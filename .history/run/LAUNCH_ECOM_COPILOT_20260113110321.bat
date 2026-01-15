@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Ecom Copilot - One-click launcher (API + React UI + Stub)
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%\" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

REM Force CRA to NEVER auto-open a browser (extra safety)
set "BROWSER=none"

REM ----------------------------
REM 1) Start Suppliers Stub API (5000)
REM ----------------------------
if exist "%ROOT%\api-stub\server.cjs" (
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
) else (
  echo NOTE: Stub not found at "%ROOT%\api-stub\server.cjs" (skipping)
)

REM ----------------------------
REM 2) Start Python API (8001)
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
  if exist "%ROOT%\api\main.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py main.py"
  ) else if exist "%ROOT%\api\app.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py app.py"
  ) else (
    echo NOTE: Could not auto-detect a Python API launcher. Skipping API start.
  )
)

REM ----------------------------
REM 3) Start React UI (3000) - NO AUTO BROWSER
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
REM 4) Open exactly ONE browser tab
REM ----------------------------
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000/suppliers"

exit /b 0
