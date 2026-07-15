import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        
        print("Found tables:", tables)
        for table in tables:
            print(f"Enabling RLS on {table}...")
            await conn.execute(text(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;'))
            
        print("RLS successfully enabled on all tables in public schema.")
        
if __name__ == "__main__":
    asyncio.run(main())
