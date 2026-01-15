@echo off
REM Ecom Copilot - main launcher

SET ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo ==========================================
echo  Ecom Copilot - Run
echo ==========================================
echo Root: "%ROOT%"
echo.

cd /d "%ROOT%"

powershell -ExecutionPolicy Bypass -File "%ROOT%\ps1\ecom_copilot_run.ps1" -Root "%ROOT%"

echo.
echo Done. Press any key to close...
pause >nul
