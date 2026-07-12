import hmac
import hashlib
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
import razorpay
import json

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, User
from app.models.user import UserDb

router = APIRouter(prefix="/payments", tags=["Payments"])

# Initialize Razorpay Client
razorpay_client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class SubscriptionCreateRequest(BaseModel):
    plan_id: str  # Razorpay plan_id


class SubscriptionCreateResponse(BaseModel):
    subscription_id: str


@router.post("/create-subscription", response_model=SubscriptionCreateResponse)
async def create_subscription(
    body: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")

    try:
        # Create Razorpay subscription
        subscription = razorpay_client.subscription.create({
            "plan_id": body.plan_id,
            "total_count": 12,  # e.g., 12 billing cycles (or 1 for annual)
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "user_id": str(current_user.id)
            }
        })
        
        # Save subscription_id to user record in pending state (optional)
        stmt = update(UserDb).where(UserDb.id == current_user.id).values(
            razorpay_subscription_id=subscription['id']
        )
        await db.execute(stmt)
        await db.commit()

        return SubscriptionCreateResponse(subscription_id=subscription['id'])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook endpoint to receive events from Razorpay.
    Verifies signature and updates user subscription_status to 'active'.
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    payload_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    # Verify signature
    try:
        razorpay_client.utility.verify_webhook_signature(
            payload_body.decode("utf-8"),
            signature,
            settings.RAZORPAY_WEBHOOK_SECRET
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = json.loads(payload_body)
    event = payload.get("event")
    
    if event in ("subscription.charged", "subscription.activated"):
        # The user has successfully paid.
        subscription_obj = payload["payload"]["subscription"]["entity"]
        user_id_str = subscription_obj.get("notes", {}).get("user_id")
        
        if user_id_str:
            stmt = update(UserDb).where(UserDb.id == user_id_str).values(
                subscription_status="active",
                razorpay_subscription_id=subscription_obj["id"]
            )
            await db.execute(stmt)
            await db.commit()
            
    elif event in ("subscription.halted", "subscription.cancelled"):
        subscription_obj = payload["payload"]["subscription"]["entity"]
        user_id_str = subscription_obj.get("notes", {}).get("user_id")
        
        if user_id_str:
            stmt = update(UserDb).where(UserDb.id == user_id_str).values(
                subscription_status="free"
            )
            await db.execute(stmt)
            await db.commit()
            
    return {"status": "ok"}
