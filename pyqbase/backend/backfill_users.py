import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        res = await conn.execute(text("""
            SELECT id, email, created_at FROM auth.users 
            WHERE id NOT IN (SELECT id FROM public.users)
        """))
        missing = res.fetchall()
        print("Missing users:", missing)
        
        for u in missing:
            print("Inserting missing user:", u)
            created_at = u[2].replace(tzinfo=None) if u[2] else None
            await conn.execute(text("""
                INSERT INTO public.users (id, email, created_at, role, subscription_status)
                VALUES (:id, :email, :created_at, 'user', 'free')
            """), {"id": u[0], "email": u[1], "created_at": created_at})
            
        print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(main())
