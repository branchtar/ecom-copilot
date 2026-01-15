"""
Accounts registry loader.

Reads config/accounts.json from the project root and returns it as a dict.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

# This file lives in <root>/py, so root is its parent directory
BASE_DIR = Path(__file__).resolve().parent.parent
ACCOUNTS_JSON = BASE_DIR / "config" / "accounts.json"


def load_accounts_registry() -> Dict[str, Any]:
    """
    Load accounts.json and return a nested dict of services/accounts.

    If the file does not exist or is invalid, returns {}.
    """
    if not ACCOUNTS_JSON.is_file():
        print(f"⚠ accounts.json not found at: {ACCOUNTS_JSON}")
        return {}

    try:
        with open(ACCOUNTS_JSON, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception as exc:
        print(f"⚠ Error reading accounts.json: {exc!r}")
        return {}

    if not isinstance(data, dict):
        print("⚠ accounts.json root is not an object; ignoring.")
        return {}

    return data
