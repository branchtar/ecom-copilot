@echo off
setlocal

REM Project: Ecom Copilot
REM File:    kmc_pricing_run.bat
REM Purpose: Launch the KMC pricing engine v1.

set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo.
echo Ecom Copilot - KMC Pricing Engine v1
echo Root: %ROOT%
echo.

cd /d "%ROOT%"
powershell -ExecutionPolicy Bypass -File "%ROOT%\ps1\kmc_pricing_run.ps1" -Root "%ROOT%"

echo.
echo Done. Press any key to close this window.
pause >nul
