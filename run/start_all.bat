@echo off
setlocal EnableExtensions

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

echo ROOT=%ROOT%
echo.

REM --- Kill ports we use (React + API) ---
call :KillPort 3000
call :KillPort 8001

echo.
echo [API] Starting uvicorn on http://127.0.0.1:8001 ...
start "ECOM API (uvicorn)" cmd /k "cd /d "%ROOT%\py" && python -m uvicorn ecom_copilot_api:app --host 127.0.0.1 --port 8001 --reload"

echo.
echo [UI] Starting React dev server on http://localhost:3000 ...
start "ECOM UI (React)" cmd /k "cd /d "%ROOT%\ui-web" && set PORT=3000 && set BROWSER=none && npm start"

echo.
echo Open these in your browser:
echo   UI:  http://localhost:3000
echo   API: http://127.0.0.1:8001/docs
echo.
echo NOTE: If UI still jumps ports, something else is holding 3000 OR you have a .env setting PORT.
echo.
pause
exit /b

:KillPort
set "P=%~1"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%P% .*LISTENING"') do (
  echo [KILL] Port %P% PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
exit /b