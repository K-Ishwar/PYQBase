from fastapi import Request
from slowapi.util import get_remote_address
from app.core.security import verify_jwt

def get_fingerprint(request: Request) -> str:
    """Returns X-Device-Fingerprint for unauthenticated attempts, or IP as fallback."""
    fingerprint = request.headers.get("X-Device-Fingerprint")
    if fingerprint:
        return fingerprint
    return get_remote_address(request)

def get_jwt_subject(request: Request) -> str:
    """Returns the user ID (sub) from JWT, or IP as fallback if not present/invalid."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = verify_jwt(token)
            sub = payload.get("sub")
            if sub:
                return sub
        except Exception:
            pass
    return get_remote_address(request)

# Default key func for search endpoints would just use get_remote_address
