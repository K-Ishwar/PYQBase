import asyncio
import os
from supabase import create_client, Client
from app.core.config import settings
import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    sb: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    # 1. Create a test admin user
    email = "test_agent_admin@example.com"
    password = "password123"
    
    print("Creating user via service key...")
    try:
        # Create user with auto confirm
        user_res = sb.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "app_metadata": {"role": "admin"}
        })
        user_id = user_res.user.id
        print(f"Created auth user: {user_id}")
    except Exception as e:
        print(f"Error creating user (might exist): {e}")
        # Get user
        res = sb.auth.admin.list_users()
        u = next((u for u in res if u.email == email), None)
        user_id = u.id if u else None
        
        if not user_id:
            print("Failed to find user")
            return

    # 2. Add to public.users
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("""
                INSERT INTO public.users (id, email, role, subscription_status)
                VALUES (:id, :email, 'admin', 'free')
                ON CONFLICT (id) DO UPDATE SET role = 'admin'
            """), {"id": user_id, "email": email})
            print("Added to public.users")
        except Exception as e:
            print("Error inserting into public.users:", e)
    
    await engine.dispose()

    # 3. Log in via standard auth
    sb_anon: Client = create_client(settings.SUPABASE_URL, os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", sb.supabase_key))
    try:
        res = sb_anon.auth.sign_in_with_password({"email": email, "password": password})
        token = res.session.access_token
        print("Got JWT token!")
    except Exception as e:
        print("Login failed:", e)
        return
        
    # 4. Make request to API
    print("Fetching /api/v1/admin/users/stats...")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/v1/admin/users/stats", headers=headers)
        print("Status:", r.status_code)
        print("Body:", r.text)

if __name__ == "__main__":
    asyncio.run(main())
