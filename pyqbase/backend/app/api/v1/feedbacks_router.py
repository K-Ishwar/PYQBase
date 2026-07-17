from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, get_admin_user, User
from app.models.feedback import FeedbackCreate, FeedbackResponse, FeedbackDb

router = APIRouter()

@router.post("", response_model=FeedbackResponse)
async def create_feedback(
    feedback_in: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a new feedback entry."""
    new_feedback = FeedbackDb(
        user_id=user.id,
        message=feedback_in.message,
    )
    db.add(new_feedback)
    await db.commit()
    await db.refresh(new_feedback)
    return new_feedback
