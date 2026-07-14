"""
One-shot script: Fetches users from Supabase Auth, creates them in the local
`users` table if missing, and promotes a specific email to admin.

Usage:
    python setup_admin.py <your-email>
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone

import asyncpg
from supabase import create_client
from app.core.config import settings


def get_db_dsn() -> str:
    """Convert the SQLAlchemy URL to a plain asyncpg DSN."""
    url = settings.DATABASE_URL
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+psycopg2://", "postgresql://")
    return url


async def setup(email: str):
    print(f"Setting up admin for: {email}")

    # 1. Fetch users from Supabase Auth via service role key
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    response = sb.auth.admin.list_users()
    supabase_users = response if isinstance(response, list) else []
    print(f"Found {len(supabase_users)} users in Supabase Auth")

    dsn = get_db_dsn()
    conn = await asyncpg.connect(dsn)

    try:
        synced = 0
        target_id = None

        for su in supabase_users:
            user_id = str(su.id)
            user_email = su.email or ""

            # Check existence
            existing = await conn.fetchval(
                "SELECT id FROM users WHERE id = $1::uuid", user_id
            )

            if existing:
                print(f"  Already exists: {user_email}")
            else:
                # asyncpg requires naive datetime for TIMESTAMP WITHOUT TIME ZONE columns
                trial_ends = datetime.utcnow() + timedelta(days=7)
                # Use $N positional params — asyncpg native, no :: conflict
                await conn.execute(
                    """
                    INSERT INTO users (id, email, role, subscription_status, trial_ends_at, created_at)
                    VALUES (
                        $1::uuid,
                        $2,
                        'user'::user_role,
                        'free'::user_subscription_status,
                        $3,
                        NOW()
                    )
                    """,
                    user_id,
                    user_email,
                    trial_ends,
                )
                synced += 1
                print(f"  Created: {user_email}")

            if user_email.lower() == email.lower():
                target_id = user_id

        print(f"Synced {synced} new users to DB")

        if not target_id:
            print(f"\n❌ Email '{email}' not found in Supabase Auth!")
            return

        # 2. Promote to admin
        await conn.execute(
            "UPDATE users SET role = 'admin'::user_role WHERE id = $1::uuid",
            target_id,
        )

        # 3. Confirm
        row = await conn.fetchrow(
            "SELECT email, role FROM users WHERE id = $1::uuid", target_id
        )
        if row:
            print(f"\n✅ Done! '{row['email']}' now has role = '{row['role']}' in the database.")
            print("Ingestion upload will work immediately on the next request.")
        else:
            print("\n❌ Something went wrong — user not found after update.")

    finally:
        await conn.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python setup_admin.py <your-email>")
        sys.exit(1)
    asyncio.run(setup(sys.argv[1]))
