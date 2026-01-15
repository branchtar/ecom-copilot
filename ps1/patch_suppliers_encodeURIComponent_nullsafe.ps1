# =========================================================
# Project: Ecom Copilot
# File: ps1\patch_suppliers_encodeURIComponent_nullsafe.ps1
# Purpose: Make encodeURIComponent calls null-safe in SuppliersPage.tsx
# =========================================================

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

# Make encodeURIComponent safe regardless of sid/selectedId type
# encodeURIComponent(sid) -> encodeURIComponent(sid ?? "")
$txt2 = $txt -replace 'encodeURIComponent\(\s*sid\s*\)', 'encodeURIComponent(sid ?? "")'

# Also catch any remaining encodeURIComponent(selectedId) -> encodeURIComponent(selectedId ?? "")
$txt2 = $txt2 -replace 'encodeURIComponent\(\s*selectedId\s*\)', 'encodeURIComponent(selectedId ?? "")'

if ($txt2 -eq $txt) {
  Write-Host "No changes needed (no matching encodeURIComponent patterns found)."
} else {
  Set-Content -LiteralPath $file -Value $txt2 -Encoding UTF8
  Write-Host "✅ Patched encodeURIComponent calls in: $file"
}
