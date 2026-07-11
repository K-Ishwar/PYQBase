import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from uuid import UUID
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

class User(BaseModel):
    id: UUID
    role: str
    email: str
    subscription_status: str = "free"  # free | active | past_due | canceled

def verify_jwt(token: str) -> dict:
    try:
        # Supabase uses HS256 with the JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = verify_jwt(credentials.credentials)
    
    # Supabase typically places user id in 'sub' and custom claims in 'app_metadata'
    user_id = payload.get("sub")
    app_metadata = payload.get("app_metadata", {})
    role = app_metadata.get("role", "user")  # Fallback to user
    email = payload.get("email", "")
    subscription_status = app_metadata.get("subscription_status", "free")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
    return User(id=user_id, role=role, email=email, subscription_status=subscription_status)

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin privileges required")
    return current_user
