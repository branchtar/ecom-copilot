@echo off
set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot
set API=%ROOT%\api
set UI=%ROOT%\ui-web
set PY=%API%\.venv\Scripts\python.exe

echo Killing ports 3000 and 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001" ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

start "Ecom Copilot API (8001)" cmd /k "cd /d "%API%" && "%PY%" -m uvicorn server:app --host 127.0.0.1 --port 8001 --log-level info"
start "Ecom Copilot UI (3000)" cmd /k "cd /d "%UI%" && npm start"

timeout /t 2 >nul
start http://localhost:3000/pricing