@echo off
echo ================================
echo Starting PYQBase Backend
echo ================================
echo.

cd /d "c:\Hackthons\PYQBase\pyqbase\backend"

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo Starting uvicorn server...
echo Backend will be available at http://127.0.0.1:8000
echo Press Ctrl+C to stop
echo.

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
