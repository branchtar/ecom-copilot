# Ecom Copilot - point amazon.bwaaack to the correct .env file

# >>> EDIT THIS LINE ONLY IF ROOT CHANGES <<<
$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Set Amazon env_path      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Root : $root"
Write-Host ""

# This is the env file for Amazon Bwaaack:
# C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Marketplaces\Amazon Bwaaack\Amazon API\keys\.env
$amazonEnvPath = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Marketplaces\Amazon Bwaaack\Amazon API\keys\.env"

if (-not (Test-Path -LiteralPath $amazonEnvPath)) {
    Write-Host "❌ The Amazon .env path does NOT exist:" -ForegroundColor Red
    Write-Host "   $amazonEnvPath" -ForegroundColor Yellow
    Write-Host "Fix the path in this script if needed, then run again." -ForegroundColor Red
    return
}

$configDir    = Join-Path $root "config"
$accountsPath = Join-Path $configDir "accounts.json"

if (-not (Test-Path -LiteralPath $configDir)) {
    New-Item -ItemType Directory -Path $configDir | Out-Null
    Write-Host "Created config folder: $configDir" -ForegroundColor Green
}

# Load existing accounts.json if present
if (Test-Path -LiteralPath $accountsPath) {
    Write-Host "Loading existing accounts.json..." -ForegroundColor DarkGray
    $raw = Get-Content -LiteralPath $accountsPath -Raw -Encoding UTF8
    try {
        $accounts = $raw | ConvertFrom-Json
    } catch {
        Write-Host "⚠ Existing accounts.json was invalid JSON. Starting fresh." -ForegroundColor Yellow
        $accounts = [pscustomobject]@{}
    }
} else {
    Write-Host "accounts.json not found. Creating a new one." -ForegroundColor Yellow
    $accounts = [pscustomobject]@{}
}

function Ensure-ChildObject {
    param(
        [Parameter(Mandatory)]
        [psobject]$Parent,
        [Parameter(Mandatory)]
        [string]$Name
    )
    if (-not ($Parent.PSObject.Properties.Name -contains $Name)) {
        $Parent | Add-Member -MemberType NoteProperty -Name $Name -Value ([pscustomobject]@{})
    }
    return $Parent.$Name
}

# Ensure accounts.amazon.bwaaack exists
$amazonObj  = Ensure-ChildObject -Parent $accounts -Name "amazon"
$bwaaackObj = Ensure-ChildObject -Parent $amazonObj -Name "bwaaack"

# Set env_path for amazon.bwaaack
$bwaaackObj.env_path = $amazonEnvPath
Write-Host "Set amazon.bwaaack.env_path to:" -ForegroundColor Green
Write-Host "  $amazonEnvPath" -ForegroundColor Cyan

# Save back to JSON
$accounts | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $accountsPath -Encoding UTF8
Write-Host ""
Write-Host "Updated accounts.json:" -ForegroundColor Green
Write-Host "  $accountsPath" -ForegroundColor Cyan

# Relaunch Ecom Copilot
$runnerPs1 = Join-Path $root "ps1\ecom_copilot_run.ps1"
Write-Host ""

if (Test-Path -LiteralPath $runnerPs1) {
    Write-Host "Starting Ecom Copilot GUI via runner:" -ForegroundColor Green
    Write-Host "  $runnerPs1" -ForegroundColor Cyan
    Write-Host ""
    powershell -ExecutionPolicy Bypass -File $runnerPs1 -Root $root
} else {
    Write-Host "Runner script not found at:" -ForegroundColor Red
    Write-Host "  $runnerPs1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Next time, just double-click this BAT to open the hub:" -ForegroundColor Green
Write-Host "  $(Join-Path $root 'run\ecom_copilot_run.bat')" -ForegroundColor Cyan
Write-Host ""
