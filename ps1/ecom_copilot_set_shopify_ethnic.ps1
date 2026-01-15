# Ecom Copilot - Auto-wire Shopify Ethnic store
# Finds the existing Ethnic Shopify .env under Bwaaack\Marketplaces\Shopify
# and points Ecom Copilot's "Test Shopify" button at it.

# >>> EDIT THIS LINE ONLY IF ROOT CHANGES <<<
$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Set Shopify (Ethnic)      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $root"
Write-Host ""

# ----------------------------------------------------------
# 1) Locate Ethnic Shopify .env by scanning Marketplaces\Shopify
# ----------------------------------------------------------
$bwaaackRoot = Split-Path $root -Parent

$shopifySearchRoot = Join-Path $bwaaackRoot "Marketplaces\Shopify"
if (-not (Test-Path -LiteralPath $shopifySearchRoot)) {
    Write-Host "⚠ Could not find Shopify marketplaces folder at:" -ForegroundColor Yellow
    Write-Host "  $shopifySearchRoot" -ForegroundColor Cyan
    Write-Host "Please adjust this script's search root and rerun." -ForegroundColor Yellow
    return
}

Write-Host "Searching for Ethnic Shopify .env under:" -ForegroundColor DarkGray
Write-Host "  $shopifySearchRoot" -ForegroundColor Cyan
Write-Host ""

$ethnicEnvFile = Get-ChildItem -Path $shopifySearchRoot -Recurse -File -Filter ".env" -ErrorAction SilentlyContinue |
    Select-Object -First 1

if (-not $ethnicEnvFile) {
    Write-Host "❌ No .env file found under Marketplaces\Shopify." -ForegroundColor Red
    Write-Host "Make sure your Ethnic Shopify .env lives somewhere under:" -ForegroundColor Yellow
    Write-Host "  $shopifySearchRoot" -ForegroundColor Cyan
    return
}

$ethnicEnvPath = $ethnicEnvFile.FullName
Write-Host "✅ Found Ethnic Shopify .env:" -ForegroundColor Green
Write-Host "  $ethnicEnvPath" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------
# 2) Ensure SHOPIFY_ADMIN_API_ACCESS_TOKEN exists (optional safety)
# ----------------------------------------------------------
$envLines = Get-Content -LiteralPath $ethnicEnvPath -ErrorAction Stop

if ($envLines -notmatch '^SHOPIFY_ADMIN_API_ACCESS_TOKEN=') {
    # Try to reuse SHOPIFY_ADMIN_TOKEN if present
    $adminTokenLine = $envLines | Where-Object { $_ -match '^SHOPIFY_ADMIN_TOKEN=' } | Select-Object -First 1
    if ($adminTokenLine) {
        $tokenValue = $adminTokenLine.Split('=', 2)[1]
        Write-Host "Adding SHOPIFY_ADMIN_API_ACCESS_TOKEN to .env using existing SHOPIFY_ADMIN_TOKEN value..." -ForegroundColor DarkGray
        Add-Content -LiteralPath $ethnicEnvPath -Value "SHOPIFY_ADMIN_API_ACCESS_TOKEN=$tokenValue"
    }
    else {
        Write-Host "⚠ SHOPIFY_ADMIN_API_ACCESS_TOKEN not present and no SHOPIFY_ADMIN_TOKEN to copy from." -ForegroundColor Yellow
        Write-Host "  You can still fix this later by editing:" -ForegroundColor Yellow
        Write-Host "  $ethnicEnvPath" -ForegroundColor Cyan
    }
}
else {
    Write-Host "SHOPIFY_ADMIN_API_ACCESS_TOKEN already present in Ethnic .env." -ForegroundColor DarkGray
}

Write-Host ""

# ----------------------------------------------------------
# 3) Update config\accounts.json -> shopify.ethnic.env_path
# ----------------------------------------------------------
$configDir   = Join-Path $root "config"
$accountsJsonPath = Join-Path $configDir "accounts.json"

if (-not (Test-Path -LiteralPath $accountsJsonPath)) {
    Write-Host "❌ accounts.json not found at:" -ForegroundColor Red
    Write-Host "  $accountsJsonPath" -ForegroundColor Cyan
    return
}

Write-Host "Updating accounts.json with Shopify Ethnic env path..." -ForegroundColor Cyan

$accountsObj = Get-Content -LiteralPath $accountsJsonPath -Raw | ConvertFrom-Json

# Ensure 'shopify' top-level object exists
if (-not ($accountsObj.PSObject.Properties.Name -contains "shopify")) {
    $accountsObj | Add-Member -MemberType NoteProperty -Name "shopify" -Value ([pscustomobject]@{})
}

$shopifyObj = $accountsObj.shopify

# Ensure 'ethnic' account object exists
if (-not ($shopifyObj.PSObject.Properties.Name -contains "ethnic")) {
    $shopifyObj | Add-Member -MemberType NoteProperty -Name "ethnic" -Value ([pscustomobject]@{})
}

$ethnicObj = $shopifyObj.ethnic

# Add or update env_path on the ethnic object
$ethnicObj | Add-Member -MemberType NoteProperty -Name "env_path" -Value $ethnicEnvPath -Force

# Write JSON back
$accountsObj | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $accountsJsonPath -Encoding UTF8

Write-Host "✅ accounts.json updated: shopify.ethnic.env_path points to:" -ForegroundColor Green
Write-Host "  $ethnicEnvPath" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------
# 4) Point the GUI's SHOPIFY button at the 'ethnic' account
#    (update ecom_copilot_main.py mapping)
# ----------------------------------------------------------
$pyDir    = Join-Path $root "py"
$mainPy   = Join-Path $pyDir "ecom_copilot_main.py"

if (Test-Path -LiteralPath $mainPy) {
    $mainContent = Get-Content -LiteralPath $mainPy -Raw

    if ($mainContent -like '*("shopify", "ethnic")*') {
        Write-Host "Shopify mapping in ecom_copilot_main.py is already set to 'ethnic'." -ForegroundColor DarkGray
    }
    elseif ($mainContent -like '*("shopify", "refreshed")*') {
        # Replace ("shopify", "refreshed") with ("shopify", "ethnic")
        $newContent = $mainContent -replace '\("shopify",\s*"refreshed"\)', '("shopify", "ethnic")'
        $newContent | Set-Content -LiteralPath $mainPy -Encoding UTF8
        Write-Host "✅ Updated SHOPIFY mapping in ecom_copilot_main.py to use account 'ethnic'." -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Could not find a SHOPIFY mapping to update in ecom_copilot_main.py." -ForegroundColor Yellow
        Write-Host "  You may need to adjust it manually later." -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠ ecom_copilot_main.py not found at:" -ForegroundColor Yellow
    Write-Host "  $mainPy" -ForegroundColor Cyan
}

Write-Host ""

# ----------------------------------------------------------
# 5) Relaunch Ecom Copilot GUI
# ----------------------------------------------------------
$runnerPs1 = Join-Path $root "ps1\ecom_copilot_run.ps1"

if (Test-Path -LiteralPath $runnerPs1) {
    Write-Host "Starting Ecom Copilot GUI via runner:" -ForegroundColor Green
    Write-Host "  $runnerPs1" -ForegroundColor Cyan
    Write-Host ""
    powershell -ExecutionPolicy Bypass -File $runnerPs1 -Root $root
}
else {
    Write-Host "⚠ Runner script not found at:" -ForegroundColor Yellow
    Write-Host "  $runnerPs1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Done. The Test Shopify button should now use the Ethnic Musical Instruments store." -ForegroundColor Green
