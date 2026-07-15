import asyncio
import os
from supabase import create_client, Client
from app.core.config import settings
import httpx

async def main():
    sb: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    email = "test_agent_admin@example.com"
    password = "password123"
    
    sb_anon: Client = create_client(settings.SUPABASE_URL, os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", sb.supabase_key))
    try:
        res = sb_anon.auth.sign_in_with_password({"email": email, "password": password})
        token = res.session.access_token
    except Exception as e:
        print("Login failed:", e)
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/v1/admin/users", headers=headers)
        print("Status:", r.status_code)
        print("Body:", r.text)

if __name__ == "__main__":
    asyncio.run(main())
