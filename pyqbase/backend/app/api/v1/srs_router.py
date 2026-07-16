from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import UserDb

router = APIRouter()


@router.get("/queue")
async def get_srs_queue(
    db: AsyncSession = Depends(get_db),
    user: UserDb = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Returns the user's SRS queue (questions due today or earlier in IST).
    Only includes lightweight metadata, NO correct_option or explanation.
    """
    query = text("""
        SELECT 
            q.id AS question_id,
            q.exam,
            s.name AS subject_name,
            t.name AS topic_name,
            q.elo_rating,
            us.next_review_date
        FROM user_srs us
        JOIN questions q ON us.question_id = q.id
        JOIN topics t ON q.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE us.user_id = :user_id
          AND us.next_review_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE
          AND q.correct_option != 'DROPPED'
        ORDER BY us.next_review_date ASC
        LIMIT :limit
    """)
    
    result = await db.execute(query, {"user_id": str(user.id), "limit": limit})
    rows = result.mappings().all()

    def get_difficulty(elo: int) -> str:
        if elo < 1100: return "Easy"
        if elo > 1300: return "Hard"
        return "Medium"

    data = []
    for row in rows:
        data.append({
            "question_id": str(row["question_id"]),
            "exam": row["exam"],
            "subject_name": row["subject_name"],
            "topic_name": row["topic_name"],
            "difficulty_label": get_difficulty(row["elo_rating"]),
            "elo_rating": row["elo_rating"],
            "next_review_date": row["next_review_date"].isoformat(),
        })

    # Get total count (for the meta block)
    count_query = text("""
        SELECT COUNT(*)
        FROM user_srs us
        JOIN questions q ON us.question_id = q.id
        WHERE us.user_id = :user_id
          AND us.next_review_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE
          AND q.correct_option != 'DROPPED'
    """)
    count_result = await db.execute(count_query, {"user_id": str(user.id)})
    total_due = count_result.scalar() or 0

    return {
        "data": data,
        "meta": {
            "total_due": total_due
        }
    }
