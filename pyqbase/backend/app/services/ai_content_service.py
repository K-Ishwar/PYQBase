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

# Max questions per batch call to stay within token limits (~6000 tokens output safe limit)
BATCH_CHUNK_SIZE = 30


@retry(
    wait=wait_exponential(multiplier=30, min=30, max=120),
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
        temperature=0.3,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# BATCH ENRICHMENT — All questions in ONE Groq call (or chunked if large)
# This replaces sequential per-question calls and is ~30x faster.
# ─────────────────────────────────────────────────────────────────────────────

_BATCH_SYSTEM_PROMPT = """You are an expert academic classification system for Indian competitive exams (UPSC CSE, UPSC CAPF, MPSC, UPSC CDS, etc.).

Given a list of multiple-choice questions and the exam context, classify EACH question into subject, topic, and subtopic.

Rules:
- Use the allowed taxonomy below. Choose the closest existing subject and topic.
- You may create a new subtopic string if none fits.
- Return a JSON object with key "results" containing an array, one entry per question.
- Each entry MUST have: "q" (question number), "subject", "topic", "subtopic"
- Do NOT skip any questions. Do NOT add extra fields.

Allowed Taxonomy:
{taxonomy_context}

Output format (strict JSON):
{
  "results": [
    {"q": 1, "subject": "History", "topic": "Ancient India", "subtopic": "Maurya Empire"},
    {"q": 2, "subject": "Science", "topic": "Physics", "subtopic": "Laws of Motion"}
  ]
}"""


async def enrich_batch_chunk(
    questions: List[StagedQuestionDb],
    batch: IngestionBatchDb,
    taxonomy_context: str,
) -> Dict[int, Dict[str, str]]:
    """
    Send a chunk of questions to Groq in a single call.
    Returns a dict mapping question_number -> {subject, topic, subtopic}.
    """
    # Build the user message listing all questions
    lines = [f"Exam: {batch.exam}"]
    for q in questions:
        header = f" [{q.header_context}]" if q.header_context else ""
        options_text = ", ".join([f"{k}: {v}" for k, v in (q.raw_options or {}).items()])
        lines.append(
            f"Q{q.question_number}{header}: {q.raw_question_stem or '(no stem)'} | Options: {options_text}"
        )
    user_msg = "\n".join(lines)

    sys_prompt = _BATCH_SYSTEM_PROMPT.replace("{taxonomy_context}", taxonomy_context)

    # Estimate tokens: ~50 tokens per question + system prompt overhead
    max_tokens = min(4000, len(questions) * 60 + 500)

    content = await call_groq_with_retry(
        [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=max_tokens,
    )

    result = json.loads(content)
    results_list = result.get("results", [])

    mapping: Dict[int, Dict[str, str]] = {}
    for item in results_list:
        q_num = item.get("q")
        if q_num is not None:
            mapping[int(q_num)] = {
                "subject": item.get("subject", "Uncategorized"),
                "topic": item.get("topic", "General"),
                "subtopic": item.get("subtopic", "Miscellaneous"),
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

            # ── Fetch existing taxonomy tree to guide AI ──
            subjects = await taxonomy_repo.list_subjects(db)
            taxonomy_tree = {}
            for s in subjects:
                topics = await taxonomy_repo.list_topics(db, s.id)
                taxonomy_tree[s.name] = [t.name for t in topics]
            taxonomy_context = json.dumps(taxonomy_tree, indent=2)

            # ── Filter: only process questions with sufficient confidence ──
            processable = [q for q in questions if (q.parse_confidence or 0) >= 0.50]
            skipped = [q for q in questions if (q.parse_confidence or 0) < 0.50]
            logger.info(f"[enrich_batch] {len(processable)} processable, {len(skipped)} skipped (low confidence)")

            # ── Chunk into groups to stay within token limits ──
            chunks = [
                processable[i : i + BATCH_CHUNK_SIZE]
                for i in range(0, len(processable), BATCH_CHUNK_SIZE)
            ]

            # ── Call Groq once per chunk ──
            all_mappings: Dict[int, Dict[str, str]] = {}
            for chunk_idx, chunk in enumerate(chunks):
                logger.info(f"[enrich_batch] Calling Groq for chunk {chunk_idx + 1}/{len(chunks)} ({len(chunk)} questions)")
                try:
                    chunk_mapping = await enrich_batch_chunk(chunk, batch, taxonomy_context)
                    all_mappings.update(chunk_mapping)
                    logger.info(f"[enrich_batch] Chunk {chunk_idx + 1} done, got {len(chunk_mapping)} classifications")
                except Exception as chunk_err:
                    logger.error(
                        f"[enrich_batch] Chunk {chunk_idx + 1} failed: {chunk_err}\n"
                        f"{traceback.format_exc()}"
                    )
                    # Mark that chunk's questions as needing edit
                    for q in chunk:
                        try:
                            await ingestion_repo.update_staged_question(
                                db,
                                q.id,
                                review_status=ReviewStatus.needs_edit,
                                reviewer_notes=f"AI batch failed: {str(chunk_err)[:100]}",
                            )
                        except Exception:
                            pass
                    continue

                # Small delay between chunks to avoid rate limiting
                if chunk_idx < len(chunks) - 1:
                    await asyncio.sleep(2)

            # ── Apply taxonomy results to DB ──
            logger.info(f"[enrich_batch] Applying {len(all_mappings)} classifications to DB")
            
            # Build a lookup dict for taxonomy names -> IDs (cache to avoid repeated DB calls)
            subject_cache: Dict[str, Any] = {}
            topic_cache: Dict[str, Any] = {}
            subtopic_cache: Dict[str, Any] = {}

            for q in processable:
                taxonomy = all_mappings.get(q.question_number)
                if not taxonomy:
                    # Groq missed this question — mark for manual review
                    await ingestion_repo.update_staged_question(
                        db,
                        q.id,
                        review_status=ReviewStatus.needs_edit,
                        reviewer_notes="AI did not classify this question — please categorize manually.",
                    )
                    continue

                try:
                    sub_name = taxonomy["subject"]
                    top_name = taxonomy["topic"]
                    subtop_name = taxonomy["subtopic"]

                    # Use cache to avoid repeated DB upserts
                    if sub_name not in subject_cache:
                        subject_cache[sub_name] = await taxonomy_repo.get_or_create_subject(db, sub_name)
                    subject = subject_cache[sub_name]

                    cache_key = f"{sub_name}::{top_name}"
                    if cache_key not in topic_cache:
                        topic_cache[cache_key] = await taxonomy_repo.get_or_create_topic(db, subject.id, top_name)
                    topic = topic_cache[cache_key]

                    subtopic_key = f"{top_name}::{subtop_name}"
                    if subtopic_key not in subtopic_cache:
                        subtopic_cache[subtopic_key] = await taxonomy_repo.get_or_create_subtopic(db, topic.id, subtop_name)
                    subtopic = subtopic_cache[subtopic_key]

                    await ingestion_repo.update_staged_question(
                        db,
                        q.id,
                        subject_id=subject.id,
                        topic_id=topic.id,
                        subtopic_id=subtopic.id,
                        review_status=ReviewStatus.pending,
                    )
                    logger.info(f"[enrich_batch] Q{q.question_number} → {sub_name} / {top_name} / {subtop_name}")

                except Exception as apply_err:
                    logger.error(f"[enrich_batch] Failed to apply taxonomy for Q{q.question_number}: {apply_err}")
                    try:
                        await ingestion_repo.update_staged_question(
                            db,
                            q.id,
                            review_status=ReviewStatus.needs_edit,
                            reviewer_notes=f"Taxonomy apply error: {str(apply_err)[:100]}",
                        )
                    except Exception:
                        pass

            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.reviewing)
            logger.info(f"[enrich_batch] Completed batch {batch_id}")

        except Exception as e:
            error_msg = f"Batch enrichment failed: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            await ingestion_repo.update_batch_status(
                db, batch_id, IngestionStatus.failed, error_log=error_msg
            )
