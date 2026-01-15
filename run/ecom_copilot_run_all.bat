$root   = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$runDir = Join-Path $root "run"
$batPath = Join-Path $runDir "ecom_copilot_run_all.bat"

$batContent = @'
@echo off
set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo.
echo ================================
echo  Ecom Copilot - Run Everything
echo ================================
echo.

REM --- Start API in its own PowerShell window ---
cd /d "%ROOT%\ps1"
echo Starting Ecom Copilot API...
start "Ecom Copilot API" powershell -ExecutionPolicy Bypass -File ".\ecom_copilot_run_api.ps1"

REM --- Start Web UI in its own window ---
cd /d "%ROOT%\ui-web"
echo Starting Ecom Copilot Web dashboard...
start "Ecom Copilot Web" npm start

echo.
echo Both API and Web dashboard have been launched.
echo You can close this window if you like.
pause
'@

Set-Content -LiteralPath $batPath -Value $batContent -Encoding ASCII
Write-Host "Created: $batPath" -ForegroundColor Green
