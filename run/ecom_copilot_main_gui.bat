$batPath = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot\run\ecom_copilot_main_gui.bat"

$batContent = @'
@echo off
set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

cd /d "%ROOT%\ps1"
powershell -NoExit -ExecutionPolicy Bypass -File ".\ecom_copilot_run_main_gui.ps1"
'@

Set-Content -LiteralPath $batPath -Value $batContent -Encoding ASCII
Write-Host "Updated BAT launcher: $batPath"
