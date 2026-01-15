Param(
    [string]$Root = ""
)

if (-not $Root) {
    $Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Supplier Pricing (Amazon)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $Root"
Write-Host ""

$pyDir  = Join-Path $Root "py"
$engine = Join-Path $pyDir "supplier_pricing_engine.py"

if (-not (Test-Path -LiteralPath $engine)) {
    Write-Host "âŒ Pricing engine not found at:" -ForegroundColor Red
    Write-Host "   $engine" -ForegroundColor Yellow
    exit 1
}

# Prefer `py` launcher if available, otherwise fall back to `python`
$pyCmd = "py"
try {
    $null = & $pyCmd --version
} catch {
    $pyCmd = "python"
}

Write-Host "Using Python command: $pyCmd"
Write-Host ""

Push-Location $Root
try {
    & $pyCmd "$engine"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Supplier pricing run complete." -ForegroundColor Green
Read-Host "Press Enter to close..."
