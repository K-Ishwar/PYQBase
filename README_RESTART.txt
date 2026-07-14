╔══════════════════════════════════════════════════════════════╗
║                    RESTART INSTRUCTIONS                      ║
║           Fix Applied - Upload Should Work Now!              ║
╚══════════════════════════════════════════════════════════════╝

THE PROBLEM:
------------
Windows resolves "localhost" to IPv6 (::1) instead of IPv4 (127.0.0.1)
This caused CORS to block all requests.

THE FIX:
--------
Changed all URLs to use 127.0.0.1 explicitly
Opened CORS in development mode


╔══════════════════════════════════════════════════════════════╗
║                   RESTART STEPS (DO THIS NOW!)               ║
╚══════════════════════════════════════════════════════════════╝

OPTION A - Use Batch Files (Easiest):
--------------------------------------

1. Double-click: restart-backend.bat
   (Opens new window, wait for "Application startup complete")

2. Double-click: restart-frontend.bat
   (Opens new window, wait for "Ready in X.Xs")

3. Go to: http://localhost:3000/admin/ingestion
   Upload a file - Should work! ✅


OPTION B - Manual:
------------------

1. BACKEND:
   - Open Command Prompt or PowerShell
   - cd c:\Hackthons\PYQBase\pyqbase\backend
   - .venv\Scripts\activate
   - uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   - Wait for "Application startup complete"

2. FRONTEND:
   - Open NEW Command Prompt or PowerShell
   - cd c:\Hackthons\PYQBase\pyqbase\frontend
   - npm run dev
   - Wait for "Ready in X.Xs"

3. TEST:
   - Go to: http://localhost:3000/admin/ingestion
   - Upload a file!


╔══════════════════════════════════════════════════════════════╗
║                      VERIFY IT WORKS                         ║
╚══════════════════════════════════════════════════════════════╝

Test 1: Backend Health
----------------------
Open in browser: http://127.0.0.1:8000/health
Should see: {"status":"ok"}


Test 2: Ingestion Health
-------------------------
Open in browser: http://127.0.0.1:8000/api/v1/admin/ingestion/health
Should see: {"status":"healthy", ...}


Test 3: Upload Test Page
-------------------------
Open in browser: http://localhost:3000/upload-test.html
All tests should show ✅ SUCCESS


Test 4: Real Upload
-------------------
1. Go to: http://localhost:3000/admin/ingestion
2. Fill in:
   - Exam: UPSC
   - Year: 2024
   - Paper: Test Paper
3. Select a .md or .pdf file
4. Click Upload

Should redirect to review page! ✅

If error occurs, click "Show Debug Info" for details.


╔══════════════════════════════════════════════════════════════╗
║                   WHAT IF IT STILL FAILS?                    ║
╚══════════════════════════════════════════════════════════════╝

1. Check browser console (F12 → Console)
   Look for error messages

2. Check backend terminal
   Look for errors or incoming requests

3. Try upload test page first:
   http://localhost:3000/upload-test.html

4. Share the error from "Show Debug Info" button


╔══════════════════════════════════════════════════════════════╗
║                      FILES CHANGED                           ║
╚══════════════════════════════════════════════════════════════╝

✅ backend/.env - Added ENVIRONMENT="development"
✅ backend/app/main.py - CORS allows all in dev mode
✅ frontend/.env.local - Changed to 127.0.0.1:8000
✅ frontend/src/lib/api-client.ts - Changed to 127.0.0.1:8000
✅ frontend/public/upload-test.html - Changed to 127.0.0.1:8000

+ Created restart-backend.bat
+ Created restart-frontend.bat
+ Created test and debug files


╔══════════════════════════════════════════════════════════════╗
║                  READY TO TEST!                              ║
╚══════════════════════════════════════════════════════════════╝

Just restart both servers and try uploading!
The upload should work now! 🚀

Questions? Check:
- FIX_APPLIED_RESTART_NOW.md (detailed guide)
- DEBUG_UPLOAD_NOW.md (troubleshooting)
- FAILED_TO_FETCH_FIX.md (background info)
