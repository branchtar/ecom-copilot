param(
  [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot",
  [int]$ApiPort = 8001,
  [int]$UiPort  = 3000
)

$ErrorActionPreference = "Stop"

function Test-Port([int]$port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect("127.0.0.1", $port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(150)
    $c.Close()
    return $ok
  } catch { return $false }
}

function Wait-Port([int]$port, [int]$timeoutSec = 60) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    if (Test-Port $port) { return $true }
    Start-Sleep -Milliseconds 300
  }
  return $false
}

$runDir = Join-Path $Root "run"
$pidDir = Join-Path $runDir "_pids"
New-Item -ItemType Directory -Force -Path $pidDir | Out-Null

# If already running, just open the UI and exit
if (Test-Port $UiPort) {
  Start-Process "http://localhost:$UiPort"
  exit 0
}

# --- Start API (hidden) ---
$apiWork = Join-Path $Root "api"
$apiPy   = Join-Path $apiWork "server.py"

# You can switch to venv later; for now use 'python' on PATH
$apiArgs = "-m uvicorn server:app --host 127.0.0.1 --port $ApiPort --reload"
$apiProc = Start-Process -FilePath "python" -ArgumentList $apiArgs -WorkingDirectory $apiWork -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $pidDir "api.pid") -Value $apiProc.Id

# --- Start UI (hidden) ---
$uiWork = Join-Path $Root "ui-web"
$uiProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start" -WorkingDirectory $uiWork -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $pidDir "ui.pid") -Value $uiProc.Id

# Wait for UI to come up
if (-not (Wait-Port $UiPort 90)) {
  Write-Host "UI did not start on port $UiPort. Try: cd `"$uiWork`"; npm start" -ForegroundColor Red
  exit 1
}

# Open ONE tab
Start-Process "http://localhost:$UiPort"