# 🔥 DEBUG UPLOAD RIGHT NOW

## Step 1: Open Test Page

Open this file in your browser:
```
http://localhost:3000/upload-test.html
```

Or double-click:
```
c:\Hackthons\PYQBase\pyqbase\frontend\public\upload-test.html
```

## Step 2: Run Tests

The page has 4 tests:

### ✅ Test 1: Health Check
- Click "Test /health"
- Should show: `✅ SUCCESS`
- If FAILED → Backend not running

### ✅ Test 2: Ingestion Health
- Click "Test /api/v1/admin/ingestion/health"
- Should show: `✅ SUCCESS - All checks passed`
- If DEGRADED → Configuration issue

### ✅ Test 3: Upload Without Auth
- Select any `.md` or `.pdf` file
- Click "Test Upload"
- Should show: `✅ CONNECTION WORKS! Got expected 401`
- If this works → Problem is authentication in your app
- If "CANNOT CONNECT" → Network/CORS issue

### ✅ Test 4: Upload With Auth
- Open your app (http://localhost:3000)
- Press `F12` → Console tab
- Type: `localStorage.getItem('sb-mhratdnwizzdxktfkfqi-auth-token')`
- Copy the token (the long string)
- Paste it in the textarea on test page
- Select a file
- Click "Test Upload With Auth"
- Should show: `✅ UPLOAD SUCCESSFUL!`

---

## What Each Result Means

### Test 3: "✅ CONNECTION WORKS! Got expected 401"
**Meaning:** Backend is reachable, but auth is failing

**Fix:** The issue is in how your app sends authentication

**Check:**
1. Are you logged in to the app?
2. Is your user an admin?
3. Check browser console for Supabase errors

---

### Test 3: "❌ CANNOT CONNECT TO BACKEND"
**Meaning:** Frontend can't reach backend at all

**Fix:**
1. Check CORS in `backend/.env`:
   ```env
   CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   ```
2. Restart backend after changing CORS
3. Check if backend is on port 8000

---

### Test 4: "✅ UPLOAD SUCCESSFUL!"
**Meaning:** Auth works when you provide token manually

**Fix:** The issue is in the API client getting the token

**Solution:** Check Supabase configuration in your app

---

### Test 4: "❌ Authentication failed (401)"
**Meaning:** Token is invalid or expired, OR you're not an admin

**Fix:**
1. Check your user role in database
2. Login again to get fresh token
3. Make sure user has role='admin'

---

## Quick Fixes

### Fix 1: Check if you're logged in
1. Go to http://localhost:3000
2. Are you logged in?
3. If not → Log in first

### Fix 2: Check if you're an admin
Run this query in Supabase SQL editor or database:
```sql
SELECT id, email, role FROM users WHERE role = 'admin';
```

If your email is not there or role is 'user', update it:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Fix 3: Restart everything
```bash
# Terminal 1: Backend
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd c:\Hackthons\PYQBase\pyqbase\frontend
npm run dev
```

### Fix 4: Clear browser cache
1. Press `Ctrl+Shift+Delete`
2. Clear cache and cookies
3. Reload page
4. Login again

---

## Enhanced Logging

I've added console logging to the API client. 

**Check browser console (F12 → Console):**

You'll now see:
```
API Request: {
  method: "POST",
  url: "http://localhost:8000/api/v1/admin/ingestion/upload",
  hasAuth: true,
  headers: {...}
}

API Response: {
  status: 401,
  statusText: "Unauthorized"
}
```

This will show exactly what's being sent and received.

---

## Most Likely Issues

### 1. Not logged in (90%)
**Solution:** Log in to your app at http://localhost:3000/login

### 2. Not an admin user (5%)
**Solution:** Update your user role to 'admin' in database

### 3. Supabase auth error (3%)
**Solution:** Check console for Supabase errors

### 4. CORS issue (2%)
**Solution:** Add your frontend URL to CORS_ORIGINS in backend/.env

---

## What I Changed

### ✅ API Client (`frontend/src/lib/api-client.ts`)
- Added try-catch for Supabase errors
- Added console logging for all requests/responses
- Better error handling
- Won't crash if Supabase fails

### ✅ Test Page (`frontend/public/upload-test.html`)
- Tests connection without auth
- Tests connection with auth
- Tests health endpoints
- Shows exactly what's failing

---

## Next Step: Run The Test

1. Open: http://localhost:3000/upload-test.html
2. Run Test 3
3. Tell me the result

If Test 3 says "✅ CONNECTION WORKS", the issue is authentication.
If Test 3 says "❌ CANNOT CONNECT", the issue is network/CORS.

Run it now and share the result! 🚀
