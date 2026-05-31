from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

import datetime
import hmac
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

import amazon_orders as _amazon_orders
import shopify_oauth as _shopify
import workspace_store as _workspace

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

# === EC_AMAZON_STATUS_START ===
# Amazon Connect (Step 3): safe connection-status check for the dashboard.
# Returns only non-token metadata — never exposes access/refresh tokens.

@app.get("/api/integrations/amazon/status")
def amazon_connection_status(tenant: str = "dev"):
    try:
        store = get_connection_store()
        meta = store.get_connection_meta(tenant=tenant)
    except MissingConfigError as exc:
        logger.error("amazon_connection_status config error: %s", exc)
        return {
            "ok": False,
            "connected": False,
            "tenant": tenant,
            "selling_partner_id": None,
            "error": "Server configuration error",
        }
    except (ConnectionStorageError, AmazonOAuthError) as exc:
        logger.error("amazon_connection_status storage error: %s", exc)
        return {
            "ok": False,
            "connected": False,
            "tenant": tenant,
            "selling_partner_id": None,
            "error": "Could not read connection status",
        }

    if meta is None:
        return {"ok": True, "connected": False, "tenant": tenant, "selling_partner_id": None}

    return {
        "ok": True,
        "connected": True,
        "tenant": meta.get("tenant", tenant),
        "selling_partner_id": meta.get("selling_partner_id"),
    }
# === EC_AMAZON_STATUS_END ===

# === EC_AMAZON_ORDERS_START ===
# Amazon Orders (read-only, no PII, no storage).
#
# Security model:
#   * Caller MUST supply X-Ecom-Internal-Key matching ECOM_INTERNAL_API_KEY.
#   * This endpoint is NOT meant to be called from the browser directly.
#   * The Next.js server route /api/amazon/orders validates the user's
#     NextAuth/Cognito session before proxying here with the internal key.
#   * NEVER log the internal key or the SP-API access token.

@app.get("/api/integrations/amazon/orders")
def amazon_orders_list(
    request: Request,
    tenant: str = "dev",
    days: int = 30,
    max_results: int = 50,
):
    # 1. Internal-key guard — constant-time compare to prevent timing attacks.
    provided_key = (request.headers.get("x-ecom-internal-key") or "")
    expected_key = (os.getenv("ECOM_INTERNAL_API_KEY") or "")
    if not expected_key:
        logger.error("ECOM_INTERNAL_API_KEY is not set — orders endpoint is disabled")
        return JSONResponse({"ok": False, "error": "Orders endpoint not configured"}, status_code=503)
    if not hmac.compare_digest(provided_key, expected_key):
        logger.warning("amazon_orders_list: invalid internal key (tenant=%s)", tenant)
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    # 2. Build CreatedAfter timestamp (ISO 8601).
    days_clamped = max(1, min(int(days), 90))
    created_after = (
        datetime.datetime.utcnow() - datetime.timedelta(days=days_clamped)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    marketplace_id = (os.getenv("AMAZON_MARKETPLACE_ID") or "ATVPDKIKX0DER").strip()

    # 3. Obtain a valid access token (refresh if near-expiry).
    try:
        access_token = _amazon_orders.get_valid_access_token(tenant)
    except _amazon_orders.AmazonOrdersError as exc:
        logger.error("amazon_orders_list: token error (tenant=%s): %s", tenant, exc)
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=502)

    # 4. Fetch orders from SP-API.
    try:
        raw_orders = _amazon_orders.fetch_orders(
            access_token,
            marketplace_id=marketplace_id,
            created_after=created_after,
            max_results=min(max(1, int(max_results)), 100),
        )
    except _amazon_orders.OrderFetchError as exc:
        logger.error("amazon_orders_list: fetch error (tenant=%s): %s", tenant, exc)
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=502)

    # 5. Normalize — strips PII fields.
    orders = [_amazon_orders.normalize_order(o) for o in raw_orders]

    return JSONResponse({
        "ok": True,
        "tenant": tenant,
        "orders": orders,
        "count": len(orders),
    })

# === EC_AMAZON_ORDERS_END ===


# =============================================================================
# SHOPIFY CONNECTOR
# Routes mirror the Amazon connector pattern.
# No product/order/inventory sync in this MVP — connect/disconnect/status only.
# =============================================================================

# === EC_SHOPIFY_CONNECT_START ===

def _render_shopify_success(shop: str) -> HTMLResponse:
    safe_shop = html.escape(shop)
    body = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shopify Connected</title>
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
      <h1><span class="ok">Shopify Connected Successfully</span></h1>
      <p>Your Shopify store is now linked to Ecom Navigation.</p>
      <p>Shop: <code>{safe_shop}</code></p>
      <p>You can close this tab and return to the dashboard.</p>
    </div>
  </body>
</html>"""
    return HTMLResponse(content=body, status_code=200)


def _render_shopify_error(message: str, status_code: int) -> HTMLResponse:
    safe_msg = html.escape(message)
    body = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shopify Connection Failed</title>
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
      <h1>Shopify Connection Failed</h1>
      <p>{safe_msg}</p>
      <p>Please retry from the Connect Shopify button. If the problem persists,
         contact support.</p>
    </div>
  </body>
</html>"""
    return HTMLResponse(content=body, status_code=status_code)


@app.get("/api/integrations/shopify/start")
def shopify_connect_start(tenant: str = "dev", shop: str = ""):
    """
    Step 1: validate the shop domain and return an authorize_url.
    No side effects — only builds the redirect URL.

    Required env vars:
        SHOPIFY_CLIENT_ID
        SHOPIFY_REDIRECT_URI
        SHOPIFY_SCOPES   (optional, defaults to read_products,read_orders,read_inventory)
    """
    client_id = (os.getenv("SHOPIFY_CLIENT_ID") or "").strip()
    redirect_uri = (os.getenv("SHOPIFY_REDIRECT_URI") or "").strip()
    scopes = (
        os.getenv("SHOPIFY_SCOPES") or _shopify.DEFAULT_SCOPES
    ).strip()

    if not client_id:
        return {"ok": False, "error": "Missing env var SHOPIFY_CLIENT_ID"}
    if not redirect_uri:
        return {"ok": False, "error": "Missing env var SHOPIFY_REDIRECT_URI"}

    try:
        normalized_shop = _shopify.normalize_shop(shop)
    except _shopify.InvalidShopError as exc:
        return {"ok": False, "error": str(exc)}

    state = _shopify.encode_state(tenant=tenant)
    authorize_url = _shopify.build_authorize_url(
        shop=normalized_shop,
        client_id=client_id,
        redirect_uri=redirect_uri,
        scopes=scopes,
        state=state,
    )

    return {
        "ok": True,
        "authorize_url": authorize_url,
        "shop": normalized_shop,
        "state": state,
    }


@app.get("/auth/shopify/start")
def shopify_oauth_browser_start(tenant: str = "dev", shop: str = ""):
    """Browser-facing entry point: build authorize URL and redirect the user."""
    result = shopify_connect_start(tenant=tenant, shop=shop)

    if not isinstance(result, dict) or not result.get("ok"):
        error = (result or {}).get("error", "Could not build Shopify authorize URL")
        return _render_shopify_error(error, status_code=400)

    authorize_url = (result.get("authorize_url") or "").strip()
    if not authorize_url:
        return _render_shopify_error("Missing authorize_url", status_code=500)

    return RedirectResponse(url=authorize_url, status_code=307)


@app.get("/auth/shopify/callback")
async def shopify_connect_callback(request: Request):
    """
    Step 2: receive Shopify callback, verify HMAC, exchange code, persist token.

    IMPORTANT: This route handles secrets.
    - Never log the code, access_token, or client_secret.
    - HMAC is verified before any other processing.
    """
    qp = dict(request.query_params)

    code = (qp.get("code") or "").strip()
    shop_raw = (qp.get("shop") or "").strip()
    state = (qp.get("state") or "").strip()
    provided_hmac = (qp.get("hmac") or "").strip()

    # 1. Required-param validation. Do NOT echo the code back.
    missing = [
        name for name, val in (
            ("code", code),
            ("shop", shop_raw),
            ("state", state),
            ("hmac", provided_hmac),
        ) if not val
    ]
    if missing:
        logger.info("Shopify callback missing params: %s", ", ".join(missing))
        return _render_shopify_error(
            f"Missing required parameter(s): {', '.join(missing)}.",
            status_code=400,
        )

    # 2. Normalise shop domain.
    try:
        shop = _shopify.normalize_shop(shop_raw)
    except _shopify.InvalidShopError as exc:
        logger.info("Shopify callback invalid shop: %s", exc)
        return _render_shopify_error(str(exc), status_code=400)

    # 3. HMAC verification — must happen before state or token work.
    client_secret = (os.getenv("SHOPIFY_CLIENT_SECRET") or "").strip()
    if not client_secret:
        logger.error("Shopify callback: SHOPIFY_CLIENT_SECRET is not set")
        return _render_shopify_error(
            "Server is missing required configuration. Contact support.",
            status_code=500,
        )
    try:
        _shopify.verify_hmac(params=qp, client_secret=client_secret)
    except _shopify.InvalidHmacError as exc:
        logger.warning("Shopify callback HMAC verification failed (shop=%s)", shop)
        return _render_shopify_error(
            "Request signature verification failed. Please retry the connection.",
            status_code=400,
        )

    # 4. State shape + age check.
    try:
        state_obj = _shopify.decode_state(state)
    except _shopify.InvalidStateError as exc:
        logger.info("Shopify callback invalid state: %s", exc)
        return _render_shopify_error(str(exc), status_code=400)

    tenant = str(state_obj.get("tenant") or "dev")

    # 5. Token exchange. Never log the code or the returned token.
    try:
        access_token = _shopify.exchange_code_for_token(shop=shop, code=code)
    except _shopify.MissingConfigError as exc:
        logger.error("Shopify callback config error: %s", exc)
        return _render_shopify_error(
            "Server is missing required configuration. Contact support.",
            status_code=500,
        )
    except _shopify.TokenExchangeError as exc:
        logger.warning("Shopify callback token exchange failed (shop=%s): %s", shop, exc)
        return _render_shopify_error(
            "Shopify refused the token exchange. Please retry the connection.",
            status_code=502,
        )

    # 6. Persist. Never log token bodies.
    try:
        store = _shopify.get_connection_store()
        store.save_connection(tenant=tenant, shop=shop, access_token=access_token)
    except _shopify.MissingConfigError as exc:
        logger.error("Shopify callback storage config error: %s", exc)
        return _render_shopify_error(
            "Server is missing required configuration. Contact support.",
            status_code=500,
        )
    except _shopify.ConnectionStorageError as exc:
        logger.error("Shopify callback storage failure (shop=%s): %s", shop, exc)
        return _render_shopify_error(
            "Could not save the Shopify connection. Please retry.",
            status_code=500,
        )

    logger.info("Shopify connection saved (tenant=%s shop=%s)", tenant, shop)
    return _render_shopify_success(shop)


@app.get("/api/integrations/shopify/status")
def shopify_connection_status(tenant: str = "dev"):
    """
    Safe connection-status check for the dashboard.
    Returns only non-token metadata — never exposes access_token.
    """
    try:
        store = _shopify.get_connection_store()
        meta = store.get_connection_meta(tenant=tenant)
    except _shopify.MissingConfigError as exc:
        logger.error("shopify_connection_status config error: %s", exc)
        return {"ok": False, "connected": False, "tenant": tenant, "shop": None,
                "error": "Server configuration error"}
    except _shopify.ConnectionStorageError as exc:
        logger.error("shopify_connection_status storage error: %s", exc)
        return {"ok": False, "connected": False, "tenant": tenant, "shop": None,
                "error": "Could not read connection status"}

    if meta is None:
        return {"ok": True, "connected": False, "tenant": tenant, "shop": None}

    return {
        "ok": True,
        "connected": True,
        "tenant": meta.get("tenant", tenant),
        "shop": meta.get("shop"),
    }


@app.delete("/api/integrations/shopify/disconnect")
def shopify_disconnect(tenant: str = "dev"):
    """
    Disconnect the Shopify store for this tenant.
    Deletes the stored token and metadata from Secrets Manager (or local store).
    """
    try:
        store = _shopify.get_connection_store()
        meta = store.get_connection_meta(tenant=tenant)
    except Exception as exc:
        logger.error("shopify_disconnect meta lookup failed (tenant=%s): %s", tenant, exc)
        return {"ok": False, "error": "Could not look up Shopify connection"}

    if meta is None or not meta.get("shop"):
        return {"ok": True, "disconnected": False, "reason": "No connection found"}

    shop = meta["shop"]
    try:
        store.delete_connection(tenant=tenant, shop=shop)
    except _shopify.ConnectionStorageError as exc:
        logger.error("shopify_disconnect delete failed (tenant=%s shop=%s): %s", tenant, shop, exc)
        return {"ok": False, "error": "Could not delete Shopify connection"}

    logger.info("Shopify connection deleted (tenant=%s shop=%s)", tenant, shop)
    return {"ok": True, "disconnected": True, "shop": shop}

# === EC_SHOPIFY_CONNECT_END ===


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


# === EC_WORKSPACES_START ===
# Phase 3B-1: workspace profile read endpoint.
# Returns the caller's workspace profile from Secrets Manager (or local store).
# No tokens, no marketplace credentials are ever returned.
#
# Security model:
#   * X-Ecom-Internal-Key — same shared key used by the Amazon orders endpoint.
#     Prevents direct browser access; the Next.js proxy supplies this header.
#   * X-Ecom-User-Sub     — Cognito sub forwarded from the NextAuth JWT.
#     Used as the profile storage key. Never logged.
#   * X-Ecom-User-Email   — Optional; used only when auto-creating a new profile.

@app.get("/api/workspaces")
def get_workspaces(request: Request):
    # 1. Internal-key guard — constant-time compare, same as orders endpoint.
    provided_key = (request.headers.get("x-ecom-internal-key") or "")
    expected_key = (os.getenv("ECOM_INTERNAL_API_KEY") or "")
    if not expected_key:
        logger.error("ECOM_INTERNAL_API_KEY not set — workspaces endpoint disabled")
        return JSONResponse({"ok": False, "error": "Workspaces endpoint not configured"}, status_code=503)
    if not hmac.compare_digest(provided_key, expected_key):
        logger.warning("get_workspaces: invalid internal key")
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    # 2. User sub — required; used as the secret path key. Never logged.
    user_sub = (request.headers.get("x-ecom-user-sub") or "").strip()
    if not user_sub:
        return JSONResponse({"ok": False, "error": "Missing X-Ecom-User-Sub"}, status_code=400)

    user_email = (request.headers.get("x-ecom-user-email") or "").strip()

    # 3. Load (or auto-create) the workspace profile. Idempotent.
    try:
        store = _workspace.get_workspace_store()
        profile = store.get_or_create_profile(user_sub=user_sub, email=user_email)
    except _workspace.MissingConfigError as exc:
        logger.error("get_workspaces config error: %s", exc)
        return JSONResponse({"ok": False, "error": "Server configuration error"}, status_code=500)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("get_workspaces storage error: %s", exc)
        return JSONResponse({"ok": False, "error": "Could not load workspace profile"}, status_code=500)

    # 4. Return safe profile only — no tokens, no marketplace credentials.
    return JSONResponse({"ok": True, "profile": profile})


@app.post("/api/workspaces")
async def create_workspace(request: Request):
    """
    Phase 3B-2: Append a new workspace to the user's profile.
    Body: { "name": "Business Name" }
    New workspaces start with marketplace_tenant_refs: {} — no marketplace connections.
    active_workspace_id is NOT changed; user switches manually.
    Returns: { "ok": true, "workspace": {...}, "profile": {...} }
    """
    # 1. Internal-key guard.
    provided_key = (request.headers.get("x-ecom-internal-key") or "")
    expected_key = (os.getenv("ECOM_INTERNAL_API_KEY") or "")
    if not expected_key:
        return JSONResponse({"ok": False, "error": "Workspaces endpoint not configured"}, status_code=503)
    if not hmac.compare_digest(provided_key, expected_key):
        logger.warning("create_workspace: invalid internal key")
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    # 2. User sub.
    user_sub = (request.headers.get("x-ecom-user-sub") or "").strip()
    if not user_sub:
        return JSONResponse({"ok": False, "error": "Missing X-Ecom-User-Sub"}, status_code=400)

    # 3. Parse and validate name.
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Invalid JSON body"}, status_code=400)

    name = (body.get("name") or "").strip()
    if len(name) < 2 or len(name) > 80:
        return JSONResponse({"ok": False, "error": "name must be 2–80 characters"}, status_code=400)

    # 4. Load profile (auto-creates if missing).
    try:
        store = _workspace.get_workspace_store()
        profile = store.get_or_create_profile(user_sub=user_sub, email="")
    except _workspace.MissingConfigError as exc:
        logger.error("create_workspace config error: %s", exc)
        return JSONResponse({"ok": False, "error": "Server configuration error"}, status_code=500)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("create_workspace storage error: %s", exc)
        return JSONResponse({"ok": False, "error": "Could not load workspace profile"}, status_code=500)

    # 5. Generate collision-safe slug (server-side — client never sends id).
    existing_ids = {w["id"] for w in profile.get("workspaces", [])}
    base_slug = _workspace.slugify_workspace_name(name)
    slug = base_slug
    counter = 2
    while slug in existing_ids:
        slug = f"{base_slug[:37]}-{counter}"
        counter += 1

    # 6. Build new workspace entry — empty marketplace refs, no active change.
    new_workspace = {
        "id": slug,
        "name": name,
        "plan": "dev",
        "created_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "marketplace_tenant_refs": {},
    }

    # 7. Append and persist.
    profile.setdefault("workspaces", [])
    profile["workspaces"].append(new_workspace)

    try:
        store.save_profile(user_sub=user_sub, profile=profile)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("create_workspace save error (sub=%s): %s", user_sub, exc)
        return JSONResponse({"ok": False, "error": "Could not save workspace"}, status_code=500)

    logger.info("create_workspace: created (sub=%s id=%s)", user_sub, slug)
    return JSONResponse({"ok": True, "workspace": new_workspace, "profile": profile})


@app.patch("/api/workspaces/active")
async def set_active_workspace(request: Request):
    """
    Phase 3B-2: Switch the user's active workspace.
    Body: { "workspace_id": "slug-id" }
    Rejects unknown IDs with 404.
    """
    # 1. Internal-key guard.
    provided_key = (request.headers.get("x-ecom-internal-key") or "")
    expected_key = (os.getenv("ECOM_INTERNAL_API_KEY") or "")
    if not expected_key:
        return JSONResponse({"ok": False, "error": "Workspaces endpoint not configured"}, status_code=503)
    if not hmac.compare_digest(provided_key, expected_key):
        logger.warning("set_active_workspace: invalid internal key")
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    # 2. User sub.
    user_sub = (request.headers.get("x-ecom-user-sub") or "").strip()
    if not user_sub:
        return JSONResponse({"ok": False, "error": "Missing X-Ecom-User-Sub"}, status_code=400)

    # 3. Parse body.
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Invalid JSON body"}, status_code=400)

    workspace_id = (body.get("workspace_id") or "").strip()
    if not workspace_id:
        return JSONResponse({"ok": False, "error": "workspace_id required"}, status_code=400)

    # 4. Load profile.
    try:
        store = _workspace.get_workspace_store()
        profile = store.get_or_create_profile(user_sub=user_sub, email="")
    except _workspace.MissingConfigError as exc:
        logger.error("set_active_workspace config error: %s", exc)
        return JSONResponse({"ok": False, "error": "Server configuration error"}, status_code=500)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("set_active_workspace storage error: %s", exc)
        return JSONResponse({"ok": False, "error": "Could not load workspace profile"}, status_code=500)

    # 5. Reject unknown workspace IDs.
    valid_ids = {w["id"] for w in profile.get("workspaces", [])}
    if workspace_id not in valid_ids:
        return JSONResponse({"ok": False, "error": "Unknown workspace_id"}, status_code=404)

    # 6. Update active and save.
    profile["active_workspace_id"] = workspace_id

    try:
        store.save_profile(user_sub=user_sub, profile=profile)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("set_active_workspace save error (sub=%s): %s", user_sub, exc)
        return JSONResponse({"ok": False, "error": "Could not save workspace"}, status_code=500)

    logger.info("set_active_workspace: switched (sub=%s id=%s)", user_sub, workspace_id)
    return JSONResponse({"ok": True, "active_workspace_id": workspace_id})


@app.patch("/api/workspaces/marketplace-refs")
async def update_marketplace_ref(request: Request):
    """
    Phase 3C-1: Set or update a marketplace tenant ref for the user's active workspace.

    Body: { "marketplace": "amazon"|"shopify", "tenant_ref": "<slug>" }

    Finds the user's active workspace by reading their profile, then sets
    marketplace_tenant_refs[marketplace] = tenant_ref for that workspace only.
    Does NOT change active_workspace_id or any other workspace field.

    Called server-side from the Next.js /api/amazon/connect route before
    redirecting the user to the Amazon OAuth authorize URL.

    Returns safe metadata only — no tokens, no credentials.
    """
    # 1. Internal-key guard — constant-time compare, same as other workspace endpoints.
    provided_key = (request.headers.get("x-ecom-internal-key") or "")
    expected_key = (os.getenv("ECOM_INTERNAL_API_KEY") or "")
    if not expected_key:
        return JSONResponse({"ok": False, "error": "Workspaces endpoint not configured"}, status_code=503)
    if not hmac.compare_digest(provided_key, expected_key):
        logger.warning("update_marketplace_ref: invalid internal key")
        return JSONResponse({"ok": False, "error": "Unauthorized"}, status_code=401)

    # 2. User sub — required; identifies which profile to update. Never logged.
    user_sub = (request.headers.get("x-ecom-user-sub") or "").strip()
    if not user_sub:
        return JSONResponse({"ok": False, "error": "Missing X-Ecom-User-Sub"}, status_code=400)

    # 3. Parse and validate body.
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Invalid JSON body"}, status_code=400)

    marketplace = (body.get("marketplace") or "").strip().lower()
    if marketplace not in ("amazon", "shopify"):
        return JSONResponse(
            {"ok": False, "error": "marketplace must be 'amazon' or 'shopify'"},
            status_code=400,
        )

    tenant_ref = (body.get("tenant_ref") or "").strip()

    # Validate tenant_ref: lowercase alphanumeric and hyphens only, 1–60 chars,
    # no leading or trailing hyphens. Matches slugify_workspace_name() output.
    _SAFE = frozenset("abcdefghijklmnopqrstuvwxyz0123456789-")
    if (
        not tenant_ref
        or len(tenant_ref) > 60
        or not all(c in _SAFE for c in tenant_ref)
        or tenant_ref.startswith("-")
        or tenant_ref.endswith("-")
    ):
        return JSONResponse(
            {
                "ok": False,
                "error": "tenant_ref must be a safe slug: lowercase alphanumeric and hyphens, 1–60 chars, no leading/trailing hyphens",
            },
            status_code=400,
        )

    # 4. Load the user's workspace profile. Idempotent — auto-creates if missing.
    try:
        store = _workspace.get_workspace_store()
        profile = store.get_or_create_profile(user_sub=user_sub, email="")
    except _workspace.MissingConfigError as exc:
        logger.error("update_marketplace_ref config error: %s", exc)
        return JSONResponse({"ok": False, "error": "Server configuration error"}, status_code=500)
    except _workspace.WorkspaceStorageError as exc:
        logger.error("update_marketplace_ref storage error: %s", exc)
        return JSONResponse({"ok": False, "error": "Could not load workspace profile"}, status_code=500)

    # 5. Find the active workspace.
    active_id = profile.get("active_workspace_id")
    target = next(
        (ws for ws in profile.get("workspaces", []) if ws.get("id") == active_id),
        None,
    )
    if target is None:
        return JSONResponse(
            {"ok": False, "error": "Active workspace not found in profile"},
            status_code=404,
        )

    # 6. Set the marketplace ref. Idempotent — safe to call again with the same value.
    target.setdefault("marketplace_tenant_refs", {})
    target["marketplace_tenant_refs"][marketplace] = tenant_ref

    # 7. Persist the updated profile.
    try:
        store.save_profile(user_sub=user_sub, profile=profile)
    except _workspace.WorkspaceStorageError as exc:
        logger.error(
            "update_marketplace_ref save error (sub=%s workspace=%s): %s",
            user_sub, active_id, exc,
        )
        return JSONResponse({"ok": False, "error": "Could not save workspace profile"}, status_code=500)

    logger.info(
        "update_marketplace_ref: %s=%s (sub=%s workspace=%s)",
        marketplace, tenant_ref, user_sub, active_id,
    )
    # Return safe metadata only — no tokens, no credentials.
    return JSONResponse({
        "ok": True,
        "workspace_id": active_id,
        "marketplace": marketplace,
        "tenant_ref": tenant_ref,
    })

# === EC_WORKSPACES_END ===



# Allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://www.ecomnavigation.com",
        "https://ecomnavigation.com",
    ],
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

