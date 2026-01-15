@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

REM ============================================================
REM Ecom Copilot - One click launcher
REM - API: 8001 (FastAPI)
REM - Stub: 5000 (Node) optional
REM - UI: 3000 (React)
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
set "APIDIR=%ROOT%\api"
set "STUBDIR=%ROOT%\api-stub"
set "UIDIR=%ROOT%\ui-web"
set "VENV_PY=%APIDIR%\.venv\Scripts\python.exe"

echo.
echo ==========================
echo   ECOM COPILOT LAUNCHER
echo ==========================
echo ROOT  = %ROOT%
echo.

if not exist "%ROOT%" (
  echo ERROR: ROOT not found
  echo %ROOT%
  echo.
  pause
  exit /b 1
)

call :kill_port 3000
call :kill_port 5000
call :kill_port 8001

echo.
echo Starting services in separate windows...
echo.

REM ---- API window (8001) ----
if exist "%VENV_PY%" (
  start "Ecom Copilot API (8001)" cmd /k "cd /d ""%APIDIR%"" && ""%VENV_PY%"" -m uvicorn server:app --host 127.0.0.1 --port 8001 --log-level info || (echo. & echo API FAILED (see error above) & pause)"
) else (
  start "Ecom Copilot API (8001)" cmd /k "echo VENV python not found: %VENV_PY% & echo Run the venv-fix script first. & pause"
)

REM ---- Stub window (5000) optional ----
if exist "%STUBDIR%\server.cjs" (
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k "cd /d ""%STUBDIR%"" && node server.cjs || (echo. & echo STUB FAILED (see error above) & pause)"
) else (
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k "echo (optional) Missing: %STUBDIR%\server.cjs & echo Stub not started. & pause"
)

REM ---- UI window (3000) ----
if exist "%UIDIR%\package.json" (
  start "Ecom Copilot UI (3000)" cmd /k "cd /d ""%UIDIR%"" && npm start || (echo. & echo UI FAILED (see error above) & pause)"
) else (
  start "Ecom Copilot UI (3000)" cmd /k "echo Missing: %UIDIR%\package.json & pause"
)

timeout /t 2 >nul
start "" "http://localhost:3000"

echo.
echo Launched.
echo - UI:  http://localhost:3000
echo - API: http://127.0.0.1:8001/docs
echo.
pause
exit /b 0

:kill_port
set "PORT=%~1"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr LISTENING') do (
  echo Killing port %PORT% (PID %%p)
  taskkill /PID %%p /F >nul 2>&1
)
exit /b 0