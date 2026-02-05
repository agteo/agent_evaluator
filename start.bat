@echo off
echo Starting Evaluator...
echo.

REM Check virtual environment
if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

echo Starting backend on http://localhost:8000 ...
start "Evaluator Backend" cmd /k ".venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --reload"

timeout /t 2 /nobreak > nul

echo Starting frontend on http://localhost:5173 ...
start "Evaluator Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers starting in separate windows.
echo   Backend:  http://localhost:8000  (Swagger: http://localhost:8000/docs)
echo   Frontend: http://localhost:5173
echo.
pause
