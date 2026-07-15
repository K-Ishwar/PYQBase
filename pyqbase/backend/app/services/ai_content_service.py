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


groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=90.0) if _is_valid_api_key(settings.GROQ_API_KEY) else None

# ── Model choice ─────────────────────────────────────────────────────────────
# llama-3.1-8b-instant  → 1M tokens/day free, very fast
# We send all questions in ONE batch call to save time.
MODEL_NAME = "llama-3.1-8b-instant"

# Max questions per batch call.
# Free Groq tier limit: 6000 TPM. Each question costs ~100-150 input tokens.
# System prompt + taxonomy context costs ~600 tokens.
# At 10 questions × 150 tokens = 1500 + 600 overhead = ~2100 tokens → safely under limit.
BATCH_CHUNK_SIZE = 10


@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((groq.RateLimitError, groq.APIStatusError)),
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
        temperature=0.3,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# BATCH ENRICHMENT — All questions in ONE Groq call (or chunked if large)
# This replaces sequential per-question calls and is ~30x faster.
# ─────────────────────────────────────────────────────────────────────────────

_BATCH_SYSTEM_PROMPT = """You are an expert academic classification system for competitive exams.

Given a list of multiple-choice questions and the exam context, classify EACH question into a subject and topic.

Rules:
- The "subject" MUST be strictly selected from the following list ONLY: History, Geography, Polity, Economy, Science, Biology, Physics, Chemistry, Environment, Current Affairs, Art and Culture, Agriculture, Defence, International Relations, Governance, Ethics, Disaster Management, Internal Security, Mathematics, Reasoning, English, Hindi, Marathi, Computer, Statistics, Data Interpretation, Logical Reasoning, General Awareness, Miscellaneous.
- Generate a specific topic based on standard academic curriculums.
- Return a JSON object with key "results" containing an array, one entry per question.
- Each entry MUST have: "q" (question number), "subject", "topic"
- The "q" field MUST exactly match the integer number provided in the 'Q#' prefix of each question (e.g., if the question starts with Q35:, the "q" field must be 35).
- Every question MUST have a subject and topic. DO NOT leave them blank, null, or empty.
- Do NOT skip any questions. Do NOT add extra fields.

Output format (strict JSON):
{
  "results": [
    {"q": 35, "subject": "History", "topic": "Ancient India"},
    {"q": 36, "subject": "Science", "topic": "Physics"}
  ]
}"""


async def enrich_batch_chunk(
    questions: List[StagedQuestionDb],
    batch: IngestionBatchDb,
    subject_name: Optional[str] = None,
    allowed_topics: Optional[List[str]] = None,
) -> Dict[int, Dict[str, str]]:
    """
    Send a chunk of questions to Groq in a single call.
    Returns a dict mapping question_number -> {subject, topic}.
    Only sends the question STEM (not options) to keep tokens minimal.
    """
    lines = [f"Exam: {batch.exam}"]
    for q in questions:
        # Only include the stem — options are not needed for classification
        # Truncate long stems to 200 chars to stay within token budget
        stem = (q.raw_question_stem or "(no stem)")[:200]
        lines.append(f"Q{q.question_number}: {stem}")
    user_msg = "\n".join(lines)

    if subject_name and allowed_topics:
        topic_list_str = ", ".join(f'"{t}"' for t in allowed_topics)
        sys_prompt = f"""You are an expert academic classification system for competitive exams.

Given a list of multiple-choice questions and the exam context, classify EACH question into a topic.

Rules:
- The "subject" MUST strictly be "{subject_name}".
- For the "topic", preferably select from the following existing topics if they fit well: {topic_list_str}.
- However, you are FREE to invent and provide a new specific topic name if the question does not fit any of the existing topics. Do not restrict yourself.
- Return a JSON object with key "results" containing an array, one entry per question.
- Each entry MUST have: "q" (question number), "subject", "topic"
- The "q" field MUST exactly match the integer number provided in the 'Q#' prefix of each question.
- Do NOT skip any questions. Do NOT add extra fields.

Output format (strict JSON):
{{
  "results": [
    {{"q": 35, "subject": "{subject_name}", "topic": "{allowed_topics[0] if allowed_topics else 'Topic'}"}}
  ]
}}"""
    elif subject_name:
        sys_prompt = f"""You are an expert academic classification system for competitive exams.

Given a list of multiple-choice questions and the exam context, classify EACH question into a topic.

Rules:
- The "subject" MUST strictly be "{subject_name}".
- Generate a specific topic based on standard academic curriculums. You may invent a suitable topic name.
- Return a JSON object with key "results" containing an array, one entry per question.
- Each entry MUST have: "q" (question number), "subject", "topic"
- The "q" field MUST exactly match the integer number provided in the 'Q#' prefix of each question.
- Do NOT skip any questions. Do NOT add extra fields.

Output format (strict JSON):
{{
  "results": [
    {{"q": 35, "subject": "{subject_name}", "topic": "Generated Topic Name"}}
  ]
}}"""
    else:
        sys_prompt = _BATCH_SYSTEM_PROMPT

    # ~80 tokens output per question (long subject/topic names need more budget)
    max_output_tokens = len(questions) * 85 + 150

    content = await call_groq_with_retry(
        [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=max_output_tokens,
    )

    result = json.loads(content)
    results_list = result.get("results", [])

    mapping: Dict[int, Dict[str, str]] = {}
    for item in results_list:
        q_num = item.get("q")
        if q_num is not None:
            mapping[int(q_num)] = {
                "subject": item.get("subject") or "Uncategorized",
                "topic": item.get("topic") or "General",
            }
    return mapping


async def enrich_batch(batch_id: UUID):
    """
    Background job: enriches all questions in a batch.
    Uses batched Groq calls (all questions at once, chunked if > BATCH_CHUNK_SIZE).
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

            # ── Filter: only process questions with sufficient confidence AND no topic assigned ──
            processable = [q for q in questions if (q.parse_confidence or 0) >= 0.90 and not q.topic_id]
            skipped = [q for q in questions if not ((q.parse_confidence or 0) >= 0.90 and not q.topic_id)]
            logger.info(f"[enrich_batch] {len(processable)} processable, {len(skipped)} skipped (low confidence or already categorized)")

            # ── Chunk into groups to stay within token limits ──
            chunks = [
                processable[i : i + BATCH_CHUNK_SIZE]
                for i in range(0, len(processable), BATCH_CHUNK_SIZE)
            ]

            # ── Check if subject_id is pre-assigned ──
            preassigned_subject_id = processable[0].subject_id if processable else None
            subject_name = None
            allowed_topics = None
            
            if preassigned_subject_id:
                from app.models.taxonomy import SubjectDb, TopicDb
                from sqlalchemy import select
                sub = (await db.execute(select(SubjectDb).where(SubjectDb.id == preassigned_subject_id))).scalar_one_or_none()
                if sub:
                    subject_name = sub.name
                    topics_res = await db.execute(select(TopicDb.name).where(TopicDb.subject_id == preassigned_subject_id))
                    topics_list = list(topics_res.scalars().all())
                    if topics_list:
                        allowed_topics = topics_list

            # ── Call Groq once per chunk ──
            all_mappings: Dict[int, Dict[str, str]] = {}
            for chunk_idx, chunk in enumerate(chunks):
                logger.info(f"[enrich_batch] Calling Groq for chunk {chunk_idx + 1}/{len(chunks)} ({len(chunk)} questions)")
                try:
                    chunk_mapping = await enrich_batch_chunk(chunk, batch, subject_name, allowed_topics)
                    all_mappings.update(chunk_mapping)
                    logger.info(f"[enrich_batch] Chunk {chunk_idx + 1} done, got {len(chunk_mapping)} classifications")
                except Exception as chunk_err:
                    logger.error(
                        f"[enrich_batch] Chunk {chunk_idx + 1} failed: {chunk_err}\n"
                        f"{traceback.format_exc()}"
                    )
                    # Mark that chunk's questions as needing edit
                    for q in chunk:
                        q.review_status = ReviewStatus.needs_edit
                        q.reviewer_notes = f"AI batch failed: {str(chunk_err)[:100]}"
                    continue

                # No sleep needed — Groq free tier allows bursts, only hits limits on huge batches

            # ── Apply taxonomy results to DB ──
            logger.info(f"[enrich_batch] Applying {len(all_mappings)} classifications to DB")
            
            # Build a lookup dict for taxonomy names -> IDs (cache to avoid repeated DB calls)
            subject_cache: Dict[str, Any] = {}
            topic_cache: Dict[str, Any] = {}
            for q in processable:
                taxonomy = all_mappings.get(q.question_number)
                if not taxonomy:
                    # Groq missed this question — mark for manual review
                    q.review_status = ReviewStatus.needs_edit
                    q.reviewer_notes = "AI did not classify this question — please categorize manually."
                    continue

                try:
                    sub_name = taxonomy["subject"]
                    top_name = taxonomy["topic"]

                    # Use cache to avoid repeated DB upserts
                    if sub_name not in subject_cache:
                        subject_cache[sub_name] = await taxonomy_repo.get_or_create_subject(db, sub_name)
                    subject = subject_cache[sub_name]

                    cache_key = f"{sub_name}::{top_name}"
                    if cache_key not in topic_cache:
                        topic_cache[cache_key] = await taxonomy_repo.get_or_create_topic(db, subject.id, top_name)
                    topic = topic_cache[cache_key]

                    q.subject_id = subject.id
                    q.topic_id = topic.id
                    q.review_status = ReviewStatus.pending
                    logger.info(f"[enrich_batch] Q{q.question_number} → {sub_name} / {top_name}")

                except Exception as apply_err:
                    logger.error(f"[enrich_batch] Failed to apply taxonomy for Q{q.question_number}: {apply_err}")
                    q.review_status = ReviewStatus.needs_edit
                    q.reviewer_notes = f"Taxonomy apply error: {str(apply_err)[:100]}"

            # Commit all the ORM changes at once
            await db.commit()
            
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.reviewing)
            logger.info(f"[enrich_batch] Completed batch {batch_id}")

        except Exception as e:
            error_msg = f"Batch enrichment failed: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            await ingestion_repo.update_batch_status(
                db, batch_id, IngestionStatus.failed, error_log=error_msg
            )
