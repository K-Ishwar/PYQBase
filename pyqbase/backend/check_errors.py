import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.ingestion import IngestionBatchDb
from dotenv import load_dotenv

load_dotenv()
if "DIRECT_URL" in os.environ:
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url and direct_url.startswith("postgres"):
        os.environ["DATABASE_URL"] = direct_url

async def get_errors():
    async with async_session_maker() as db:
        res = await db.execute(select(IngestionBatchDb).order_by(IngestionBatchDb.created_at.desc()).limit(3))
        batches = res.scalars().all()
        for b in batches:
            print(f"Batch {b.id} | Status: {b.status} | File: {b.source_filename}")
            if b.error_log:
                print(f"Error Log: {b.error_log}")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(get_errors())
