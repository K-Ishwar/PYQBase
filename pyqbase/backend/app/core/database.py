from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
from app.core.config import settings

# Create async engine. Configured to route through PgBouncer (pool_size=20)
# Note: PgBouncer transaction mode requires specific SQLAlchemy settings (pool_pre_ping=True)
engine = create_async_engine(
    settings.async_database_url,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
    echo=False,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
)

# Create session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Dependency generator for FastAPI routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
