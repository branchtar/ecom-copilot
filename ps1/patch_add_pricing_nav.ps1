# patch_add_pricing_nav.ps1
$ErrorActionPreference = "Stop"

$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$srcRoot = Join-Path $root "ui-web\src"
$pricingPage = Join-Path $srcRoot "pages\Pricing.tsx"

if (-not (Test-Path $pricingPage)) {
  throw "Missing Pricing page: $pricingPage (run patch_pricing_mapping.ps1 first)"
}

function Backup-File($p) {
  if (Test-Path $p) {
    $bak = "$p.bak_{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss")
    Copy-Item -Force $p $bak
    Write-Host "Backed up: $p -> $bak"
  }
}

# -------------------------------------------------------
# 1) Find the Routes file (react-router v6) and patch it
# -------------------------------------------------------
$routesFile = Get-ChildItem $srcRoot -Recurse -Include *.tsx,*.ts |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
  Where-Object { (Get-Content $_.FullName -Raw) -match "<Routes>" } |
  Select-Object -First 1

if (-not $routesFile) {
  throw "Could not find a file containing <Routes>. Your app may use a different router structure."
}

$routesPath = $routesFile.FullName
Backup-File $routesPath

$routesText = Get-Content $routesPath -Raw

# Add import if missing
if ($routesText -notmatch 'from\s+["'']\.\/pages\/Pricing["'']|from\s+["'']\.\.\/pages\/Pricing["'']') {
  # Try common relative paths
  # If routes file is App.tsx in src, import is ./pages/Pricing
  $importLine = 'import PricingPage from "./pages/Pricing";'
  if ($routesPath -match "\\src\\.*\\") {
    # If routes file is inside a subfolder, use ../pages/Pricing
    $relativeDepth = ($routesPath.Substring($srcRoot.Length) -split "[\\/]" | Where-Object { $_ -ne "" }).Count
    if ($relativeDepth -ge 3) { $importLine = 'import PricingPage from "../pages/Pricing";' }
  }

  # Insert after the last import line
  $routesText = $routesText -replace "(?s)(\A.*?^import .*?;\s*)", "`$1`r`n$importLine`r`n"
}

# Add route if missing
if ($routesText -notmatch 'path=["'']\/pricing["'']') {
  $routesText = $routesText -replace "(<Routes>\s*)", "`$1`r`n      <Route path=""/pricing"" element={<PricingPage />} />`r`n"
}

Set-Content -Encoding UTF8 $routesPath $routesText
Write-Host "✅ Patched routes in: $routesPath"

# -------------------------------------------------------
# 2) Find the sidebar/nav file and add a Pricing link
# -------------------------------------------------------
# We'll look for a file that contains all these menu words
$navFile = Get-ChildItem $srcRoot -Recurse -Include *.tsx,*.ts |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
  Where-Object {
    $t = Get-Content $_.FullName -Raw
    ($t -match "Suppliers") -and ($t -match "Emails") -and ($t -match "Marketplaces")
  } | Select-Object -First 1

if (-not $navFile) {
  Write-Host "⚠️ Could not auto-find sidebar/nav file. Route is fixed, but you may need to add the nav link manually." -ForegroundColor Yellow
  Write-Host "Try opening: http://localhost:3000/pricing" -ForegroundColor Yellow
  exit 0
}

$navPath = $navFile.FullName
Backup-File $navPath
$navText = Get-Content $navPath -Raw

# Best-effort: insert "Pricing" near Suppliers
# Handles common patterns: arrays of items with label/name + path/to/href
if ($navText -notmatch "Pricing") {
  # Try insert in a nav-items array pattern
  $navText2 = $navText

  # Pattern A: { label: "Suppliers", to: "/suppliers" }
  if ($navText2 -match 'label:\s*["'']Suppliers["'']') {
    $navText2 = $navText2 -replace '(\{\s*label:\s*["'']Suppliers["''][^}]*\}\s*,?)',
      "`$1`r`n    { label: ""Pricing"", to: ""/pricing"" },"
  }
  # Pattern B: { name: "Suppliers", href: "/suppliers" }
  elseif ($navText2 -match 'name:\s*["'']Suppliers["'']') {
    $navText2 = $navText2 -replace '(\{\s*name:\s*["'']Suppliers["''][^}]*\}\s*,?)',
      "`$1`r`n    { name: ""Pricing"", href: ""/pricing"" },"
  }
  # Pattern C: plain JSX list with "Suppliers" link
  elseif ($navText2 -match ">Suppliers<") {
    # Insert a new link block right after Suppliers (very simple)
    $navText2 = $navText2 -replace '(>Suppliers<.*?\r?\n)', "`$1`r`n{/* Pricing */}`r`n<a href=""/pricing"">Pricing</a>`r`n"
  }

  if ($navText2 -ne $navText) {
    $navText = $navText2
    Set-Content -Encoding UTF8 $navPath $navText
    Write-Host "✅ Patched sidebar/nav in: $navPath"
  } else {
    Write-Host "⚠️ Found nav file but couldn't safely inject Pricing link. Route is fixed; add nav link manually." -ForegroundColor Yellow
    Write-Host "Nav file: $navPath" -ForegroundColor Yellow
  }
} else {
  Write-Host "Nav already contains Pricing; skipping nav patch."
}

Write-Host ""
Write-Host "Done. Restart UI (npm start) and open: http://localhost:3000/pricing"
