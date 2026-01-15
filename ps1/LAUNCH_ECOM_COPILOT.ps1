# LAUNCH_ECOM_COPILOT.ps1
# One-click launcher: Suppliers Stub (5000) + Main API (8001) + React UI (3000)
# Stores this .ps1 in /ps1 and a .bat in /run

$ErrorActionPreference = "Stop"

$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

$UI_DIR   = Join-Path $ROOT "ui-web"
$STUB_DIR = Join-Path $ROOT "api-stub"

# -----------------------------
# MAIN API (Python / Uvicorn)
# -----------------------------
# You currently have something responding on http://127.0.0.1:8001/dashboard/kpis
# If your backend folder/app import is different, we’ll adjust these two lines.
$API_DIR = Join-Path $ROOT "api"
$UVICORN_APP = "main:app"
$API_PORT = 8001

# -----------------------------
# Suppliers Stub (Node / Express)
# -----------------------------
$STUB_PORT = 5000

# -----------------------------
# UI (React)
# -----------------------------
$UI_PORT = 3000

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSec = 30
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  do {
    try {
      $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 400
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$WorkingDir,
    [string]$Command
  )

  if (!(Test-Path $WorkingDir)) {
    throw "Folder not found: $WorkingDir"
  }

  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "cd `"$WorkingDir`"; `$Host.UI.RawUI.WindowTitle = `"$Title`"; $Command"
  ) | Out-Null
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " Ecom Copilot - One-click Launcher (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Root: $ROOT"
Write-Host ""

# 0) Basic folder sanity
foreach ($p in @($ROOT, $UI_DIR, $STUB_DIR)) {
  if (!(Test-Path $p)) { throw "Required folder missing: $p" }
}
if (!(Test-Path $API_DIR)) {
  Write-Host "WARNING: API folder not found at: $API_DIR" -ForegroundColor Yellow
  Write-Host "If your API lives somewhere else, we’ll update `$API_DIR + `$UVICORN_APP." -ForegroundColor Yellow
}

# 1) Start Suppliers Stub (5000)
if (-not (Test-PortListening $STUB_PORT)) {
  Write-Host "Starting Suppliers Stub API on :$STUB_PORT ..." -ForegroundColor Yellow
  Start-ServiceWindow -Title "Ecom Copilot Suppliers Stub ($STUB_PORT)" -WorkingDir $STUB_DIR -Command "node .\server.cjs"
} else {
  Write-Host "Suppliers Stub already listening on :$STUB_PORT" -ForegroundColor Green
}

# 2) Start Main API (8001)
if (-not (Test-PortListening $API_PORT)) {
  Write-Host "Starting Main API on :$API_PORT ..." -ForegroundColor Yellow

  # Prefer "py" (your screenshots show it works). Change later if you want a venv path.
  $cmd = "py -m uvicorn $UVICORN_APP --host 127.0.0.1 --port $API_PORT --reload"
  Start-ServiceWindow -Title "Ecom Copilot API ($API_PORT)" -WorkingDir $API_DIR -Command $cmd
} else {
  Write-Host "Main API already listening on :$API_PORT" -ForegroundColor Green
}

# 3) Start UI (3000)
if (-not (Test-PortListening $UI_PORT)) {
  Write-Host "Starting UI on :$UI_PORT ..." -ForegroundColor Yellow
  Start-ServiceWindow -Title "Ecom Copilot UI ($UI_PORT)" -WorkingDir $UI_DIR -Command "npm start"
} else {
  Write-Host "UI already listening on :$UI_PORT" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting for services to respond..." -ForegroundColor Cyan

$okStub = Wait-HttpOk -Url "http://127.0.0.1:$STUB_PORT/health" -TimeoutSec 30
$okApi  = Wait-HttpOk -Url "http://127.0.0.1:$API_PORT/dashboard/kpis" -TimeoutSec 30
$okUi   = Wait-HttpOk -Url "http://localhost:$UI_PORT" -TimeoutSec 45

Write-Host ("Stub  (:{0}) health: {1}" -f $STUB_PORT, $okStub) -ForegroundColor Gray
Write-Host ("API   (:{0}) kpis:   {1}" -f $API_PORT,  $okApi)  -ForegroundColor Gray
Write-Host ("UI    (:{0}) web:    {1}" -f $UI_PORT,   $okUi)   -ForegroundColor Gray
Write-Host ""

# IMPORTANT: open ONE tab only
# If you want it to open directly to Suppliers, set to /suppliers
$START_URL = "http://localhost:$UI_PORT"
# $START_URL = "http://localhost:$UI_PORT/suppliers"

Start-Process $START_URL | Out-Null
Write-Host "Opened: $START_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
