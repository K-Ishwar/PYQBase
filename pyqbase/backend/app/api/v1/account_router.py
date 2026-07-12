"""
Account Router — handles data export (LC-04), soft delete (FR-01.4), reactivation, and profile.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.core.database import get_db
from app.core.security import get_current_user, User

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current user's profile and deletion status."""
    row = (
        await db.execute(
            text("SELECT email, role, subscription_status, deleted_at, created_at FROM users WHERE id = :id"),
            {"id": str(current_user.id)},
        )
    ).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    deleted_at = row["deleted_at"]
    reactivation_deadline = None
    if deleted_at:
        reactivation_deadline = (deleted_at + timedelta(days=30)).isoformat()

    return {
        "id": str(current_user.id),
        "email": row["email"],
        "role": row["role"],
        "subscription_status": row["subscription_status"],
        "deleted_at": deleted_at.isoformat() if deleted_at else None,
        "reactivation_deadline": reactivation_deadline,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.get("/export")
async def request_data_export(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    LC-04: Enqueues a data_export background job.
    The worker will gather user_attempts, user_srs, mock_tests → email as JSON attachment.
    Returns 202 Accepted with estimated delivery (72h per DPDP).
    """
    # Idempotency: check for a pending export job in the last 24h
    existing = (
        await db.execute(
            text("""
                SELECT id FROM background_jobs
                WHERE task_type = 'data_export'
                  AND payload->>'user_id' = :user_id
                  AND status IN ('pending', 'processing')
                  AND created_at >= NOW() - INTERVAL '24 hours'
                LIMIT 1
            """),
            {"user_id": str(current_user.id)},
        )
    ).scalar_one_or_none()

    if existing:
        return JSONResponse(
            status_code=202,
            content={
                "message": "A data export is already in progress. You will receive an email within 72 hours.",
                "status": "queued",
            },
        )

    await db.execute(
        text("""
            INSERT INTO background_jobs (id, task_type, payload, status)
            VALUES (:id, 'data_export', :payload::jsonb, 'pending')
        """),
        {
            "id": str(uuid4()),
            "payload": f'{{"user_id": "{current_user.id}", "email": "{current_user.email}"}}',
        },
    )
    await db.commit()

    return JSONResponse(
        status_code=202,
        content={
            "message": "Your data export has been queued. You will receive an email with a JSON attachment within 72 hours.",
            "status": "queued",
        },
    )


@router.delete("")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-01.4: Soft-deletes the account by setting deleted_at.
    The account can be reactivated within 30 days.
    Hard deletion is performed by the nightly background worker.
    """
    await db.execute(
        text("UPDATE users SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL"),
        {"id": str(current_user.id)},
    )
    await db.commit()

    reactivation_deadline = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    return {
        "message": "Your account has been scheduled for deletion.",
        "reactivation_deadline": reactivation_deadline,
        "detail": f"You may reactivate by logging in before {reactivation_deadline}. After that, all data is permanently erased.",
    }


@router.post("/reactivate")
async def reactivate_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    FR-01.4: Clears deleted_at if within the 30-day reactivation window.
    """
    row = (
        await db.execute(
            text("SELECT deleted_at FROM users WHERE id = :id"),
            {"id": str(current_user.id)},
        )
    ).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    deleted_at = row["deleted_at"]

    if not deleted_at:
        return {"message": "Account is already active."}

    # Make timezone-aware for comparison
    if deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > deleted_at + timedelta(days=30):
        raise HTTPException(
            status_code=410,
            detail="Reactivation window has expired. Your account data has been permanently deleted.",
        )

    await db.execute(
        text("UPDATE users SET deleted_at = NULL WHERE id = :id"),
        {"id": str(current_user.id)},
    )
    await db.commit()

    return {"message": "Your account has been successfully reactivated. Welcome back!"}
