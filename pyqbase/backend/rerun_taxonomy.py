import asyncio
import os
import sys
from uuid import UUID

# Bypass PGbouncer connection limits by using DIRECT_URL if available
from dotenv import load_dotenv
load_dotenv()

if "DIRECT_URL" in os.environ:
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url and direct_url.startswith("postgres"):
        # Patch the environment variable so Settings picks it up on import
        os.environ["DATABASE_URL"] = direct_url

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.database import async_session_maker
from app.models.ingestion import IngestionBatchDb
from app.services.ai_content_service import enrich_batch

async def rerun_for_file(filename: str):
    print(f"Looking for batch with source_filename: {filename}")
    
    async with async_session_maker() as db:
        res = await db.execute(
            select(IngestionBatchDb).where(IngestionBatchDb.source_filename == filename)
        )
        batches = res.scalars().all()
        
        if not batches:
            print(f"Error: No ingestion batch found for filename '{filename}'")
            return
            
        if len(batches) > 1:
            print(f"Warning: Multiple batches found for '{filename}'. Processing the most recent one.")
            # sort by created_at descending
            batches.sort(key=lambda b: b.created_at, reverse=True)
            
        batch = batches[0]
        print(f"Found Batch ID: {batch.id}")
        
    print(f"Starting AI Taxonomy Re-classification for batch {batch.id}...")
    await enrich_batch(batch.id)
    print(f"Finished AI Taxonomy Re-classification for batch {batch.id}.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rerun_taxonomy.py <filename>")
        print("Example: python rerun_taxonomy.py Science.md")
        sys.exit(1)
        
    filename = sys.argv[1]
    
    try:
        asyncio.run(rerun_for_file(filename))
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
