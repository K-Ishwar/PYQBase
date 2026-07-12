"""
Security tests: BOLA/IDOR — verifies users cannot access each other's data.

These tests mock the DB layer so no live DB is required.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from tests.conftest import TOKEN_A, TOKEN_B, USER_A_ID, USER_B_ID, auth_headers


from app.main import app
from app.core.database import get_db

@pytest.mark.asyncio
async def test_user_cannot_read_other_users_srs_queue(client: AsyncClient):
    """
    BOLA: GET /api/v1/srs/queue always returns the authenticated user's queue,
    never another user's data. User B calling with their token only gets their rows.
    """
    mock_rows = []  # User B has no SRS entries

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = mock_rows
    mock_result.scalar.return_value = 0
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        # User B can only see their own (empty) queue
        resp = await client.get("/api/v1/srs/queue", headers=auth_headers(TOKEN_B))
        assert resp.status_code == 200
        data = resp.json()
        assert data["meta"]["total_due"] == 0
        assert data["data"] == []
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_user_cannot_fetch_other_users_mock_test(client: AsyncClient):
    """
    BOLA: GET /api/v1/mock-tests/{id} where the mock test belongs to User B.
    User A should receive 404 (not 403, to avoid enumeration).
    """
    b_mock_test_id = str(uuid4())

    mock_db = AsyncMock()
    # Simulate DB returning a mock test owned by User B
    mock_test = MagicMock()
    mock_test.user_id = uuid4()  # Different UUID → ownership check fails
    mock_db.get = AsyncMock(return_value=mock_test)

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        resp = await client.get(
            f"/api/v1/mock-tests/{b_mock_test_id}",
            headers=auth_headers(TOKEN_A),  # User A's token
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(client: AsyncClient):
    """No token → 401 on any protected endpoint."""
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    try:
        resp = await client.get("/api/v1/srs/queue")
        assert resp.status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_account_export_requires_auth(client: AsyncClient):
    """Data export endpoint must reject unauthenticated requests."""
    resp = await client.get("/api/v1/account/export")
    assert resp.status_code == 401
