from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import PyqBaseException, pyq_exception_handler
from app.core.rate_limit import get_fingerprint, get_jwt_subject
from app.core.security import get_current_user, User

# Initialize slowapi limiter. Default is IP based.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="PYQBase API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Rate Limiting Middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Register Custom Global Exception Handler
app.add_exception_handler(PyqBaseException, pyq_exception_handler)

@app.get("/health")
@limiter.exempt
def health_check():
    return {"status": "ok"}

@app.get("/")
@limiter.exempt
def read_root():
    return {"message": "Hello PYQBASE"}

# ===============================================
# Dummy endpoints to demonstrate rate limiting
# ===============================================

@app.get("/api/v1/search")
@limiter.limit("60/minute")
def search_questions(request: Request):
    return {"message": "Search results"}

@app.get("/api/v1/unauthenticated-attempts")
@limiter.limit("30/day", key_func=get_fingerprint)
def unauthenticated_attempt(request: Request):
    return {"message": "Attempt logged using fingerprint"}

@app.get("/api/v1/authenticated-attempts")
@limiter.limit("200/minute", key_func=get_jwt_subject)
def authenticated_attempt(request: Request, current_user: User = Depends(get_current_user)):
    return {"message": f"Attempt logged for user {current_user.id}"}
