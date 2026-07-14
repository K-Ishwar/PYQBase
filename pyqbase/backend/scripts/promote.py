import asyncio
import sys
import os

# Add the backend root directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import select
from app.core.database import async_session_maker
from app.models.user import UserDb

async def main():
    email = "omekhande4@gmail.com"
    async with async_session_maker() as db:
        # Find the user
        stmt = select(UserDb).where(UserDb.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ User with email {email} not found in the database.")
            return

        # Update role to admin
        if user.role == "admin":
            print(f"✅ {email} is already an admin!")
        else:
            user.role = "admin"
            await db.commit()
            print(f"🎉 Successfully promoted {email} to admin!")

if __name__ == "__main__":
    asyncio.run(main())
