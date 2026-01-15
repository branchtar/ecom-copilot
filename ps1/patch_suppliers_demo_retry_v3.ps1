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

# If already patched, exit safely
if ($txt -match 'loadDemoSuppliers' -or $txt -match 'Use demo data') {
  Write-Host "⚠️ Demo/Retry already present. No changes made." -ForegroundColor Yellow
  exit 0
}

# 1) Inject helpers right after the FIRST occurrence of: if (mode === "list") {
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

$txt2 = [regex]::Replace(
  $txt,
  'if\s*\(\s*mode\s*===\s*"list"\s*\)\s*\{',
  $inject,
  1
)

if ($txt2 -eq $txt) {
  throw 'Could not find pattern: if (mode === "list") {  (it may be different in your file)'
}

# 2) Replace the FIRST error render block that contains "Failed to fetch"
# We look for a JSX chunk that includes the literal text "Failed to fetch" inside an error conditional.
$errorLines = @(
'{!loading && error && (',
'  <div className="bg-red-50 border border-red-100 rounded-xl p-4">',
'    <div className="text-sm text-red-700 font-medium mb-1">Failed to fetch</div>',
'    <div className="text-xs text-red-700/80">',
'      Couldn’t reach the backend at:{" "}<span className="font-mono">{suppliersUrl}</span>',
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
'      Tip: make sure your backend is running and CORS allows requests from{" "}',
'      <span className="font-mono">http://localhost:3000</span>.',
'    </div>',
'  </div>',
')}'
)
$errorReplacement = ($errorLines -join "`r`n")

$txt3 = [regex]::Replace(
  $txt2,
  '(?s)\{\s*!loading\s*&&\s*error\s*&&\s*\(.*?Failed to fetch.*?\)\s*\}',
  $errorReplacement,
  1
)

if ($txt3 -eq $txt2) {
  Write-Host "⚠️ Could not find an error JSX block containing 'Failed to fetch' to replace." -ForegroundColor Yellow
  Write-Host "   Helpers were injected; error UI may still be the old one." -ForegroundColor Yellow
}

Set-Content -LiteralPath $file -Value $txt3 -Encoding UTF8
Write-Host "✅ Patched SuppliersPage list view with Demo + Retry." -ForegroundColor Green
