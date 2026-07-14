"""
Script to make a user an admin
Run this to give admin access to your user
"""
import asyncio
from sqlalchemy import select, update, text
from app.core.database import async_session_maker
from app.models.user import UserDb

async def make_admin():
    print("=" * 60)
    print("MAKE USER ADMIN")
    print("=" * 60)
    print()
    
    email = input("Enter user email to make admin: ").strip()
    
    if not email:
        print("❌ Email is required!")
        return
    
    async with async_session_maker() as db:
        # Check if user exists
        result = await db.execute(
            select(UserDb).where(UserDb.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found!")
            print()
            print("Available users:")
            result = await db.execute(select(UserDb))
            users = result.scalars().all()
            for u in users:
                print(f"  - {u.email} (role: {u.role})")
            return
        
        print()
        print(f"Found user:")
        print(f"  Email: {user.email}")
        print(f"  Current Role: {user.role}")
        print(f"  ID: {user.id}")
        print()
        
        if user.role == "admin":
            print("✅ User is already an admin!")
            return
        
        # Update to admin
        await db.execute(
            update(UserDb)
            .where(UserDb.email == email)
            .values(role="admin")
        )
        await db.commit()
        
        print("✅ User is now an ADMIN!")
        print()
        print("You can now:")
        print("  1. Log out and log in again")
        print("  2. Go to /admin/ingestion")
        print("  3. Upload content!")
        print()

if __name__ == "__main__":
    asyncio.run(make_admin())
