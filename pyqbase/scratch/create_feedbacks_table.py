import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import get_db, engine
from sqlalchemy import text
from app.models.feedback import FeedbackDb

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'new',
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_feedbacks_user_id ON feedbacks (user_id);
            CREATE INDEX IF NOT EXISTS ix_feedbacks_created_at ON feedbacks (created_at DESC);
        """))
    print("Feedbacks table created successfully.")

if __name__ == "__main__":
    asyncio.run(main())
