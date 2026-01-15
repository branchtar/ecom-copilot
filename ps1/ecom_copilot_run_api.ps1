param(
    [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Local API               " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $Root"
Write-Host ""

$apiScript = Join-Path $Root "py\ecom_copilot_api.py"

if (-not (Test-Path -LiteralPath $apiScript)) {
    Write-Host "❌ API script not found:" -ForegroundColor Red
    Write-Host "   $apiScript" -ForegroundColor Yellow
    exit 1
}

# Prefer 'py' launcher if available
$pythonCmd = "py"
try {
    $null = & $pythonCmd --version 2>$null
} catch {
    $pythonCmd = "python"
}

Write-Host "Using Python command: $pythonCmd" -ForegroundColor Cyan
Write-Host "Starting uvicorn on http://127.0.0.1:8001 ..." -ForegroundColor Cyan
Write-Host ""

Push-Location (Split-Path -Parent $apiScript)
& $pythonCmd -m uvicorn ecom_copilot_api:app --host 127.0.0.1 --port 8001
Pop-Location
