# ecom_copilot_make_launcher.ps1
# Creates/updates: ...\Ecom Copilot\run\LAUNCH_ECOM_COPILOT.bat

$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$PS1_DIR = Join-Path $ROOT "ps1"
$RUN_DIR = Join-Path $ROOT "run"

New-Item -ItemType Directory -Force -Path $PS1_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $RUN_DIR | Out-Null

$batPath = Join-Path $RUN_DIR "LAUNCH_ECOM_COPILOT.bat"

$bat = @'
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher (API 8001 + Stub 5000 + UI 3000)
REM  Root: %~dp0.. (resolved below)
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

REM ------------------------------
REM Helper: port check
REM ------------------------------
REM Usage: call :is_listening 8001 && echo yes || echo no
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%

REM ------------------------------
REM Start Python API (8001)
REM ------------------------------
call :is_listening 8001
if %errorlevel%==0 (
  echo [OK] API already listening on 8001
) else (
  echo [..] Starting API on 8001...
  set "PY=%ROOT%\api\.venv\Scripts\python.exe"
  if not exist "!PY!" set "PY=py"

  start "Ecom Copilot API (8001)" cmd /k ^
    "cd /d ""%ROOT%\api"" && !PY! -m uvicorn server:app --host 127.0.0.1 --port 8001"
)

REM ------------------------------
REM Start Suppliers Stub (5000)
REM ------------------------------
call :is_listening 5000
if %errorlevel%==0 (
  echo [OK] Suppliers Stub already listening on 5000
) else (
  echo [..] Starting Suppliers Stub on 5000...
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
)

REM ------------------------------
REM Start React UI (3000)
REM ------------------------------
call :is_listening 3000
if %errorlevel%==0 (
  echo [OK] UI already listening on 3000
) else (
  echo [..] Starting UI on 3000...
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%ROOT%\ui-web"" && npm start"
)

REM Give servers a moment
timeout /t 2 /nobreak >nul

REM ------------------------------
REM Open ONE tab
REM ------------------------------
start "" "http://localhost:3000/suppliers"

echo.
echo Done. If something doesn't load:
echo  - UI:   http://localhost:3000
echo  - API:  http://127.0.0.1:8001/docs
echo  - Stub: http://127.0.0.1:5000/health
echo.
exit /b 0
'@

Set-Content -LiteralPath $batPath -Value $bat -Encoding ASCII

Write-Host "✅ Updated launcher:" -ForegroundColor Green
Write-Host $batPath
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "Double-click: $batPath"
