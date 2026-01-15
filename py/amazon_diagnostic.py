"""
Amazon diagnostic helpers for Ecom Copilot.

Phase 1: only checks the env file:
- Can we read it?
- How many keys does it have?
- Are some important keys present?

Later we can add a real SP-API ping here.
"""

from typing import Callable, Dict


def load_env_file(path: str) -> Dict[str, str]:
    """Very simple .env loader (no external dependencies)."""
    env: Dict[str, str] = {}
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
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


# These are common SP-API related keys.
# If your env uses slightly different names, this will still load,
# but will log which of these are missing.
IMPORTANT_KEYS = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "LWA_CLIENT_ID",
    "LWA_CLIENT_SECRET",
    "SPAPI_REFRESH_TOKEN",
    "SPAPI_ROLE_ARN",
    "SELLER_ID",
]


def run_diagnostic(env_path: str, log: Callable[[str], None]) -> None:
    """Run phase-1 diagnostic for Amazon env file."""
    log(f"Amazon diagnostic: reading env file: {env_path}")
    try:
        env = load_env_file(env_path)
    except FileNotFoundError:
        log("❌ Env file not found when trying to read it.")
        return
    except Exception as exc:
        log(f"❌ Error reading env file: {exc!r}")
        return

    if not env:
        log("⚠ Env file is empty or contains no valid KEY=VALUE lines.")
        return

    log(f"Loaded {len(env)} keys from env file.")

    missing = [k for k in IMPORTANT_KEYS if k not in env]
    if missing:
        log("⚠ Some important keys are missing from the env file:")
        for k in missing:
            log(f"   - {k}")
    else:
        log("✅ All important Amazon SP-API keys appear to be present.")

    # Placeholder for future SP-API connectivity check.
    log("TODO: add live SP-API marketplaceParticipations ping here.")
