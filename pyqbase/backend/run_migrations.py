import asyncio
from sqlalchemy import text
from app.core.database import async_session_maker

async def migrate():
    with open("migrations/001_initial_schema.sql", "r") as f:
        sql = f.read()

    async with async_session_maker() as session:
        # asyncpg does not support executing multiple statements via session.execute(text())
        # easily if there are transactional commands. 
        # But we can try to get the raw connection and execute.
        conn = await session.connection()
        raw_conn = await conn.get_raw_connection()
        await raw_conn.driver_connection.execute(sql)
        await session.commit()
        print("Migration successful")

if __name__ == "__main__":
    asyncio.run(migrate())
