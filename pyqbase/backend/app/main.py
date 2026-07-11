from contextlib import asynccontextmanager
import asyncio
import logging

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
from app.api.v1.auth_router import router as auth_router
from app.api.v1.admin_router import router as admin_router
from app.api.v1.questions_router import router as questions_router
from app.api.v1.attempts_router import router as attempts_router
from app.api.v1.srs_router import router as srs_router
from app.services.elo_worker import run_elo_worker

logger = logging.getLogger(__name__)


async def _elo_worker_loop() -> None:
    """
    Repeats the ELO worker every 300 seconds (5 minutes).
    Runs as a background asyncio task from startup.
    No Redis — uses Postgres FOR UPDATE SKIP LOCKED.
    """
    while True:
        try:
            await run_elo_worker()
        except Exception as exc:
            logger.error(f"ELO worker loop error: {exc}", exc_info=True)
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start ELO background worker
    task = asyncio.create_task(_elo_worker_loop())
    logger.info("ELO worker started.")
    yield
    task.cancel()
    logger.info("ELO worker stopped.")


# Initialize slowapi limiter. Default is IP based.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="PYQBase API", lifespan=lifespan)

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

# Register API Routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(questions_router, prefix="/api/v1/questions", tags=["Questions"])
app.include_router(attempts_router, prefix="/api/v1/attempts", tags=["Attempts"])
app.include_router(srs_router, prefix="/api/v1/srs", tags=["SRS"])


@app.get("/health")
@limiter.exempt
def health_check():
    return {"status": "ok"}


@app.get("/")
@limiter.exempt
def read_root():
    return {"message": "Hello PYQBASE"}

