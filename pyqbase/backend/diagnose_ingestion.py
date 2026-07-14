"""
Diagnostic script for ingestion issues
Run this to check configuration and recent batch status
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, desc
from app.core.database import async_session_maker
from app.models.ingestion import IngestionBatchDb, StagedQuestionDb
from app.core.config import settings


async def check_configuration():
    """Check if all required configuration is present"""
    print("=" * 60)
    print("CONFIGURATION CHECK")
    print("=" * 60)
    
    issues = []
    
    # Check database
    try:
        print(f"✓ Database URL configured: {settings.DATABASE_URL[:30]}...")
    except Exception as e:
        print(f"✗ Database URL issue: {e}")
        issues.append("Database configuration")
    
    # Check GROQ API Key
    if not settings.GROQ_API_KEY:
        print("✗ GROQ_API_KEY not set")
        issues.append("GROQ API Key missing")
    elif settings.GROQ_API_KEY.startswith("placeholder"):
        print(f"✗ GROQ_API_KEY is a placeholder: {settings.GROQ_API_KEY}")
        print("  Get a real API key from: https://console.groq.com/keys")
        issues.append("GROQ API Key is placeholder")
    else:
        print(f"✓ GROQ_API_KEY configured: {settings.GROQ_API_KEY[:10]}...")
    
    # Check upload directory
    upload_dir = Path(__file__).parent / "uploads"
    if upload_dir.exists():
        print(f"✓ Upload directory exists: {upload_dir}")
        files = list(upload_dir.glob("*"))
        print(f"  Contains {len(files)} files")
    else:
        print(f"✓ Upload directory will be created: {upload_dir}")
    
    return issues


async def check_recent_batches():
    """Check the status of recent ingestion batches"""
    print("\n" + "=" * 60)
    print("RECENT INGESTION BATCHES")
    print("=" * 60)
    
    try:
        async with async_session_maker() as db:
            # Get recent batches
            result = await db.execute(
                select(IngestionBatchDb)
                .order_by(desc(IngestionBatchDb.created_at))
                .limit(5)
            )
            batches = result.scalars().all()
            
            if not batches:
                print("No ingestion batches found in database")
                return
            
            for batch in batches:
                print(f"\nBatch ID: {batch.id}")
                print(f"  Exam: {batch.exam} ({batch.year}) - {batch.paper}")
                print(f"  Status: {batch.status}")
                print(f"  Source: {batch.source_filename}")
                print(f"  Total Questions: {batch.total_questions}")
                print(f"  Created: {batch.created_at}")
                
                # Get staged questions count
                stmt = select(StagedQuestionDb).where(StagedQuestionDb.batch_id == batch.id)
                q_result = await db.execute(stmt)
                questions = q_result.scalars().all()
                print(f"  Staged Questions: {len(questions)}")
                
                # Show error log if failed
                if batch.status == "failed" and batch.error_log:
                    print(f"  ERROR LOG:")
                    for line in batch.error_log.split('\n')[:10]:
                        print(f"    {line}")
                    if len(batch.error_log.split('\n')) > 10:
                        print("    ... (truncated)")
                
                # Show question review status breakdown
                if questions:
                    status_counts = {}
                    for q in questions:
                        status = q.review_status
                        status_counts[status] = status_counts.get(status, 0) + 1
                    print(f"  Review Status Breakdown:")
                    for status, count in status_counts.items():
                        print(f"    - {status}: {count}")
                        
    except Exception as e:
        print(f"Error checking batches: {e}")
        import traceback
        traceback.print_exc()


async def test_database_connection():
    """Test database connection"""
    print("\n" + "=" * 60)
    print("DATABASE CONNECTION TEST")
    print("=" * 60)
    
    try:
        async with async_session_maker() as db:
            result = await db.execute(select(IngestionBatchDb).limit(1))
            print("✓ Database connection successful")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


async def main():
    print("\n🔍 PYQBase Ingestion Diagnostic Tool\n")
    
    # Run checks
    config_issues = await check_configuration()
    
    db_ok = await test_database_connection()
    if db_ok:
        await check_recent_batches()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if config_issues:
        print("\n❌ Issues found:")
        for issue in config_issues:
            print(f"  - {issue}")
        print("\nPlease fix these issues before uploading content.")
    else:
        print("\n✅ Configuration looks good!")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
