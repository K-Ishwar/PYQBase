"""
Boundary condition tests:
1. IST midnight: attempt at 23:59 IST counted in day N; attempt at 00:01 IST counted in day N+1.
2. Dropped question: submitting answer for a DROPPED question → is_correct=False, no ELO job enqueued.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock, call
from uuid import uuid4

from app.services.quiz_service import _ist_today, FREE_DAILY_LIMIT


# ── IST Midnight boundary ──────────────────────────────────────────────────────

def test_ist_today_returns_correct_date_before_midnight():
    """
    At 23:59 IST (18:29 UTC), _ist_today() should return today's IST date,
    not tomorrow's.
    """
    # 2026-07-12 23:59:00 IST = 2026-07-12 18:29:00 UTC
    fake_utc_23_59_ist = datetime(2026, 7, 12, 18, 29, 0, tzinfo=timezone.utc)
    with patch("app.services.quiz_service.datetime") as mock_dt:
        mock_dt.now.return_value = fake_utc_23_59_ist.astimezone(
            timezone(timedelta(hours=5, minutes=30))
        )
        mock_dt.now.side_effect = lambda tz=None: (
            fake_utc_23_59_ist.astimezone(tz) if tz else fake_utc_23_59_ist
        )
        result = _ist_today()

    assert result.day == 12, f"Expected day 12, got {result.day}"
    assert result.month == 7


def test_ist_today_returns_next_day_after_midnight():
    """
    At 00:01 IST (18:31 UTC from the previous day), _ist_today() returns
    the NEXT day's IST date.
    """
    # 2026-07-13 00:01:00 IST = 2026-07-12 18:31:00 UTC
    fake_utc_after_midnight = datetime(2026, 7, 12, 18, 31, 0, tzinfo=timezone.utc)
    IST = timezone(timedelta(hours=5, minutes=30))

    with patch("app.services.quiz_service.datetime") as mock_dt:
        mock_dt.now.side_effect = lambda tz=None: (
            fake_utc_after_midnight.astimezone(tz) if tz else fake_utc_after_midnight
        )
        result = _ist_today()

    # 18:31 UTC = 00:01 IST next day (July 13)
    expected = fake_utc_after_midnight.astimezone(IST).date()
    assert result == expected, f"Expected {expected}, got {result}"
    assert result.day == 13


# ── Dropped question scoring ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_dropped_question_gives_no_marks_no_elo():
    """
    FR: A DROPPED question should:
    - be scored as is_correct=False (no marks)
    - NOT enqueue an ELO background job
    """
    from app.services.quiz_service import submit_attempt

    mock_db = AsyncMock()

    dropped_question = MagicMock()
    dropped_question.id = uuid4()
    dropped_question.correct_option = "DROPPED"
    dropped_question.elo_rating = 1200
    mock_db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: dropped_question))

    user_id = uuid4()
    existing_attempt = None

    # Mock repositories
    with (
        patch("app.services.quiz_service.progress_repo") as mock_repo,
    ):
        mock_repo.count_attempts_today = AsyncMock(return_value=0)
        mock_repo.check_duplicate_attempt = AsyncMock(return_value=False)
        mock_repo.get_attempt_for_question_today = AsyncMock(return_value=None)
        mock_repo.insert_attempt = AsyncMock()
        mock_repo.get_user_srs = AsyncMock(return_value=None)

        result = await submit_attempt(
            db=mock_db,
            user_id=user_id,
            subscription_status="free",
            question_id=dropped_question.id,
            selected_option="A",  # Any option — doesn't matter for DROPPED
            time_taken_seconds=30,
        )

    # Should NOT be scored as correct
    assert result["is_correct"] is False, "DROPPED question must not award marks"

    # Verify no ELO job was enqueued (db.add should not have been called with BackgroundJobDb)
    from app.models.user_progress import BackgroundJobDb
    elo_jobs_added = [
        c for c in mock_db.add.call_args_list
        if isinstance(c.args[0], BackgroundJobDb)
    ]
    assert len(elo_jobs_added) == 0, f"ELO job must NOT be enqueued for DROPPED questions, got: {elo_jobs_added}"
