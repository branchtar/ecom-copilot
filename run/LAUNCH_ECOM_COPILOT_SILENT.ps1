$ErrorActionPreference = "Stop"
$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$LOGS = Join-Path $ROOT "logs"
New-Item -ItemType Directory -Force -Path $LOGS | Out-Null

function Kill-Port([int]$Port) {
  $line = netstat -ano | findstr ":$Port" | findstr LISTENING | Select-Object -First 1
  if ($line) {
    $pid = (($line -split "\s+")[-1])
    try { taskkill /PID $pid /F | Out-Null } catch {}
  }
}

# Clean ports (UI + API)
Kill-Port 3000
Kill-Port 3001
Kill-Port 5000

# --- Start API (adjust if your API start is different) ---
# Option A: if you have a BAT already:
$apiBat = Join-Path $ROOT "run\RUN_API_5000.bat"
if (Test-Path $apiBat) {
  Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile","-ExecutionPolicy","Bypass",
    "-Command",
    "cmd /c """"$apiBat"""" > """"$LOGS\api.log"""" 2>&1"
  )
} else {
  # Option B: try python server directly (edit if needed)
  $apiPy = Join-Path $ROOT "api\server.py"
  if (Test-Path $apiPy) {
    Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile","-ExecutionPolicy","Bypass",
      "-Command",
      "cd """"$ROOT""""; python """"$apiPy"""" > """"$LOGS\api.log"""" 2>&1"
    )
  }
}

# --- Start React UI ---
Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile","-ExecutionPolicy","Bypass",
  "-Command",
  "cd """"$ROOT\ui-web""""; npm start > """"$LOGS\ui.log"""" 2>&1"
)
