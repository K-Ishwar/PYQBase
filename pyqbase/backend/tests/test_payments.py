import pytest
from httpx import AsyncClient
import json

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from unittest.mock import patch, AsyncMock, MagicMock

# ── Helpers ─────────────────────────────────────────────────────────────

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

# Fake token for testing
TOKEN_USER = create_access_token(data={"sub": "00000000-0000-0000-0000-000000000001", "role": "user", "subscription_status": "free"})

@pytest.mark.asyncio
async def test_create_subscription_returns_200_and_id(client: AsyncClient):
    with patch("app.api.v1.payments_router.razorpay_client") as mock_rzp:
        mock_rzp.subscription.create.return_value = {"id": "sub_fake_123"}
        
        # We also need to mock the db to avoid DB errors on update
        mock_db = AsyncMock()
        from app.core.database import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        
        try:
            resp = await client.post(
                "/api/v1/payments/create-subscription",
                json={"plan_id": "plan_monthly_299"},
                headers=auth_headers(TOKEN_USER)
            )
            assert resp.status_code == 200
            assert resp.json()["subscription_id"] == "sub_fake_123"
        finally:
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_400(client: AsyncClient):
    with patch("app.api.v1.payments_router.razorpay_client") as mock_rzp:
        import razorpay
        # Force a signature error
        mock_rzp.utility.verify_webhook_signature.side_effect = razorpay.errors.SignatureVerificationError("Invalid", "sig")
        
        settings.RAZORPAY_WEBHOOK_SECRET = "secret"
        
        resp = await client.post(
            "/api/v1/payments/webhook",
            json={"event": "subscription.charged"},
            headers={"X-Razorpay-Signature": "invalid_sig"}
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Invalid signature"
