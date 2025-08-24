@echo off
echo Starting Medh Backend Server...
echo.
echo Make sure you have:
echo 1. Node.js installed
echo 2. MongoDB running (if using local database)
echo 3. All dependencies installed (npm install)
echo.
echo Starting server on http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
npm run dev
