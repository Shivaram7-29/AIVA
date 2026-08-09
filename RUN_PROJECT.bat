@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo           Placement-Ai One-Click Launcher 🚀
echo ============================================================
echo.

:: 1. Check for Node.js
echo [1/5] Checking Node.js...
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install it from: https://nodejs.org/
    pause
    exit /b
)
echo [OK] Node.js is installed.

:: 2. Check for Python
echo [2/5] Checking Python...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed.
    echo Please install it from: https://www.python.org/
    pause
    exit /b
)
echo [OK] Python is installed.

:: 3. Frontend dependencies
echo [3/5] Installing Frontend dependencies (npm install)...
echo This may take a minute...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b
)

:: 4. Backend dependencies
echo [4/5] Setting up Backend...
cd backend

:: Create venv if it doesn't exist
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

:: Install requirements
echo Installing Python dependencies...
call .venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed.
    pause
    exit /b
)
cd ..

:: 5. Start servers
echo.
echo [5/5] Launching Servers...
echo.
echo [INFO] Starting Backend in a new window...
start "Placement-Ai Backend" cmd /k "cd backend && .venv\Scripts\activate && echo Backend running at http://localhost:8000 && python -m uvicorn main:app --port 8000"

echo [INFO] Starting Frontend...
echo [INFO] Once started, open: http://localhost:5173
echo.
npm run dev

pause
