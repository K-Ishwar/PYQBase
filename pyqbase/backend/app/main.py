from contextlib import asynccontextmanager
import asyncio
import logging
import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

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
from app.api.v1.analytics_router import router as analytics_router
from app.api.v1.taxonomy_router import router as taxonomy_router
from app.api.v1.mock_tests_router import router as mock_tests_router
from app.api.v1.account_router import router as account_router
from app.api.v1.payments_router import router as payments_router
from app.api.v1.ingestion_router import router as ingestion_router
from app.services.elo_worker import run_elo_worker
from app.services.heatmap_worker import heatmap_worker_loop, heatmap_scheduler_loop
from app.services.account_worker import account_worker_loop, account_scheduler_loop

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


# Initialise Sentry in production only
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if os.getenv("ENVIRONMENT") == "production" and _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.2,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start ELO background worker
    elo_task = asyncio.create_task(_elo_worker_loop())
    logger.info("ELO worker started.")
    
    # Start Heatmap scheduler and worker
    heatmap_sched_task = asyncio.create_task(heatmap_scheduler_loop())
    heatmap_work_task = asyncio.create_task(heatmap_worker_loop())
    logger.info("Heatmap scheduler and worker started.")

    # Start Account scheduler and worker (data_export, hard_delete, srs_reminder)
    account_sched_task = asyncio.create_task(account_scheduler_loop())
    account_work_task = asyncio.create_task(account_worker_loop())
    logger.info("Account scheduler and worker started.")

    yield

    elo_task.cancel()
    heatmap_sched_task.cancel()
    heatmap_work_task.cancel()
    account_sched_task.cancel()
    account_work_task.cancel()
    logger.info("Background workers stopped.")


# Initialize slowapi limiter. Default is IP based.
limiter = Limiter(key_func=get_remote_address)

import sentry_sdk

if settings.ENVIRONMENT == "production" and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
    )

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
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(taxonomy_router, prefix="/api/v1/taxonomy", tags=["Taxonomy"])
app.include_router(mock_tests_router, prefix="/api/v1", tags=["MockTests"])
app.include_router(account_router, prefix="/api/v1", tags=["Account"])
app.include_router(payments_router, prefix="/api/v1", tags=["Payments"])
app.include_router(ingestion_router, prefix="/api/v1/admin/ingestion", tags=["Ingestion"])


@app.get("/health")
@limiter.exempt
def health_check():
    return {"status": "ok"}


@app.get("/")
@limiter.exempt
def read_root():
    return {"message": "Hello PYQBASE"}

