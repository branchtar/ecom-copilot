# Ecom Copilot - full scaffolding (Tkinter GUI + accounts registry + runners + BATs)

# >>> EDIT THIS LINE ONLY IF ROOT CHANGES <<<
$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Full Scaffolding        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root : $root"
Write-Host ""

# 1) Ensure root exists
if (-not (Test-Path -LiteralPath $root)) {
    New-Item -ItemType Directory -Path $root | Out-Null
    Write-Host "Created root folder: $root" -ForegroundColor Green
} else {
    Write-Host "Root folder already exists." -ForegroundColor DarkGray
}

# 2) Standard subfolders
$folders = @(
    "keys",
    "py",
    "ps1",
    "run",
    "diagnostic",
    "js",
    "json",
    "input",
    "output",
    "logs",
    "docs",
    "config",
    "ui",
    "assets"
)

foreach ($f in $folders) {
    $path = Join-Path $root $f
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Write-Host "Created folder: $path" -ForegroundColor Green
    } else {
        Write-Host "Folder already exists: $path" -ForegroundColor DarkGray
    }
}

# 3) accounts.json registry
$configDir    = Join-Path $root "config"
$accountsPath = Join-Path $configDir "accounts.json"

$accountsJson = @'
{
  "amazon": {
    "bwaaack": {
      "env_path": "C:\\Users\\Kylem\\OneDrive - Copy and Paste LLC\\Copy and Paste LLC\\marketplaces\\Amazon\\Amazon API\\keys\\.env"
    }
  },
  "walmart": {
    "bwaaack": {
      "env_path": "C:\\Users\\Kylem\\OneDrive - Copy and Paste LLC\\Bwaaack\\Marketplaces\\Walmart\\Walmart API\\keys\\.env"
    }
  },
  "shopify": {
    "refreshed": {
      "env_path": "C:\\Users\\Kylem\\OneDrive - Copy and Paste LLC\\Copy and Paste LLC\\Brands\\Refreshed Shoe Cleaner\\Marketplaces\\Shopify\\Shopify API\\keys\\.env"
    }
  },
  "reverb": {
    "bwaaack": {
      "env_path": "REPLACE_WITH_REVERB_ENV_PATH"
    }
  },
  "ebay": {
    "bwaaack": {
      "env_path": "REPLACE_WITH_EBAY_ENV_PATH"
    }
  },
  "usps": {
    "default": {
      "env_path": "REPLACE_WITH_USPS_ENV_PATH"
    }
  },
  "ups": {
    "default": {
      "env_path": "REPLACE_WITH_UPS_ENV_PATH"
    }
  },
  "fedex": {
    "default": {
      "env_path": "REPLACE_WITH_FEDEX_ENV_PATH"
    }
  }
}
'@

$accountsJson | Set-Content -Path $accountsPath -Encoding UTF8
Write-Host "Wrote accounts registry: $accountsPath" -ForegroundColor Yellow

# 4) Main Python GUI using Tkinter + accounts awareness: py\ecom_copilot_main.py
$pyMainPath = Join-Path $root "py\ecom_copilot_main.py"
$pyMainContent = @'
"""
Ecom Copilot main GUI entry point (Tkinter) with accounts registry.

- Buttons for each marketplace and carrier.
- Log panel to show status messages.
- Reads config/accounts.json to find env_path for each service/account.

NOTE: This version does NOT use PySimpleGUI. It only uses Tkinter from the standard library.
"""

import os
import json
import tkinter as tk
from tkinter import ttk

# Map GUI button keys to (service, account) entries in accounts.json
SERVICE_ACCOUNT_MAP = {
    "AMAZON": ("amazon", "bwaaack"),
    "WALMART": ("walmart", "bwaaack"),
    "SHOPIFY": ("shopify", "refreshed"),
    "REVERB": ("reverb", "bwaaack"),
    "EBAY": ("ebay", "bwaaack"),
    "USPS": ("usps", "default"),
    "UPS": ("ups", "default"),
    "FEDEX": ("fedex", "default"),
}

BUTTONS_MARKETPLACE = [
    ("Test Amazon", "AMAZON"),
    ("Test Walmart", "WALMART"),
    ("Test Shopify", "SHOPIFY"),
    ("Test Reverb", "REVERB"),
    ("Test eBay", "EBAY"),
]

BUTTONS_CARRIER = [
    ("Test USPS", "USPS"),
    ("Test UPS", "UPS"),
    ("Test FedEx", "FEDEX"),
]

# Resolve base dir (root of Ecom Copilot project)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACCOUNTS_PATH = os.path.join(BASE_DIR, "config", "accounts.json")

_ACCOUNTS_CACHE = None
_ACCOUNTS_ERROR = None


def log(text_widget, message: str) -> None:
    """Append a line to the log panel and print to stdout."""
    text_widget.config(state="normal")
    text_widget.insert("end", message + "\\n")
    text_widget.see("end")
    text_widget.config(state="disabled")
    print(message)


def load_accounts() -> None:
    """Load accounts.json once and cache it."""
    global _ACCOUNTS_CACHE, _ACCOUNTS_ERROR
    if _ACCOUNTS_CACHE is not None or _ACCOUNTS_ERROR is not None:
        return

    try:
        with open(ACCOUNTS_PATH, "r", encoding="utf-8") as f:
            _ACCOUNTS_CACHE = json.load(f)
    except FileNotFoundError:
        _ACCOUNTS_ERROR = f"accounts.json not found at: {ACCOUNTS_PATH}"
    except Exception as exc:
        _ACCOUNTS_ERROR = f"Error loading accounts.json: {exc!r}"


def get_env_path(service: str, account: str):
    """
    Return (env_path, error_message).
    If there is a problem, env_path will be None and error_message will be non-empty.
    """
    load_accounts()
    if _ACCOUNTS_ERROR:
        return None, _ACCOUNTS_ERROR

    svc = _ACCOUNTS_CACHE.get(service)
    if not svc:
        return None, f"No service entry for '{service}' in accounts.json."

    acc = svc.get(account)
    if not acc:
        return None, f"No account '{account}' under service '{service}' in accounts.json."

    env_path = acc.get("env_path")
    if not env_path:
        return None, f"No env_path defined for {service}.{account} in accounts.json."

    return env_path, None


def handle_action(text_widget, action_key: str) -> None:
    """Handle button presses; check env_path and log diagnostics."""
    if action_key not in SERVICE_ACCOUNT_MAP:
        log(text_widget, f"Unknown action key: {action_key}")
        return

    service, account = SERVICE_ACCOUNT_MAP[action_key]
    header = f"=== {service.upper()} ({account}) ==="
    log(text_widget, header)

    env_path, err = get_env_path(service, account)
    if err:
        log(text_widget, f"⚠ {err}")
        return

    if os.path.exists(env_path):
        log(text_widget, f"✅ Env file found at: {env_path}")
        # TODO: in the future, load env and call actual API here.
        log(text_widget, "   (API call wiring TODO)")
    else:
        log(text_widget, "❌ Env file path set but file does not exist:")
        log(text_widget, f"   {env_path}")


def build_window():
    root = tk.Tk()
    root.title("Ecom Copilot - API Hub")
    root.geometry("900x600")

    # Configure grid to be resizable
    root.columnconfigure(0, weight=0)
    root.columnconfigure(1, weight=1)
    root.rowconfigure(0, weight=1)

    # Left frame for buttons
    left = ttk.Frame(root, padding=10)
    left.grid(row=0, column=0, sticky="nsw")

    ttk.Label(left, text="Marketplace APIs", font=("Segoe UI", 14, "bold")).grid(
        row=0, column=0, pady=(0, 5), sticky="w"
    )

    row = 1
    for label, key in BUTTONS_MARKETPLACE:
        btn = ttk.Button(
            left,
            text=label,
            command=lambda k=key: handle_action(root.log_text, k),
            width=20,
        )
        btn.grid(row=row, column=0, pady=3, sticky="w")
        row += 1

    ttk.Separator(left, orient="horizontal").grid(
        row=row, column=0, pady=10, sticky="ew"
    )
    row += 1

    ttk.Label(left, text="Carrier APIs", font=("Segoe UI", 14, "bold")).grid(
        row=row, column=0, pady=(0, 5), sticky="w"
    )
    row += 1

    for label, key in BUTTONS_CARRIER:
        btn = ttk.Button(
            left,
            text=label,
            command=lambda k=key: handle_action(root.log_text, k),
            width=20,
        )
        btn.grid(row=row, column=0, pady=3, sticky="w")
        row += 1

    ttk.Separator(left, orient="horizontal").grid(
        row=row, column=0, pady=10, sticky="ew"
    )
    row += 1

    exit_btn = ttk.Button(left, text="Exit", command=root.destroy, width=20)
    exit_btn.grid(row=row, column=0, pady=10, sticky="w")

    # Right frame for log
    right = ttk.Frame(root, padding=10)
    right.grid(row=0, column=1, sticky="nsew")
    right.columnconfigure(0, weight=1)
    right.rowconfigure(1, weight=1)

    ttk.Label(right, text="Log", font=("Segoe UI", 14, "bold")).grid(
        row=0, column=0, sticky="w"
    )

    text = tk.Text(right, wrap="word", state="disabled")
    text.grid(row=1, column=0, sticky="nsew")

    scrollbar = ttk.Scrollbar(right, orient="vertical", command=text.yview)
    scrollbar.grid(row=1, column=1, sticky="ns")
    text["yscrollcommand"] = scrollbar.set

    # Attach log widget to root so callbacks can reach it
    root.log_text = text

    # Initial messages
    log(text, "Ecom Copilot API Hub loaded.")
    log(text, "Press a button to run an accounts-aware diagnostic.")

    return root


def main():
    root = build_window()
    root.mainloop()


if __name__ == "__main__":
    main()
'@

$pyMainContent | Set-Content -Path $pyMainPath -Encoding UTF8
Write-Host "Wrote Python Tkinter GUI main (accounts-aware): $pyMainPath" -ForegroundColor Yellow

# 5) PowerShell runner: ps1\ecom_copilot_run.ps1
$psRunPath = Join-Path $root "ps1\ecom_copilot_run.ps1"
$psRunContent = @'
# Ecom Copilot - PowerShell runner
# Runs the main Python GUI entry point.

param(
    [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Run                      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("Root : {0}" -f $Root)
Write-Host ""

$pyFile = Join-Path $Root "py\ecom_copilot_main.py"

if (-not (Test-Path -LiteralPath $pyFile)) {
    Write-Host ("Python main file not found: {0}" -f $pyFile) -ForegroundColor Red
    exit 1
}

# Try 'py' launcher first, then 'python'
$pythonCmd = "py"
$pythonVersion = ""

try {
    $pythonVersion = & $pythonCmd --version 2>$null
} catch {
    $pythonCmd = "python"
    try {
        $pythonVersion = & $pythonCmd --version 2>$null
    } catch {
        Write-Host "Could not find 'py' or 'python' on PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host ("Using Python command: {0} {1}" -f $pythonCmd, $pythonVersion) -ForegroundColor Yellow
Write-Host ""

& $pythonCmd $pyFile

Write-Host ""
Write-Host "Ecom Copilot run script finished." -ForegroundColor Green
'@
$psRunContent | Set-Content -Path $psRunPath -Encoding UTF8
Write-Host "Wrote PowerShell runner: $psRunPath" -ForegroundColor Yellow

# 6) Diagnostic Python stub: diagnostic\diagnostic_api_check.py
$diagPyPath = Join-Path $root "diagnostic\diagnostic_api_check.py"
$diagPyContent = @'
# Ecom Copilot diagnostic - API check stub
# This will eventually test marketplace and carrier API connections.

def main():
    print("Ecom Copilot diagnostic - API check stub")
    print("TODO: implement real API connectivity tests here.")

if __name__ == "__main__":
    main()
'@
$diagPyContent | Set-Content -Path $diagPyPath -Encoding UTF8
Write-Host "Wrote diagnostic Python stub: $diagPyPath" -ForegroundColor Yellow

# 7) Diagnostic PowerShell runner: diagnostic\diagnostic_run_api_check.ps1
$diagPsPath = Join-Path $root "diagnostic\diagnostic_run_api_check.ps1"
$diagPsContent = @'
# Ecom Copilot - diagnostic runner for API check

param(
    [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - API Diagnostic           " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("Root : {0}" -f $Root)
Write-Host ""

$pyFile = Join-Path $Root "diagnostic\diagnostic_api_check.py"

if (-not (Test-Path -LiteralPath $pyFile)) {
    Write-Host ("Diagnostic Python file not found: {0}" -f $pyFile) -ForegroundColor Red
    exit 1
}

$pythonCmd = "py"
$pythonVersion = ""

try {
    $pythonVersion = & $pythonCmd --version 2>$null
} catch {
    $pythonCmd = "python"
    try {
        $pythonVersion = & $pythonCmd --version 2>$null
    } catch {
        Write-Host "Could not find 'py' or 'python' on PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host ("Using Python command: {0} {1}" -f $pythonCmd, $pythonVersion) -ForegroundColor Yellow
Write-Host ""

& $pythonCmd $pyFile

Write-Host ""
Write-Host "Ecom Copilot API diagnostic finished." -ForegroundColor Green
'@
$diagPsContent | Set-Content -Path $diagPsPath -Encoding UTF8
Write-Host "Wrote diagnostic PowerShell runner: $diagPsPath" -ForegroundColor Yellow

# 8) Main BAT launcher in run: run\ecom_copilot_run.bat
$batMainPath = Join-Path $root "run\ecom_copilot_run.bat"
$batMainContent = @'
@echo off
REM Ecom Copilot - main launcher

SET ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo ==========================================
echo  Ecom Copilot - Run
echo ==========================================
echo Root: "%ROOT%"
echo.

cd /d "%ROOT%"

powershell -ExecutionPolicy Bypass -File "%ROOT%\ps1\ecom_copilot_run.ps1" -Root "%ROOT%"

echo.
echo Done. Press any key to close...
pause >nul
'@
$batMainContent | Set-Content -Path $batMainPath -Encoding ASCII
Write-Host "Wrote main BAT launcher: $batMainPath" -ForegroundColor Yellow

# 9) Diagnostic BAT launcher in diagnostic: diagnostic\diagnostic_run_api_check.bat
$batDiagPath = Join-Path $root "diagnostic\diagnostic_run_api_check.bat"
$batDiagContent = @'
@echo off
REM Ecom Copilot - API diagnostic launcher

SET ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

echo ==========================================
echo  Ecom Copilot - API Diagnostic
echo ==========================================
echo Root: "%ROOT%"
echo.

cd /d "%ROOT%"

powershell -ExecutionPolicy Bypass -File "%ROOT%\diagnostic\diagnostic_run_api_check.ps1" -Root "%ROOT%"

echo.
echo Done. Press any key to close...
pause >nul
'@
$batDiagContent | Set-Content -Path $batDiagPath -Encoding ASCII
Write-Host "Wrote diagnostic BAT launcher: $batDiagPath" -ForegroundColor Yellow

Write-Host ""
Write-Host "Scaffolding complete (Tkinter, no PySimpleGUI) and accounts-aware GUI ready." -ForegroundColor Green
Write-Host "accounts.json path:" -ForegroundColor Green
Write-Host "  $accountsPath" -ForegroundColor Cyan
Write-Host "Main launcher BAT (double-click later):" -ForegroundColor Green
Write-Host "  $batMainPath" -ForegroundColor Cyan
Write-Host "Diagnostic API check BAT (double-click later):" -ForegroundColor Green
Write-Host "  $batDiagPath" -ForegroundColor Cyan
Write-Host ""
