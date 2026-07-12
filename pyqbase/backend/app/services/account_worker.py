"""
Account Worker — processes three background job types:

1. data_export     — bundles user data as JSON and emails via Resend (LC-04 / DPDP)
2. hard_delete     — permanently deletes accounts soft-deleted > 30 days ago (FR-01.4)
3. srs_reminder    — sends daily SRS review reminder emails at 07:00 IST (FR-17)
"""
from __future__ import annotations

import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import zoneinfo

import httpx
from sqlalchemy import text

from app.core.database import async_session_maker
from app.core.config import settings

logger = logging.getLogger(__name__)

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

async def _send_email(to: str, subject: str, html: str, attachments: list | None = None) -> bool:
    """Sends an email via Resend API. Returns True on success."""
    if not getattr(settings, "RESEND_API_KEY", None):
        logger.warning("RESEND_API_KEY not set — skipping email send")
        return False

    payload: dict = {
        "from": "PYQBase <noreply@pyqbase.com>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if attachments:
        payload["attachments"] = attachments

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json=payload,
            )
            resp.raise_for_status()
            return True
    except Exception as exc:
        logger.error(f"Resend email failed: {exc}")
        return False


# ──────────────────────────────────────────────
# Job: data_export
# ──────────────────────────────────────────────

async def _handle_data_export(job_id: str, payload: dict) -> None:
    user_id = payload.get("user_id")
    email = payload.get("email")
    if not user_id or not email:
        raise ValueError("data_export job missing user_id or email")

    async with async_session_maker() as db:
        # Gather user_attempts
        attempts = (
            await db.execute(
                text("""
                    SELECT id, question_id, selected_option, is_correct,
                           time_taken_seconds, attempt_date
                    FROM user_attempts WHERE user_id = :uid
                    ORDER BY attempt_date DESC
                    LIMIT 10000
                """),
                {"uid": user_id},
            )
        ).mappings().all()

        # Gather user_srs
        srs = (
            await db.execute(
                text("""
                    SELECT question_id, next_review_date, interval, ease_factor, repetitions
                    FROM user_srs WHERE user_id = :uid
                """),
                {"uid": user_id},
            )
        ).mappings().all()

        # Gather mock_tests
        mock_tests = (
            await db.execute(
                text("""
                    SELECT id, exam, mode, score, created_at
                    FROM mock_tests WHERE user_id = :uid
                    ORDER BY created_at DESC
                """),
                {"uid": user_id},
            )
        ).mappings().all()

    def to_list(rows):
        return [dict(r) for r in rows]

    export_data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "user_attempts": to_list(attempts),
        "user_srs": to_list(srs),
        "mock_tests": to_list(mock_tests),
    }

    # Serialize dates/UUIDs
    json_bytes = json.dumps(export_data, default=str, indent=2).encode()

    # Email with attachment (base64 encoded)
    import base64
    attachment = {
        "filename": f"pyqbase_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json",
        "content": base64.b64encode(json_bytes).decode(),
    }

    html = f"""
    <p>Hi,</p>
    <p>Your PYQBase data export is attached to this email as a JSON file.</p>
    <p>It contains your quiz attempts, SRS review state, and mock test history.</p>
    <p>This export was requested in compliance with the Digital Personal Data Protection Act 2023.</p>
    <br>
    <p>— The PYQBase Team</p>
    """

    await _send_email(email, "Your PYQBase Data Export", html, attachments=[attachment])
    logger.info(f"Data export sent to {email} for user {user_id}")


# ──────────────────────────────────────────────
# Job: hard_delete_accounts (nightly)
# ──────────────────────────────────────────────

async def _handle_hard_delete() -> None:
    """Permanently deletes users who soft-deleted > 30 days ago (FR-01.4)."""
    async with async_session_maker() as db:
        result = await db.execute(
            text("""
                DELETE FROM users
                WHERE deleted_at IS NOT NULL
                  AND deleted_at < NOW() - INTERVAL '30 days'
                RETURNING id, email
            """)
        )
        deleted = result.mappings().all()
        await db.commit()

    if deleted:
        logger.info(f"Hard-deleted {len(deleted)} expired accounts: {[r['email'] for r in deleted]}")
    else:
        logger.debug("hard_delete_accounts: no accounts due for deletion")


# ──────────────────────────────────────────────
# Job: srs_reminder (FR-17)
# ──────────────────────────────────────────────

async def _handle_srs_reminder() -> None:
    """
    Queries all non-deleted users with SRS reviews due today (IST),
    sends a reminder email to each.
    """
    async with async_session_maker() as db:
        rows = (
            await db.execute(
                text("""
                    SELECT u.id, u.email, COUNT(us.id) AS due_count
                    FROM users u
                    JOIN user_srs us ON us.user_id = u.id
                    JOIN questions q ON q.id = us.question_id
                    WHERE u.deleted_at IS NULL
                      AND us.next_review_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
                      AND q.correct_option != 'DROPPED'
                    GROUP BY u.id, u.email
                    HAVING COUNT(us.id) > 0
                """)
            )
        ).mappings().all()

    logger.info(f"SRS reminder: found {len(rows)} users with due reviews")

    for row in rows:
        n = row["due_count"]
        html = f"""
        <p>Hi,</p>
        <p>You have <strong>{n} question{'s' if n != 1 else ''}</strong> due for review today in your
        PYQBase spaced repetition queue.</p>
        <p>Staying consistent with your daily reviews is the fastest path to exam readiness.</p>
        <p><a href="https://pyqbase.com/srs" style="background:#6366f1;color:#fff;padding:10px 20px;
        border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">
        Start Today's Review →</a></p>
        <br>
        <p style="color:#888;font-size:12px;">
        To unsubscribe from these reminders, delete your account in
        <a href="https://pyqbase.com/settings">Settings</a>.
        </p>
        """
        await _send_email(row["email"], f"📚 You have {n} SRS question{'s' if n != 1 else ''} due today", html)

    logger.info(f"SRS reminder: sent {len(rows)} emails")


# ──────────────────────────────────────────────
# Generic worker — claims & dispatches jobs
# ──────────────────────────────────────────────

async def run_account_worker() -> None:
    """Claims and processes pending data_export jobs."""
    async with async_session_maker() as db:
        rows = (
            await db.execute(
                text("""
                    SELECT id, task_type, payload
                    FROM background_jobs
                    WHERE task_type = 'data_export'
                      AND status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT 5
                    FOR UPDATE SKIP LOCKED
                """)
            )
        ).mappings().all()

        if not rows:
            return

        for row in rows:
            job_id = str(row["id"])
            await db.execute(
                text("UPDATE background_jobs SET status='processing', locked_at=NOW() WHERE id=:id"),
                {"id": job_id},
            )
        await db.commit()

    for row in rows:
        job_id = str(row["id"])
        try:
            if row["task_type"] == "data_export":
                payload = row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"])
                await _handle_data_export(job_id, payload)
        except Exception as exc:
            logger.error(f"Account worker failed on job {job_id}: {exc}", exc_info=True)
            async with async_session_maker() as db:
                await db.execute(
                    text("UPDATE background_jobs SET status='failed' WHERE id=:id"),
                    {"id": job_id},
                )
                await db.commit()
            continue

        async with async_session_maker() as db:
            await db.execute(
                text("UPDATE background_jobs SET status='completed' WHERE id=:id"),
                {"id": job_id},
            )
            await db.commit()


# ──────────────────────────────────────────────
# Schedulers
# ──────────────────────────────────────────────

async def _schedule_hard_delete() -> None:
    """Inserts a hard_delete_accounts job once daily at 01:00 IST."""
    now_ist = datetime.now(IST)
    if now_ist.hour != 1:
        return

    async with async_session_maker() as db:
        start_of_day_utc = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        existing = (
            await db.execute(
                text("""
                    SELECT id FROM background_jobs
                    WHERE task_type = 'hard_delete_accounts'
                      AND created_at >= :start_of_day
                    LIMIT 1
                """),
                {"start_of_day": start_of_day_utc},
            )
        ).scalar_one_or_none()

        if not existing:
            await db.execute(
                text("""
                    INSERT INTO background_jobs (id, task_type, payload, status)
                    VALUES (:id, 'hard_delete_accounts', '{}'::jsonb, 'pending')
                """),
                {"id": str(uuid4())},
            )
            await db.commit()
            logger.info("Inserted daily hard_delete_accounts job")
            await _handle_hard_delete()


async def _schedule_srs_reminder() -> None:
    """Inserts and runs srs_reminder job once daily at 07:00 IST."""
    now_ist = datetime.now(IST)
    if now_ist.hour != 7:
        return

    async with async_session_maker() as db:
        start_of_day_utc = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        existing = (
            await db.execute(
                text("""
                    SELECT id FROM background_jobs
                    WHERE task_type = 'srs_reminder'
                      AND created_at >= :start_of_day
                    LIMIT 1
                """),
                {"start_of_day": start_of_day_utc},
            )
        ).scalar_one_or_none()

        if not existing:
            await db.execute(
                text("""
                    INSERT INTO background_jobs (id, task_type, payload, status)
                    VALUES (:id, 'srs_reminder', '{}'::jsonb, 'pending')
                """),
                {"id": str(uuid4())},
            )
            await db.commit()
            logger.info("Inserted daily srs_reminder job — running now")
            await _handle_srs_reminder()


async def account_scheduler_loop() -> None:
    """Runs every 60 seconds to check for scheduled maintenance jobs."""
    while True:
        try:
            await _schedule_hard_delete()
            await _schedule_srs_reminder()
        except Exception as exc:
            logger.error(f"Account scheduler error: {exc}", exc_info=True)
        await asyncio.sleep(60)


async def account_worker_loop() -> None:
    """Runs every 30 seconds to process pending data_export jobs."""
    while True:
        try:
            await run_account_worker()
        except Exception as exc:
            logger.error(f"Account worker loop error: {exc}", exc_info=True)
        await asyncio.sleep(30)
