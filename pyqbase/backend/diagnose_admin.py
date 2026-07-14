"""
Comprehensive Admin Role Diagnostics
Checks database role, JWT token metadata, and provides solutions
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import json

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("=" * 70)
print("PYQBASE ADMIN ROLE DIAGNOSTIC TOOL")
print("=" * 70)
print()

# Step 1: Check environment variables
print("📋 STEP 1: Checking Environment Variables")
print("-" * 70)

if not SUPABASE_URL:
    print("❌ SUPABASE_URL not found in .env")
    sys.exit(1)
else:
    print(f"✅ SUPABASE_URL: {SUPABASE_URL}")

if not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_SERVICE_KEY not found in .env")
    print()
    print("⚠️  WARNING: This is REQUIRED to update user metadata!")
    print()
    sys.exit(1)
else:
    print(f"✅ SUPABASE_SERVICE_KEY found: {SUPABASE_SERVICE_KEY[:25]}...")
    
    # Check if it looks like a service key (should start with 'eyJ')
    if SUPABASE_SERVICE_KEY.startswith('sb_publishable') or SUPABASE_SERVICE_KEY.startswith('sb_anon'):
        print()
        print("❌ CRITICAL ERROR: This is NOT a SERVICE ROLE key!")
        print(f"   Your key starts with: {SUPABASE_SERVICE_KEY[:20]}...")
        print()
        print("   Service role keys start with 'eyJ' and are LONG JWT tokens.")
        print("   You're using a public/anon key which CANNOT update user metadata.")
        print()
        print("   🔧 How to get the SERVICE ROLE key:")
        print("   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api")
        print("   2. Scroll to 'Project API keys' section")
        print("   3. Find the key labeled 'service_role' (NOT 'anon' or 'publishable')")
        print("   4. Click to reveal and copy the FULL key")
        print("   5. Update backend/.env:")
        print('      SUPABASE_SERVICE_KEY="eyJhbGc...YOUR_LONG_SERVICE_KEY"')
        print()
        
        # Ask if user wants to continue anyway (will likely fail)
        choice = input("Continue anyway? (will likely fail): ").strip().lower()
        if choice != 'y':
            print()
            print("Exiting. Please update SUPABASE_SERVICE_KEY in .env first.")
            sys.exit(1)
        print()
        print("⚠️  Continuing with incorrect key - expect errors...")
    elif SUPABASE_SERVICE_KEY.startswith('eyJ'):
        print("✅ Key format looks correct (starts with 'eyJ')")

print()
print()

# Step 2: Get user email
print("📋 STEP 2: User Identification")
print("-" * 70)
email = input("Enter your login email: ").strip()

if not email:
    print("❌ Email is required!")
    sys.exit(1)

print()
print()

# Step 3: Create Supabase client
print("📋 STEP 3: Connecting to Supabase")
print("-" * 70)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✅ Connected to Supabase")
except Exception as e:
    print(f"❌ Failed to connect: {e}")
    sys.exit(1)

print()
print()

# Step 4: Check user in Supabase Auth
print("📋 STEP 4: Checking Supabase Auth User")
print("-" * 70)

try:
    # List users
    response = supabase.auth.admin.list_users()
    users = response
    
    # Find user
    user = None
    for u in users:
        if u.email == email:
            user = u
            break
    
    if not user:
        print(f"❌ User '{email}' not found in Supabase Auth!")
        print()
        print("Available users (first 10):")
        for u in users[:10]:
            print(f"   - {u.email}")
        sys.exit(1)
    
    print(f"✅ Found user in Supabase Auth")
    print(f"   Email: {user.email}")
    print(f"   ID: {user.id}")
    print(f"   Created: {user.created_at}")
    
except Exception as e:
    print(f"❌ Error accessing Supabase Auth: {e}")
    print()
    print("This likely means:")
    print("  - SUPABASE_SERVICE_KEY is incorrect")
    print("  - It's not a service role key (needs admin permissions)")
    print()
    sys.exit(1)

print()
print()

# Step 5: Check app_metadata (JWT claims)
print("📋 STEP 5: Checking JWT Token Metadata (app_metadata)")
print("-" * 70)

app_metadata = user.app_metadata or {}
print(f"Current app_metadata: {json.dumps(app_metadata, indent=2)}")
print()

role_in_jwt = app_metadata.get('role')
if role_in_jwt == 'admin':
    print("✅ User HAS 'admin' role in JWT token (app_metadata)")
    print()
    print("⚠️  Since JWT already has admin role but you're still getting redirected:")
    print()
    print("SOLUTION:")
    print("  1. Log out completely from http://localhost:3000")
    print("  2. Press F12 → Application → Storage → Clear site data")
    print("  3. Close ALL browser tabs for localhost:3000")
    print("  4. Open a new tab and go to http://localhost:3000/login")
    print("  5. Log in again")
    print("  6. Go to http://localhost:3000/admin/ingestion")
    print()
    print("The issue is likely a STALE JWT TOKEN in your browser.")
    print("Clearing storage forces a fresh login with the updated metadata.")
    print()
else:
    print(f"❌ User DOES NOT have 'admin' role in JWT token")
    print(f"   Current role in JWT: {role_in_jwt or '(none)'}")
    print()
    print("This is the problem! The admin layout checks:")
    print("   user.app_metadata?.role === 'admin'")
    print()
    print("SOLUTION: Update app_metadata to include role='admin'")
    print()
    
    choice = input("Update user metadata now? (y/n): ").strip().lower()
    if choice == 'y':
        try:
            print()
            print("Updating user metadata...")
            
            supabase.auth.admin.update_user_by_id(
                user.id,
                {
                    "app_metadata": {
                        **app_metadata,
                        "role": "admin"
                    }
                }
            )
            
            print()
            print("✅ SUCCESS! User metadata updated!")
            print()
            print("app_metadata now includes: { \"role\": \"admin\" }")
            print()
            print("NEXT STEPS:")
            print("  1. Log out from http://localhost:3000")
            print("  2. Clear browser storage (F12 → Application → Clear site data)")
            print("  3. Close all tabs for localhost:3000")
            print("  4. Log in again")
            print("  5. Go to /admin/ingestion")
            print()
            print("The new JWT token will now include role='admin'!")
            print()
            
        except Exception as e:
            print(f"❌ Error updating metadata: {e}")
            print()
            print("This likely means:")
            print("  - SUPABASE_SERVICE_KEY doesn't have admin permissions")
            print("  - You need the actual SERVICE ROLE key from Supabase dashboard")
            print()
    else:
        print()
        print("Skipped metadata update.")
        print()

print()
print()

# Step 6: Check database role (optional, for reference)
print("📋 STEP 6: Checking Database Role (for reference)")
print("-" * 70)

try:
    from sqlalchemy import create_engine, text
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT is_admin FROM users WHERE id = :user_id"),
                {"user_id": user.id}
            ).fetchone()
            
            if result:
                is_admin_db = result[0]
                if is_admin_db:
                    print("✅ User has is_admin=true in database")
                else:
                    print("⚠️  User has is_admin=false in database")
                    print("   (This doesn't affect admin access - JWT role is what matters)")
            else:
                print("ℹ️  User not found in database users table")
                print("   (This is OK - they will be synced on first login)")
    else:
        print("ℹ️  DATABASE_URL not set, skipping database check")
        
except Exception as e:
    print(f"ℹ️  Could not check database: {e}")
    print("   (This is OK - database role is less important than JWT role)")

print()
print()
print("=" * 70)
print("DIAGNOSTIC COMPLETE")
print("=" * 70)
print()
