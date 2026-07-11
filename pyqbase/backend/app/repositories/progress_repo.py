from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import date


async def count_attempts_today(
    db: AsyncSession,
    user_id: UUID,
    ist_today: date,
) -> int:
    """
    Count how many attempts the user has made on the given IST date.
    IST offset (+05:30) is computed by the caller.
    """
    from app.models.user_progress import UserAttemptDb
    result = await db.execute(
        select(func.count(UserAttemptDb.id)).where(
            and_(
                UserAttemptDb.user_id == user_id,
                UserAttemptDb.attempt_date == ist_today,
            )
        )
    )
    return result.scalar_one() or 0


async def check_duplicate_attempt(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
    ist_today: date,
) -> bool:
    """
    Returns True if the user already submitted this question in the last second.
    Used for idempotency — rejects rapid double-submits.
    """
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT 1 FROM user_attempts
            WHERE user_id = :user_id
              AND question_id = :question_id
              AND attempt_date = :today
              AND (NOW() - created_at) < INTERVAL '5 seconds'
            LIMIT 1
        """),
        {"user_id": str(user_id), "question_id": str(question_id), "today": ist_today},
    )
    return result.first() is not None


async def insert_attempt(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
    selected_option: str,
    is_correct: bool,
    time_taken_seconds: int,
    ist_today: date,
) -> None:
    from app.models.user_progress import UserAttemptDb
    attempt = UserAttemptDb(
        user_id=user_id,
        question_id=question_id,
        selected_option=selected_option,
        is_correct=is_correct,
        time_taken_seconds=time_taken_seconds,
        attempt_date=ist_today,
    )
    db.add(attempt)
    await db.commit()

async def get_user_srs(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
):
    from app.models.user_progress import UserSrsDb
    result = await db.execute(
        select(UserSrsDb).where(
            and_(
                UserSrsDb.user_id == user_id,
                UserSrsDb.question_id == question_id,
            )
        )
    )
    return result.scalar_one_or_none()

async def upsert_user_srs(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
    next_review_date: date,
    interval: int,
    ease_factor: float,
    repetitions: int,
) -> None:
    from app.models.user_progress import UserSrsDb
    # Postgres doesn't have a simple async upsert via SQLModel objects out-of-the-box,
    # so we'll query and update, or insert.
    srs = await get_user_srs(db, user_id, question_id)
    if srs:
        srs.next_review_date = next_review_date
        srs.interval = interval
        srs.ease_factor = ease_factor
        srs.repetitions = repetitions
    else:
        srs = UserSrsDb(
            user_id=user_id,
            question_id=question_id,
            next_review_date=next_review_date,
            interval=interval,
            ease_factor=ease_factor,
            repetitions=repetitions,
        )
        db.add(srs)
    await db.commit()
