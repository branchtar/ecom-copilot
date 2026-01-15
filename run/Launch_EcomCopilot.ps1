param(
  [string]$Root = "C:\\Users\\Kylem\\OneDrive - Copy and Paste LLC\\Bwaaack\\Ecom Copilot",
  [switch]$StartStub  # optional: if you REALLY want the stub service too
)

$ErrorActionPreference = "Stop"

$RunDir  = Join-Path $Root "run"
$LogsDir = Join-Path $RunDir "logs"
$PidFile = Join-Path $RunDir "pids.json"

New-Item -ItemType Directory -Force -Path $RunDir, $LogsDir | Out-Null

function Start-HiddenProcess {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$Arguments,
    [Parameter(Mandatory=$true)][string]$WorkingDirectory,
    [Parameter(Mandatory=$true)][string]$LogPrefix
  )

  $outLog = Join-Path $LogsDir "$LogPrefix.out.log"
  $errLog = Join-Path $LogsDir "$LogPrefix.err.log"

  # Use cmd.exe so we can redirect output to log files while keeping window hidden.
  $cmd = "/c `"$FilePath`" $Arguments 1>> `"$outLog`" 2>> `"$errLog`""

  $p = Start-Process -FilePath "cmd.exe" `
    -ArgumentList $cmd `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -PassThru

  return [pscustomobject]@{ pid=$p.Id; out=$outLog; err=$errLog }
}

function Wait-Port {
  param(
    [int]$Port,
    [int]$TimeoutSec = 60
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while((Get-Date) -lt $deadline) {
    try {
      $c = New-Object System.Net.Sockets.TcpClient
      $iar = $c.BeginConnect("127.0.0.1", $Port, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(350)
      if ($ok -and $c.Connected) { $c.Close(); return $true }
      $c.Close()
    } catch {}
    Start-Sleep -Milliseconds 350
  }
  return $false
}

# --- sanity ---
$ApiDir = Join-Path $Root "api"
$UiDir  = Join-Path $Root "ui-web"

if (!(Test-Path $ApiDir)) { throw "Missing api folder: $ApiDir" }
if (!(Test-Path $UiDir))  { throw "Missing ui-web folder: $UiDir" }

# Optional: stop anything already holding ports
function Stop-Port([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port" | ForEach-Object { $_.Line }
  foreach ($l in $lines) {
    if ($l -match "\sLISTENING\s+(\d+)\s*$") {
      $pid = [int]$Matches[1]
      try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
}
Stop-Port 3000
Stop-Port 8001
Stop-Port 5000

# --- START API (8001) ---
# Prefer "python server.py" because your project already has api\server.py.
$apiServer = Join-Path $ApiDir "server.py"
if (!(Test-Path $apiServer)) { throw "Missing: $apiServer" }

$api = Start-HiddenProcess -FilePath "python" -Arguments "server.py" -WorkingDirectory $ApiDir -LogPrefix "api_8001"

# --- START UI (3000) ---
$ui = Start-HiddenProcess -FilePath "npm" -Arguments "start" -WorkingDirectory $UiDir -LogPrefix "ui_3000"

# --- OPTIONAL: START STUB (5000) ---
# Only if you explicitly pass -StartStub, and ONLY if we can find a likely stub file.
$stub = $null
if ($StartStub) {
  $stubCandidates = @(
    (Join-Path $ApiDir "suppliers_stub.py"),
    (Join-Path $ApiDir "suppliers_stub_api.py"),
    (Join-Path $ApiDir "stub_api.py"),
    (Join-Path $ApiDir "suppliers_api_stub.py")
  )
  $stubFile = $stubCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($stubFile) {
    $stubName = Split-Path $stubFile -Leaf
    $stub = Start-HiddenProcess -FilePath "python" -Arguments $stubName -WorkingDirectory $ApiDir -LogPrefix "stub_5000"
  }
}

# Save PIDs
$pids = [ordered]@{
  started_at = (Get-Date).ToString("s")
  root = $Root
  api  = $api
  ui   = $ui
  stub = $stub
}
$pids | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $PidFile

# Wait for ports so browser doesn't open too early
$okUi  = Wait-Port -Port 3000 -TimeoutSec 90
$okApi = Wait-Port -Port 8001 -TimeoutSec 90

# Open browser only when UI is ready
if ($okUi) {
  Start-Process "http://localhost:3000/pricing"
} else {
  # If UI didn't come up, open logs folder so you can see errors
  Start-Process explorer.exe $LogsDir
}
