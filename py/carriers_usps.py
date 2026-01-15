"""
USPS carrier diagnostics.

Uses USPS Web Tools CityStateLookup API as a simple connectivity test.
"""

from typing import Callable

from env_diagnostic import parse_dotenv  # reuse existing parser

try:
    import requests
    import xml.etree.ElementTree as ET
except Exception:  # requests may not be installed yet
    requests = None
    ET = None  # type: ignore


def test_usps_connection(env_path: str, log: Callable[[str], None]) -> str:
    """
    Test USPS API connectivity using the USPS_USER_ID from env_path.

    Returns:
      - "ok"    : HTTP 200 and non-error USPS response
      - "error" : any problem (missing key, network error, USPS error)
      - "warn"  : requests library missing
    """
    log(f"USPS connection test using env: {env_path}")

    if requests is None:
        log("⚠ Python 'requests' library is not installed. Run 'py -m pip install requests'.")
        return "warn"

    try:
        env = parse_dotenv(env_path)
    except Exception as exc:
        log(f"❌ Could not re-read env file: {exc!r}")
        return "error"

    user_id = env.get("USPS_USER_ID")
    if not user_id:
        log("❌ USPS_USER_ID is missing in the env file; cannot call USPS API.")
        return "error"

    # Simple test: CityStateLookup for ZIP 90210
    zip5 = "90210"
    xml = (
        f'<CityStateLookupRequest USERID="{user_id}">'
        f'<ZipCode ID="0"><Zip5>{zip5}</Zip5></ZipCode>'
        f"</CityStateLookupRequest>"
    )

    params = {
        "API": "CityStateLookup",
        "XML": xml,
    }

    url = "https://secure.shippingapis.com/ShippingAPI.dll"

    try:
        resp = requests.get(url, params=params, timeout=10)
    except Exception as exc:
        log(f"❌ Network error calling USPS: {exc!r}")
        return "error"

    log(f"HTTP status: {resp.status_code}")
    if resp.status_code != 200:
        log("❌ Non-200 response from USPS.")
        return "error"

    body = resp.text
    if "<Error>" in body:
        log("❌ USPS returned an error response.")
        try:
            if ET is not None:
                root = ET.fromstring(body)
                desc = root.findtext(".//Description")
                if desc:
                    log(f"   USPS: {desc}")
        except Exception:
            # Best-effort only
            pass
        return "error"

    log("✅ USPS CityStateLookup succeeded. Credentials and connectivity look good.")
    return "ok"
