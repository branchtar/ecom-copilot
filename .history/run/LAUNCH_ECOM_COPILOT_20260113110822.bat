@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM Ecom Copilot - One-click launcher
REM   - Starts (if not already running):
REM       1) Suppliers Stub API (Node)   : http://127.0.0.1:5000/health
REM       2) Main API (Uvicorn/FastAPI)  : http://127.0.0.1:8001/dashboard/kpis
REM       3) React UI                    : http://localhost:3000
REM   - Opens ONE browser tab to: http://localhost:3000/suppliers
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
set "UI=%ROOT%\ui-web"
set "STUB=%ROOT%\api-stub"
set "PS1=%ROOT%\ps1"

set "UI_URL=http://localhost:3000/suppliers"
set "STUB_HEALTH=http://127.0.0.1:5000/health"
set "API_HEALTH=http://127.0.0.1:8001/dashboard/kpis"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo   %ROOT%
  pause
  exit /b 1
)

REM --- helper: check URL returns HTTP 200 using PowerShell ---
REM sets ERRORLEVEL 0 if OK, 1 if not
set "PSCHECK=powershell -NoProfile -ExecutionPolicy Bypass -Command"
set "PSGET200=$u='%1'; try { $r=Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } else { exit 1 } } catch { exit 1 }"

echo.
echo ============================================================
echo   Ecom Copilot Launcher
echo   Root: %ROOT%
echo ============================================================
echo.

REM ============================================================
REM 1) Suppliers Stub API (5000)
REM ============================================================
%PSCHECK% "%PSGET200%" "%STUB_HEALTH%"
if errorlevel 1 (
  echo [START] Suppliers Stub API (5000)
  if not exist "%STUB%\server.cjs" (
    echo ERROR: Stub server not found:
    echo   %STUB%\server.cjs
    pause
    exit /b 1
  )
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%STUB%"" && node server.cjs"
) else (
  echo [OK] Suppliers Stub API already running (5000)
)

REM ============================================================
REM 2) Main API (8001) - uses your existing PS1 launcher if present
REM ============================================================
%PSCHECK% "%PSGET200%" "%API_HEALTH%"
if errorlevel 1 (
  echo [START] Main API (8001)
  REM If you have a known PS1 that starts uvicorn, use it here.
  REM Option A: If you have a launcher script, uncomment and set it:
  REM start "Ecom Copilot API (8001)" powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%\START_API.ps1"

  REM Option B: If your existing batch already starts it elsewhere, leave as-is.
  REM We'll try a common approach: run uvicorn from ROOT if main.py/app exists.
  REM (If this doesn't match your project, tell me what starts the API and I'll wire it.)
  if exist "%ROOT%\api\main.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
  ) else if exist "%ROOT%\main.py" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%"" && py -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
  ) else (
    echo NOTE: I did not find api\main.py or main.py to auto-start uvicorn.
    echo       If your API already starts via another script, that's fine.
    echo       Otherwise tell me what file/command you use to start 8001 and I will wire it.
  )
) else (
  echo [OK] Main API already running (8001)
)

REM ============================================================
REM 3) React UI (3000)
REM ============================================================
%PSCHECK% "%PSGET200%" "http://localhost:3000"
if errorlevel 1 (
  echo [START] React UI (3000)
  if not exist "%UI%\package.json" (
    echo ERROR: UI package.json not found:
    echo   %UI%\package.json
    pause
    exit /b 1
  )
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%UI%"" && npm start"
) else (
  echo [OK] React UI already running (3000)
)

REM ============================================================
REM Wait briefly for services to settle, then open ONE tab
REM ============================================================
echo.
echo [OPEN] %UI_URL%
timeout /t 2 /nobreak >nul
start "" "%UI_URL%"

echo.
echo Done.
endlocal
