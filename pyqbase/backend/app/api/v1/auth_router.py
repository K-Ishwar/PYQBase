from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import get_current_user, User
from app.models.user import UserDb

router = APIRouter()

@router.post("/sync-user")
async def sync_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Called right after Supabase signup to create the corresponding row in our `users` table.
    Sets trial_ends_at to 7 days from now.
    """
    # Check if user already exists
    result = await db.execute(select(UserDb).where(UserDb.id == current_user.id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        db_user = UserDb(
            id=current_user.id,
            email=current_user.email,
            role="user",
            subscription_status="free",
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
    return {"success": True, "message": "User synced", "user_id": db_user.id}

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the current user's profile + subscription_status.
    """
    result = await db.execute(select(UserDb).where(UserDb.id == current_user.id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        return {"success": False, "error": "User not found in database"}
        
    return {
        "id": db_user.id,
        "email": db_user.email,
        "role": db_user.role,
        "subscription_status": db_user.subscription_status,
        "trial_ends_at": db_user.trial_ends_at
    }
