import asyncio
from app.core.database import async_session_maker
from sqlalchemy import text

async def main():
    db = async_session_maker()
    async with db as session:
        res = await session.execute(text("SELECT id FROM subjects LIMIT 1"))
        print(res.scalar())

asyncio.run(main())
