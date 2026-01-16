param(
  [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

$ErrorActionPreference = "SilentlyContinue"

$pidDir = Join-Path (Join-Path $Root "run") "_pids"
$apiPidFile = Join-Path $pidDir "api.pid"
$uiPidFile  = Join-Path $pidDir "ui.pid"

function Kill-PidFile($file) {
  if (Test-Path $file) {
    $pid = (Get-Content $file -Raw).Trim()
    if ($pid) {
      Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -Force $file -ErrorAction SilentlyContinue
  }
}

Kill-PidFile $uiPidFile
Kill-PidFile $apiPidFile

# Also kill leftover node/uvicorn spawned by reload (safe)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*python*" } | Out-Null