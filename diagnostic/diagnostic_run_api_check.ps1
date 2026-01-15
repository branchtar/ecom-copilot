# Ecom Copilot - diagnostic runner for API check

param(
    [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - API Diagnostic           " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("Root : {0}" -f $Root)
Write-Host ""

$pyFile = Join-Path $Root "diagnostic\diagnostic_api_check.py"

if (-not (Test-Path -LiteralPath $pyFile)) {
    Write-Host ("Diagnostic Python file not found: {0}" -f $pyFile) -ForegroundColor Red
    exit 1
}

$pythonCmd = "py"
$pythonVersion = ""

try {
    $pythonVersion = & $pythonCmd --version 2>$null
} catch {
    $pythonCmd = "python"
    try {
        $pythonVersion = & $pythonCmd --version 2>$null
    } catch {
        Write-Host "Could not find 'py' or 'python' on PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host ("Using Python command: {0} {1}" -f $pythonCmd, $pythonVersion) -ForegroundColor Yellow
Write-Host ""

& $pythonCmd $pyFile

Write-Host ""
Write-Host "Ecom Copilot API diagnostic finished." -ForegroundColor Green
