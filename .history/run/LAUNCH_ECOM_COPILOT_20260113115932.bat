@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher
REM   - Python API: 8001 (FastAPI)
REM   - Suppliers Stub: 5000 (Node)
REM   - React UI: 3000
REM ============================================================

goto :main

REM ------------------------------
REM Helper: check if port is listening
REM Usage: call :is_listening 8001
REM returns ERRORLEVEL 0 if listening, 1 if not
REM ------------------------------
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%


:main
set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Ecom Copilot launcher
echo  ROOT: %ROOT%
echo ============================================================
echo.

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

REM Give services a moment
timeout /t 2 /nobreak >nul

REM Open ONE tab
start "" "http://localhost:3000/suppliers"

echo.
echo Done.
echo  UI:   http://localhost:3000/suppliers
echo  API:  http://127.0.0.1:8001/docs
echo  Stub: http://127.0.0.1:5000/health
echo.

exit /b 0
