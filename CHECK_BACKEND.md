# Backend Connection Check

## Error: "Failed to fetch"

This means the frontend **cannot connect** to the backend server at all.

---

## Quick Checks

### 1️⃣ Is Backend Running?

Open a terminal and check if you see this:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**If NOT running:**
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload
```

---

### 2️⃣ Test Backend Manually

Open browser and visit:
```
http://localhost:8000/health
```

**Expected response:**
```json
{"status": "ok"}
```

**If you see this** → Backend is running ✅

**If browser can't connect** → Backend is not running ❌

---

### 3️⃣ Test Ingestion Health

Visit:
```
http://localhost:8000/api/v1/admin/ingestion/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "checks": {
    "upload_dir_exists": true,
    "upload_dir_writable": true,
    "groq_client_initialized": true,
    "groq_api_key_set": true,
    "database_url_set": true
  }
}
```

---

### 4️⃣ Check Frontend Configuration

File: `c:\Hackthons\PYQBase\pyqbase\frontend\.env.local`

Should contain:
```env
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

**If this file doesn't exist or URL is wrong** → Create/fix it ❌

---

### 5️⃣ Check CORS Settings

File: `c:\Hackthons\PYQBase\pyqbase\backend\.env`

Should contain:
```env
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

Make sure your frontend URL is in this list!

---

## Common Issues

### Issue 1: Backend Not Running
**Symptom:** `http://localhost:8000/health` doesn't load

**Fix:**
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload
```

---

### Issue 2: Wrong Port
**Symptom:** Backend is running but on different port

**Check terminal output:**
```
INFO:     Uvicorn running on http://127.0.0.1:XXXX
```

If not 8000, update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:XXXX"
```

Then restart frontend.

---

### Issue 3: CORS Blocked
**Symptom:** Backend running, but browser console shows CORS error

**Check browser console (F12):**
```
Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Fix:** Update `backend/.env`:
```env
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

Restart backend.

---

### Issue 4: Not Logged In as Admin
**Symptom:** Backend responds but returns 401

**Fix:** Make sure you're logged in with an admin account

Check user role in database or Supabase dashboard.

---

### Issue 5: File Upload Content-Type
**Symptom:** Request reaches backend but fails

**This is now handled automatically** - no action needed.

---

## Step-by-Step Diagnosis

### Step 1: Open browser console
Press `F12` → Console tab

### Step 2: Try to upload a file

Look for error messages in console.

### Step 3: Check Network Tab
Press `F12` → Network tab → Try upload again

Look for the request to `/api/v1/admin/ingestion/upload`

**Status:**
- **(failed)** - Network error, backend not reachable
- **200** - Success ✅
- **401** - Not authenticated
- **400** - Bad request (invalid data)
- **500** - Server error

Click on the failed request to see details.

---

## Manual Test with cURL

Test if backend is accepting uploads:

```bash
# First, get your auth token from browser
# F12 → Application → Local Storage → supabase.auth.token

curl -X POST http://localhost:8000/api/v1/admin/ingestion/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "exam=UPSC" \
  -F "year=2024" \
  -F "paper=Test" \
  -F "paper_file=@test.md"
```

If this works, the issue is in the frontend fetch.

---

## Current Status

Based on previous checks:
- ✅ Port 8000 is listening
- ✅ Database migrations ran (4 succeeded)
- ✅ GROQ API key configured
- ❓ Backend server running?
- ❓ CORS configured?
- ❓ Admin authentication?

---

## Next Steps

1. **Check if backend is running:**
   - Visit `http://localhost:8000/health`
   - Should see `{"status": "ok"}`

2. **Click "Show Debug Info" after upload error**
   - Will show troubleshooting steps
   - Check browser console for more details

3. **Look at backend terminal**
   - Any errors when you try to upload?
   - Do you see the request come in?

4. **Share the debug info**
   - Screenshot the debug panel
   - Share backend terminal output

The "Failed to fetch" error means the request isn't even reaching the backend. Let's fix the connection first! 🔧
