from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID
from datetime import datetime, timedelta
import zoneinfo
from pydantic import BaseModel

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

@router.get("/available-questions", response_model=list[UUID])
async def get_available_questions(
    exam: str,
    subject_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    from app.models.question import QuestionDb
    from app.models.taxonomy import TopicDb
    
    stmt = (
        select(QuestionDb.id)
        .join(TopicDb, QuestionDb.topic_id == TopicDb.id)
        .where(
            and_(
                QuestionDb.exam == exam,
                TopicDb.subject_id == subject_id
            )
        )
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.post("/generate", response_model=MockTestResponse, status_code=status.HTTP_201_CREATED)
async def generate_mock_test(
    body: MockTestGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_premium = current_user.subscription_status in ("active", "past_due")

    if not is_premium:
        raise PremiumRequiredException(
            message="The Mock Test Generator is a premium feature. Upgrade to create custom timed practice tests.",
            details=[{"required_plan": "active", "upgrade_url": "/pricing"}]
        )

    # Generate questions
    if body.question_ids:
        question_ids = body.question_ids
    else:
        # Generate questions via factory fallback
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
        mode=body.mode,
        time_limit=body.time_limit,
        test_format=body.test_format
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
    
    if not is_premium:
        raise PremiumRequiredException(
            message="Mock Test history is a premium feature.",
            details=[{"required_plan": "active", "upgrade_url": "/pricing"}]
        )
        
    stmt = select(MockTestDb).where(MockTestDb.user_id == current_user.id).order_by(MockTestDb.created_at.desc())
        
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.get("/{id}", response_model=MockTestResponse)
async def get_mock_test(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_premium = current_user.subscription_status in ("active", "past_due")
    if not is_premium:
        raise PremiumRequiredException(
            message="Viewing Mock Tests is a premium feature.",
            details=[{"required_plan": "active", "upgrade_url": "/pricing"}]
        )

    mock_test = await db.get(MockTestDb, id)
    if not mock_test or mock_test.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Mock test not found")

    # Fetch question details without answers
    from app.models.question import QuestionDb
    from sqlalchemy import select
    stmt = select(QuestionDb).where(QuestionDb.id.in_(mock_test.question_ids))
    res = await db.execute(stmt)
    questions_db = res.scalars().all()
    
    # Sort them to match the original question_ids order
    is_submitted = mock_test.score is not None
    q_map = {q.id: q for q in questions_db}
    questions_list = []
    for q_id in mock_test.question_ids:
        q = q_map.get(q_id)
        if q:
            q_dict = {
                "id": str(q.id),
                "exam": q.exam,
                "year": q.year,
                "paper": q.paper,
                "question_number": q.question_number,
                "question_stem": q.question_stem,
                "options": q.options,
                "has_image": q.has_image,
                "image_url": q.image_url,
                "topic_id": str(q.topic_id),
            }
            if is_submitted:
                q_dict["correct_option"] = q.correct_option
                q_dict["explanation"] = q.explanation
            questions_list.append(q_dict)
    
    response = MockTestResponse.model_validate(mock_test)
    response.questions = questions_list
    return response

class MockTestSubmitRequest(BaseModel):
    answers: dict[str, str] # question_id -> Option (A/B/C/D)
    time_taken_seconds: int

@router.post("/{id}/submit", response_model=MockTestResponse)
async def submit_mock_test(
    id: UUID,
    body: MockTestSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    mock_test = await db.get(MockTestDb, id)
    if not mock_test or mock_test.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Mock test not found")
        
    if mock_test.score is not None:
        raise HTTPException(status_code=400, detail="Mock test already submitted")

    # Fetch correct answers
    from app.models.question import QuestionDb
    from sqlalchemy import select
    stmt = select(QuestionDb).where(QuestionDb.id.in_(mock_test.question_ids))
    res = await db.execute(stmt)
    questions_db = res.scalars().all()
    q_map = {str(q.id): q for q in questions_db}
    
    # Calculate score (+2 for correct, -0.66 for incorrect)
    # Defaulting to standard UPSC scoring for all mock tests right now
    score = 0.0
    for q_id, q_db in q_map.items():
        user_answer = body.answers.get(q_id)
        if user_answer:
            if user_answer == q_db.correct_option:
                score += 2.0
            else:
                score -= 0.66
                
    mock_test.score = score
    mock_test.user_answers = body.answers
    db.add(mock_test)
    await db.commit()
    await db.refresh(mock_test)
    
    # We do NOT include questions in the submit response to keep payload small
    return mock_test
