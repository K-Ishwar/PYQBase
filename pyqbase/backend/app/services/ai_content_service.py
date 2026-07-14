import os
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
import traceback
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from groq import AsyncGroq
import groq
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from app.core.database import async_session_maker
from app.core.config import settings
from app.models.ingestion import IngestionStatus, StagedQuestionDb, ReviewStatus, IngestionBatchDb
from app.repositories import ingestion_repo, taxonomy_repo

logger = logging.getLogger(__name__)


def _is_valid_api_key(key: str) -> bool:
    return bool(key and not key.startswith("placeholder") and len(key) > 20)


groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=45.0) if _is_valid_api_key(settings.GROQ_API_KEY) else None

# ── Model choice ─────────────────────────────────────────────────────────────
# llama-3.1-8b-instant  → 1M tokens/day free, very fast, lower quality
# llama-3.3-70b-versatile → 100K tokens/day free, slower, higher quality
# We use the 8b model to stay well under the daily limit.
MODEL_NAME = "llama-3.1-8b-instant"


def calculate_lexical_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    tokens1 = set(text1.lower().replace(".", "").replace(",", "").split())
    tokens2 = set(text2.lower().replace(".", "").replace(",", "").split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


@retry(
    wait=wait_exponential(multiplier=30, min=30, max=90),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(groq.RateLimitError),
    reraise=True,
)
async def call_groq_with_retry(
    messages: List[Dict[str, str]],
    response_format: dict = {"type": "json_object"},
    max_tokens: int = 600,
) -> str:
    if not groq_client:
        raise ValueError(
            "GROQ_API_KEY is not configured or invalid. "
            "Please set a valid API key in your .env file."
        )
    response = await groq_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format=response_format,
        temperature=0.4,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# COMBINED SINGLE-CALL ENRICHMENT
# Instead of 2 separate Groq calls (paraphrase + explanation), we do ONE call
# that returns both. This halves token consumption per question.
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an academic content expert. Given a multiple-choice question, you must:
1. Rewrite the stem and all four options in your own words (preserve meaning, change wording).
2. Provide a concise explanation for the correct answer.
3. Classify the question into subject/topic/subtopic.

Output ONLY valid JSON in this exact format (no extra keys):
{
  "paraphrased_stem": "rewritten question stem",
  "paraphrased_options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "concept_summary": "one sentence overview",
  "why_correct": "why the correct option is right",
  "why_others_wrong": "brief note on incorrect options",
  "exam_relevance_note": "relevance to competitive exams",
  "subject": "e.g. Science",
  "topic": "e.g. Biology",
  "subtopic": "e.g. Cell Division"
}"""


async def enrich_question_single_call(
    staged_question: StagedQuestionDb,
    batch: IngestionBatchDb,
    db: AsyncSession,
) -> bool:
    """
    ONE Groq API call that does paraphrase + explanation + taxonomy together.
    Saves ~50% tokens vs the previous 2-call approach.
    Returns True on success.
    """
    header_info = f"Header context: {staged_question.header_context}. " if staged_question.header_context else ""
    correct = staged_question.correct_option or "Unknown"

    user_msg = (
        f"{header_info}Exam: {batch.exam}. Correct option: {correct}.\n"
        f"Stem: {staged_question.raw_question_stem}\n"
        f"Options: {json.dumps(staged_question.raw_options)}"
    )

    try:
        content = await call_groq_with_retry(
            [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=700,
        )

        result = json.loads(content)

        # ── Paraphrase ────────────────────────────────────────────────────
        if "paraphrased_stem" in result and "paraphrased_options" in result:
            raw_text = staged_question.raw_question_stem + " " + " ".join(
                str(v) for v in staged_question.raw_options.values()
            )
            para_text = result["paraphrased_stem"] + " " + " ".join(
                str(v) for v in result["paraphrased_options"].values()
            )
            staged_question.paraphrased_stem = {"en": result["paraphrased_stem"]}
            staged_question.paraphrased_options = {"en": result["paraphrased_options"]}
            staged_question.lexical_similarity_score = calculate_lexical_similarity(raw_text, para_text)

        # ── Explanation ───────────────────────────────────────────────────
        ai_exp = {
            "concept_summary": result.get("concept_summary", ""),
            "why_correct": result.get("why_correct", ""),
            "why_others_wrong": result.get("why_others_wrong", ""),
            "exam_relevance_note": result.get("exam_relevance_note", ""),
            "disclaimer": "AI-Generated · Verify from official sources",
        }
        staged_question.ai_explanation = {"en": ai_exp}

        # ── Taxonomy ──────────────────────────────────────────────────────
        sub_name = result.get("subject", "Uncategorized")
        top_name = result.get("topic", "General")
        subtop_name = result.get("subtopic", "Miscellaneous")

        subject = await taxonomy_repo.get_or_create_subject(db, sub_name)
        topic = await taxonomy_repo.get_or_create_topic(db, subject.id, top_name)
        subtopic = await taxonomy_repo.get_or_create_subtopic(db, topic.id, subtop_name)

        staged_question.subject_id = subject.id
        staged_question.topic_id = topic.id
        staged_question.subtopic_id = subtopic.id

        return True

    except Exception as e:
        logger.error(
            f"enrich_question_single_call failed for Q{staged_question.question_number}: "
            f"{traceback.format_exc()}"
        )
        return False


async def process_question(db: AsyncSession, q: StagedQuestionDb, batch: IngestionBatchDb):
    """Process a single question with one combined Groq API call."""
    if q.parse_confidence < 0.90:
        logger.info(f"Skipping Q{q.question_number}: low confidence ({q.parse_confidence:.2f})")
        return

    logger.info(f"Enriching Q{q.question_number} ...")
    success = await enrich_question_single_call(q, batch, db)

    if not success:
        q.review_status = ReviewStatus.needs_edit
        q.reviewer_notes = "AI enrichment failed — check server logs."
    else:
        logger.info(f"Q{q.question_number} done. Subject: {q.subject_id}")

    await ingestion_repo.update_staged_question(
        db,
        q.id,
        paraphrased_stem=q.paraphrased_stem,
        paraphrased_options=q.paraphrased_options,
        lexical_similarity_score=q.lexical_similarity_score,
        ai_explanation=q.ai_explanation,
        review_status=q.review_status,
        reviewer_notes=q.reviewer_notes,
        subject_id=q.subject_id,
        topic_id=q.topic_id,
        subtopic_id=q.subtopic_id,
    )


async def enrich_batch(batch_id: UUID):
    """
    Background job: enriches all questions in a batch using one Groq call each.
    Runs in its own DB session (independent of the parse session).
    """
    logger.info(f"[enrich_batch] Starting for batch {batch_id}")
    async with async_session_maker() as db:
        try:
            batch, questions = await ingestion_repo.get_batch_with_questions(db, batch_id)
            if not batch:
                logger.error(f"[enrich_batch] Batch {batch_id} not found")
                return
            if not questions:
                logger.warning(f"[enrich_batch] No questions in batch {batch_id}")
                return

            logger.info(f"[enrich_batch] {len(questions)} questions to enrich")

            for idx, q in enumerate(questions):
                logger.info(f"[enrich_batch] {idx + 1}/{len(questions)} — Q{q.question_number}")
                try:
                    await process_question(db, q, batch)
                except Exception as q_err:
                    logger.error(
                        f"[enrich_batch] Q{q.question_number} crashed: {q_err}\n"
                        f"{traceback.format_exc()}"
                    )
                    try:
                        await ingestion_repo.update_staged_question(
                            db,
                            q.id,
                            review_status=ReviewStatus.needs_edit,
                            reviewer_notes=f"Processing error: {str(q_err)}",
                        )
                    except Exception:
                        pass
                    continue

            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.reviewing)
            logger.info(f"[enrich_batch] Completed batch {batch_id}")

        except Exception as e:
            error_msg = f"Batch enrichment failed: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            await ingestion_repo.update_batch_status(
                db, batch_id, IngestionStatus.failed, error_log=error_msg
            )
