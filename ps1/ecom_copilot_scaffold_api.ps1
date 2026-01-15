$ErrorActionPreference = "Stop"

$Root  = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$pyDir  = Join-Path $Root "py"
$ps1Dir = Join-Path $Root "ps1"
$runDir = Join-Path $Root "run"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - API Scaffolding         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $Root"
Write-Host ""

foreach ($dir in @($pyDir, $ps1Dir, $runDir)) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host ("Created folder: {0}" -f $dir)
    } else {
        Write-Host ("Folder exists:  {0}" -f $dir)
    }
}

# ------------------------------------------------------------
# Python FastAPI backend (placeholder data for now)
# ------------------------------------------------------------
$apiPath = Join-Path $pyDir "ecom_copilot_api.py"

$apiContent = @'
"""
Ecom Copilot - FastAPI backend (local only for now).

Endpoints:
- /health
- /dashboard/kpis
- /dashboard/marketplace-balances
- /dashboard/recent-orders
- /dashboard/stock-alerts
- /settings/api-status

All data is placeholder. Later we'll wire these to real APIs.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parents[1]
PY_DIR = BASE_DIR / "py"

if str(PY_DIR) not in sys.path:
    sys.path.insert(0, str(PY_DIR))

try:
    from accounts_registry import load_accounts_registry  # type: ignore
    from env_diagnostic import run_env_diagnostic        # type: ignore
except Exception as exc:  # pragma: no cover
    load_accounts_registry = None  # type: ignore
    run_env_diagnostic = None      # type: ignore
    print(f"[WARN] Could not import helper modules: {exc!r}")

app = FastAPI(
    title="Ecom Copilot API",
    version="0.1.0",
    description="Local API backend for the Ecom Copilot dashboard.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "base_dir": str(BASE_DIR)}

@app.get("/dashboard/kpis")
def dashboard_kpis() -> Dict[str, Any]:
    return {
        "total_sales_7d": 17542.73,
        "orders_7d": 167,
        "returns_7d": 12,
        "items_sold_7d": 212,
    }

@app.get("/dashboard/marketplace-balances")
def marketplace_balances() -> List[Dict[str, Any]]:
    return [
        {"marketplace": "Amazon",  "balance": 1872.45, "next_payout": "2024-04-30"},
        {"marketplace": "Walmart", "balance": 948.25,  "next_payout": "2024-04-27"},
        {"marketplace": "Shopify", "balance": 527.90,  "next_payout": "2024-05-02"},
        {"marketplace": "Reverb",  "balance": 316.75,  "next_payout": "2024-04-25"},
    ]

@app.get("/dashboard/recent-orders")
def recent_orders() -> List[Dict[str, Any]]:
    return [
        {"id": "#1332", "customer": "Kyle Mulvey",  "status": "Shipped",   "date": "2024-04-24", "total": 42.60},
        {"id": "#1381", "customer": "Jane Smith",   "status": "Pending",   "date": "2024-04-24", "total": 19.95},
        {"id": "#1360", "customer": "Mike Johnson", "status": "Shipped",   "date": "2024-04-23", "total": 87.90},
        {"id": "#1379", "customer": "Emma Davis",   "status": "Cancelled", "date": "2024-04-22", "total": 15.45},
    ]

@app.get("/dashboard/stock-alerts")
def stock_alerts() -> List[Dict[str, Any]]:
    return [
        {"sku": "KMC-ABC123", "product": "Drumstick S4 Hickory", "stock": 3, "supplier": "KMC Music"},
        {"sku": "ENS-789",    "product": "Guitar Tuner Clip-On", "stock": 5, "supplier": "Ensoul Music"},
        {"sku": "LPD-456",    "product": "Harmonica Key of C",   "stock": 7, "supplier": "LPD Music"},
    ]

@app.get("/settings/api-status")
def settings_api_status() -> Dict[str, Any]:
    if load_accounts_registry is None or run_env_diagnostic is None:
        return {"note": "accounts_registry/env_diagnostic not available", "rows": []}

    registry = load_accounts_registry()
    if not registry:
        return {"note": "No services defined in accounts registry.", "rows": []}

    rows: List[Dict[str, Any]] = []

    for service_name, svc_cfg in registry.items():
        accounts = svc_cfg.get("accounts") or {}
        if not isinstance(accounts, dict):
            continue

        for account_name, account_cfg in accounts.items():
            env_path = account_cfg.get("env_path") or ""
            log_lines: List[str] = []

            def log_fn(msg: str) -> None:
                log_lines.append(msg)

            try:
                status = run_env_diagnostic(service_name, account_name, env_path, log_fn)
            except Exception as exc:  # pragma: no cover
                log_lines.append(f"❌ Exception during diagnostic: {exc!r}")
                status = "error"

            rows.append(
                {
                    "service": service_name,
                    "account": account_name,
                    "status": status,
                    "env_path": env_path,
                    "log_lines": log_lines,
                }
            )

    return {"rows": rows}
'@

Set-Content -LiteralPath $apiPath -Value $apiContent -Encoding UTF8
Write-Host ("Wrote API Python: {0}" -f $apiPath) -ForegroundColor Green

# ------------------------------------------------------------
# PowerShell runner for the API (uvicorn)
# ------------------------------------------------------------
$apiRunnerPath = Join-Path $ps1Dir "ecom_copilot_run_api.ps1"

$apiRunnerContent = @'
param(
    [string]C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - API Backend               " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
Write-Host ""

 = "1"

    = Join-Path C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot "py"
 = Join-Path  "ecom_copilot_api.py"

if (-not (Test-Path -LiteralPath )) {
    Write-Host "❌ API script not found:" -ForegroundColor Red
    Write-Host "   " -ForegroundColor Yellow
    exit 1
}

 = "py"
try {
     = &  --version 2>
} catch {
     = "python"
}

Write-Host "Using Python command: " -ForegroundColor Cyan
Write-Host "If FastAPI/Uvicorn are missing, install with:" -ForegroundColor Yellow
Write-Host '   py -m pip install fastapi "uvicorn[standard]"' -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting API at http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host ""

Push-Location 
&  -m uvicorn ecom_copilot_api:app --reload --host 127.0.0.1 --port 8000
Pop-Location
'@

Set-Content -LiteralPath $apiRunnerPath -Value $apiRunnerContent -Encoding UTF8
Write-Host ("Wrote API runner PS1: {0}" -f $apiRunnerPath) -ForegroundColor Green

# ------------------------------------------------------------
# BAT launcher for the API
# ------------------------------------------------------------
$apiBatPath = Join-Path $runDir "ecom_copilot_api.bat"

$apiBatContent = @'
@echo off
set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

cd /d "%ROOT%\ps1"
powershell -ExecutionPolicy Bypass -File ".\ecom_copilot_run_api.ps1"
'@

Set-Content -LiteralPath $apiBatPath -Value $apiBatContent -Encoding ASCII
Write-Host ("Wrote API BAT launcher: {0}" -f $apiBatPath) -ForegroundColor Green

Write-Host ""
Write-Host "✅ API scaffolding complete." -ForegroundColor Green
Write-Host ("   Next: double-click {0}" -f $apiBatPath)
