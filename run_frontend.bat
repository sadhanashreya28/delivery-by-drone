@echo off
title Safe Drop Checker - Frontend Server
echo =========================================================
echo  Starting Safe Drop Checker React Vite Frontend
echo =========================================================
cd frontend
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)
echo Starting Vite dev server...
npm run dev
pause
