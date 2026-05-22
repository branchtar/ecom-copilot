from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse

import html
import json
import logging
import os
from pathlib import Path
from pricing_engine import compute_pricing

from amazon_oauth import (
    AmazonOAuthError,
    ConnectionStorageError,
    InvalidStateError,
    MissingConfigError,
    TokenExchangeError,
    decode_state,
    exchange_code_for_tokens,
    get_connection_store,
)

logger = logging.getLogger("ecom_copilot.api")

app = FastAPI()





# === EC_AMAZON_CONNECT_START ===
# Amazon Connect (Step 1): generate the Seller Central consent URL.
# Env vars (set locally or in AWS App Runner):
#   AMAZON_SPAPI_APP_ID         (required)  e.g., amzn1.sellerapps.app....
#   AMAZON_SELLER_CENTRAL_BASE  (optional)  default https://sellercentral.amazon.com
#   AMAZON_SPAPI_REDIRECT_URI   (optional)  callback URL (we'll add callback endpoint next)
#   AMAZON_SPAPI_USE_BETA       (optional)  true/1 to append version=beta for draft apps
#
# This endpoint has NO side effects. It only returns an authorize_url.

@app.get("/api/integrations/amazon/start")
def amazon_connect_start(tenant: str = "dev"):
    import os, json, time, secrets, base64
    from urllib.parse import urlencode

    application_id = (os.getenv("AMAZON_SPAPI_APP_ID") or "").strip()
    if not application_id:
        return {"ok": False, "error": "Missing env var AMAZON_SPAPI_APP_ID"}

    seller_central = (os.getenv("AMAZON_SELLER_CENTRAL_BASE") or "https://sellercentral.amazon.com").rstrip("/")
    redirect_uri = (os.getenv("AMAZON_SPAPI_REDIRECT_URI") or "").strip()
    use_beta = (os.getenv("AMAZON_SPAPI_USE_BETA") or "").strip().lower() in ("1", "true", "yes", "y")

    state_obj = {"tenant": tenant, "ts": int(time.time()), "nonce": secrets.token_urlsafe(12)}
    state_json = json.dumps(state_obj, separators=(", ", ":")).encode("utf-8")
    state = base64.urlsafe_b64encode(state_json).decode("utf-8").rstrip("=")

    params = {
        "application_id": application_id,
        "state": state,
    }
    if redirect_uri:
        params["redirect_uri"] = redirect_uri
    if use_beta:
        params["version"] = "beta"

    authorize_url = f"{seller_central}/apps/authorize/consent?{urlencode(params)}"

    return {
        "ok": True,
        "authorize_url": authorize_url,
        "state": state,
        "seller_central": seller_central,
    }

# === EC_AMAZON_CONNECT_END ===

# === EC_AMAZON_CALLBACK_START ===
# Amazon Connect (Step 2): receive the Seller Central redirect, exchange the
# OAuth code for LWA tokens, and persist the seller connection.
#
# This route is the only place that handles secrets. It MUST NOT log or render
# the OAuth code, access token, refresh token, or client secret. All heavy
# lifting (token exchange, encrypted storage) lives in api/amazon_oauth.py.

def _render_amazon_success(selling_partner_id: str) -> HTMLResponse:
    safe_spid = html.escape(selling_partner_id)
    body = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Amazon Connected</title>
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 560px; margin: 80px auto; padding: 0 24px; color: #111; }}
      .card {{ border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; }}
      h1 {{ margin: 0 0 12px; font-size: 22px; }}
      .ok {{ color: #047857; font-weight: 600; }}
      code {{ background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }}
      p {{ line-height: 1.5; }}
    </style>
  </head>
  <body>
    <div class="card">
      <h1><span class="ok">Amazon Connected Successfully</span></h1>
      <p>Your Amazon seller account is now linked to Ecom Copilot.</p>
      <p>Selling Partner ID: <code>{safe_spid}</code></p>
      <p>You can close this tab.</p>
    </div>
  </body>
</html>"""
    return HTMLResponse(content=body, status_code=200)


def _render_amazon_error(message: str, status_code: int) -> HTMLResponse:
    safe_msg = html.escape(message)
    body = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Amazon Connection Failed</title>
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 560px; margin: 80px auto; padding: 0 24px; color: #111; }}
      .card {{ border: 1px solid #fecaca; background: #fef2f2; border-radius: 12px; padding: 28px; }}
      h1 {{ margin: 0 0 12px; font-size: 22px; color: #b91c1c; }}
      p {{ line-height: 1.5; }}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Amazon Connection Failed</h1>
      <p>{safe_msg}</p>
      <p>Please retry from the Connect Amazon button. If the problem persists,
         contact support.</p>
    </div>
  </body>
</html>"""
    return HTMLResponse(content=body, status_code=status_code)


@app.get("/auth/amazon/callback")
async def amazon_connect_callback(request: Request):
    qp = request.query_params

    spapi_oauth_code = (qp.get("spapi_oauth_code") or "").strip()
    state = (qp.get("state") or "").strip()
    selling_partner_id = (qp.get("selling_partner_id") or "").strip()

    # 1. Required-param validation. Do NOT echo the code back.
    missing = [
        name for name, val in (
            ("spapi_oauth_code", spapi_oauth_code),
            ("state", state),
            ("selling_partner_id", selling_partner_id),
        ) if not val
    ]
    if missing:
        logger.info("Amazon callback missing params: %s", ", ".join(missing))
        return _render_amazon_error(
            f"Missing required parameter(s): {', '.join(missing)}.",
            status_code=400,
        )

    # 2. State shape + age check.
    try:
        state_obj = decode_state(state)
    except InvalidStateError as exc:
        logger.info("Amazon callback invalid state: %s", exc)
        return _render_amazon_error(str(exc), status_code=400)

    tenant = str(state_obj.get("tenant") or "dev")

    # 3. Token exchange. Echo redirect_uri only if one was configured at start.
    redirect_uri = (os.getenv("AMAZON_SPAPI_REDIRECT_URI") or "").strip() or None
    try:
        tokens = exchange_code_for_tokens(
            spapi_oauth_code=spapi_oauth_code,
            redirect_uri=redirect_uri,
        )
    except MissingConfigError as exc:
        logger.error("Amazon callback config error: %s", exc)
        return _render_amazon_error(
            "Server is missing required configuration. Contact support.",
            status_code=500,
        )
    except TokenExchangeError as exc:
        logger.warning("Amazon callback token exchange failed: %s", exc)
        return _render_amazon_error(
            "Amazon refused the token exchange. Please retry the connection.",
            status_code=502,
        )

    # 4. Persist. Never log token bodies.
    try:
        store = get_connection_store()
        store.save_connection(
            tenant=tenant,
            selling_partner_id=selling_partner_id,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=int(tokens["expires_in"]),
        )
    except MissingConfigError as exc:
        logger.error("Amazon callback storage config error: %s", exc)
        return _render_amazon_error(
            "Server is missing required configuration. Contact support.",
            status_code=500,
        )
    except ConnectionStorageError as exc:
        logger.error("Amazon callback storage failure: %s", exc)
        return _render_amazon_error(
            "Could not save the Amazon connection. Please retry.",
            status_code=500,
        )
    except AmazonOAuthError as exc:
        # Catch-all for any future subclasses; still no secrets.
        logger.error("Amazon callback unexpected oauth error: %s", exc)
        return _render_amazon_error(
            "An unexpected error occurred completing the connection.",
            status_code=500,
        )

    logger.info(
        "Amazon connection saved (tenant=%s, selling_partner_id=%s)",
        tenant, selling_partner_id,
    )
    return _render_amazon_success(selling_partner_id)
# === EC_AMAZON_CALLBACK_END ===

# === EC_AMAZON_BROWSER_START ===
# Browser-facing Amazon OAuth entrypoint.
# Redirects the user to Seller Central consent using the existing URL builder.

@app.get("/auth/amazon/start")
def amazon_oauth_browser_start(tenant: str = "dev"):
    result = amazon_connect_start(tenant=tenant)

    if not isinstance(result, dict):
        return {"ok": False, "error": "Unexpected response building Amazon authorize URL"}

    if not result.get("ok"):
        return result

    authorize_url = (result.get("authorize_url") or "").strip()
    if not authorize_url:
        return {"ok": False, "error": "Missing authorize_url"}

    return RedirectResponse(url=authorize_url, status_code=307)

# === EC_AMAZON_BROWSER_START_END ===


# === EC_PRICING_START ===
# Pricing feature: config + preview endpoints
# (Safe block; can be expanded later with real marketplace fee lookups)

CONFIG_PATH = Path(__file__).parent / "pricing_config.json"

def load_pricing_config() -> dict:
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}

def save_pricing_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

@app.get("/pricing/config")
def pricing_get_config():
    return load_pricing_config()

@app.post("/pricing/config")
def pricing_set_config(cfg: dict):
    save_pricing_config(cfg)
    return {"ok": True}

@app.post("/pricing/preview")
def pricing_preview(payload: dict):
    cfg = load_pricing_config()
    return compute_pricing(payload, cfg)

# === EC_PRICING_END ===
# === EC_DASHBOARD_START ===
# Minimal dashboard endpoints so the UI stops showing "Could not reach API".
# Expand these later with real data sources.

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dashboard/kpis")
def dashboard_kpis():
    return {
        "total_sales_7d": 0,
        "orders_7d": 0,
        "returns_7d": 0,
        "items_sold_7d": 0
    }

@app.get("/dashboard/marketplace-balances")
def dashboard_marketplace_balances():
    # UI can render "No balances loaded yet."
    return []

@app.get("/dashboard/recent-orders")
def dashboard_recent_orders():
    # UI can render "No orders loaded yet."
    return []

@app.get("/dashboard/stock-alerts")
def dashboard_stock_alerts():
    # UI can render "No low stock alerts yet."
    return []
# === EC_DASHBOARD_END ===





# Allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Demo endpoints used by SuppliersPage ---
@app.get("/api/suppliers")
def list_suppliers():
    return [
        {"id": "KMC", "key": "KMC", "name": "KMC Music", "location": "USA"},
        {"id": "ENSOUL", "key": "ENSOUL", "name": "Ensoul Music", "location": "USA"},
        {"id": "CHESBRO", "key": "CHESBRO", "name": "Chesbro Music", "location": "USA"},
    ]

@app.get("/api/suppliers/{supplier_id}")
def supplier_detail(supplier_id: str):
    return {
        "id": supplier_id,
        "key": supplier_id,
        "name": supplier_id,
        "location": "USA",
        "notes": "Demo detail endpoint",
    }

# Optional: pricing preview endpoints SuppliersPage probes
@app.get("/api/suppliers/{supplier_id}/pricing_preview")
def pricing_preview_supplier(supplier_id: str):
    return {"rows": []}

@app.get("/api/kmc/pricing_preview")
def pricing_preview_kmc():
    return {"rows": []}

@app.get("/api/pricing/kmc_preview")
def pricing_preview_kmc_alt():
    return {"rows": []}

# -------------------------------------------------------------------
# UI compatibility endpoints (React dashboard expects these)
# -------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dashboard/kpis")
def dashboard_kpis():
    # Placeholder metrics until real data wiring is implemented
    return {
        "totalSales7d": 0,
        "orders7d": 0,
        "returns7d": 0,
        "itemsSold7d": 0
    }

@app.get("/dashboard/orders_recent")
def dashboard_orders_recent():
    return []

@app.get("/dashboard/stock_alerts")
def dashboard_stock_alerts():
    return []


# === EC_PRICING_CONFIG_START ===
# Pricing config endpoints (safe, additive)
PRICING_CONFIG_PATH = Path(__file__).resolve().parent / "pricing_config.json"

def _load_pricing_config():
    try:
        with open(PRICING_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"version": 1, "suppliers": {}}

def _save_pricing_config(cfg: dict):
    with open(PRICING_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

@app.get("/api/pricing/config")
def get_pricing_config(supplier_key: str = ""):
    cfg = _load_pricing_config()
    if supplier_key:
        sup = (cfg.get("suppliers") or {}).get(supplier_key)
        return {"supplier_key": supplier_key, "config": sup}
    return cfg

@app.put("/api/pricing/config")
def put_pricing_config(payload: dict):
    """
    payload:
      { "supplier_key": "KMC", "hard_costs": {...} }
    """
    supplier_key = (payload or {}).get("supplier_key")
    hard_costs = (payload or {}).get("hard_costs") or {}

    if not supplier_key:
        return {"ok": False, "error": "supplier_key required"}

    cfg = _load_pricing_config()
    cfg.setdefault("version", 1)
    cfg.setdefault("suppliers", {})

    cfg["suppliers"].setdefault(supplier_key, {"key": supplier_key})
    cfg["suppliers"][supplier_key].setdefault("hard_costs", {})

    allowed = {
        "dropship_fee",
        "handling_fee",
        "misc_fee",
        "shipping_base",
        "shipping_per_lb",
        "dim_divisor",
        "marketplace_fee_pct_override",
    }

    for k, v in hard_costs.items():
        if k in allowed:
            try:
                cfg["suppliers"][supplier_key]["hard_costs"][k] = float(v)
            except Exception:
                pass

    _save_pricing_config(cfg)
    return {"ok": True, "supplier_key": supplier_key, "hard_costs": cfg["suppliers"][supplier_key]["hard_costs"]}
# === EC_PRICING_CONFIG_END ===

