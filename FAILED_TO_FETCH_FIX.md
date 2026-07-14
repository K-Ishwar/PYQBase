# ❌ "Failed to Fetch" Error - Quick Fix

## What This Error Means

**"Failed to fetch"** means the frontend **cannot connect** to the backend server at all. It's not an application error - the request never reaches the backend.

---

## Quick Fix (90% of cases)

### 1. Check Backend is Running

Open a terminal:
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 2. Test Backend Manually

Open browser: **http://localhost:8000/health**

Should show:
```json
{"status": "ok"}
```

✅ If you see this → Backend is running, proceed to step 3

❌ If browser can't connect → Backend not running, go back to step 1

### 3. Restart Frontend

```bash
cd c:\Hackthons\PYQBase\pyqbase\frontend
# Press Ctrl+C to stop
npm run dev
```

### 4. Try Upload Again

The error should be gone!

---

## Still Not Working? Run This Test

Open in browser:
```
file:///c:/Hackthons/PYQBase/pyqbase/frontend/test-backend.html
```

Or double-click this file:
```
c:\Hackthons\PYQBase\pyqbase\frontend\test-backend.html
```

This will test:
- ✅ Backend connectivity
- ✅ Ingestion service health
- ✅ CORS configuration

---

## Enhanced Debug Panel

I've updated the frontend to show detailed troubleshooting when "Failed to fetch" occurs.

Now when you try to upload, you'll see:

```
❌ Upload Failed
Cannot connect to backend server

[Show Debug Info] ← Click this
```

With debug info:
```
🔍 DEBUG INFORMATION
⚠️ Network Error

Possible Causes:
• Backend server is not running
• Backend is running on wrong port
• CORS is blocking the request
• Network connectivity issue

Expected URL:
http://localhost:8000/api/v1/admin/ingestion/upload

Troubleshooting Steps:
1. Is backend running? Check terminal for 'uvicorn app.main:app --reload'
2. Is it on port 8000? Check the terminal output
3. Test manually: Open http://localhost:8000/health in browser
4. Check CORS settings in backend/app/main.py
5. Check frontend .env.local: NEXT_PUBLIC_API_URL
```

---

## Common Issues

### Issue 1: Backend Not Running ⭐ MOST COMMON
**Symptom:** http://localhost:8000/health doesn't load

**Fix:**
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload
```

---

### Issue 2: Wrong Port
**Symptom:** Backend running but on different port (e.g., 8001)

**Check terminal output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001  ← Note the port!
```

**Fix:** Update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:8001"
```

Restart frontend.

---

### Issue 3: CORS Not Configured
**Symptom:** Browser console shows CORS error

**Fix:** Check `backend/.env`:
```env
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

Restart backend.

---

### Issue 4: Virtual Environment Not Activated
**Symptom:** Backend fails to start with import errors

**Fix:**
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

---

## Verification Checklist

Before trying to upload:

- [ ] Backend terminal shows "Uvicorn running on http://127.0.0.1:8000"
- [ ] Browser can open http://localhost:8000/health
- [ ] Browser shows `{"status": "ok"}`
- [ ] Frontend terminal shows "Ready - started server on..."
- [ ] `.env.local` has `NEXT_PUBLIC_API_URL="http://localhost:8000"`

All checked? Try upload again!

---

## Still Not Working?

### Check Browser Console
1. Press `F12`
2. Go to Console tab
3. Try upload
4. Look for red errors
5. Take screenshot and share

### Check Network Tab
1. Press `F12`
2. Go to Network tab
3. Try upload
4. Look for request to `/api/v1/admin/ingestion/upload`
5. Click on it → See details
6. Take screenshot and share

### Check Backend Logs
Look at terminal where `uvicorn` is running:
- Any errors?
- Does it show the incoming request?
- Take screenshot and share

---

## What Changed

### ✅ Enhanced Frontend Error Handling
- Detects "Failed to fetch" specifically
- Shows network error troubleshooting
- Displays expected URLs
- Provides step-by-step checks

### ✅ Test Page Created
- `frontend/test-backend.html`
- Tests backend connectivity
- Tests ingestion health
- Tests CORS configuration

### ✅ Better Debug Info
- Shows network errors separately
- Provides specific troubleshooting steps
- Logs to browser console

---

## Next Steps

1. **Make sure backend is running:**
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Test manually:**
   - Open http://localhost:8000/health
   - Should see `{"status": "ok"}`

3. **Try upload again:**
   - Click "Show Debug Info" if it fails
   - Follow troubleshooting steps

4. **Use test page:**
   - Open `test-backend.html` in browser
   - See detailed connectivity tests

The error message now guides you to the exact problem! 🎯
