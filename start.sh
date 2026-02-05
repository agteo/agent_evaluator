#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Run setup.sh first."
    exit 1
fi

echo "Starting backend on http://localhost:8000 ..."
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
cd backend
uvicorn app.main:app --reload &
BACKEND_PID=$!
cd ..

sleep 2

echo "Starting frontend on http://localhost:5173 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Both servers running."
echo "  Backend:  http://localhost:8000  (Swagger: http://localhost:8000/docs)"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
