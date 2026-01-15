param(
  [Parameter(Mandatory=$false)]
  [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$file = Join-Path $Root "ui-web\src\pages\SuppliersPage.tsx"
if (!(Test-Path -LiteralPath $file)) { throw "Missing file: $file" }

# Backup
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -LiteralPath $file -Destination "$file.bak_$stamp" -Force
Write-Host "Backup created: $file.bak_$stamp"

$txt = Get-Content -Raw -LiteralPath $file

# 1) Remove the exact rendered line you showed (sometimes it ends up in one line)
$txt = [regex]::Replace(
  $txt,
  '(?m)^\s*//\s*SUPPLIERS_LIST_ERROR_UI_BLOCK_START\s*//\s*SUPPLIERS_LIST_ERROR_UI_BLOCK_END\s*$\r?\n?',
  ''
)

# 2) If markers exist as line-comments inside JSX, convert them to JSX comments (safe no-render)
# Convert only the specific markers we care about:
$txt = $txt -replace [regex]::Escape('// SUPPLIERS_LIST_ERROR_UI_BLOCK_START'), '{/* SUPPLIERS_LIST_ERROR_UI_BLOCK_START */}'
$txt = $txt -replace [regex]::Escape('// SUPPLIERS_LIST_ERROR_UI_BLOCK_END'),   '{/* SUPPLIERS_LIST_ERROR_UI_BLOCK_END */}'

Set-Content -LiteralPath $file -Value $txt -Encoding UTF8
Write-Host "✅ Fixed rendered block markers in SuppliersPage.tsx" -ForegroundColor Green
