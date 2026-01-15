# =========================================================
# Project: Ecom Copilot
# File: ps1\patch_suppliers_selectedId_null.ps1
# Purpose: Fix TS strictness for selectedId (string | null)
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

# ---- Patch 1: detail effect guard to introduce sid
# Old:
# useEffect(() => {
#   if (!selectedId) return;
#
# New:
# useEffect(() => {
#   const sid = selectedId;
#   if (!sid) return;
#
$txt = [regex]::Replace(
  $txt,
  '(?s)useEffect\(\(\) => \{\s*if \(!selectedId\) return;\s*',
  "useEffect(() => {`r`n    const sid = selectedId;`r`n    if (!sid) return;`r`n`r`n",
  1
)

# Replace encodeURIComponent(selectedId) -> encodeURIComponent(sid)
$txt = $txt -replace 'encodeURIComponent\(selectedId\)', 'encodeURIComponent(sid)'

# ---- Patch 2: KMC preview effect guard to introduce sid
# Old:
# useEffect(() => {
#   if (mode !== "detail" || !selectedId) return;
#
# New:
# useEffect(() => {
#   const sid = selectedId;
#   if (mode !== "detail" || !sid) return;
#
$txt = [regex]::Replace(
  $txt,
  '(?s)useEffect\(\(\) => \{\s*if \(mode !== "detail" \|\| !selectedId\) return;\s*',
  "useEffect(() => {`r`n    const sid = selectedId;`r`n    if (mode !== `"detail`" || !sid) return;`r`n`r`n",
  1
)

Set-Content -LiteralPath $file -Value $txt -Encoding UTF8
Write-Host "✅ Patched selectedId nullability in: $file"
