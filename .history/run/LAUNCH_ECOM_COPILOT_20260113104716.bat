
@echo off
setlocal EnableExtensions

REM =====================================================
REM Ecom Copilot - One-click launcher (API + React UI)
REM =====================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo   %ROOT%
  pause
  exit /b 1
)

cd /d "%ROOT%"

REM --- Choose Python (prefer .venv if it exists) ---
set "PY=python"
if exist "%ROOT%\.venv\Scripts\python.exe" set "PY=%ROOT%\.venv\Scripts\python.exe"
if exist "%ROOT%\venv\Scripts\python.exe"  set "PY=%ROOT%\venv\Scripts\python.exe"

REM --- Start API in its own window ---
if exist "%ROOT%\run\ecom_copilot_api.bat" (
  start "Ecom Copilot API (8001)" cmd /k ""%ROOT%\run\ecom_copilot_api.bat""
) else if exist "%ROOT%\py\ecom_copilot_api.py" (
  start "Ecom Copilot API (8001)" cmd /k ""%PY%" "%ROOT%\py\ecom_copilot_api.py""
) else (
  echo ERROR: Could not find API launcher or py\ecom_copilot_api.py
  pause
  exit /b 1
)

REM --- Start React UI in its own window ---
if exist "%ROOT%\run\ecom_copilot_ui_web.bat" (
  start "Ecom Copilot UI (3000)" cmd /k ""%ROOT%\run\ecom_copilot_ui_web.bat""
) else if exist "%ROOT%\ui-web\package.json" (
  start "Ecom Copilot UI (3000)" cmd /k "cd /d "%ROOT%\ui-web" && npm start"
) else (
  echo ERROR: Could not find UI launcher or ui-web\package.json
  pause
  exit /b 1
)

REM --- Give servers a moment, then open the UI ---
timeout /t 3 >nul
start "" "http://localhost:3000"

echo.
echo ✅ Launch started:
echo - API window:    http://127.0.0.1:8001
echo - UI in browser: http://localhost:3000
echo.
exit /b 0
