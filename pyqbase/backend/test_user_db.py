import asyncio
from app.core.database import async_session_maker
from app.models.user import UserDb
from sqlalchemy import select, func

async def main():
    async with async_session_maker() as db:
        result = await db.execute(select(UserDb))
        users = result.scalars().all()
        print("Users from UserDb:", users)
        
        total = await db.scalar(select(func.count(UserDb.id)))
        print("Total count:", total)

if __name__ == "__main__":
    asyncio.run(main())
