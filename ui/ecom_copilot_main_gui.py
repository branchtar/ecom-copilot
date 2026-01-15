"""
Ecom Copilot - Main Dashboard GUI (API-backed)

Desktop cockpit that talks to the local FastAPI backend at http://127.0.0.1:8001.
- Left nav: Dashboard / Suppliers / Emails / Marketplaces / Settings
- Dashboard pulls data from:
    /dashboard/kpis
    /dashboard/marketplace-balances
    /dashboard/recent-orders
    /dashboard/stock-alerts
- Settings / API pulls from:
    /settings/api-status
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

import requests
import PySimpleGUI as sg

# ------------------------------------------------------------
# Constants
# ------------------------------------------------------------

API_BASE = "http://127.0.0.1:8001"
BASE_DIR = Path(__file__).resolve().parents[1]  # ...\Bwaaack\Ecom Copilot


# ------------------------------------------------------------
# API helpers
# ------------------------------------------------------------

def api_get(path: str, default: Any = None) -> Any:
    """
    Simple GET helper against the local API.
    Returns JSON or the provided default on error.
    """
    url = f"{API_BASE}{path}"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"[WARN] API GET failed for {url!r}: {exc}")
        return default


def fmt_currency(value: Any, currency_symbol: str = "$") -> str:
    try:
        num = float(value)
    except Exception:
        return f"{currency_symbol}0.00"
    return f"{currency_symbol}{num:,.2f}"


def extract_rows(payload: Any) -> List[Dict[str, Any]]:
    """
    Normalise API responses into a list of row dicts.

    Supports:
      - list of dicts
      - dict with 'rows' or 'data' keys
    """
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        rows = payload.get("rows") or payload.get("data") or []
        if isinstance(rows, list):
            return rows
    return []


# ------------------------------------------------------------
# Small UI helper pieces
# ------------------------------------------------------------

def kpi_card(title: str, value_key: str, subtitle: str = "") -> sg.Frame:
    """Simple KPI card frame."""
    return sg.Frame(
        title,
        [
            [sg.Text("—", key=value_key, font=("Segoe UI", 18, "bold"))],
            [sg.Text(subtitle, font=("Segoe UI", 8))]
        ],
        pad=(5, 5),
        relief=sg.RELIEF_RIDGE,
        element_justification="center",
        expand_x=True,
    )


def make_dashboard_page() -> sg.Column:
    """Main dashboard page layout (API-backed)."""

    # KPI row – 4 cards like the mock
    kpi_row = [
        kpi_card("Total Sales (7d)", "-KPI_TOTAL_SALES-", "All marketplaces"),
        kpi_card("Orders (7d)", "-KPI_ORDERS-", "Completed orders"),
        kpi_card("Returns (7d)", "-KPI_RETURNS-", "Processed returns"),
        kpi_card("Items Sold (7d)", "-KPI_ITEMS-", "Units shipped"),
    ]

    # Sales overview – placeholder frame (chart will live here later)
    sales_overview_frame = sg.Frame(
        "Sales Overview (placeholder)",
        [[sg.Text("Chart wiring comes later — placeholder for 30-day sales graph.")]],
        expand_x=True,
        expand_y=False,
    )

    # Marketplace balances table
    balances_table = sg.Table(
        headings=["Marketplace", "Balance", "Next Payout"],
        values=[],
        key="-BALANCES_TABLE-",
        auto_size_columns=True,
        expand_x=True,
        expand_y=True,
        justification="left",
        num_rows=4,
        enable_events=False,
    )

    balances_frame = sg.Frame(
        "Marketplace Balances",
        [[balances_table]],
        expand_x=True,
        expand_y=True,
    )

    # Recent orders table
    recent_orders_table = sg.Table(
        headings=["#", "Customer", "Status", "Date", "Total"],
        values=[],
        key="-RECENT_ORDERS_TABLE-",
        auto_size_columns=True,
        expand_x=True,
        expand_y=True,
        justification="left",
        num_rows=6,
        enable_events=False,
    )

    recent_orders_frame = sg.Frame(
        "Recent Orders",
        [[recent_orders_table]],
        expand_x=True,
        expand_y=True,
    )

    # Stock alerts table
    stock_alerts_table = sg.Table(
        headings=["SKU", "Product", "Stock", "Supplier"],
        values=[],
        key="-STOCK_ALERTS_TABLE-",
        auto_size_columns=True,
        expand_x=True,
        expand_y=True,
        justification="left",
        num_rows=6,
        enable_events=False,
    )

    stock_alerts_frame = sg.Frame(
        "Stock Alerts",
        [[stock_alerts_table]],
        expand_x=True,
        expand_y=True,
    )

    layout = [
        [sg.Text("Dashboard", font=("Segoe UI", 16, "bold"))],
        [sg.Text("Welcome back, Kyle!", font=("Segoe UI", 11))],
        kpi_row,
        [sales_overview_frame],
        [balances_frame],
        [recent_orders_frame, stock_alerts_frame],
    ]

    return sg.Column(layout, key="-PAGE_DASHBOARD-", visible=True, expand_x=True, expand_y=True)


def make_suppliers_page() -> sg.Column:
    """Suppliers page (ties into supplier pricing engine)."""
    supplier_pricing_ps1 = BASE_DIR / "ps1" / "ecom_copilot_run_supplier_pricing.ps1"

    layout = [
        [sg.Text("Suppliers & Pricing", font=("Segoe UI", 14, "bold"))],
        [
            sg.Text(
                "This section mirrors SellerChamp-style supplier setup:\n"
                "- config\\suppliers.csv for master supplier info\n"
                "- data\\supplier_products.csv for SKU/cost/weight/etc\n"
                "- pricing engine to calculate min/max price per marketplace"
            )
        ],
        [sg.HorizontalSeparator()],
        [
            sg.Button(
                "Open Supplier Pricing Module",
                key="-BTN_OPEN_SUPPLIER_PRICING-",
                size=(30, 1),
                disabled=not supplier_pricing_ps1.is_file(),
                tooltip=str(supplier_pricing_ps1),
            )
        ],
        [
            sg.Text(
                "(Button is disabled if ecom_copilot_run_supplier_pricing.ps1 "
                "was not found in ps1/.)",
                font=("Segoe UI", 8),
                text_color="gray",
            )
        ],
        [sg.HorizontalSeparator()],
        [sg.Text("Later we can add:", font=("Segoe UI", 10, "bold"))],
        [
            sg.Text(
                "• Supplier list grid\n"
                "• Quick filters (active, paused)\n"
                "• Per-supplier margin presets\n"
                "• Buttons to push prices to marketplaces",
                font=("Segoe UI", 9),
            )
        ],
    ]

    return sg.Column(layout, key="-PAGE_SUPPLIERS-", visible=False, expand_x=True, expand_y=True)


def make_emails_page() -> sg.Column:
    """Emails page placeholder."""
    layout = [
        [sg.Text("Emails & Automations", font=("Segoe UI", 14, "bold"))],
        [
            sg.Text(
                "This tab will connect to the Amazon Email App / scheduler:\n"
                "- Rules for thank-you emails, instructions, feedback requests\n"
                "- Per-marketplace toggles\n"
                "- Log of recent sends and queue status"
            )
        ],
        [sg.HorizontalSeparator()],
        [
            sg.Button(
                "Launch Amazon Email Scheduler (placeholder)",
                key="-BTN_LAUNCH_EMAIL_APP-",
                size=(35, 1),
            )
        ],
        [
            sg.Text(
                "For now this button is just a placeholder (no external process wired).",
                font=("Segoe UI", 8),
                text_color="gray",
            )
        ],
    ]

    return sg.Column(layout, key="-PAGE_EMAILS-", visible=False, expand_x=True, expand_y=True)


def make_marketplaces_page() -> sg.Column:
    """Marketplaces config placeholder."""
    layout = [
        [sg.Text("Marketplaces", font=("Segoe UI", 14, "bold"))],
        [
            sg.Text(
                "High-level marketplace toggles and preferences will live here:\n"
                "- Which marketplaces are active (Amazon, Walmart, Shopify, etc.)\n"
                "- Default handling time per channel\n"
                "- Default shipping service and backup service\n"
                "- Per-channel min/maximum margin presets"
            )
        ],
        [sg.HorizontalSeparator()],
        [
            sg.Checkbox("Amazon Bwaaack", key="-MP_AMAZON_BWAAACK-", default=True),
            sg.Checkbox("Walmart Bwaaack", key="-MP_WALMART_BWAAACK-", default=True),
        ],
        [
            sg.Checkbox(
                "Shopify (Ethnic Musical Instruments)",
                key="-MP_SHOPIFY_ETHNIC-",
                default=True,
            ),
            sg.Checkbox(
                "Shopify (Refreshed Shoe Cleaner)",
                key="-MP_SHOPIFY_REFRESHED-",
                default=True,
            ),
        ],
        [
            sg.Text(
                "These switches are just UI for now — we'll wire them into logic later.",
                font=("Segoe UI", 8),
                text_color="gray",
            )
        ],
    ]

    return sg.Column(layout, key="-PAGE_MARKETPLACES-", visible=False, expand_x=True, expand_y=True)


def make_settings_page() -> sg.Column:
    """Settings / API connections page (data from /settings/api-status)."""

    api_table = sg.Table(
        headings=["Service", "Account", "Status", "Env file"],
        values=[],
        key="-API_STATUS_TABLE-",
        auto_size_columns=True,
        expand_x=True,
        expand_y=True,
        justification="left",
        num_rows=10,
        enable_events=True,
    )

    log_box = sg.Multiline(
        "",
        key="-API_LOG-",
        size=(80, 8),
        expand_x=True,
        expand_y=False,
        disabled=True,
        autoscroll=True,
        font=("Consolas", 9),
    )

    layout = [
        [sg.Text("Settings / API Connections", font=("Segoe UI", 14, "bold"))],
        [
            sg.Text(
                "This calls the local API /settings/api-status endpoint.\n"
                "Think of it as the high-level health check for each connection."
            )
        ],
        [sg.Button("Refresh API Status", key="-BTN_REFRESH_API-", size=(20, 1))],
        [api_table],
        [sg.Text("Details for selected row:", font=("Segoe UI", 10, "bold"))],
        [log_box],
    ]

    return sg.Column(layout, key="-PAGE_SETTINGS-", visible=False, expand_x=True, expand_y=True)


# ------------------------------------------------------------
# API-backed data loaders
# ------------------------------------------------------------

def populate_dashboard_from_api(window: sg.Window) -> None:
    """Fill all dashboard widgets using the local API."""

    # KPIs
    kpis = api_get("/dashboard/kpis", {}) or {}
    total_sales = kpis.get("total_sales_7d") or kpis.get("total_sales") or 0
    orders = kpis.get("orders_7d") or kpis.get("orders") or 0
    returns = kpis.get("returns_7d") or kpis.get("returns") or 0
    items = kpis.get("items_sold_7d") or kpis.get("items_sold") or 0

    window["-KPI_TOTAL_SALES-"].update(fmt_currency(total_sales))
    window["-KPI_ORDERS-"].update(str(orders))
    window["-KPI_RETURNS-"].update(str(returns))
    window["-KPI_ITEMS-"].update(str(items))

    # Marketplace balances
    balances_payload = api_get("/dashboard/marketplace-balances", []) or []
    balances_rows = extract_rows(balances_payload)
    table_balances = [
        [
            row.get("marketplace", ""),
            fmt_currency(row.get("balance", 0)),
            row.get("next_payout", ""),
        ]
        for row in balances_rows
    ]
    window["-BALANCES_TABLE-"].update(values=table_balances)

    # Recent orders
    orders_payload = api_get("/dashboard/recent-orders", []) or []
    recent_rows = extract_rows(orders_payload)
    table_recent = [
        [
            row.get("order_id", ""),
            row.get("customer", ""),
            row.get("status", ""),
            row.get("date", ""),
            fmt_currency(row.get("total", 0)),
        ]
        for row in recent_rows
    ]
    window["-RECENT_ORDERS_TABLE-"].update(values=table_recent)

    # Stock alerts
    alerts_payload = api_get("/dashboard/stock-alerts", []) or []
    alert_rows = extract_rows(alerts_payload)
    table_alerts = [
        [
            row.get("sku", ""),
            row.get("product", ""),
            str(row.get("stock", "")),
            row.get("supplier", ""),
        ]
        for row in alert_rows
    ]
    window["-STOCK_ALERTS_TABLE-"].update(values=table_alerts)


def refresh_api_status(window: sg.Window) -> None:
    """Populate the API status table and clear log box."""
    data = api_get("/settings/api-status", []) or []
    # data can be a list of dicts, which is what our API returns.
    if not isinstance(data, list):
        rows = extract_rows(data)
    else:
        rows = data

    table_values = [
        [
            row.get("service", ""),
            row.get("account", ""),
            row.get("status", ""),
            row.get("env_path", ""),
        ]
        for row in rows
    ]
    window["-API_STATUS_TABLE-"].update(values=table_values)
    window["-API_LOG-"].update("")
    window.metadata = {"api_status_rows": rows}


def update_log_for_selected_row(window: sg.Window, selected_indices: List[int]) -> None:
    rows = (window.metadata or {}).get("api_status_rows", [])
    if not rows or not selected_indices:
        return
    idx = selected_indices[0]
    if idx < 0 or idx >= len(rows):
        return

    row = rows[idx]
    log_lines = row.get("log_lines")
    if isinstance(log_lines, list):
        text = "\n".join(str(line) for line in log_lines)
    else:
        # Fallback: pretty-print the row dict
        text = json.dumps(row, indent=2)
    window["-API_LOG-"].update(text)


# ------------------------------------------------------------
# Suppliers integration helper
# ------------------------------------------------------------

def launch_supplier_pricing_runner() -> None:
    """Kick off the supplier pricing PowerShell runner if present."""
    ps1_path = BASE_DIR / "ps1" / "ecom_copilot_run_supplier_pricing.ps1"
    if not ps1_path.is_file():
        sg.popup_error(
            "Supplier pricing runner not found.",
            f"Expected at:\n{ps1_path}",
            keep_on_top=True,
        )
        return

    subprocess.Popen(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_path)],
        creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0),
    )


# ------------------------------------------------------------
# Main window
# ------------------------------------------------------------

def build_window() -> sg.Window:
    sg.theme("SystemDefault")

    nav_column = sg.Column(
        [
            [sg.Text("Ecom Copilot", font=("Segoe UI", 14, "bold"))],
            [sg.Text(f"Root:\n{BASE_DIR}", font=("Segoe UI", 7), size=(22, 3))],
            [sg.HorizontalSeparator()],
            [sg.Button("Dashboard", key="-NAV_DASHBOARD-", size=(18, 1))],
            [sg.Button("Suppliers", key="-NAV_SUPPLIERS-", size=(18, 1))],
            [sg.Button("Emails", key="-NAV_EMAILS-", size=(18, 1))],
            [sg.Button("Marketplaces", key="-NAV_MARKETPLACES-", size=(18, 1))],
            [sg.Button("Settings / API", key="-NAV_SETTINGS-", size=(18, 1))],
            [sg.VPush()],
            [sg.Button("Exit", key="-NAV_EXIT-", size=(18, 1))],
        ],
        pad=(5, 5),
        element_justification="left",
        expand_y=True,
    )

    dashboard_page = make_dashboard_page()
    suppliers_page = make_suppliers_page()
    emails_page = make_emails_page()
    marketplaces_page = make_marketplaces_page()
    settings_page = make_settings_page()

    main_column = sg.Column(
        [
            [dashboard_page],
            [suppliers_page],
            [emails_page],
            [marketplaces_page],
            [settings_page],
        ],
        expand_x=True,
        expand_y=True,
    )

    layout = [[nav_column, main_column]]

    window = sg.Window(
        "Ecom Copilot - Main Dashboard",
        layout,
        resizable=True,
        finalize=True,
        size=(1100, 650),
    )

    # Allow pages to stretch with window
    for key in [
        "-PAGE_DASHBOARD-",
        "-PAGE_SUPPLIERS-",
        "-PAGE_EMAILS-",
        "-PAGE_MARKETPLACES-",
        "-PAGE_SETTINGS-",
    ]:
        window[key].expand(True, True)

    # Initial data pull
    populate_dashboard_from_api(window)
    refresh_api_status(window)

    return window


def show_page(window: sg.Window, page_key: str) -> None:
    for key in [
        "-PAGE_DASHBOARD-",
        "-PAGE_SUPPLIERS-",
        "-PAGE_EMAILS-",
        "-PAGE_MARKETPLACES-",
        "-PAGE_SETTINGS-",
    ]:
        window[key].update(visible=(key == page_key))


def main() -> None:
    window = build_window()

    while True:
        event, values = window.read()

        if event in (sg.WIN_CLOSED, "-NAV_EXIT-"):
            break

        # Navigation
        if event == "-NAV_DASHBOARD-":
            show_page(window, "-PAGE_DASHBOARD-")
        elif event == "-NAV_SUPPLIERS-":
            show_page(window, "-PAGE_SUPPLIERS-")
        elif event == "-NAV_EMAILS-":
            show_page(window, "-PAGE_EMAILS-")
        elif event == "-NAV_MARKETPLACES-":
            show_page(window, "-PAGE_MARKETPLACES-")
        elif event == "-NAV_SETTINGS-":
            show_page(window, "-PAGE_SETTINGS-")

        # Settings / API
        elif event == "-BTN_REFRESH_API-":
            refresh_api_status(window)
        elif event == "-API_STATUS_TABLE-":
            selected = values.get("-API_STATUS_TABLE-", [])
            update_log_for_selected_row(window, selected)

        # Suppliers
        elif event == "-BTN_OPEN_SUPPLIER_PRICING-":
            launch_supplier_pricing_runner()

        # Emails placeholder
        elif event == "-BTN_LAUNCH_EMAIL_APP-":
            sg.popup(
                "Email automations wiring will live here.\n"
                "For now this is just a placeholder button.",
                keep_on_top=True,
            )

    window.close()


if __name__ == "__main__":
    main()
