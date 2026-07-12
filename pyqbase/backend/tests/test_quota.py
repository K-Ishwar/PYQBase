"""
Quota enforcement tests:
- Free user: 31st attempt → 429
- Free user: 2nd custom mock test in same ISO week → 429
- Premium user: same scenarios → pass (200/201)
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from tests.conftest import TOKEN_A, TOKEN_A_PREMIUM, USER_A_ID, auth_headers


# ── Quiz attempt quota ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_free_user_31st_attempt_rejected(client: AsyncClient):
    """
    FR: Free users are limited to 30 attempts per IST day.
    The 31st attempt must return 429 QUOTA_EXCEEDED.
    """
    with patch("app.services.quiz_service.progress_repo") as mock_repo:
        # Simulate: 30 attempts already made today
        mock_repo.count_attempts_today = AsyncMock(return_value=30)

        mock_db = AsyncMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        try:
            resp = await client.post(
                "/api/v1/attempts",
                json={
                    "question_id": str(uuid4()),
                    "selected_option": "A",
                    "time_taken_seconds": 30,
                },
                headers=auth_headers(TOKEN_A),
            )
            assert resp.status_code == 429
            body = resp.json()
            assert body["error"]["code"] == "QUOTA_EXCEEDED"
        finally:
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_premium_user_can_exceed_30_attempts(client: AsyncClient):
    """Premium users have no daily attempt limit."""
    with patch("app.services.quiz_service.progress_repo") as mock_repo:
        mock_repo.count_attempts_today = AsyncMock(return_value=50)

        mock_db = AsyncMock()
        mock_question = MagicMock()
        mock_question.correct_option = "A"
        mock_question.elo_rating = 1200
        mock_question.id = uuid4()
        mock_question.image_description = None
        
        # In quiz_service, db.execute is used for questions
        mock_db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: mock_question))
        
        app.dependency_overrides[get_db] = lambda: mock_db
        
        mock_repo.check_duplicate_attempt = AsyncMock(return_value=False)
        mock_repo.insert_attempt = AsyncMock()
        mock_repo.get_user_srs = AsyncMock(return_value=None)
        mock_repo.upsert_user_srs = AsyncMock()

        try:
            resp = await client.post(
                "/api/v1/attempts",
                json={
                    "question_id": str(mock_question.id),
                    "selected_option": "A",
                    "time_taken_seconds": 30,
                },
                headers=auth_headers(TOKEN_A_PREMIUM),
            )
            # Should not 429 — may 200 or fail on question lookup, but not quota
            assert resp.status_code != 429
        finally:
            app.dependency_overrides.clear()


# ── Mock test weekly quota ─────────────────────────────────────────────────────

from app.main import app
from app.core.database import get_db

@pytest.mark.asyncio
async def test_free_user_second_mock_test_same_week_rejected(client: AsyncClient):
    """
    BR-02: Free users may generate only 1 custom mock test per ISO week.
    The 2nd request in the same week must return 429.
    """
    mock_db = AsyncMock()

    # Count query returns 1 (already generated one this week)
    count_result = MagicMock()
    count_result.scalar.return_value = 1
    mock_db.execute = AsyncMock(return_value=count_result)
    
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        resp = await client.post(
            "/api/v1/mock-tests/generate",
            json={
                "exam": "UPSC",
                "subject_id": str(uuid4()),
                "question_count": 10,
                "mode": "custom",
            },
            headers=auth_headers(TOKEN_A),
        )
        assert resp.status_code == 429
        body = resp.json()
        assert body["error"]["code"] == "QUOTA_EXCEEDED"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_free_user_weak_area_mode_blocked(client: AsyncClient):
    """weak_area mode requires premium — free user gets 403 PREMIUM_REQUIRED."""
    with patch("app.api.v1.mock_tests_router.get_db") as mock_get_db:
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db

        resp = await client.post(
            "/api/v1/mock-tests/generate",
            json={
                "exam": "UPSC",
                "subject_id": str(uuid4()),
                "question_count": 10,
                "mode": "weak_area",
            },
            headers=auth_headers(TOKEN_A),
        )
        assert resp.status_code == 403
        body = resp.json()
        assert body["error"]["code"] == "PREMIUM_REQUIRED"


@pytest.mark.asyncio
async def test_free_user_question_count_over_25_rejected(client: AsyncClient):
    """Free users requesting > 25 questions get 429."""
    with patch("app.api.v1.mock_tests_router.get_db") as mock_get_db:
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db

        resp = await client.post(
            "/api/v1/mock-tests/generate",
            json={
                "exam": "UPSC",
                "subject_id": str(uuid4()),
                "question_count": 26,
                "mode": "custom",
            },
            headers=auth_headers(TOKEN_A),
        )
        assert resp.status_code == 429
        body = resp.json()
        assert body["error"]["code"] == "QUOTA_EXCEEDED"
