# ecom_copilot_make_launcher.ps1
# Writes a corrected launcher that does NOT exit early (labels are at bottom + goto :MAIN)

$ROOT   = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$RUNDIR = Join-Path $ROOT "run"

New-Item -ItemType Directory -Force -Path $RUNDIR | Out-Null

$batPath = Join-Path $RUNDIR "LAUNCH_ECOM_COPILOT.bat"

$bat = @'
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher
REM   - Python API:        8001 (FastAPI)
REM   - Suppliers Stub:    5000 (Node)
REM   - React UI:          3000
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

REM IMPORTANT: do not fall into label blocks
goto :MAIN

:MAIN
if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  echo.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo  Ecom Copilot Launcher
echo  ROOT: %ROOT%
echo ==========================================
echo.

REM ---- Start Python API (8001) ----
call :is_listening 8001
if %errorlevel%==0 (
  echo [OK] API already listening on 8001
) else (
  echo [..] Starting API on 8001...
  set "PY=%ROOT%\api\.venv\Scripts\python.exe"
  if exist "!PY!" (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && ""!PY!"" -m uvicorn server:app --host 127.0.0.1 --port 8001"
  ) else (
    start "Ecom Copilot API (8001)" cmd /k ^
      "cd /d ""%ROOT%\api"" && py -m uvicorn server:app --host 127.0.0.1 --port 8001"
  )
)

REM ---- Start Suppliers Stub (5000) ----
call :is_listening 5000
if %errorlevel%==0 (
  echo [OK] Suppliers Stub already listening on 5000
) else (
  echo [..] Starting Suppliers Stub on 5000...
  if not exist "%ROOT%\api-stub\server.cjs" (
    echo ERROR: Missing stub entry:
    echo %ROOT%\api-stub\server.cjs
    echo.
    pause
    exit /b 1
  )
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
)

REM ---- Start React UI (3000) ----
call :is_listening 3000
if %errorlevel%==0 (
  echo [OK] UI already listening on 3000
) else (
  echo [..] Starting UI on 3000...
  if not exist "%ROOT%\ui-web\package.json" (
    echo ERROR: Missing UI folder:
    echo %ROOT%\ui-web
    echo.
    pause
    exit /b 1
  )
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%ROOT%\ui-web"" && npm start"
)

REM Give servers a moment
timeout /t 2 /nobreak >nul

REM Open ONE tab
start "" "http://localhost:3000/suppliers"

echo.
echo Done.
echo   UI:   http://localhost:3000/suppliers
echo   API:  http://127.0.0.1:8001/docs
echo   Stub: http://127.0.0.1:5000/health
echo.

exit /b 0

REM ============================================================
REM Helpers (must be BELOW :MAIN)
REM ============================================================
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%
'@

Set-Content -LiteralPath $batPath -Value $bat -Encoding ASCII

Write-Host "✅ Updated launcher written:" -ForegroundColor Green
Write-Host $batPath
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "Double-click: $batPath"
