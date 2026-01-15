@echo off
REM Ecom Copilot - API diagnostic launcher

SET ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo ==========================================
echo  Ecom Copilot - API Diagnostic
echo ==========================================
echo Root: "%ROOT%"
echo.

cd /d "%ROOT%"

powershell -ExecutionPolicy Bypass -File "%ROOT%\diagnostic\diagnostic_run_api_check.ps1" -Root "%ROOT%"

echo.
echo Done. Press any key to close...
pause >nul
