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

# A) Remove stray fragment-only lines
$txt = [regex]::Replace($txt, '(?m)^\s*<>\s*$\r?\n?', '')
$txt = [regex]::Replace($txt, '(?m)^\s*</>\s*$\r?\n?', '')

# B) Convert standalone marker lines into JSX comments so they never render
$txt = [regex]::Replace(
  $txt,
  '(?m)^(\s*)//\s*([A-Z0-9_]+_BLOCK_(?:START|END))\s*$',
  '${1}{/* ${2} */}'
)

# C) Locate the {!loading && !error && ( block start
$start = [regex]::Match($txt, '(?m)^(?<indent>\s*)\{\s*!loading\s*&&\s*!error\s*&&\s*\(\s*$')
if (!$start.Success) { throw 'Could not find start line: {!loading && !error && (' }

$indent = $start.Groups['indent'].Value
$startIndex = $start.Index

# Find the FIRST line that is exactly ")}" after start (avoids "))}")
$tail = $txt.Substring($startIndex)
$end = [regex]::Match($tail, '(?m)^\s*\)\}\s*$')
if (!$end.Success) { throw 'Found start, but could not find an end line that is exactly: )}' }

$endIndexGlobal = $startIndex + $end.Index + $end.Length

$before = $txt.Substring(0, $startIndex)
$after  = $txt.Substring($endIndexGlobal)

# Build a known-good replacement block (indented)
$lines = @(
'{!loading && !error && (',
'  <div className="flex flex-col gap-3">',
'    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">',
'      <div className="flex items-center gap-2">',
'        <input',
'          className="w-72 max-w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
'          placeholder="Search suppliers (coming soon)"',
'          disabled',
'        />',
'        <select',
'          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"',
'          disabled',
'          defaultValue="all"',
'        >',
'          <option value="all">All statuses (soon)</option>',
'          <option value="active">Active</option>',
'          <option value="inactive">Inactive</option>',
'        </select>',
'      </div>',
'      <div className="text-xs text-slate-500">',
'        {rows?.length ?? 0} supplier{(rows?.length ?? 0) === 1 ? "" : "s"}',
'      </div>',
'    </div>',
'',
'    <div className="bg-white rounded-xl shadow-sm overflow-hidden">',
'      <table className="w-full text-sm">',
'        <thead className="bg-slate-50 text-slate-600">',
'          <tr>',
'            <th className="text-left px-3 py-2 font-medium">Name</th>',
'            <th className="text-left px-3 py-2 font-medium">Key</th>',
'            <th className="text-left px-3 py-2 font-medium">Location</th>',
'            <th className="text-right px-3 py-2 font-medium">Action</th>',
'          </tr>',
'        </thead>',
'        <tbody>',
'          {rows.map((s) => (',
'            <tr key={s.id} className="border-t border-slate-100">',
'              <td className="px-3 py-2 text-slate-900">{s.name}</td>',
'              <td className="px-3 py-2 text-slate-600">{(s as any).key ?? "-"}</td>',
'              <td className="px-3 py-2 text-slate-600">{(s as any).location ?? "-"}</td>',
'              <td className="px-3 py-2 text-right">',
'                <button',
'                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs"',
'                  onClick={() => {',
'                    setSelectedId(s.id);',
'                    setMode("detail");',
'                  }}',
'                >',
'                  View',
'                </button>',
'              </td>',
'            </tr>',
'          ))}',
'',
'          {rows.length === 0 && (',
'            <tr>',
'              <td colSpan={4} className="px-3 py-6 text-center text-slate-500">',
'                No suppliers yet.',
'              </td>',
'            </tr>',
'          )}',
'        </tbody>',
'      </table>',
'    </div>',
'  </div>',
')}'
)

$replacement = ($lines | ForEach-Object { $indent + $_ }) -join "`r`n"

$txtNew = $before + $replacement + "`r`n" + $after
Set-Content -LiteralPath $file -Value $txtNew -Encoding UTF8

Write-Host "✅ Replaced entire {!loading && !error && (...)} block with a known-good toolbar+table." -ForegroundColor Green
