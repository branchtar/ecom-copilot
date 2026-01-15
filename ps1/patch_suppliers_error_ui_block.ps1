param(
  [Parameter(Mandatory=$false)]
  [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $Root "ps1\_block_tools.ps1")

$file = Join-Path $Root "ui-web\src\pages\SuppliersPage.tsx"
if (!(Test-Path -LiteralPath $file)) { throw "Missing file: $file" }

Write-Host "Patching SuppliersPage error UI block..." -ForegroundColor Cyan

# Backup
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -LiteralPath $file -Destination "$file.bak_$stamp" -Force
Write-Host "Backup created: $file.bak_$stamp"

# Ensure markers exist around the current error block:
# start line: "{!loading && error && ("
# end line:   ")}"
Ensure-BlockMarkersAroundRange `
  -FilePath $file `
  -BlockName "SUPPLIERS_LIST_ERROR_UI" `
  -StartLineRegex '^\s*\{\s*!loading\s*&&\s*error\s*&&\s*\(\s*$' `
  -EndLineRegex   '^\s*\)\}\s*$'

# Build new inner content as an array of lines (no nested here-string)
$lines = @(
'{!loading && error && (',
'  <div className="bg-red-50 border border-red-100 rounded-xl p-4">',
'    <div className="text-sm text-red-700 font-medium mb-1">Failed to load suppliers</div>',
'',
'    <div className="text-xs text-red-700/80">',
'      Backend URL:{" "}<span className="font-mono">{API_BASE + "/api/suppliers"}</span>',
'    </div>',
'',
'    <div className="text-xs text-red-700/80 mt-1">{error}</div>',
'',
'    <div className="flex flex-wrap gap-2 mt-3">',
'      <button',
'        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs hover:bg-red-700"',
'        onClick={() => window.location.reload()}',
'      >',
'        Retry',
'      </button>',
'',
'      <button',
'        className="px-3 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"',
'        onClick={() => {',
'          setLoading(false);',
'          setError(null);',
'          setRows([',
'            { id: "KMC", key: "KMC", name: "KMC Music", location: "USA" },',
'            { id: "ENSOUL", key: "ENSOUL", name: "Ensoul Music", location: "USA" },',
'            { id: "CHESBRO", key: "CHESBRO", name: "Chesbro Music", location: "USA" },',
'          ]);',
'        }}',
'      >',
'        Use demo data',
'      </button>',
'',
'      <button',
'        className="px-3 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-xs hover:bg-red-100"',
'        onClick={() => {',
'          const url = API_BASE + "/api/suppliers";',
'          navigator.clipboard?.writeText(url);',
'        }}',
'      >',
'        Copy API URL',
'      </button>',
'    </div>',
'',
'    <div className="text-[11px] text-red-700/70 mt-3">',
'      Tip: start the backend and allow CORS from{" "}',
'      <span className="font-mono">http://localhost:3000</span>.',
'    </div>',
'  </div>',
')}'
)

$newInner = ($lines -join "`r`n")
Set-Block -FilePath $file -BlockName "SUPPLIERS_LIST_ERROR_UI" -NewInnerContent $newInner

Write-Host "✅ SuppliersPage error UI block updated." -ForegroundColor Green
