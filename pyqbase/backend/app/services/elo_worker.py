"""
ELO Worker — runs every 300 seconds as a FastAPI startup background task.

Uses Postgres FOR UPDATE SKIP LOCKED on background_jobs table.
No Redis. Per FTDD Architecture decision.

Worker pattern:
1. SELECT pending elo_update jobs FOR UPDATE SKIP LOCKED.
2. Aggregate multiple jobs per question_id → take max new_elo.
3. Bulk UPDATE questions.elo_rating.
4. Mark jobs as 'completed'.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker

logger = logging.getLogger(__name__)

BATCH_SIZE = 200  # max jobs to process per cycle


async def run_elo_worker() -> None:
    """
    Called every 5 minutes by the FastAPI startup lifespan.
    Processes all pending elo_update background jobs in a single DB transaction.
    """
    async with async_session_maker() as db:
        try:
            await _process_elo_batch(db)
        except Exception as exc:
            logger.error(f"ELO worker failed: {exc}", exc_info=True)
            await db.rollback()


async def _process_elo_batch(db: AsyncSession) -> None:
    # ── 1. Claim pending jobs (SKIP LOCKED prevents concurrent worker conflicts)
    rows = (
        await db.execute(
            text("""
                SELECT id, payload
                FROM background_jobs
                WHERE task_type = 'elo_update'
                  AND status = 'pending'
                ORDER BY created_at ASC
                LIMIT :batch_size
                FOR UPDATE SKIP LOCKED
            """),
            {"batch_size": BATCH_SIZE},
        )
    ).mappings().all()

    if not rows:
        logger.debug("ELO worker: no pending jobs.")
        return

    job_ids = [str(row["id"]) for row in rows]
    logger.info(f"ELO worker: claiming {len(rows)} jobs.")

    # Mark as 'processing' immediately to guard against crashes
    await db.execute(
        text("""
            UPDATE background_jobs
            SET status = 'processing', locked_at = :now
            WHERE id = ANY(:ids::uuid[])
        """),
        {"now": datetime.now(timezone.utc), "ids": job_ids},
    )
    await db.commit()

    # ── 2. Aggregate per question_id (take the last submitted new_elo)
    # Multiple attempts on the same question in a batch → use the most recent value.
    elo_map: dict[str, int] = {}
    for row in rows:
        payload = row["payload"]
        qid = str(payload["question_id"])
        new_elo = int(payload["new_elo"])
        # Take max to avoid regressing due to out-of-order events
        elo_map[qid] = max(elo_map.get(qid, 0), new_elo)

    # ── 3. Bulk UPDATE questions.elo_rating
    # Build a VALUES list for a single efficient UPDATE
    if elo_map:
        values_clause = ", ".join(
            f"('{qid}'::uuid, {elo})" for qid, elo in elo_map.items()
        )
        await db.execute(
            text(f"""
                UPDATE questions AS q
                SET elo_rating = v.new_elo
                FROM (VALUES {values_clause}) AS v(question_id, new_elo)
                WHERE q.id = v.question_id
            """)
        )
        logger.info(f"ELO worker: updated ELO for {len(elo_map)} questions.")

    # ── 4. Mark jobs 'completed'
    await db.execute(
        text("""
            UPDATE background_jobs
            SET status = 'completed'
            WHERE id = ANY(:ids::uuid[])
        """),
        {"ids": job_ids},
    )
    await db.commit()
    logger.info(f"ELO worker: completed {len(job_ids)} jobs.")
