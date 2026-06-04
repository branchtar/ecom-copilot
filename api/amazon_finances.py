"""
Amazon SP-API Finance helpers for Ecom Navigation.

Responsibilities:
  * Fetch recent financial event groups from SP-API Finances v0.
  * Normalize raw group objects to a safe, minimal field set.
  * Build a structured finance summary for the dashboard.

The access_token is vended by the caller (server.py) via
amazon_orders.get_valid_access_token() — token logic is not duplicated here.

IMPORTANT: Never log the access_token or any token value.
"""

from __future__ import annotations

import datetime
import logging
from typing import Optional

import requests

logger = logging.getLogger("ecom_copilot.amazon_finances")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SP_API_FINANCE_URL = (
    "https://sellingpartnerapi-na.amazon.com/finances/v0/financialEventGroups"
)

FINANCE_WARNING = (
    "Amazon finance data is not exact bank-available cash. "
    "Reserves, holds, returns, and pending adjustments may affect availability."
)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class AmazonFinancesError(Exception):
    """Base class for finance-fetch errors."""


class FinanceRoleError(AmazonFinancesError):
    """SP-API returned 403 — Finance and Accounting role not approved."""


class FinanceFetchError(AmazonFinancesError):
    """SP-API finance fetch failed."""


# ---------------------------------------------------------------------------
# SP-API fetch
# ---------------------------------------------------------------------------


def fetch_financial_event_groups(
    access_token: str,
    *,
    days: int = 90,
    max_results: int = 10,
    timeout_seconds: float = 20.0,
) -> list:
    """
    Fetch recent financial event groups from SP-API Finances v0.
    Returns the raw list of group dicts from the response payload.
    NEVER log the access_token.

    Raises FinanceRoleError on 403 (missing Finance and Accounting role).
    Raises FinanceFetchError on other HTTP or parse errors.
    """
    if not access_token:
        raise FinanceFetchError("access_token is empty")

    started_after = (
        datetime.datetime.utcnow() - datetime.timedelta(days=max(1, days))
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    params = {
        "FinancialEventGroupStartedAfter": started_after,
        "MaxResultsPerPage": min(max(1, max_results), 100),
    }

    headers = {
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
    }

    try:
        resp = requests.get(
            SP_API_FINANCE_URL,
            params=params,
            headers=headers,
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        logger.warning("SP-API finance network error")
        raise FinanceFetchError(
            "Network error contacting SP-API Finance endpoint"
        ) from exc

    if resp.status_code == 403:
        raise FinanceRoleError(
            "SP-API returned 403 — verify that the Finance and Accounting role "
            "is approved on your SP-API application in Seller Central."
        )
    if resp.status_code == 429:
        raise FinanceFetchError("SP-API rate limit exceeded; retry later.")
    if resp.status_code != 200:
        logger.warning("SP-API finance returned HTTP %s", resp.status_code)
        raise FinanceFetchError(
            f"SP-API Finance endpoint returned HTTP {resp.status_code}"
        )

    try:
        body = resp.json()
    except ValueError as exc:
        raise FinanceFetchError(
            "SP-API finance response was not valid JSON"
        ) from exc

    return ((body.get("payload") or {}).get("FinancialEventGroupList") or [])


# ---------------------------------------------------------------------------
# Safe normalization
# ---------------------------------------------------------------------------


def normalize_group(raw: dict) -> dict:
    """
    Extract a safe, minimal field set from a raw SP-API FinancialEventGroup.

    Intentionally excluded: TraceId, AccountTail, ConvertedTotal, BeginningBalance,
    and any field not in the allow-list below.
    """
    original_total = raw.get("OriginalTotal") or {}
    return {
        "id":                   raw.get("FinancialEventGroupId"),
        "status":               raw.get("ProcessingStatus"),
        "fund_transfer_status": raw.get("FundTransferStatus"),
        "original_total":       original_total.get("CurrencyAmount"),
        "currency":             original_total.get("CurrencyCode"),
        "fund_transfer_date":   raw.get("FundTransferDate"),
        "begin_date":           raw.get("FinancialEventGroupStart"),
        "end_date":             raw.get("FinancialEventGroupEnd"),
    }


# ---------------------------------------------------------------------------
# Summary builder
# ---------------------------------------------------------------------------


def build_finance_summary(
    tenant: str,
    selling_partner_id: Optional[str],
    groups: list,
) -> dict:
    """
    Build the structured finance summary returned by the API endpoint.
    groups must already be normalized via normalize_group().
    """
    closed = [g for g in groups if g.get("status") == "Closed"]
    open_  = [g for g in groups if g.get("status") == "Open"]

    latest_closed = closed[0] if closed else None
    latest_open   = open_[0]  if open_  else None

    # Currency from whichever group is most recent.
    currency = (latest_closed or latest_open or {}).get("currency")

    return {
        "ok":                  True,
        "connected":           True,
        "tenant":              tenant,
        "selling_partner_id":  selling_partner_id,
        "currency":            currency,
        "latest_closed_group": latest_closed,
        "latest_open_group":   latest_open,
        "recent_groups":       groups[:5],
        "warnings":            [FINANCE_WARNING],
        "error_code":          None,
    }
