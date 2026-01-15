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

# 1) Convert block marker comment lines into JSX-safe comments so they do NOT render in UI
#    // SUPPLIERS_LIST_ERROR_UI_BLOCK_START  ->  {/* SUPPLIERS_LIST_ERROR_UI_BLOCK_START */}
$txt2 = [regex]::Replace(
  $txt,
  '(?m)^(\s*)//\s*([A-Z0-9_]+_BLOCK_(?:START|END))\s*$',
  '${1}{/* ${2} */}'
)

# 2) Insert toolbar right above the table container (once)
$needlePattern = '(?s)(\r?\n)(\s*)<div\s+className="bg-white\s+rounded-xl\s+shadow-sm\s+overflow-hidden">'
$already = $txt2 -match 'Search suppliers \(coming soon\)'

if (-not $already -and ([regex]::IsMatch($txt2, $needlePattern))) {

  $toolbarLines = @(
    '<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">',
    '  <div className="flex items-center gap-2">',
    '    <input',
    '      className="w-72 max-w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
    '      placeholder="Search suppliers (coming soon)"',
    '      disabled',
    '    />',
    '    <select',
    '      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
    '      disabled',
    '      defaultValue="all"',
    '    >',
    '      <option value="all">All statuses (soon)</option>',
    '      <option value="active">Active</option>',
    '      <option value="inactive">Inactive</option>',
    '    </select>',
    '  </div>',
    '',
    '  <div className="text-xs text-slate-500">',
    '    {rows?.length ?? 0} supplier{(rows?.length ?? 0) === 1 ? "" : "s"}',
    '  </div>',
    '</div>'
  )

  $toolbar = ($toolbarLines -join "`r`n")

  $txt3 = [regex]::Replace(
    $txt2,
    $needlePattern,
    '${1}${2}' + $toolbar + '${1}${2}<div className="bg-white rounded-xl shadow-sm overflow-hidden">',
    1
  )
} else {
  $txt3 = $txt2
  if ($already) { Write-Host "Toolbar already present; skipping toolbar injection." -ForegroundColor Yellow }
  else { Write-Host "Could not find table container to inject toolbar; skipping injection." -ForegroundColor Yellow }
}

Set-Content -LiteralPath $file -Value $txt3 -Encoding UTF8
Write-Host "✅ Patched SuppliersPage: block markers hidden + table toolbar added." -ForegroundColor Green
