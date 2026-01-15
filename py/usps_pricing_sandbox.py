"""
USPS Pricing Sandbox GUI for Ecom Copilot.

- Reads USPS_USER_ID from the USPS env referenced in accounts.json
- Lets user enter origin ZIP, destination ZIP, pounds, ounces
- Calls USPS RateV4 API for PRIORITY Mail and shows the rate.

This is a standalone window, separate from the main API Hub.
"""

from __future__ import annotations

import sys
from typing import Tuple

import tkinter as tk
from tkinter import ttk, messagebox

import xml.etree.ElementTree as ET

try:
    import requests
except Exception:  # pragma: no cover - environment issue
    requests = None  # type: ignore

from accounts_registry import load_accounts_registry
from env_diagnostic import parse_dotenv


USPS_API_URL = "https://secure.shippingapis.com/ShippingAPI.dll"


def resolve_usps_env_path() -> str:
    """
    Look up the USPS env_path from config/accounts.json (service: usps, account: default).
    """
    cfg = load_accounts_registry()
    svc = cfg.get("usps", {})
    acct = svc.get("default", {})
    env_path = acct.get("env_path")
    if not env_path:
        raise RuntimeError("No usps.default.env_path defined in accounts.json.")
    return env_path


def get_usps_user_id(env_path: str) -> str:
    """
    Read USPS_USER_ID from the provided env file.
    """
    env = parse_dotenv(env_path)
    user_id = env.get("USPS_USER_ID")
    if not user_id:
        raise RuntimeError(f"USPS_USER_ID missing in env file: {env_path}")
    return user_id


def build_ratev4_request_xml(user_id: str, zip_from: str, zip_to: str, pounds: int, ounces: float) -> str:
    """
    Construct a simple RateV4Request XML for Priority Mail.
    """
    return (
        f'<RateV4Request USERID="{user_id}">'
        f"<Revision>2</Revision>"
        f'<Package ID="1">'
        f"<Service>PRIORITY</Service>"
        f"<ZipOrigination>{zip_from}</ZipOrigination>"
        f"<ZipDestination>{zip_to}</ZipDestination>"
        f"<Pounds>{pounds}</Pounds>"
        f"<Ounces>{ounces:.1f}</Ounces>"
        f"<Container>VARIABLE</Container>"
        f"<Machinable>true</Machinable>"
        f"</Package>"
        f"</RateV4Request>"
    )


def fetch_priority_rate(
    user_id: str,
    zip_from: str,
    zip_to: str,
    pounds: int,
    ounces: float,
) -> Tuple[str, str]:
    """
    Call USPS RateV4 API for a simple Priority Mail rate.

    Returns:
        (result_message, raw_xml_response)
    """
    if requests is None:
        return (
            "Python 'requests' library is not installed. Run 'py -m pip install requests' and try again.",
            "",
        )

    xml_body = build_ratev4_request_xml(user_id, zip_from, zip_to, pounds, ounces)
    params = {"API": "RateV4", "XML": xml_body}

    try:
        resp = requests.get(USPS_API_URL, params=params, timeout=20)
    except Exception as exc:
        return (f"Network error calling USPS: {exc!r}", "")

    text = resp.text

    if resp.status_code != 200:
        return (f"Non-200 HTTP status from USPS: {resp.status_code}", text)

    try:
        root = ET.fromstring(text)
    except Exception as exc:
        return (f"Error parsing USPS XML response: {exc!r}", text)

    # If root is <Error> or contains <Error> children, show that.
    if root.tag == "Error" or root.find(".//Error") is not None:
        desc = root.findtext(".//Description") or "USPS returned an error."
        return (f"USPS ERROR: {desc}", text)

    rate_elem = root.find(".//Package/Postage/Rate")
    if rate_elem is None or not rate_elem.text:
        return ("Could not find a <Rate> element in USPS response.", text)

    rate_str = rate_elem.text.strip()
    return (f"Priority Mail Rate: ${rate_str}", text)


class UspsPricingApp(tk.Tk):
    def __init__(self, env_path: str, user_id: str) -> None:
        super().__init__()
        self.env_path = env_path
        self.user_id = user_id

        self.title("USPS Pricing Sandbox - Ecom Copilot")
        self.geometry("520x420")

        self._build_ui()

    def _build_ui(self) -> None:
        main = ttk.Frame(self, padding=10)
        main.pack(fill="both", expand=True)

        # Inputs
        row = 0
        ttk.Label(main, text="Origin ZIP:", width=15).grid(row=row, column=0, sticky="e", pady=3)
        self.origin_var = tk.StringVar(value="92663")  # default to Newport Beach
        ttk.Entry(main, textvariable=self.origin_var, width=15).grid(row=row, column=1, sticky="w", pady=3)
        row += 1

        ttk.Label(main, text="Destination ZIP:", width=15).grid(row=row, column=0, sticky="e", pady=3)
        self.dest_var = tk.StringVar(value="10001")
        ttk.Entry(main, textvariable=self.dest_var, width=15).grid(row=row, column=1, sticky="w", pady=3)
        row += 1

        ttk.Label(main, text="Pounds:", width=15).grid(row=row, column=0, sticky="e", pady=3)
        self.pounds_var = tk.StringVar(value="1")
        ttk.Entry(main, textvariable=self.pounds_var, width=15).grid(row=row, column=1, sticky="w", pady=3)
        row += 1

        ttk.Label(main, text="Ounces:", width=15).grid(row=row, column=0, sticky="e", pady=3)
        self.ounces_var = tk.StringVar(value="0")
        ttk.Entry(main, textvariable=self.ounces_var, width=15).grid(row=row, column=1, sticky="w", pady=3)
        row += 1

        ttk.Label(main, text="Service:", width=15).grid(row=row, column=0, sticky="e", pady=3)
        ttk.Label(main, text="PRIORITY (fixed for now)").grid(row=row, column=1, sticky="w", pady=3)
        row += 1

        btn = ttk.Button(main, text="Get USPS Rate", command=self.on_get_rate)
        btn.grid(row=row, column=0, columnspan=2, pady=10)
        row += 1

        ttk.Separator(main, orient="horizontal").grid(row=row, column=0, columnspan=2, sticky="ew", pady=5)
        row += 1

        ttk.Label(main, text="Result / Raw XML (read-only):").grid(row=row, column=0, columnspan=2, sticky="w")
        row += 1

        self.result_text = tk.Text(main, wrap="word", height=10, state="disabled")
        self.result_text.grid(row=row, column=0, columnspan=2, sticky="nsew")
        main.rowconfigure(row, weight=1)

        scrollbar = ttk.Scrollbar(main, orient="vertical", command=self.result_text.yview)
        scrollbar.grid(row=row, column=2, sticky="ns")
        self.result_text["yscrollcommand"] = scrollbar.set

    def append_text(self, text: str) -> None:
        self.result_text.config(state="normal")
        self.result_text.insert("end", text + "\n")
        self.result_text.see("end")
        self.result_text.config(state="disabled")

    def on_get_rate(self) -> None:
        origin = self.origin_var.get().strip()
        dest = self.dest_var.get().strip()
        pounds_str = self.pounds_var.get().strip()
        ounces_str = self.ounces_var.get().strip()

        # Basic validation
        if not (origin.isdigit() and len(origin) in (5, 9)):
            messagebox.showerror("Input Error", "Origin ZIP must be 5 or 9 digits.")
            return
        if not (dest.isdigit() and len(dest) in (5, 9)):
            messagebox.showerror("Input Error", "Destination ZIP must be 5 or 9 digits.")
            return
        try:
            pounds = int(pounds_str)
            if pounds < 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Input Error", "Pounds must be a non-negative integer.")
            return
        try:
            ounces = float(ounces_str)
            if ounces < 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Input Error", "Ounces must be a non-negative number.")
            return

        self.append_text(f"Requesting Priority rate {pounds} lb / {ounces:.1f} oz {origin} -> {dest} ...")

        msg, raw_xml = fetch_priority_rate(self.user_id, origin, dest, pounds, ounces)

        self.append_text(msg)
        if raw_xml:
            self.append_text("")
            self.append_text("----- Raw USPS XML -----")
            self.append_text(raw_xml)
            self.append_text("------------------------")


def main() -> None:
    try:
        env_path = resolve_usps_env_path()
    except Exception as exc:
        tk.Tk().withdraw()
        messagebox.showerror("USPS Env Error", f"Could not resolve USPS env file from accounts.json:\n{exc}")
        return

    try:
        user_id = get_usps_user_id(env_path)
    except Exception as exc:
        tk.Tk().withdraw()
        messagebox.showerror("USPS Env Error", f"Could not read USPS_USER_ID from env:\n{exc}")
        return

    app = UspsPricingApp(env_path, user_id)
    app.mainloop()


if __name__ == "__main__":
    main()
