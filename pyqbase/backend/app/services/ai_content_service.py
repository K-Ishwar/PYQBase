import os
import json
import asyncio
from typing import Dict, Any, List, Optional, Tuple
import traceback
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from groq import AsyncGroq
import groq
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from app.core.database import async_session_maker
from app.core.config import settings
from app.models.ingestion import IngestionStatus, StagedQuestionDb, ReviewStatus
from app.repositories import ingestion_repo

# Initialize Groq client
# If GROQ_API_KEY is not in settings, this will throw an error when used, which is handled gracefully
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
MODEL_NAME = "llama-3.3-70b-versatile"

def calculate_lexical_similarity(text1: str, text2: str) -> float:
    """
    Calculates Jaccard similarity between two strings based on token overlap.
    """
    if not text1 or not text2:
        return 0.0
        
    # Basic tokenization
    tokens1 = set(text1.lower().replace('.', '').replace(',', '').split())
    tokens2 = set(text2.lower().replace('.', '').replace(',', '').split())
    
    if not tokens1 or not tokens2:
        return 0.0
        
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    return len(intersection) / len(union)

# Retry decorator for Groq 429 errors (Rate Limit)
# Waits 60s, then 120s, up to 3 attempts total.
@retry(
    wait=wait_exponential(multiplier=60, min=60, max=120),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(groq.RateLimitError),
    reraise=True
)
async def call_groq_with_retry(messages: List[Dict[str, str]], response_format={"type": "json_object"}) -> str:
    if not groq_client:
        raise ValueError("GROQ_API_KEY is not configured.")
        
    response = await groq_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format=response_format,
        temperature=0.7
    )
    return response.choices[0].message.content


async def generate_paraphrase(staged_question: StagedQuestionDb, strong_prompt: bool = False) -> Tuple[bool, float, Optional[str]]:
    """
    Generates a paraphrased version of the stem and options.
    Returns (success_boolean, similarity_score, error_message).
    """
    instruction = (
        "You are an expert academic content creator. Your task is to rewrite the provided multiple choice question "
        "to completely avoid copyright infringement while preserving the exact factual meaning and logical structure. "
        "Change the sentence structure, vocabulary, and phrasing significantly. Do not just swap a few words."
    )
    
    if strong_prompt:
        instruction += "\nCRITICAL: The previous attempt was too similar to the original. You MUST reword this completely. Use radically different sentence structures."

    prompt = f"""
    Raw Question Stem: {staged_question.raw_question_stem}
    Raw Options: {json.dumps(staged_question.raw_options)}
    
    Output JSON exactly in this format:
    {{
        "paraphrased_stem": "your rewritten stem here",
        "paraphrased_options": {{
            "A": "rewritten option A",
            "B": "rewritten option B",
            "C": "rewritten option C",
            "D": "rewritten option D"
        }}
    }}
    """
    
    try:
        content = await call_groq_with_retry([
            {"role": "system", "content": instruction},
            {"role": "user", "content": prompt}
        ])
        
        result = json.loads(content)
        
        # Calculate similarity (combining stem and options for a holistic score)
        raw_text = staged_question.raw_question_stem + " " + " ".join(staged_question.raw_options.values())
        para_text = result["paraphrased_stem"] + " " + " ".join(result["paraphrased_options"].values())
        
        sim_score = calculate_lexical_similarity(raw_text, para_text)
        
        # Update question object
        staged_question.paraphrased_stem = {"en": result["paraphrased_stem"]}
        staged_question.paraphrased_options = {"en": result["paraphrased_options"]}
        staged_question.lexical_similarity_score = sim_score
        
        return True, sim_score, None
        
    except Exception as e:
        return False, 0.0, str(e)


async def generate_explanation(staged_question: StagedQuestionDb) -> Tuple[bool, Optional[str]]:
    """
    Generates the 4-part explanation.
    Returns (success_boolean, error_message).
    """
    # If we don't have a correct option, we can't reliably explain why it's correct.
    if not staged_question.correct_option:
        return False, "Skipped explanation: correct_option is missing."

    instruction = (
        "You are an expert tutor. Generate an explanation for the multiple choice question. "
        "Output JSON exactly in this format:\n"
        "{\n"
        "  \"concept_summary\": \"Brief overview of the core concept tested.\",\n"
        "  \"why_correct\": \"Detailed explanation of why the correct option is right.\",\n"
        "  \"why_others_wrong\": \"Explanation of why the other options are incorrect.\",\n"
        "  \"exam_relevance_note\": \"Why this is relevant for competitive exams.\"\n"
        "}"
    )
    
    prompt = f"""
    Question Stem: {staged_question.paraphrased_stem.get('en') if staged_question.paraphrased_stem else staged_question.raw_question_stem}
    Options: {json.dumps(staged_question.paraphrased_options.get('en') if staged_question.paraphrased_options else staged_question.raw_options)}
    Correct Option: {staged_question.correct_option}
    """
    
    try:
        content = await call_groq_with_retry([
            {"role": "system", "content": instruction},
            {"role": "user", "content": prompt}
        ])
        
        result = json.loads(content)
        
        # FR-12.2 Mandatory Disclaimer Injection
        result["disclaimer"] = "AI-Generated · Verify from official sources"
        
        staged_question.ai_explanation = {"en": result}
        return True, None
        
    except Exception as e:
        return False, str(e)


async def process_question(db: AsyncSession, q: StagedQuestionDb):
    # Only process high confidence parsing
    if q.parse_confidence < 0.90:
        return

    # 1. Paraphrase (Attempt 1)
    success, sim_score, err = await generate_paraphrase(q, strong_prompt=False)
    
    if not success:
        q.review_status = ReviewStatus.needs_edit
        q.reviewer_notes = f"AI Paraphrase Failed: {err}"
        await ingestion_repo.update_staged_question(db, q.id, review_status=q.review_status, reviewer_notes=q.reviewer_notes)
        return
        
    # Check similarity gate
    if sim_score >= 0.60:
        # Paraphrase (Attempt 2 - Stronger)
        success, sim_score, err = await generate_paraphrase(q, strong_prompt=True)
        if not success or sim_score >= 0.60:
            q.review_status = ReviewStatus.needs_edit
            notes = f"Failed Similarity Gate 4. Final Score: {sim_score:.2f}. " + (err if err else "")
            q.reviewer_notes = (q.reviewer_notes + "\n" + notes) if q.reviewer_notes else notes
    
    # 2. Generate Explanation
    exp_success, exp_err = await generate_explanation(q)
    if not exp_success and "Skipped" not in str(exp_err):
        q.review_status = ReviewStatus.needs_edit
        notes = f"Explanation Gen Failed: {exp_err}"
        q.reviewer_notes = (q.reviewer_notes + "\n" + notes) if q.reviewer_notes else notes

    # Save updates
    await ingestion_repo.update_staged_question(
        db, 
        q.id, 
        paraphrased_stem=q.paraphrased_stem,
        paraphrased_options=q.paraphrased_options,
        lexical_similarity_score=q.lexical_similarity_score,
        ai_explanation=q.ai_explanation,
        review_status=q.review_status,
        reviewer_notes=q.reviewer_notes
    )


async def enrich_batch(batch_id: UUID):
    """
    Background job to run AI paraphrasing and explanations on parsed questions.
    """
    async with async_session_maker() as db:
        try:
            batch, questions = await ingestion_repo.get_batch_with_questions(db, batch_id)
            if not batch:
                return

            # Process questions (can be done sequentially or concurrently. 
            # Sequential is safer for rate limits initially)
            for q in questions:
                await process_question(db, q)
                
            # Update batch status to reviewing
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.reviewing)
            
        except Exception as e:
            error_msg = f"Batch AI Enrichment failed: {str(e)}\n{traceback.format_exc()}"
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.failed, error_log=error_msg)
