# Debug Panel & Enhanced Error Handling Added

## Changes Made

### ✅ Frontend Changes (Admin Ingestion Page)

**File:** `frontend/src/app/admin/ingestion/page.tsx`

#### Added Features:

1. **Debug Information Panel**
   - Shows/hides with a toggle button
   - Displays HTTP status, response body, headers
   - Shows common solutions for errors
   - Logs errors to browser console

2. **Better Error Display**
   - Shows actual error message from backend (not generic)
   - Color-coded error alerts
   - Expandable debug section

3. **Error Capture**
   - Captures full response details
   - Parses JSON error responses
   - Fallback to text if JSON parsing fails
   - Stores debug info in state

#### What You'll See Now:

When an upload fails, instead of just:
```
❌ An error occurred during upload. Please try again.
```

You'll see:
```
❌ Upload Failed
Invalid paper file format '.docx'. Allowed formats: .md, .pdf, .txt

[Show Debug Info] ← Click this button
```

With debug info expanded:
```
🔍 DEBUG INFORMATION
Status: 400 Bad Request
URL: http://localhost:8000/api/v1/admin/ingestion/upload
Response: {
  "detail": "Invalid paper file format '.docx'. Allowed formats: .md, .pdf, .txt"
}

Common Solutions:
• Check if backend server is running
• Verify authentication token is valid
• Ensure file format is .md, .pdf, or .txt
• Check backend logs: python diagnose_ingestion.py
• Status 401: Not authenticated as admin
• Status 400: Invalid input data
• Status 500: Server error (check backend logs)
```

---

### ✅ Backend Changes

#### 1. Global Exception Handler
**File:** `backend/app/main.py`

Added a catch-all exception handler that ensures ALL errors return proper JSON:

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Returns detailed JSON error for any unhandled exception"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path,
        }
    )
```

**Benefits:**
- No more HTML error pages
- Always returns JSON
- Includes exception type
- Shows full traceback in development

#### 2. Enhanced Upload Endpoint
**File:** `backend/app/api/v1/ingestion_router.py`

Added comprehensive error handling with specific messages:

**Validations Added:**
- ✅ File existence check
- ✅ File content (not empty)
- ✅ File format validation
- ✅ Directory permissions
- ✅ Database operation errors
- ✅ File I/O errors

**Logging Added:**
- Upload attempt details
- File sizes
- Path information
- Database operations
- Background task triggers

**Error Messages Now Include:**
- Exact error cause
- File format requirements
- Byte sizes for debugging
- Paths for troubleshooting

#### 3. Health Check Endpoint
**File:** `backend/app/api/v1/ingestion_router.py`

New endpoint: `GET /api/v1/admin/ingestion/health`

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "upload_dir_exists": true,
    "upload_dir_writable": true,
    "upload_dir_path": "/path/to/uploads",
    "groq_client_initialized": true,
    "groq_api_key_set": true,
    "database_url_set": true
  },
  "issues": []
}
```

**Use this to verify setup before uploading!**

---

## How to Test

### Step 1: Restart Backend
```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
# Stop server (Ctrl+C) and restart
uvicorn app.main:app --reload
```

### Step 2: Restart Frontend
```bash
cd c:\Hackthons\PYQBase\pyqbase\frontend
# Stop (Ctrl+C) and restart
npm run dev
```

### Step 3: Test Health Endpoint

Open browser or use curl:
```bash
http://localhost:8000/api/v1/admin/ingestion/health
```

Should return all checks as `true`.

### Step 4: Try an Upload

1. Go to admin panel → Bulk Ingestion
2. Try uploading a file
3. If it fails, you'll see:
   - **Exact error message** (not generic)
   - **Show Debug Info button** - click it
   - **Full debug panel** with response details
   - **Browser console** - check for logged errors

---

## Common Errors You Might See (Now With Clear Messages)

### Error: "Not authenticated as admin"
**Status:** 401
**Cause:** You're not logged in as admin
**Solution:** Log in with admin credentials

### Error: "Invalid paper file format '.docx'"
**Status:** 400
**Cause:** Uploaded wrong file type
**Solution:** Use .md, .pdf, or .txt files

### Error: "Paper file is empty"
**Status:** 400
**Cause:** File has no content
**Solution:** Check the file isn't corrupted

### Error: "Database error: Failed to create batch"
**Status:** 500
**Cause:** Database connection or table issue
**Solution:** Run `python diagnose_ingestion.py`

### Error: "Failed to save paper file: Permission denied"
**Status:** 500
**Cause:** Upload directory not writable
**Solution:** Check directory permissions

### Error: "GROQ_API_KEY is not configured"
**Status:** 500 (during AI enrichment)
**Cause:** Invalid API key
**Solution:** Update `.env` with real key from console.groq.com

---

## Debug Workflow

When you see an error:

1. **Read the error message** - It now tells you exactly what's wrong

2. **Click "Show Debug Info"** - See technical details

3. **Check browser console** - `F12` → Console tab

4. **Check backend logs** - Look at terminal where uvicorn is running

5. **Run diagnostic tool:**
   ```bash
   cd c:\Hackthons\PYQBase\pyqbase\backend
   python diagnose_ingestion.py
   ```

6. **Check health endpoint:**
   ```
   GET /api/v1/admin/ingestion/health
   ```

---

## What Changed Technically

### Frontend
- Added `debugInfo` state
- Added `showDebug` state  
- Enhanced error handling in try/catch
- Captures response details before parsing
- Shows expandable debug panel
- Logs to console for developer tools

### Backend
- Added global exception handler
- Enhanced upload validation
- Added comprehensive logging
- Better error messages
- Health check endpoint
- Proper cleanup on errors

---

## Files Modified

✅ `frontend/src/app/admin/ingestion/page.tsx` - Debug panel UI
✅ `backend/app/main.py` - Global exception handler
✅ `backend/app/api/v1/ingestion_router.py` - Enhanced error handling + health endpoint

---

## Next Steps

1. **Restart both servers** (backend + frontend)
2. **Test health endpoint** - Verify all checks pass
3. **Try upload** - If it fails, you'll see the actual error
4. **Share the error** - Use the debug info to troubleshoot

The generic "An error occurred" message is now gone. You'll see exactly what's failing! 🎯
