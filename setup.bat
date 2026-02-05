@echo off
echo ========================================
echo  Evaluator - First Time Setup
echo ========================================
echo.

REM Create virtual environment
echo [1/4] Creating Python virtual environment...
python -m venv .venv
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ and try again.
    pause
    exit /b 1
)

REM Install Python dependencies
echo [2/4] Installing Python dependencies...
call .venv\Scripts\activate.bat
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

REM Install Node dependencies
echo [3/4] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js 18+ and try again.
    cd ..
    pause
    exit /b 1
)
cd ..

REM Create .env if it doesn't exist
echo [4/4] Setting up environment file...
if not exist ".env" (
    copy .env.example .env
    echo Created .env file. Edit it to add your API keys.
) else (
    echo .env already exists, skipping.
)

echo.
echo ========================================
echo  Setup complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit .env and add your API keys
echo   2. Run start.bat to launch the app
echo.
pause
