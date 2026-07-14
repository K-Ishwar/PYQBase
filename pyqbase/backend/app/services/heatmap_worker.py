"""
Heatmap Worker — handles daily REFRESH MATERIALIZED VIEW CONCURRENTLY for topic_heatmap.

Includes:
1. A scheduler loop that inserts a 'refresh_heatmap' job daily at 00:01 IST.
2. A worker loop that processes pending 'refresh_heatmap' jobs.
"""
from __future__ import annotations

import logging
import asyncio
from datetime import datetime, timezone, timedelta
import zoneinfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker

logger = logging.getLogger(__name__)

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

async def _schedule_heatmap_refresh() -> None:
    """
    Checks if it's 00:01 IST, and if a job hasn't been created today, inserts one.
    """
    async with async_session_maker() as db:
        now_ist = datetime.now(IST)
        # Check if we are past 00:01 today
        if now_ist.hour == 0 and now_ist.minute >= 1 or now_ist.hour > 0:
            # Check if a job was already created today (IST)
            start_of_day_utc = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
            # Strip tzinfo — the DB column is TIMESTAMP WITHOUT TIME ZONE
            start_of_day_naive = start_of_day_utc.replace(tzinfo=None)
            
            row = (await db.execute(
                text("""
                    SELECT id FROM background_jobs 
                    WHERE task_type = 'refresh_heatmap' 
                      AND created_at >= :start_of_day
                    LIMIT 1
                """),
                {"start_of_day": start_of_day_naive}
            )).scalar_one_or_none()
            
            if not row:
                # Insert the daily job
                await db.execute(
                    text("""
                        INSERT INTO background_jobs (task_type, payload, status)
                        VALUES ('refresh_heatmap', '{}'::jsonb, 'pending')
                    """)
                )
                await db.commit()
                logger.info("Inserted daily refresh_heatmap background job.")


async def heatmap_scheduler_loop() -> None:
    """Runs every 60 seconds to check if we should insert the daily job."""
    while True:
        try:
            await _schedule_heatmap_refresh()
        except Exception as exc:
            logger.error(f"Heatmap scheduler error: {exc}", exc_info=True)
        await asyncio.sleep(60)


async def run_heatmap_worker() -> None:
    """
    Processes pending 'refresh_heatmap' jobs.
    """
    async with async_session_maker() as db:
        try:
            await _process_refresh_batch(db)
        except Exception as exc:
            logger.error(f"Heatmap worker failed: {exc}", exc_info=True)
            await db.rollback()


async def _process_refresh_batch(db: AsyncSession) -> None:
    # ── 1. Claim pending jobs (SKIP LOCKED prevents concurrent worker conflicts)
    rows = (
        await db.execute(
            text("""
                SELECT id 
                FROM background_jobs
                WHERE task_type = 'refresh_heatmap'
                  AND status = 'pending'
                ORDER BY created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            """)
        )
    ).mappings().all()

    if not rows:
        return

    job_id = rows[0]["id"]
    logger.info(f"Heatmap worker: processing job {job_id}")

    # Mark as 'processing'
    await db.execute(
        text("""
            UPDATE background_jobs
            SET status = 'processing', locked_at = :now
            WHERE id = :id
        """),
        {"now": datetime.utcnow(), "id": job_id},
    )
    await db.commit()

    # PostgreSQL's REFRESH MATERIALIZED VIEW CONCURRENTLY cannot be run inside a transaction block.
    # We must set isolation_level = 'AUTOCOMMIT' for this execution.
    # AsyncSession doesn't easily expose this per-query.
    # SQLAlchemy 2.0 allows execution with `.execution_options(isolation_level="AUTOCOMMIT")`.
    
    logger.info("Executing REFRESH MATERIALIZED VIEW CONCURRENTLY topic_heatmap...")
    
    try:
        # Commit any pending transaction before doing autocommit operations
        await db.commit()
        
        # Execute REFRESH MATERIALIZED VIEW with connection-level isolation
        conn = await db.connection()
        await conn.execute(
            text("REFRESH MATERIALIZED VIEW CONCURRENTLY topic_heatmap"),
            execution_options={"isolation_level": "AUTOCOMMIT"}
        )
    except Exception as e:
        logger.error(f"Error during refresh: {e}")
        # Need to start a new transaction to update status to error
        await db.execute(
            text("""
                UPDATE background_jobs
                SET status = 'failed'
                WHERE id = :id
            """),
            {"id": job_id},
        )
        await db.commit()
        raise e

    # Start new transaction for final update
    await db.execute(
        text("""
            UPDATE background_jobs
            SET status = 'completed'
            WHERE id = :id
        """),
        {"id": job_id},
    )
    await db.commit()
    logger.info("Heatmap worker: refresh completed.")


async def heatmap_worker_loop() -> None:
    """Runs every 60 seconds to process heatmap jobs."""
    while True:
        try:
            await run_heatmap_worker()
        except Exception as exc:
            logger.error(f"Heatmap worker loop error: {exc}", exc_info=True)
        await asyncio.sleep(60)
