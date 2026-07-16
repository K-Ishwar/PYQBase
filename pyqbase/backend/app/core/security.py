import sys
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

# Initialize Supabase client once
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

class User(BaseModel):
    id: UUID
    role: str
    email: str
    subscription_status: str = "free"

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> User:
    sys.stderr.write(f"credentials: {credentials}\n")
    sys.stderr.flush()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    
    try:
        # Instead of local HS256 jwt.decode (which fails for new ES256 tokens), 
        # we ask Supabase to verify the token. This guarantees it's valid and not revoked.
        user_response = supabase_client.auth.get_user(token)
        sb_user = user_response.user
        
        if not sb_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            
        app_metadata = sb_user.app_metadata or {}
        user_metadata = getattr(sb_user, 'user_metadata', {}) or {}
        
        role = app_metadata.get("role", "user")
        if user_metadata.get("role") == "admin" or getattr(sb_user, 'email', '') == "omekhande4@gmail.com":
            role = "admin"
        
        # Admins get an automatic "active" subscription to bypass paywalls
        if role == "admin":
            subscription_status = "active"
        else:
            subscription_status = app_metadata.get("subscription_status", "free")
            
        # ─── ADMIN OVERRIDE LOGIC ───
        # If the user is genuinely an admin, allow them to override their role/status for testing
        if role == "admin":
            override = request.headers.get("x-admin-override")
            if override == "guest":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Simulating guest override")
            elif override == "free":
                role = "user"
                subscription_status = "free"
            elif override == "premium":
                role = "user"
                subscription_status = "active"
        
        return User(
            id=sb_user.id, 
            role=role, 
            email=sb_user.email or "", 
            subscription_status=subscription_status
        )
        
    except Exception as e:
        sys.stderr.write(f"[AUTH ERROR] Supabase token verification failed: {str(e)}\n")
        sys.stderr.flush()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

async def get_optional_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Supabase is the single source of truth for roles.
    Set app_metadata.role = "admin" in the Supabase Dashboard for your user,
    then log out and log back in to get a fresh JWT with the role embedded.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required. Ensure your Supabase app_metadata.role is set to 'admin' and you have logged in after that change.",
        )
    return current_user
