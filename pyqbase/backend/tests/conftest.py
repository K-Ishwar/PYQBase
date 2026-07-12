"""
Pytest configuration and shared fixtures for PYQBase test suite.
Uses httpx.AsyncClient against the FastAPI app directly (no live server needed).
"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from uuid import uuid4
import jwt
from datetime import datetime, timedelta, timezone

# Import app after mocking any heavy startup dependencies
import os
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("ENVIRONMENT", "test")

from app.main import app
from app.core.config import settings

# ── JWT helpers ────────────────────────────────────────────────────────────────

def _make_token(user_id: str, role: str = "user", subscription_status: str = "free") -> str:
    """Creates a signed JWT matching our verification logic."""
    payload = {
        "sub": user_id,
        "email": f"{user_id[:8]}@test.com",
        "app_metadata": {"role": role, "subscription_status": subscription_status},
        "exp": (datetime.now(timezone.utc) + timedelta(hours=1)).timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


USER_A_ID = str(uuid4())
USER_B_ID = str(uuid4())
ADMIN_ID  = str(uuid4())

TOKEN_A         = _make_token(USER_A_ID, "user", "free")
TOKEN_B         = _make_token(USER_B_ID, "user", "free")
TOKEN_A_PREMIUM = _make_token(USER_A_ID, "user", "active")
TOKEN_ADMIN     = _make_token(ADMIN_ID, "admin", "active")


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client pointed at the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
