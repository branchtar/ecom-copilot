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

# Find start of block with indentation capture
$start = [regex]::Match(
  $txt,
  '(?m)^(?<indent>\s*)\{\s*!loading\s*&&\s*!error\s*&&\s*\(\s*$'
)
if (!$start.Success) { throw 'Could not find start line: {!loading && !error && (' }

$indent = $start.Groups['indent'].Value
$startIndex = $start.Index
$startAfter = $startIndex + $start.Length

# Find end line at SAME indentation level as start
$tail = $txt.Substring($startIndex)
$endPattern = '(?m)^' + [regex]::Escape($indent) + '\)\}\s*$'
$end = [regex]::Match($tail, $endPattern)
if (!$end.Success) { throw 'Found start, but could not find matching end line at same indent: )}' }

$endLineStartGlobal = $startIndex + $end.Index
$endLineGlobal = $txt.Substring($endLineStartGlobal, $end.Length)

# Extract inner content between start line and end line
$inner = $txt.Substring($startAfter, $endLineStartGlobal - $startAfter)

# Remove any previously injected fragment lines inside this block
# (lines that are exactly "<>" or "</>" with whitespace)
$innerClean = [regex]::Replace($inner, '(?m)^\s*<>\s*$\r?\n?', '')
$innerClean = [regex]::Replace($innerClean, '(?m)^\s*</>\s*$\r?\n?', '')

# Build new wrapped block
$openFrag  = "`r`n" + $indent + "  <>" + "`r`n"
$closeFrag = "`r`n" + $indent + "  </>" + "`r`n"

$before = $txt.Substring(0, $startAfter)
$after  = $txt.Substring($endLineStartGlobal)

# Ensure inner has reasonable edges
$innerTrimmed = $innerClean.Trim("`r","`n")

$newBlock = $before + $openFrag + $innerTrimmed + $closeFrag + $indent + ')}' + "`r`n"

# The $after currently begins with the old end line. Replace that first end line with remainder after it.
# Remove the first occurrence of the end line from $after.
$afterRemainder = $after.Substring($end.Length)
$txtNew = $newBlock + $afterRemainder

Set-Content -LiteralPath $file -Value $txtNew -Encoding UTF8
Write-Host "✅ Fixed: wrapped {!loading && !error && (...)} content in a correct fragment (indent-safe)." -ForegroundColor Green
