param([string]$Root = "C:\\Users\\Kylem\\OneDrive - Copy and Paste LLC\\Bwaaack\\Ecom Copilot")

$RunDir  = Join-Path $Root "run"
$PidFile = Join-Path $RunDir "pids.json"

function Stop-Port([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port" | ForEach-Object { $_.Line }
  foreach ($l in $lines) {
    if ($l -match "\sLISTENING\s+(\d+)\s*$") {
      $pid = [int]$Matches[1]
      try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
}

# Stop by ports (most reliable)
Stop-Port 3000
Stop-Port 8001
Stop-Port 5000

# Also try stored PIDs
if (Test-Path $PidFile) {
  try {
    $p = Get-Content $PidFile -Raw | ConvertFrom-Json
    foreach ($k in @("api","ui","stub")) {
      $pid = $p.$k.pid
      if ($pid) {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
      }
    }
  } catch {}
}

"Stopped. If anything still runs, reboot is the nuclear option."