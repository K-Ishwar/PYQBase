# Fix Admin Login Redirect Loop

## Problem
- Logging in successfully but immediately redirected back to `/login`
- Cannot access `/admin/ingestion` page
- Getting "Authentication failed" on upload

## Root Cause
The admin layout checks if `user.app_metadata?.role === 'admin'` in your **JWT token**, NOT the database. Your Supabase JWT token doesn't include `role: 'admin'` in its metadata, so the frontend thinks you're not an admin.

## Solution Overview
1. **Check** your current JWT token to see if it has admin role
2. **Update** Supabase user metadata to include admin role (if missing)
3. **Clear** browser storage to force a new JWT token
4. **Login** again to get the updated token

---

## Step 1: Check Your Current JWT Token

Open this page in your browser while logged in:
```
http://localhost:3000/check-jwt.html
```

This tool will:
- ✅ Show you if `role: 'admin'` is in your JWT token
- ✅ Display your current `app_metadata`
- ✅ Tell you exactly what to do next

**If it shows "Admin Role Found"**: Skip to **Step 3** (just clear storage)  
**If it shows "Admin Role Missing"**: Continue to **Step 2**

---

## Step 2: Update Supabase User Metadata (If Missing Admin Role)

### Run the diagnostic script:

```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
python diagnose_admin.py
```

### What it does:
1. ✅ Checks if `SUPABASE_SERVICE_KEY` is valid
2. ✅ Finds your user in Supabase
3. ✅ Shows your current `app_metadata`
4. ✅ Updates metadata to include `role: 'admin'`

### Enter your email when prompted:
```
Enter your login email: your-email@example.com
```

### Expected output:
```
✅ SUCCESS! User metadata updated!

app_metadata now includes: { "role": "admin" }

NEXT STEPS:
  1. Log out from http://localhost:3000
  2. Clear browser storage (F12 → Application → Clear site data)
  3. Close all tabs for localhost:3000
  4. Log in again
  5. Go to /admin/ingestion
```

### ⚠️ Important Note About Service Key

If the script shows:
```
⚠️  WARNING: This looks like a PUBLISHABLE key, not a SERVICE ROLE key!
```

You need to get your **actual service role key**:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Find the **"service_role"** key (NOT "anon" or "publishable")
3. Copy it (it's a long JWT token starting with `eyJ`)
4. Update in `backend/.env`:
   ```
   SUPABASE_SERVICE_KEY="eyJhbGc...your-actual-service-key"
   ```
5. Run `diagnose_admin.py` again

---

## Step 3: Clear Browser Storage & Re-Login

### Option A: Use the JWT Checker Tool
1. Go to: http://localhost:3000/check-jwt.html
2. Click **"Clear Storage & Logout"** button
3. It will redirect you to login page
4. Log in again

### Option B: Manual Clear
1. Go to http://localhost:3000
2. Press **F12** (open DevTools)
3. Go to **Application** tab (or **Storage** in Firefox)
4. Click **"Clear site data"** or **"Clear storage"**
5. Close ALL browser tabs for localhost:3000
6. Open a new tab: http://localhost:3000/login
7. Log in again

---

## Step 4: Verify & Test

### 1. Check JWT Token Again
Go to: http://localhost:3000/check-jwt.html
- Should now show: ✅ **"Admin Role Found!"**
- `app_metadata` should contain: `{ "role": "admin" }`

### 2. Access Admin Panel
Go to: http://localhost:3000/admin/ingestion
- Should NOT redirect to login
- Should see the "Bulk Content Ingestion" page

### 3. Test Upload
1. Select a file
2. Click "Upload & Parse Paper"
3. Should NOT show "Authentication failed"
4. Should see upload progress or success

---

## Troubleshooting

### Still getting redirected after clearing storage?

**Try this nuclear option:**
1. Completely close your browser (all windows)
2. Reopen browser
3. Go to http://localhost:3000/login
4. Log in
5. Try /admin/ingestion

### Getting "Cannot connect to backend server"?

1. Check backend is running:
   ```cmd
   cd c:\Hackthons\PYQBase\pyqbase\backend
   .venv\Scripts\activate
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Test backend health:
   - Open: http://127.0.0.1:8000/health
   - Should show: `{"status":"ok"}`

### Script fails with permission error?

Your `SUPABASE_SERVICE_KEY` doesn't have admin permissions. You need the **service role key** from Supabase dashboard (see Step 2 warning above).

### Can't find service role key?

1. Log into Supabase dashboard
2. Select your project
3. Go to Settings → API
4. Scroll to "Project API keys"
5. Copy the **"service_role"** key (keep it secret!)

---

## Quick Reference Commands

### Check JWT in browser:
```
http://localhost:3000/check-jwt.html
```

### Run diagnostic script:
```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
python diagnose_admin.py
```

### Restart backend:
```cmd
cd c:\Hackthons\PYQBase\pyqbase\backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Test backend:
```
http://127.0.0.1:8000/health
```

---

## Why This Happens

The admin layout (`frontend/src/app/admin/layout.tsx`) checks:
```typescript
const isAdmin = user.app_metadata?.role === 'admin'
if (!isAdmin) redirect('/login')
```

This checks the **JWT token metadata**, not the database `is_admin` field.

When you create a Supabase user, the JWT token's `app_metadata` is empty by default. You need to explicitly set `role: 'admin'` using the Supabase Admin API (which requires the service role key).

Once updated, new JWT tokens issued on login will include this role, allowing access to admin routes.

---

## Files Created/Modified

- ✅ `backend/diagnose_admin.py` - Comprehensive diagnostic tool
- ✅ `frontend/public/check-jwt.html` - Browser-based JWT checker
- ✅ `FIX_ADMIN_LOGIN_LOOP.md` - This guide

---

## Summary

1. **Check**: http://localhost:3000/check-jwt.html
2. **Fix**: `python diagnose_admin.py` (if admin role missing)
3. **Clear**: Browser storage (F12 → Application → Clear)
4. **Login**: Fresh login to get new JWT with admin role
5. **Test**: http://localhost:3000/admin/ingestion

The key is getting a **new JWT token** after updating the metadata. Clearing browser storage forces this.
