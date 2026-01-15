@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Ecom Copilot - One-click launcher (API + React UI + Stub)
REM   UI:        http://localhost:3000
REM   Python API: http://127.0.0.1:8001
REM   Stub API:   http://127.0.0.1:5000
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%\" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

REM ----------------------------
REM 1) Start Suppliers Stub API (5000) ONCE
REM ----------------------------
if exist "%ROOT%\api-stub\server.cjs" (
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
) else (
  echo NOTE: Stub not found at "%ROOT%\api-stub\server.cjs" (skipping)
)

REM ----------------------------
REM 2) Start Python API (8001)
REM    - Prefer a PS1 launcher if present
REM    - Fallback to running api\main.py or api\app.py
REM ----------------------------
set "API_PS1="

for %%F in ("%ROOT%\ps1\*api*8001*.ps1") do if exist "%%~fF" set "API_PS1=%%~fF"
if not defined API_PS1 (
  for %%F in ("%ROOT%\ps1\*start*api*.ps1") do if exist "%%~fF" set "API_PS1=%%~fF"
)
if not defined API_PS1 (
  for %%F in ("%ROOT%\ps1\*run*api*.ps1") do if exist "%%~fF" set "API_PS1=%%~fF"
)

if defined API_PS1 (
  start "Ecom Copilot API (8001)" powershell -NoExit -ExecutionPolicy Bypass ^
    -File "%API_PS1%" -Root "%ROOT%"
) else (
  REM Fallback guesses (adjust if your api file lives elsewhere)
  if exist "%ROOT%\api\main.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py main.py"
  ) else if exist "%ROOT%\api\app.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py app.py"
  ) else (
    echo NOTE: Could not auto-detect a Python API launcher. Skipping API start.
    echo       Look for a PS1 under "%ROOT%\ps1" that starts uvicorn on 8001,
    echo       or put your API entrypoint at "%ROOT%\api\main.py".
  )
)

REM ----------------------------
REM 3) Start React UI (3000)
REM    Prevent auto-opening multiple browser tabs by setting BROWSER=none
REM ----------------------------
if exist "%ROOT%\ui-web\package.json" (
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%ROOT%\ui-web"" && set BROWSER=none && npm start"
) else (
  echo ERROR: UI not found at "%ROOT%\ui-web\package.json"
  pause
  exit /b 1
)

REM ----------------------------
REM 4) Open exactly ONE browser tab (after a short delay)
REM ----------------------------
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000/suppliers"

echo.
echo Done launching Ecom Copilot.
echo (You can close this window.)
echo.
endlocal
exit /b 0
