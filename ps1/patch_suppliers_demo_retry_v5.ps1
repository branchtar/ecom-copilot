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

# Make sure helpers exist (if not, inject them)
if (!($txt -match 'const\s+suppliersUrl\s*=')) {
  $injectLines = @(
'if (mode === "list") {',
'    const suppliersUrl = API_BASE + "/api/suppliers";',
'',
'    const loadDemoSuppliers = () => {',
'      setLoading(false);',
'      setError(null);',
'      setRows([',
'        { id: "KMC", key: "KMC", name: "KMC Music", location: "USA" },',
'        { id: "ENSOUL", key: "ENSOUL", name: "Ensoul Music", location: "USA" },',
'        { id: "CHESBRO", key: "CHESBRO", name: "Chesbro Music", location: "USA" },',
'      ]);',
'    };',
'',
'    const retry = () => {',
'      window.location.reload();',
'    };',
''
  )
  $inject = ($injectLines -join "`r`n")

  $txtInjected = [regex]::Replace(
    $txt,
    'if\s*\(\s*mode\s*===\s*["'']list["'']\s*\)\s*\{',
    $inject,
    1
  )

  if ($txtInjected -eq $txt) {
    throw 'Could not inject helpers: list-mode block not found (if (mode === "list") {)'
  }

  $txt = $txtInjected
  Write-Host "Injected helpers (suppliersUrl / loadDemoSuppliers / retry)." -ForegroundColor Green
} else {
  Write-Host "Helpers already present." -ForegroundColor DarkGray
}

# ---- Replace the error JSX block safely ----
# Find the start of the error block line: "{!loading && error && ("
$startMatch = [regex]::Match($txt, '(?m)^\s*\{\s*!loading\s*&&\s*error\s*&&\s*\(\s*$')
if (!$startMatch.Success) {
  throw 'Could not find start of error block: {!loading && error && ('
}

$startIndex = $startMatch.Index

# Find the end marker line: ")}" (line that contains only ")}" possibly with whitespace)
$tail = $txt.Substring($startIndex)
$endMatch = [regex]::Match($tail, '(?m)^\s*\)\}\s*$')
if (!$endMatch.Success) {
  throw 'Found start of error block, but could not find end line: )}'
}

$endIndex = $startIndex + $endMatch.Index + $endMatch.Length

# Build replacement block (ASCII only)
$replacementLines = @(
'{!loading && error && (',
'  <div className="bg-red-50 border border-red-100 rounded-xl p-4">',
'    <div className="text-sm text-red-700 font-medium mb-1">Failed to load suppliers</div>',
'    <div className="text-xs text-red-700/80">',
'      Backend URL:{" "}<span className="font-mono">{suppliersUrl}</span>',
'    </div>',
'    <div className="text-xs text-red-700/80 mt-1">{error}</div>',
'',
'    <div className="flex flex-wrap gap-2 mt-3">',
'      <button',
'        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs hover:bg-red-700"',
'        onClick={retry}',
'      >',
'        Retry',
'      </button>',
'',
'      <button',
'        className="px-3 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"',
'        onClick={loadDemoSuppliers}',
'      >',
'        Use demo data',
'      </button>',
'',
'      <button',
'        className="px-3 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"',
'        onClick={() => navigator.clipboard?.writeText(suppliersUrl)}',
'      >',
'        Copy API URL',
'      </button>',
'    </div>',
'',
'    <div className="text-[11px] text-red-700/70 mt-3">',
'      Tip: start the backend and allow CORS from{" "}<span className="font-mono">http://localhost:3000</span>.',
'    </div>',
'  </div>',
')}'  # important: keep the end marker line
)
$replacement = ($replacementLines -join "`r`n")

# Replace the original block
$before = $txt.Substring(0, $startIndex)
$after  = $txt.Substring($endIndex)
$txtNew = $before + $replacement + "`r`n" + $after

Set-Content -LiteralPath $file -Value $txtNew -Encoding UTF8
Write-Host "✅ Replaced error UI block with Demo + Retry buttons." -ForegroundColor Green
