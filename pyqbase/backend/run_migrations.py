"""
Run database migrations
"""
import asyncio
import os
from pathlib import Path
import sys

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.database import async_session_maker
from app.core.config import settings


async def run_migration(migration_file: Path):
    """Run a single migration file"""
    print(f"\n📄 Running migration: {migration_file.name}")
    
    try:
        # Read the SQL file
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Execute the migration
        async with async_session_maker() as db:
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            
            for stmt in statements:
                if stmt:
                    try:
                        await db.execute(text(stmt))
                    except Exception as e:
                        # Check if error is "already exists"
                        error_str = str(e).lower()
                        if 'already exists' in error_str or 'duplicate' in error_str:
                            print(f"  ⚠️  Skipping (already exists): {stmt[:60]}...")
                        else:
                            raise
            
            await db.commit()
            print(f"  ✅ Migration completed successfully")
            return True
            
    except Exception as e:
        print(f"  ❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("=" * 60)
    print("🔧 PYQBase Database Migration Tool")
    print("=" * 60)
    
    print(f"\n📊 Database: {settings.DATABASE_URL[:50]}...")
    
    # Get migration files
    migrations_dir = Path(__file__).parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("\n❌ No migration files found!")
        return
    
    print(f"\n📁 Found {len(migration_files)} migration files")
    
    # Ask for confirmation
    print("\nMigrations to run:")
    for mf in migration_files:
        print(f"  - {mf.name}")
    
    response = input("\nProceed with migrations? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("❌ Aborted")
        return
    
    # Run migrations
    success_count = 0
    for migration_file in migration_files:
        success = await run_migration(migration_file)
        if success:
            success_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Total migrations: {len(migration_files)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(migration_files) - success_count}")
    
    if success_count == len(migration_files):
        print("\n✅ All migrations completed successfully!")
    else:
        print("\n⚠️  Some migrations failed. Check the logs above.")
    
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
