@echo off
title Safe Drop Checker - Backend Server
echo =========================================================
echo  Starting Safe Drop Checker FastAPI Backend Server
echo =========================================================
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Installing/Verifying requirements...
pip install -r requirements.txt
echo Starting Uvicorn backend server on http://localhost:8000 ...
uvicorn app.main:app --reload --port 8000
pause
