$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$batPath = Join-Path $ROOT "run\LAUNCH_ECOM_COPILOT.bat"

$bat = @'
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher (API 8001 + Stub 5000 + UI 3000)
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

goto :main

REM ------------------------------
REM Helper: port check
REM ------------------------------
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%

REM ------------------------------
REM Main
REM ------------------------------
:main

REM Start Python API (8001)
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

REM Start Suppliers Stub (5000)
call :is_listening 5000
if %errorlevel%==0 (
  echo [OK] Suppliers Stub already listening on 5000
) else (
  echo [..] Starting Suppliers Stub on 5000...
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
)

REM Start React UI (3000) - prevent CRA from auto-opening a browser tab
call :is_listening 3000
if %errorlevel%==0 (
  echo [OK] UI already listening on 3000
) else (
  echo [..] Starting UI on 3000...
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%ROOT%\ui-web"" && set BROWSER=none && npm start"
)

REM Wait (up to ~20s) for UI port 3000 to come up
set /a tries=0
:wait_ui
call :is_listening 3000
if %errorlevel%==0 goto :open_one
set /a tries+=1
if !tries! GEQ 20 goto :open_one
timeout /t 1 /nobreak >nul
goto :wait_ui

:open_one
REM Open ONE tab
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
Write-Host "✅ Replaced launcher:" -ForegroundColor Green
Write-Host $batPath
