param(
    [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Main Dashboard           " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $Root"
Write-Host ""

$uiScript = Join-Path $Root "ui\ecom_copilot_main_gui.py"

if (-not (Test-Path -LiteralPath $uiScript)) {
    Write-Host "❌ UI script not found:" -ForegroundColor Red
    Write-Host "   $uiScript" -ForegroundColor Yellow
    exit 1
}

$pythonCmd = "py"
try {
    $null = & $pythonCmd --version 2>$null
} catch {
    $pythonCmd = "python"
}

Write-Host "Using Python command: $pythonCmd" -ForegroundColor Cyan
Write-Host ""

& $pythonCmd $uiScript
