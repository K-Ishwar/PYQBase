# 🔑 Where to Find Your Supabase Service Role Key

## The Problem
You have this in your `.env`:
```
SUPABASE_SERVICE_KEY="sb_publishable_UMS2EzfRZvlZrtZrMMO1OQ_udcOFeSn"
```

This is a **publishable/anon key** ❌ - NOT a service role key!

---

## Where to Get the Service Role Key

### Step 1: Go to Supabase Dashboard

**Your Project URL:**
```
https://supabase.com/dashboard/project/mhratdnwizzdxktfkfqi/settings/api
```

Or manually:
1. Go to https://supabase.com/dashboard
2. Select your project: `mhratdnwizzdxktfkfqi`
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** in the settings menu

---

### Step 2: Find the API Keys Section

You'll see a section called **"Project API keys"** with THREE keys:

```
┌─────────────────────────────────────────────────────────┐
│  Project API keys                                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  🔓 anon / public                                        │
│  This key is safe to use in a browser if you have        │
│  enabled Row Level Security                              │
│  [sb_publishable_xxxxx...]  [Reveal] [Copy]              │
│                                                           │
│  🔐 service_role  ← YOU NEED THIS ONE!                   │
│  This key has the ability to bypass Row Level Security   │
│  Never expose it publicly.                               │
│  [••••••••••••••••••]  [Reveal] [Copy]                   │
│                                                           │
│  🔑 JWT Secret                                           │
│  Used to decode your JWTs                                │
│  [••••••••••••••••••]  [Reveal] [Copy]                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Step 3: Reveal and Copy Service Role Key

1. Find the row that says **"service_role"** ⚠️ (NOT "anon" or "public")
2. Click the **"Reveal"** button
3. Click the **"Copy"** button to copy the ENTIRE key

**What it looks like:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocmF0ZG53aXp6ZHhrdGZrZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3...
```

**Key characteristics:**
- ✅ Starts with `eyJ`
- ✅ VERY long (200+ characters)
- ✅ Has dots (`.`) separating sections
- ✅ Is a JWT token format

---

### Step 4: Update Your .env File

Open: `c:\Hackthons\PYQBase\pyqbase\backend\.env`

**Find this line:**
```env
SUPABASE_SERVICE_KEY="sb_publishable_UMS2EzfRZvlZrtZrMMO1OQ_udcOFeSn"
```

**Replace with:**
```env
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...YOUR_ACTUAL_KEY"
```

(Paste the FULL key you copied from Supabase dashboard)

**Save the file!**

---

## Verify You Got the Right Key

### Quick Check:

Your key should:
- ✅ Start with `eyJ`
- ✅ Be VERY long (200+ characters)
- ✅ Have two dots (`.`) in it
- ✅ NOT start with `sb_publishable` or `sb_anon`

### Wrong Key Examples:

❌ `sb_publishable_xxxxx` - This is the PUBLIC key  
❌ `sb_anon_xxxxx` - This is the ANON key  
❌ `ec917b89-db83-4405-a94c-196f145f4107` - This is JWT SECRET

### Right Key Example:

✅ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocmF0ZG53aXp6ZHhrdGZrZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3...`

---

## After Updating the Key

Run the diagnostic script:

```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
python diagnose_admin.py
```

If you have the correct service role key, it will:
- ✅ Connect to Supabase successfully
- ✅ Find your user
- ✅ Update your `app_metadata` to include `role: 'admin'`

---

## Why Do You Need This Key?

### The Three Types of Keys:

1. **Public/Anon Key** (`sb_publishable_...`)
   - Safe to use in browser/frontend
   - Can only read/write data with RLS (Row Level Security)
   - ❌ CANNOT update user metadata

2. **Service Role Key** (`eyJ...`)
   - Full admin access to database
   - Can bypass RLS
   - ✅ CAN update user metadata
   - ⚠️ Must keep secret (server-side only)

3. **JWT Secret** (UUID format)
   - Used to verify JWT signatures
   - Not used for API calls

### Why You Need Service Role Key:

The admin layout checks: `user.app_metadata?.role === 'admin'`

To set `app_metadata` on a Supabase user, you need **admin permissions**, which only the **service role key** has.

---

## Security Warning

⚠️ **IMPORTANT**: The service role key has FULL access to your database!

**Keep it secret:**
- ✅ Only in `.env` files (never commit to git)
- ✅ Only on backend/server (never in frontend)
- ✅ Only use in trusted environments
- ❌ Never expose in client-side code
- ❌ Never commit to GitHub
- ❌ Never share publicly

Your `.gitignore` should already exclude `.env` files.

---

## Quick Reference

| Key Type | Format | Safe for Browser? | Can Update Metadata? |
|----------|--------|-------------------|---------------------|
| Anon/Public | `sb_publishable_xxx` | ✅ Yes | ❌ No |
| Service Role | `eyJ...` (JWT) | ❌ No | ✅ Yes |
| JWT Secret | `xxxx-xxxx-xxxx` (UUID) | ❌ No | N/A |

**You need:** Service Role Key (the long JWT)

---

## Next Steps

After updating the `.env` with the correct service role key:

1. ✅ Run `python diagnose_admin.py`
2. ✅ Enter your email
3. ✅ Update metadata (type 'y')
4. ✅ Go to http://localhost:3000/check-jwt.html
5. ✅ Clear storage & logout
6. ✅ Login again
7. ✅ Test at http://localhost:3000/admin/ingestion

---

## Still Can't Find It?

If you can't find the service role key in the dashboard:

1. Make sure you're logged into the correct Supabase account
2. Make sure you have admin access to the project
3. Try going directly to: https://supabase.com/dashboard/project/mhratdnwizzdxktfkfqi/settings/api
4. If still not visible, you may not have admin permissions to the project

Contact your Supabase project admin if you don't have access.
