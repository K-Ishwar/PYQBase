"""
Fix Supabase user metadata to include admin role
This updates the JWT token to include role='admin' in app_metadata
"""
import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env")
    exit(1)

# Need service role key to update user metadata
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def fix_admin():
    print("=" * 60)
    print("FIX SUPABASE ADMIN ROLE")
    print("=" * 60)
    print()
    
    email = input("Enter user email to make admin: ").strip()
    
    if not email:
        print("❌ Email is required!")
        return
    
    print()
    print(f"Looking for user: {email}")
    print()
    
    try:
        # List all users (requires service role key)
        response = supabase.auth.admin.list_users()
        users = response
        
        # Find user by email
        user = None
        for u in users:
            if u.email == email:
                user = u
                break
        
        if not user:
            print(f"❌ User '{email}' not found in Supabase!")
            print()
            print("Available users:")
            for u in users[:10]:  # Show first 10
                print(f"  - {u.email}")
            return
        
        print(f"✅ Found user:")
        print(f"   Email: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Current app_metadata: {user.app_metadata}")
        print()
        
        # Check current role
        current_role = user.app_metadata.get('role') if user.app_metadata else None
        if current_role == 'admin':
            print("✅ User already has admin role in app_metadata!")
            print()
            print("If still having issues:")
            print("  1. Log out completely")
            print("  2. Clear browser storage (F12 → Application → Clear)")
            print("  3. Log in again")
            return
        
        # Update user metadata to include admin role
        print("Updating user metadata to include role='admin'...")
        
        supabase.auth.admin.update_user_by_id(
            user.id,
            {
                "app_metadata": {
                    **user.app_metadata,
                    "role": "admin"
                }
            }
        )
        
        print()
        print("✅ SUCCESS! User metadata updated!")
        print()
        print("app_metadata now includes: { \"role\": \"admin\" }")
        print()
        print("IMPORTANT - Do this now:")
        print("  1. Log out from your app completely")
        print("  2. Clear browser storage:")
        print("     - Press F12")
        print("     - Go to Application tab")
        print("     - Click 'Clear site data' or 'Clear storage'")
        print("  3. Close all browser tabs for localhost:3000")
        print("  4. Log in again")
        print("  5. Go to /admin/ingestion")
        print()
        print("The new JWT token will now include role='admin'!")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Make sure:")
        print("  - SUPABASE_SERVICE_KEY is correct in .env")
        print("  - You have admin access to Supabase")

if __name__ == "__main__":
    asyncio.run(fix_admin())
