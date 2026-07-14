# 🚀 FIX LOGIN LOOP - DO THIS NOW

## The Problem
You're stuck in a login redirect loop because your JWT token doesn't have `role: 'admin'`.

## What I Found
Your `SUPABASE_SERVICE_KEY` in `.env` is actually a **publishable key**, not a service role key:
```
SUPABASE_SERVICE_KEY="sb_publishable_UMS2EzfRZvlZrtZrMMO1OQ_udcOFeSn"
```

This key **CANNOT** update user metadata. You need the actual **service role key**.

---

## STEP 1: Get Your Service Role Key

### 1.1. Go to Supabase Dashboard
```
https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
```
Replace `YOUR_PROJECT` with your project ID: `mhratdnwizzdxktfkfqi`

Full URL: https://supabase.com/dashboard/project/mhratdnwizzdxktfkfqi/settings/api

### 1.2. Find the Service Role Key
- Scroll down to **"Project API keys"**
- You'll see three keys:
  - ❌ `anon` / `public` - This is what you have now (sb_publishable...)
  - ✅ **`service_role`** - This is what you NEED!
  - ❌ `JWT Secret` - Don't use this

### 1.3. Copy the Service Role Key
- Click "Reveal" next to `service_role`
- Copy the ENTIRE key (it's VERY long, starts with `eyJ`)
- Keep it secret! This has admin access to your Supabase project

### 1.4. Update Your .env File
Open: `c:\Hackthons\PYQBase\pyqbase\backend\.env`

Replace the line:
```
SUPABASE_SERVICE_KEY="sb_publishable_UMS2EzfRZvlZrtZrMMO1OQ_udcOFeSn"
```

With:
```
SUPABASE_SERVICE_KEY="eyJhbGciOi...YOUR_ACTUAL_SERVICE_KEY"
```
(Paste your actual service role key)

Save the file.

---

## STEP 2: Check Your JWT Token

Open in your browser:
```
http://localhost:3000/check-jwt.html
```

This will show you if your current JWT has the admin role or not.

**If it says "Admin Role Found"**: You just need to clear cache (skip to STEP 4)  
**If it says "Admin Role Missing"**: Continue to STEP 3

---

## STEP 3: Update Your User Metadata

### 3.1. Run the Diagnostic Script

```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
python diagnose_admin.py
```

### 3.2. Enter Your Email
When prompted:
```
Enter your login email: <your-email@example.com>
```

### 3.3. Update When Asked
It will ask: `Update user metadata now? (y/n)`

Type: `y`

### 3.4. Expected Output
```
✅ SUCCESS! User metadata updated!

app_metadata now includes: { "role": "admin" }
```

---

## STEP 4: Clear Browser Storage

### Option A: Use the Tool
1. Go to: http://localhost:3000/check-jwt.html
2. Click: **"Clear Storage & Logout"**
3. You'll be redirected to login

### Option B: Manual
1. Press **F12** in your browser
2. Go to **Application** tab (Chrome) or **Storage** (Firefox)
3. Click **"Clear site data"**
4. Close ALL tabs for localhost:3000

---

## STEP 5: Login Again

1. Open: http://localhost:3000/login
2. Enter your credentials
3. Log in

**The new JWT token will now include `role: 'admin'`!**

---

## STEP 6: Test Admin Access

Go to: http://localhost:3000/admin/ingestion

✅ Should see the admin panel (no redirect)  
✅ Should be able to upload files  
✅ Should NOT get "Authentication failed"

---

## Still Not Working?

### Check Backend is Running
```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Test: http://127.0.0.1:8000/health
Should show: `{"status":"ok"}`

### Verify JWT Token Again
http://localhost:3000/check-jwt.html

Should show: ✅ "Admin Role Found!"

### Nuclear Option
1. Close ALL browser windows
2. Clear browser cache entirely (Ctrl+Shift+Delete)
3. Reopen browser
4. Go to login page
5. Try again

---

## Quick Reference

| Task | Command/URL |
|------|-------------|
| Get service key | https://supabase.com/dashboard → Settings → API |
| Check JWT | http://localhost:3000/check-jwt.html |
| Fix metadata | `python diagnose_admin.py` |
| Test backend | http://127.0.0.1:8000/health |
| Admin page | http://localhost:3000/admin/ingestion |

---

## Why This is Happening

1. The admin layout checks: `user.app_metadata?.role === 'admin'`
2. This checks the **JWT token**, not the database
3. Your JWT token doesn't have this metadata by default
4. You need a **service role key** to update Supabase user metadata
5. The key in your .env is a **public key**, which can't do this
6. Once you use the correct service key to update metadata...
7. And clear your browser storage to force a new JWT token...
8. You'll get a fresh JWT with `role: 'admin'` included
9. The admin layout will allow access

---

## TL;DR

1. **Get service role key** from Supabase dashboard
2. **Update** `backend/.env` with the real service key
3. **Run** `python diagnose_admin.py` and enter your email
4. **Clear** browser storage (use check-jwt.html tool)
5. **Login** again
6. **Test** at /admin/ingestion

**The key issue**: You're using a public key where you need a service role key!
