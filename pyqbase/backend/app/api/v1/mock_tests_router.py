from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID
from datetime import datetime, timedelta
import zoneinfo

from app.core.database import get_db
from app.core.security import get_current_user, User
from app.core.exceptions import PremiumRequiredException, QuotaExceededException
from app.models.mock_test import (
    MockTestDb,
    MockTestGenerateRequest,
    MockTestResponse
)
from app.services.mock_test_factory import MockTestFactory

router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

def get_start_of_iso_week_ist() -> datetime:
    """Returns the start of the current ISO week (Monday 00:00:00) in IST, converted to UTC for DB querying."""
    now_ist = datetime.now(IST)
    start_of_week_ist = now_ist - timedelta(days=now_ist.weekday())
    start_of_week_ist = start_of_week_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    # Convert to UTC
    return start_of_week_ist.astimezone(zoneinfo.ZoneInfo("UTC")).replace(tzinfo=None)

@router.post("/generate", response_model=MockTestResponse, status_code=status.HTTP_201_CREATED)
async def generate_mock_test(
    body: MockTestGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_premium = current_user.subscription_status in ("active", "past_due")

    # Freemium Limits
    if not is_premium:
        if body.question_count > 25:
            raise QuotaExceededException(
                message="Free users are limited to 25 questions per mock test. Upgrade for up to 100.",
                details=[{"limit": 25, "requested": body.question_count}]
            )
        
        if body.mode == "weak_area":
            raise PremiumRequiredException(
                message="Weak-area mock tests are a premium feature. Upgrade to access personalised wrong-answer targeting.",
                details=[{"required_plan": "active", "upgrade_url": "/pricing"}]
            )
        
        if body.mode == "custom":
            start_of_week = get_start_of_iso_week_ist()
            stmt = select(func.count(MockTestDb.id)).where(
                and_(
                    MockTestDb.user_id == current_user.id,
                    MockTestDb.mode == "custom",
                    MockTestDb.created_at >= start_of_week
                )
            )
            res = await db.execute(stmt)
            count = res.scalar() or 0
            if count >= 1:
                raise QuotaExceededException(
                    message="Free users are limited to 1 custom mock test per ISO week (resets Monday 00:00 IST). Upgrade for unlimited.",
                    details=[{"week_count": count, "limit": 1, "resets": "Monday 00:00 IST", "upgrade_url": "/pricing"}]
                )

    # Generate questions
    factory = MockTestFactory(db, current_user.id)
    if body.mode == "custom":
        question_ids = await factory.generate_custom(body.exam, body.subject_id, body.question_count)
    elif body.mode == "weak_area":
        question_ids = await factory.generate_weak_area(body.exam, body.subject_id, body.question_count)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode.")

    if not question_ids:
        raise HTTPException(status_code=404, detail="No questions found for the given criteria.")

    # Insert mock test
    mock_test = MockTestDb(
        user_id=current_user.id,
        exam=body.exam,
        question_ids=question_ids,
        mode=body.mode
    )
    db.add(mock_test)
    await db.commit()
    await db.refresh(mock_test)

    return mock_test

@router.get("/history", response_model=list[MockTestResponse])
async def get_mock_test_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_premium = current_user.subscription_status in ("active", "past_due")
    
    stmt = select(MockTestDb).where(MockTestDb.user_id == current_user.id).order_by(MockTestDb.created_at.desc())
    if not is_premium:
        stmt = stmt.limit(3)
        
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.get("/{id}", response_model=MockTestResponse)
async def get_mock_test(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    mock_test = await db.get(MockTestDb, id)
    if not mock_test or mock_test.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Mock test not found")
    return mock_test
