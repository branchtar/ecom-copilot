param(
    [string]$Root = "$(Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - USPS Pricing Sandbox     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $Root"
Write-Host ""

$pyDir = Join-Path $Root "py"
$scriptPath = Join-Path $pyDir "usps_pricing_sandbox.py"

if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-Host "âŒ usps_pricing_sandbox.py not found at:" -ForegroundColor Red
    Write-Host "   $scriptPath" -ForegroundColor Cyan
    exit 1
}

Write-Host "Ensuring Python 'requests' library is installed..." -ForegroundColor Cyan
try {
    py -m pip install requests | Out-Null
    Write-Host "requests installed/verified." -ForegroundColor Green
} catch {
    Write-Host "âš  Could not install 'requests'. You may need to run 'py -m pip install requests' manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting USPS Pricing Sandbox GUI..." -ForegroundColor Green
Write-Host ""

py "$scriptPath"
