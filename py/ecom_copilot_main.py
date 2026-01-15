"""
Ecom Copilot main GUI entry point (Tkinter).

This window is the API Hub:
- Buttons for each marketplace (Amazon, Walmart, Shopify, Reverb, eBay)
- Buttons for each carrier (USPS, UPS, FedEx)
- Status lights (gray/blue/green/yellow/red) next to each button
- Log panel showing diagnostics

Env + accounts registry:
- config/accounts.json maps each service/account to an env_path
- env_diagnostic.run_env_diagnostic() checks that env file and returns a status code

For USPS, we also call a live USPS API ping using carriers_usps.test_usps_connection().
"""

from typing import Dict, Tuple

import tkinter as tk
from tkinter import ttk

from env_diagnostic import run_env_diagnostic
from accounts_registry import load_accounts_registry

# USPS extra diagnostic
try:
    from carriers_usps import test_usps_connection
except Exception:
    test_usps_connection = None  # type: ignore


# Service/action keys and labels
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


# Map our internal status codes to colors
STATUS_COLORS = {
    "unknown": "light gray",
    "blue": "dodger blue",
    "ok": "lime green",
    "warn": "gold",
    "error": "red",
}


def resolve_env_path_for_action(cfg: Dict, action_key: str) -> Tuple[str, str]:
    """
    Return (service_name, env_path) for a given action key.

    This uses hard-coded account names for now:
      - amazon.bwaaack
      - walmart.bwaaack
      - shopify.refreshed
      - reverb.bwaaack
      - ebay.bwaaack
      - usps.default
      - ups.default
      - fedex.default
    """
    mapping = {
        "AMAZON": ("amazon", "bwaaack"),
        "WALMART": ("walmart", "bwaaack"),
        "SHOPIFY": ("shopify", "ethnic"),
        "REVERB": ("reverb", "bwaaack"),
        "EBAY": ("ebay", "bwaaack"),
        "USPS": ("usps", "default"),
        "UPS": ("ups", "default"),
        "FEDEX": ("fedex", "default"),
    }

    if action_key not in mapping:
        return ("", "")

    service, account = mapping[action_key]
    service_cfg = cfg.get(service, {})
    account_cfg = service_cfg.get(account, {})
    env_path = account_cfg.get("env_path", "")

    return service, env_path


def tk_log(text_widget: tk.Text, message: str) -> None:
    """Append a line to the log panel and to stdout."""
    text_widget.config(state="normal")
    text_widget.insert("end", message + "\n")
    text_widget.see("end")
    text_widget.config(state="disabled")
    print(message)


def build_status_lights(root: tk.Tk):
    """
    Build little colored dots next to each button.
    Returns a dict action_key -> canvas widget.
    """
    status_widgets: Dict[str, tk.Canvas] = {}
    root.status_widgets = status_widgets  # type: ignore[attr-defined]
    return status_widgets


def set_status(root: tk.Tk, action_key: str, status: str):
    """
    Change the color of the dot for a given action_key.
    status in {"unknown","blue","ok","warn","error"}.
    """
    status_widgets: Dict[str, tk.Canvas] = getattr(root, "status_widgets", {})
    canvas = status_widgets.get(action_key)
    if not canvas:
        return

    color = STATUS_COLORS.get(status, STATUS_COLORS["unknown"])
    canvas.delete("all")
    canvas.create_oval(2, 2, 12, 12, fill=color, outline="")


def handle_action(root: tk.Tk, text_widget: tk.Text, action_key: str):
    """
    Run env diagnostic (and USPS live ping if applicable) for the given action key.
    """
    cfg = load_accounts_registry()

    tk_log(text_widget, "")
    tk_log(text_widget, f"=== {action_key} diagnostic ===")

    # 1) Look up env_path
    service, env_path = resolve_env_path_for_action(cfg, action_key)
    if not service or not env_path:
        tk_log(text_widget, f"⚠ No env_path defined for {action_key.lower()} in accounts.json.")
        set_status(root, action_key, "error")
        return

    tk_log(text_widget, f"Using env file: {env_path}")

    # 2) Basic env health check (file exists + required keys present)
    status = run_env_diagnostic(
        service_name=service,
        account_name=None,
        env_path=env_path,
        log=lambda m: tk_log(text_widget, "  " + m),
    )

    if status == "error":
        tk_log(text_widget, f"{action_key} env diagnostic reported an error.")
        set_status(root, action_key, "error")
        return

    # 3) USPS-specific live API ping (only if status was good and action is USPS)
    if action_key == "USPS" and status in ("ok", "blue", "warn"):
        if test_usps_connection is None:
            tk_log(text_widget, "⚠ carriers_usps or requests not available; skipping live USPS ping.")
        else:
            try:
                conn_status = test_usps_connection(env_path, lambda msg: tk_log(text_widget, "  " + msg))
            except Exception as exc:
                tk_log(text_widget, f"❌ Unexpected error in USPS ping: {exc!r}")
                conn_status = "error"
            if conn_status in ("error", "warn"):
                status = conn_status
            else:
                status = "ok"

    # 4) Set status light
    set_status(root, action_key, status)


def build_window():
    root = tk.Tk()
    root.title("Ecom Copilot - API Hub")
    root.geometry("950x600")

    root.columnconfigure(0, weight=0)
    root.columnconfigure(1, weight=1)
    root.rowconfigure(0, weight=1)

    status_widgets = build_status_lights(root)

    # Left frame for buttons
    left = ttk.Frame(root, padding=10)
    left.grid(row=0, column=0, sticky="nsw")

    left.columnconfigure(0, weight=0)
    left.columnconfigure(1, weight=0)

    ttk.Label(left, text="Marketplace APIs", font=("Segoe UI", 14, "bold")).grid(
        row=0, column=0, columnspan=2, pady=(0, 5), sticky="w"
    )

    row = 1
    for label, key in BUTTONS_MARKETPLACE:
        btn = ttk.Button(
            left,
            text=label,
            command=lambda k=key: handle_action(root, root.log_text, k),
            width=18,
        )
        btn.grid(row=row, column=0, pady=3, sticky="w")

        dot = tk.Canvas(left, width=16, height=16, highlightthickness=0)
        dot.grid(row=row, column=1, padx=(4, 0))
        status_widgets[key] = dot
        set_status(root, key, "unknown")
        row += 1

    ttk.Separator(left, orient="horizontal").grid(
        row=row, column=0, columnspan=2, pady=10, sticky="ew"
    )
    row += 1

    ttk.Label(left, text="Carrier APIs", font=("Segoe UI", 14, "bold")).grid(
        row=row, column=0, columnspan=2, pady=(0, 5), sticky="w"
    )
    row += 1

    for label, key in BUTTONS_CARRIER:
        btn = ttk.Button(
            left,
            text=label,
            command=lambda k=key: handle_action(root, root.log_text, k),
            width=18,
        )
        btn.grid(row=row, column=0, pady=3, sticky="w")

        dot = tk.Canvas(left, width=16, height=16, highlightthickness=0)
        dot.grid(row=row, column=1, padx=(4, 0))
        status_widgets[key] = dot
        set_status(root, key, "unknown")
        row += 1

    ttk.Separator(left, orient="horizontal").grid(
        row=row, column=0, columnspan=2, pady=10, sticky="ew"
    )
    row += 1

    exit_btn = ttk.Button(left, text="Exit", command=root.destroy, width=18)
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

    root.log_text = text  # type: ignore[attr-defined]
    root.status_widgets = status_widgets  # type: ignore[attr-defined]

    tk_log(text, "Ecom Copilot API Hub loaded.")
    tk_log(
        text,
        "Press a button to run an accounts-aware env diagnostic. USPS will also run a live CityStateLookup ping.",
    )

    return root


def main():
    root = build_window()
    root.mainloop()


if __name__ == "__main__":
    main()

