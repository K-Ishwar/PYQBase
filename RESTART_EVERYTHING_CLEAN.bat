@echo off
echo ================================================================
echo   CLEAN RESTART - This will fix the connection issue
echo ================================================================
echo.

echo Step 1: Stopping any running processes...
echo.
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
timeout /t 2 >nul

echo Step 2: Clearing frontend cache...
echo.
if exist "c:\Hackthons\PYQBase\pyqbase\frontend\.next" (
    rmdir /s /q "c:\Hackthons\PYQBase\pyqbase\frontend\.next"
    echo Frontend cache cleared!
) else (
    echo No cache to clear
)
echo.

echo Step 3: Starting BACKEND...
echo Opening new window for backend...
echo.
start "PYQBase Backend" cmd /k "cd /d c:\Hackthons\PYQBase\pyqbase\backend && .venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Waiting for backend to start...
timeout /t 5 >nul

echo Step 4: Starting FRONTEND...
echo Opening new window for frontend...
echo.
start "PYQBase Frontend" cmd /k "cd /d c:\Hackthons\PYQBase\pyqbase\frontend && npm run dev"

echo.
echo ================================================================
echo   SERVERS STARTING!
echo ================================================================
echo.
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Wait 10 seconds for both to start, then:
echo.
echo 1. Open http://127.0.0.1:8000/health
echo    Should see: {"status":"ok"}
echo.
echo 2. Open http://localhost:3000/admin/ingestion
echo    Press Ctrl+Shift+R to hard reload
echo    Try uploading!
echo.
echo ================================================================
echo.
pause
