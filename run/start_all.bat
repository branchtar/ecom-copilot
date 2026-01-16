@echo off
setlocal

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

echo ROOT=%ROOT%
echo.

REM ---- Kill anything on port 3000 (React) ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do (
  echo [KILL] Port 3000 PID=%%a
  taskkill /F /PID %%a >nul 2>&1
)

REM ---- Kill anything on port 8001 (API) ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001" ^| findstr LISTENING') do (
  echo [KILL] Port 8001 PID=%%a
  taskkill /F /PID %%a >nul 2>&1
)

REM ---- API (FastAPI / uvicorn) ----
start "ECOM API (uvicorn)" cmd /k "cd /d ""%ROOT%\py"" && echo [API] Starting uvicorn on http://127.0.0.1:8001 ... && python -m uvicorn ecom_copilot_api:app --host 127.0.0.1 --port 8001 --reload"

REM ---- UI (React) ----
start "ECOM UI (React)" cmd /k "cd /d ""%ROOT%\ui-web"" && echo [UI] Starting React dev server on 3000... && set PORT=3000 && npm start"

echo.
echo Open these in your browser:
echo   UI:  http://localhost:3000
echo   API: http://127.0.0.1:8001/docs
echo.
pause
