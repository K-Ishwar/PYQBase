import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, created_at, trial_ends_at FROM public.users"))
        users = res.fetchall()
        print("Dates in public.users:")
        for u in users:
            print(u)

if __name__ == "__main__":
    asyncio.run(main())
