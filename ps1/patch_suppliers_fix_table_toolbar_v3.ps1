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

# ---------------------------------------------------------
# A) Remove any stray fragment-only lines that are breaking JSX
# ---------------------------------------------------------
$txt = [regex]::Replace($txt, '(?m)^\s*<>\s*$\r?\n?', '')
$txt = [regex]::Replace($txt, '(?m)^\s*</>\s*$\r?\n?', '')

# ---------------------------------------------------------
# B) If block markers are inside JSX, convert them to JSX comments
#    // XYZ_BLOCK_START  ->  {/* XYZ_BLOCK_START */}
# ---------------------------------------------------------
$txt = [regex]::Replace(
  $txt,
  '(?m)^(\s*)//\s*([A-Z0-9_]+_BLOCK_(?:START|END))\s*$',
  '${1}{/* ${2} */}'
)

# ---------------------------------------------------------
# C) Patch the {!loading && !error && ( ... )} block
#    - Wrap table card with a toolbar in a parent div
#    - Close wrapper right before the line that is exactly ")}"
# ---------------------------------------------------------
$start = [regex]::Match($txt, '(?m)^(?<indent>\s*)\{\s*!loading\s*&&\s*!error\s*&&\s*\(\s*$')
if (!$start.Success) { throw 'Could not find start line: {!loading && !error && (' }

$startIndex = $start.Index
$startAfter = $startIndex + $start.Length

$tail = $txt.Substring($startIndex)

# IMPORTANT: end line is the FIRST line that is exactly ")}" (ignores "))}")
$end = [regex]::Match($tail, '(?m)^\s*\)\}\s*$')
if (!$end.Success) { throw 'Found start, but could not find an end line that is exactly: )}' }

$endLineStartGlobal = $startIndex + $end.Index

$before = $txt.Substring(0, $startAfter)
$inner  = $txt.Substring($startAfter, $endLineStartGlobal - $startAfter)
$after  = $txt.Substring($endLineStartGlobal) # starts with ")}"

# If already wrapped, skip toolbar injection
if ($inner -match 'Search suppliers \(coming soon\)' -or $inner -match 'flex flex-col gap-3') {
  Write-Host "Toolbar/wrapper already present inside !loading && !error block. Skipping injection." -ForegroundColor Yellow
} else {
  $cardMatch = [regex]::Match($inner, '(?m)^(?<i>\s*)<div className="bg-white rounded-xl shadow-sm overflow-hidden">')
  if (!$cardMatch.Success) {
    throw 'Could not find the table card div: <div className="bg-white rounded-xl shadow-sm overflow-hidden">'
  }

  $ind = $cardMatch.Groups['i'].Value

  $toolbarLines = @(
    $ind + '<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">',
    $ind + '  <div className="flex items-center gap-2">',
    $ind + '    <input',
    $ind + '      className="w-72 max-w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
    $ind + '      placeholder="Search suppliers (coming soon)"',
    $ind + '      disabled',
    $ind + '    />',
    $ind + '    <select',
    $ind + '      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
    $ind + '      disabled',
    $ind + '      defaultValue="all"',
    $ind + '    >',
    $ind + '      <option value="all">All statuses (soon)</option>',
    $ind + '      <option value="active">Active</option>',
    $ind + '      <option value="inactive">Inactive</option>',
    $ind + '    </select>',
    $ind + '  </div>',
    $ind + '  <div className="text-xs text-slate-500">',
    $ind + '    {rows?.length ?? 0} supplier{(rows?.length ?? 0) === 1 ? "" : "s"}',
    $ind + '  </div>',
    $ind + '</div>'
  ) -join "`r`n"

  $wrapperOpen =
    $ind + '<div className="flex flex-col gap-3">' + "`r`n" +
    $toolbarLines + "`r`n" +
    $ind + '<div className="bg-white rounded-xl shadow-sm overflow-hidden">'

  # Replace only the first occurrence of the card div line
  $inner = [regex]::Replace(
    $inner,
    '(?m)^(?<i>\s*)<div className="bg-white rounded-xl shadow-sm overflow-hidden">',
    [System.Text.RegularExpressions.MatchEvaluator]{
      param($m)
      $wrapperOpen
    },
    1
  )

  # Ensure we close the wrapper BEFORE the block's ")}"
  # We insert an extra closing </div> at the end of inner, but only if not already present.
  if ($inner -notmatch '(?m)^\s*</div>\s*$' -or $inner -notmatch 'flex flex-col gap-3') {
    # safe append: close wrapper one level above the table card
    $inner = $inner.TrimEnd("`r","`n") + "`r`n" + $ind + "</div>`r`n"
  }

  Write-Host "Injected toolbar + wrapper into !loading && !error block." -ForegroundColor Green
}

$txtNew = $before + $inner + $after
Set-Content -LiteralPath $file -Value $txtNew -Encoding UTF8

Write-Host "✅ Fixed fragments + added suppliers table toolbar wrapper." -ForegroundColor Green
