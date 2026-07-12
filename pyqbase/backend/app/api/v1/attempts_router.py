from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user, User
from app.services.quiz_service import submit_attempt

router = APIRouter()


class AttemptRequest(BaseModel):
    question_id: UUID
    selected_option: str   # 'A' | 'B' | 'C' | 'D'
    time_taken_seconds: int


class AttemptResponse(BaseModel):
    is_correct: bool
    correct_option: str
    new_elo_rating: int
    explanation: Optional[str]


@router.post("", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def post_attempt(
    body: AttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_device_fingerprint: Optional[str] = Header(None, alias="X-Device-Fingerprint"),
):
    """
    Submit a quiz attempt.
    - Quota: free users limited to 30 attempts per IST day (raises 429 QUOTA_EXCEEDED).
    - Idempotency: rejects duplicate submit of same question within 1 second.
    - Returns is_correct + correct_option + new ELO (enqueues ELO update, does not wait).
    - Responds in well under 200ms.
    """
    result = await submit_attempt(
        db=db,
        user_id=current_user.id,
        subscription_status=current_user.subscription_status,   # 'free' | 'active' etc from JWT
        question_id=body.question_id,
        selected_option=body.selected_option,
        time_taken_seconds=body.time_taken_seconds,
    )
    return AttemptResponse(**result)
