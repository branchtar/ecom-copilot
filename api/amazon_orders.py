"""
Amazon SP-API Orders helper for Ecom Navigation.

Responsibilities:
  * Refresh an LWA access token using the stored refresh_token.
  * Retrieve a valid (possibly freshly-refreshed) access token for a tenant.
  * Fetch recent orders from the SP-API Orders v0 endpoint.
  * Normalize raw order objects to a safe, minimal field set.
    Buyer email, buyer name, and shipping address are intentionally excluded.

IMPORTANT: Never log access_token, refresh_token, or client credentials.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

import requests

from amazon_oauth import (
    ConnectionStorageError,
    MissingConfigError,
    get_connection_store,
)

logger = logging.getLogger("ecom_copilot.amazon_orders")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LWA_TOKEN_URL    = "https://api.amazon.com/auth/o2/token"
SP_API_ORDERS_URL = "https://sellingpartnerapi-na.amazon.com/orders/v0/orders"

# Refresh the stored access_token if it expires within this many seconds.
TOKEN_REFRESH_BUFFER_SECONDS = 120


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class AmazonOrdersError(Exception):
    """Base class for orders-fetch errors."""

class TokenRefreshError(AmazonOrdersError):
    """LWA access-token refresh failed."""

class OrderFetchError(AmazonOrdersError):
    """SP-API orders fetch failed."""


# ---------------------------------------------------------------------------
# LWA token refresh
# ---------------------------------------------------------------------------

def refresh_lwa_token(refresh_token: str, *, timeout_seconds: float = 15.0) -> str:
    """
    POST to LWA with grant_type=refresh_token to get a fresh access_token.
    Returns the new access_token string (valid ~1 hour).
    NEVER log the refresh_token, the payload, or the response body.
    """
    client_id     = (os.getenv("AMAZON_LWA_CLIENT_ID")     or "").strip()
    client_secret = (os.getenv("AMAZON_LWA_CLIENT_SECRET") or "").strip()

    if not client_id:
        raise MissingConfigError("AMAZON_LWA_CLIENT_ID is not set")
    if not client_secret:
        raise MissingConfigError("AMAZON_LWA_CLIENT_SECRET is not set")
    if not refresh_token:
        raise TokenRefreshError("refresh_token is empty")

    payload = {
        "grant_type":    "refresh_token",
        "refresh_token": refresh_token,
        "client_id":     client_id,
        "client_secret": client_secret,
    }

    try:
        resp = requests.post(
            LWA_TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        logger.warning("LWA token refresh network error")
        raise TokenRefreshError("Network error contacting Amazon LWA") from exc

    if resp.status_code != 200:
        logger.warning("LWA token refresh returned HTTP %s", resp.status_code)
        raise TokenRefreshError(
            f"Amazon LWA refresh endpoint returned HTTP {resp.status_code}"
        )

    try:
        data = resp.json()
    except ValueError as exc:
        raise TokenRefreshError("LWA refresh response was not valid JSON") from exc

    access_token = (data.get("access_token") or "").strip()
    if not access_token:
        raise TokenRefreshError("LWA refresh response missing access_token")

    return access_token


# ---------------------------------------------------------------------------
# Access-token vending
# ---------------------------------------------------------------------------

def get_valid_access_token(tenant: str) -> str:
    """
    Return a valid SP-API access_token for the given tenant.

    Strategy:
      1. Load the stored token bundle via get_tokens().
      2. If the stored access_token has sufficient remaining lifetime
         (> TOKEN_REFRESH_BUFFER_SECONDS), return it directly.
      3. Otherwise refresh via LWA and return the new access_token.

    Raises MissingConfigError, ConnectionStorageError, TokenRefreshError.
    NEVER log the returned token.
    """
    store  = get_connection_store()
    tokens = store.get_tokens(tenant=tenant)

    if tokens is None:
        raise ConnectionStorageError(
            f"No Amazon connection found for tenant '{tenant}'"
        )

    refresh_token = (tokens.get("refresh_token") or "").strip()
    if not refresh_token:
        raise ConnectionStorageError(
            "Stored token bundle is missing refresh_token"
        )

    obtained_at = int(tokens.get("obtained_at") or 0)
    expires_in  = int(tokens.get("expires_in")  or 3600)
    age         = int(time.time()) - obtained_at
    remaining   = expires_in - age

    if remaining > TOKEN_REFRESH_BUFFER_SECONDS:
        access_token = (tokens.get("access_token") or "").strip()
        if access_token:
            return access_token

    # Token is expired or near-expiry — refresh.
    logger.info(
        "Amazon access token for tenant '%s' is stale (remaining=%ds); refreshing.",
        tenant, remaining,
    )
    return refresh_lwa_token(refresh_token)


# ---------------------------------------------------------------------------
# SP-API Orders fetch
# ---------------------------------------------------------------------------

def fetch_orders(
    access_token: str,
    *,
    marketplace_id: str,
    created_after: Optional[str] = None,
    max_results: int = 50,
    timeout_seconds: float = 20.0,
) -> list:
    """
    Fetch recent orders from the SP-API Orders v0 endpoint.
    Returns the raw list of order dicts from the response payload.
    NEVER log the access_token.

    Raises OrderFetchError on HTTP or parse errors.
    A 403 typically means the Orders role is not approved on the SP-API app.
    """
    if not access_token:
        raise OrderFetchError("access_token is empty")
    if not marketplace_id:
        raise OrderFetchError("marketplace_id is required")

    params = {
        "MarketplaceIds":    marketplace_id,
        "MaxResultsPerPage": min(max(1, max_results), 100),
    }
    if created_after:
        params["CreatedAfter"] = created_after

    headers = {
        "x-amz-access-token": access_token,
        "Content-Type":       "application/json",
    }

    try:
        resp = requests.get(
            SP_API_ORDERS_URL,
            params=params,
            headers=headers,
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        logger.warning("SP-API orders network error")
        raise OrderFetchError(
            "Network error contacting SP-API Orders endpoint"
        ) from exc

    if resp.status_code == 403:
        raise OrderFetchError(
            "SP-API returned 403 — verify that the Orders role is approved "
            "on your SP-API application in Seller Central."
        )
    if resp.status_code == 429:
        raise OrderFetchError("SP-API rate limit exceeded; retry later.")
    if resp.status_code != 200:
        logger.warning("SP-API orders returned HTTP %s", resp.status_code)
        raise OrderFetchError(
            f"SP-API Orders endpoint returned HTTP {resp.status_code}"
        )

    try:
        body = resp.json()
    except ValueError as exc:
        raise OrderFetchError(
            "SP-API orders response was not valid JSON"
        ) from exc

    orders = ((body.get("payload") or {}).get("Orders") or [])
    return orders


# ---------------------------------------------------------------------------
# Safe normalization
# ---------------------------------------------------------------------------

def normalize_order(raw: dict) -> dict:
    """
    Extract a safe, minimal field set from a raw SP-API Order object.

    Intentionally excluded (PII / requires extra SP-API approval):
      * BuyerEmail       — PII; needs explicit data-element approval
      * BuyerName        — PII
      * ShippingAddress  — PII
      * Any field not in the allow-list below
    """
    order_total = raw.get("OrderTotal") or {}
    return {
        "orderId":            raw.get("AmazonOrderId"),
        "purchaseDate":       raw.get("PurchaseDate"),
        "orderStatus":        raw.get("OrderStatus"),
        "fulfillmentChannel": raw.get("FulfillmentChannel"),
        "salesChannel":       raw.get("SalesChannel"),
        "marketplaceId":      raw.get("MarketplaceId"),
        "orderTotal": {
            "amount":       order_total.get("Amount"),
            "currencyCode": order_total.get("CurrencyCode"),
        } if order_total else None,
        "shipServiceLevel":   raw.get("ShipServiceLevel"),
    }
