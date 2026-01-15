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

# Find the non-error table render block: {!loading && !error && ( ... )}
$start = [regex]::Match($txt, '(?m)^\s*\{\s*!loading\s*&&\s*!error\s*&&\s*\(\s*$')
if (!$start.Success) { throw 'Could not find start line: {!loading && !error && (' }

$startIndex = $start.Index

# If fragment already present immediately after start, do nothing
$tail = $txt.Substring($startIndex)
$alreadyWrapped = [regex]::IsMatch($tail, '(?s)^\s*\{\s*!loading\s*&&\s*!error\s*&&\s*\(\s*\r?\n\s*<>\s*\r?\n')
if ($alreadyWrapped) {
  Write-Host "Fragment wrapper already present. No change needed." -ForegroundColor Yellow
  exit 0
}

# Insert "<>" on the line after the start
$insertPos = $startIndex + $start.Length
$before = $txt.Substring(0, $insertPos)
$after  = $txt.Substring($insertPos)

# Put fragment open on its own line with same indentation level as block content (2 spaces is fine)
$after2 = "`r`n  <>`r`n" + $after

$txt2 = $before + $after2

# Now find the corresponding FIRST end line ")}" after the start
$tail2 = $txt2.Substring($startIndex)
$end = [regex]::Match($tail2, '(?m)^\s*\)\}\s*$')
if (!$end.Success) { throw 'Found start of block, but could not find end line: )}' }

$endIndexGlobal = $startIndex + $end.Index

# Insert "</>" immediately BEFORE the end line
$beforeEnd = $txt2.Substring(0, $endIndexGlobal)
$endAndAfter = $txt2.Substring($endIndexGlobal)

$txt3 = $beforeEnd.TrimEnd() + "`r`n  </>`r`n" + $endAndAfter

Set-Content -LiteralPath $file -Value $txt3 -Encoding UTF8
Write-Host "✅ Wrapped toolbar + table in a React fragment (<></>) to fix adjacent JSX error." -ForegroundColor Green
