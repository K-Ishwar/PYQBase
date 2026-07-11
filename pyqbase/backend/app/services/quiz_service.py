"""
Quiz service — handles attempt submission, quota enforcement, ELO computation,
and background job enqueuing.

Per FTDD: ELO batching uses the Postgres `background_jobs` table with
FOR UPDATE SKIP LOCKED.  No Redis.
"""
from __future__ import annotations

from datetime import datetime, date, timezone, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import QuotaExceededException, DomainValidationException
from app.models.user_progress import BackgroundJobDb
from app.models.question import QuestionDb
from app.repositories import progress_repo

# IST = UTC+5:30
_IST = timezone(timedelta(hours=5, minutes=30))

FREE_DAILY_LIMIT = 30
ELO_K_FACTOR = 24


def _ist_today() -> date:
    """Returns today's date in IST."""
    return datetime.now(_IST).date()


def _compute_elo(player_elo: int, opponent_elo: int, score: float, k: int = ELO_K_FACTOR) -> int:
    """
    Standard ELO formula.
    score = 1.0 (win / correct), 0.5 (draw / DROPPED), 0.0 (loss / wrong)
    """
    expected = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
    new_elo = player_elo + k * (score - expected)
    return max(100, round(new_elo))  # floor at 100


def _compute_sm2(is_correct: bool, interval: int, ease_factor: float, repetitions: int) -> tuple[int, float, int]:
    """
    SM-2 spaced repetition algorithm.
    Returns (new_interval, new_ease_factor, new_repetitions)
    """
    if is_correct:
        quality = 4
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)
        new_repetitions = repetitions + 1
    else:
        quality = 0
        new_repetitions = 0
        new_interval = 1
        
    new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease_factor = max(1.3, new_ease_factor)
    
    return new_interval, new_ease_factor, new_repetitions


async def _enqueue_elo_update(db: AsyncSession, question_id: UUID, new_elo: int) -> None:
    """Insert a pending background_jobs row for the ELO worker to pick up."""
    job = BackgroundJobDb(
        task_type="elo_update",
        payload={"question_id": str(question_id), "new_elo": new_elo},
        status="pending",
    )
    db.add(job)
    await db.commit()


async def submit_attempt(
    db: AsyncSession,
    user_id: UUID,
    subscription_status: str,
    question_id: UUID,
    selected_option: str,
    time_taken_seconds: int,
) -> dict:
    """
    Core attempt submission flow:
    1. Quota check (free users: 30/IST-day).
    2. Idempotency check (reject duplicate within same second).
    3. Fetch question.
    4. Determine correctness (DROPPED → neutral).
    5. Insert user_attempts row.
    6. Compute new ELO and enqueue background_job.
    7. Return result immediately — does NOT wait for worker.
    """
    ist_today = _ist_today()

    # ── 1. Quota check ─────────────────────────────────────────────────────
    if subscription_status == "free":
        count = await progress_repo.count_attempts_today(db, user_id, ist_today)
        if count >= FREE_DAILY_LIMIT:
            raise QuotaExceededException(
                message=f"Free users are limited to {FREE_DAILY_LIMIT} attempts per day (IST).",
                details=[{"attempts_used": count, "limit": FREE_DAILY_LIMIT}],
            )

    # ── 2. Idempotency — reject rapid double-submits ────────────────────────
    is_duplicate = await progress_repo.check_duplicate_attempt(
        db, user_id, question_id, ist_today
    )
    if is_duplicate:
        raise DomainValidationException(
            message="Duplicate attempt: this question was already submitted within the last second.",
            details=[{"question_id": str(question_id)}],
        )

    # ── 3. Fetch question ───────────────────────────────────────────────────
    result = await db.execute(select(QuestionDb).where(QuestionDb.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException(f"Question {question_id} not found.")

    # ── 4. Correctness (DROPPED = neutral) ─────────────────────────────────
    correct_option = question.correct_option
    if correct_option == "DROPPED":
        is_correct = True          # neutral: no marks either way
        elo_score = 0.5            # draw
    else:
        is_correct = selected_option.upper() == correct_option
        elo_score = 1.0 if is_correct else 0.0

    # ── 5. Insert attempt ───────────────────────────────────────────────────
    await progress_repo.insert_attempt(
        db=db,
        user_id=user_id,
        question_id=question_id,
        selected_option=selected_option.upper(),
        is_correct=is_correct,
        time_taken_seconds=time_taken_seconds,
        ist_today=ist_today,
    )

    # ── 5.5. SRS / SM-2 Computation ─────────────────────────────────────────
    # If the question was DROPPED, we do NOT schedule it for SRS.
    if correct_option != "DROPPED":
        # Fetch previous SRS state
        prev_srs = await progress_repo.get_user_srs(db, user_id, question_id)
        if prev_srs:
            prev_interval = prev_srs.interval
            prev_ease_factor = prev_srs.ease_factor
            prev_repetitions = prev_srs.repetitions
        else:
            prev_interval = 0
            prev_ease_factor = 2.5
            prev_repetitions = 0
            
        new_interval, new_ease_factor, new_repetitions = _compute_sm2(
            is_correct=is_correct,
            interval=prev_interval,
            ease_factor=prev_ease_factor,
            repetitions=prev_repetitions,
        )
        
        next_review_date = ist_today + timedelta(days=new_interval)
        
        await progress_repo.upsert_user_srs(
            db=db,
            user_id=user_id,
            question_id=question_id,
            next_review_date=next_review_date,
            interval=new_interval,
            ease_factor=new_ease_factor,
            repetitions=new_repetitions,
        )

    # ── 6. ELO computation + enqueue ────────────────────────────────────────
    # Treat user's current skill as 1200 baseline (full SRS/ELO per user is Phase 8)
    if correct_option != "DROPPED":
        user_elo = 1200
        new_question_elo = _compute_elo(
            player_elo=question.elo_rating,
            opponent_elo=user_elo,
            score=elo_score,
        )
        await _enqueue_elo_update(db, question_id, new_question_elo)
    else:
        new_question_elo = question.elo_rating

    # ── 7. Return immediately ───────────────────────────────────────────────
    return {
        "is_correct": is_correct,
        "correct_option": correct_option,
        "new_elo_rating": new_question_elo,
        "explanation": question.image_description or None,  # placeholder; real AI explanation Phase 8
    }
