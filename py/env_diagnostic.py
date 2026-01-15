"""
Env diagnostic helpers for Ecom Copilot.

- parse_dotenv(path) -> dict of key/value pairs.
- run_env_diagnostic(service_name, account_name, env_path, log)
    * validates that env file exists
    * loads key/value pairs
    * checks for some service-specific important keys
    * returns a status code: "ok", "warn", or "error"
"""

from __future__ import annotations

import os
from typing import Callable, Dict, Iterable, List


def parse_dotenv(path: str) -> Dict[str, str]:
    """
    Very small .env parser.

    - ignores blank lines
    - ignores lines starting with '#'
    - splits on first '='
    - strips quotes around values
    - supports UTF-8 + BOM
    """
    env: Dict[str, str] = {}
    with open(path, "r", encoding="utf-8-sig") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                env[key] = value
    return env


def _required_keys_for_service(service: str) -> Iterable[str]:
    """
    Define the "important" keys we expect for each service.

    This is not exhaustive; it's just enough to give a quick health check.
    """
    service = service.lower()
    if service == "amazon":
        return [
            "LWA_CLIENT_ID",
            "LWA_CLIENT_SECRET",
            "SPAPI_REFRESH_TOKEN",
            "SPAPI_ROLE_ARN",
            "SELLER_ID",
        ]
    if service == "walmart":
        return [
            "WM_CLIENT_ID",
            "WM_CLIENT_SECRET",
        ]
    if service == "shopify":
        return [
            "SHOPIFY_STORE_DOMAIN",
            "SHOPIFY_ADMIN_API_ACCESS_TOKEN",
        ]
    if service == "reverb":
        return ["REVERB_API_TOKEN"]
    if service == "ebay":
        return ["EBAY_APP_ID"]
    if service == "usps":
        return ["USPS_USER_ID"]
    if service == "ups":
        return [
            "UPS_ACCESS_KEY",
            "UPS_USERNAME",
            "UPS_PASSWORD",
            "UPS_ACCOUNT_NUMBER",
        ]
    if service == "fedex":
        return [
            "FEDEX_CLIENT_ID",
            "FEDEX_CLIENT_SECRET",
            "FEDEX_ACCOUNT_NUMBER",
            "FEDEX_METER_NUMBER",
        ]
    return []


def run_env_diagnostic(
    service_name: str,
    account_name: str | None,
    env_path: str,
    log: Callable[[str], None],
) -> str:
    """
    Basic env diagnostic.

    Returns:
        "ok"   : file exists and all important keys are present
        "warn" : file exists but some important keys are missing
        "error": file missing or unreadable
    """
    if not env_path:
        log("❌ No env_path specified.")
        return "error"

    if not os.path.isfile(env_path):
        log(f"❌ Env file not found: {env_path}")
        return "error"

    log(f"diagnostic: reading env file: {env_path}")
    try:
        env = parse_dotenv(env_path)
    except Exception as exc:
        log(f"❌ Failed to read env file: {exc!r}")
        return "error"

    log(f"Loaded {len(env)} keys from env file.")

    required: List[str] = list(_required_keys_for_service(service_name))
    if not required:
        log("⚪ No specific required-keys list for this service; treating as OK.")
        return "ok"

    missing = [k for k in required if not env.get(k)]
    if missing:
        log("⚠ Some important keys are missing from the env file:")
        for k in missing:
            log(f"   - {k}")
        # treat as warning so the light can be yellow
        return "warn"

    log("✅ All important keys are present.")
    return "ok"
