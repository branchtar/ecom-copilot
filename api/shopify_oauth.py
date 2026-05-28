"""
Shopify OAuth helpers for Ecom Navigation.

Responsibilities:
  * Build the Shopify OAuth authorize URL.
  * Validate the HMAC-SHA256 signature on the callback.
  * Decode and validate the state blob (same pattern as amazon_oauth.py).
  * Exchange the authorization code for a permanent Shopify access token.
  * Persist the resulting shop connection through a storage abstraction so
    the durable backend can be swapped in later without touching route code.

Shopify access tokens are permanent (no refresh token). The token bundle
stored here is simply: {access_token, shop, tenant, obtained_at}.

IMPORTANT: Never log access_token values, the OAuth code, or the client secret.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode, urlparse

import requests
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("ecom_navigation.shopify_oauth")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STATE_MAX_AGE_SECONDS = 30 * 60  # same generous cap as Amazon connector

# Minimum allowed Shopify scopes for MVP (dashboard status + connect/disconnect).
# Expand here when order/product sync is added in later phases.
DEFAULT_SCOPES = "read_products,read_orders,read_inventory"

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class ShopifyOAuthError(Exception):
    """Base class for Shopify OAuth errors. Safe to render to end users."""


class InvalidStateError(ShopifyOAuthError):
    """The state parameter is missing, malformed, or expired."""


class InvalidHmacError(ShopifyOAuthError):
    """The HMAC signature on the Shopify callback could not be verified."""


class InvalidShopError(ShopifyOAuthError):
    """The shop parameter is missing or not a valid Shopify domain."""


class MissingConfigError(ShopifyOAuthError):
    """A required environment variable is not set."""


class TokenExchangeError(ShopifyOAuthError):
    """Shopify's token endpoint refused or failed the exchange."""


class ConnectionStorageError(ShopifyOAuthError):
    """The connection could not be persisted."""


# ---------------------------------------------------------------------------
# Shop domain validation
# ---------------------------------------------------------------------------

# Accept *.myshopify.com OR a bare custom domain (letters/digits/hyphens/dots).
_SHOP_RE = re.compile(
    r"^[a-zA-Z0-9][a-zA-Z0-9\-]*"           # at least one label
    r"(\.[a-zA-Z0-9][a-zA-Z0-9\-]*)*"        # optional extra labels
    r"\.[a-zA-Z]{2,}$"                        # TLD
)


def normalize_shop(shop: Optional[str]) -> str:
    """
    Normalise and validate a Shopify shop domain.

    Strips scheme/path so callers can paste the full URL.
    Returns the bare hostname (e.g. 'my-store.myshopify.com').
    Raises InvalidShopError on bad input.
    """
    if not shop:
        raise InvalidShopError("shop parameter is required")

    shop = shop.strip().lower()

    # Strip scheme if pasted as a URL.
    if "://" in shop:
        parsed = urlparse(shop)
        shop = parsed.hostname or ""

    # Strip trailing slashes or paths.
    shop = shop.split("/")[0].strip()

    if not shop:
        raise InvalidShopError("shop parameter is empty after normalisation")

    if not _SHOP_RE.match(shop):
        raise InvalidShopError(
            f"'{shop}' does not look like a valid shop domain"
        )

    return shop


# ---------------------------------------------------------------------------
# State encoding / decoding  (mirrors amazon_oauth.py)
# ---------------------------------------------------------------------------


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def encode_state(*, tenant: str) -> str:
    """
    Build a base64url-encoded state blob: {tenant, ts, nonce}.
    Same structure as the Amazon connector so decode_state() can be shared.
    """
    import secrets as _secrets

    obj = {
        "tenant": tenant,
        "ts": int(time.time()),
        "nonce": _secrets.token_urlsafe(12),
    }
    raw = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def decode_state(state: Optional[str]) -> dict:
    """
    Decode and shape-validate the state blob produced by encode_state().

    Returns the decoded dict on success. Raises InvalidStateError otherwise.
    """
    if not state:
        raise InvalidStateError("Missing state parameter")

    try:
        raw = _b64url_decode(state)
        obj = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise InvalidStateError("State parameter could not be decoded") from exc

    if not isinstance(obj, dict):
        raise InvalidStateError("State payload is not an object")

    for required in ("tenant", "ts", "nonce"):
        if required not in obj:
            raise InvalidStateError(f"State missing required field: {required}")

    try:
        ts = int(obj["ts"])
    except (TypeError, ValueError) as exc:
        raise InvalidStateError("State timestamp is not an integer") from exc

    age = int(time.time()) - ts
    if age < -60 or age > STATE_MAX_AGE_SECONDS:
        raise InvalidStateError("State is expired or has an implausible timestamp")

    return obj


# ---------------------------------------------------------------------------
# HMAC verification
# ---------------------------------------------------------------------------


def verify_hmac(*, params: dict, client_secret: str) -> None:
    """
    Verify the HMAC-SHA256 signature Shopify appends to the callback URL.

    Algorithm (per Shopify docs):
      1. Remove the 'hmac' key from the query params.
      2. Sort remaining params, percent-encode per Shopify rules, join as
         key=value pairs separated by '&'.
      3. Compute HMAC-SHA256(client_secret, message).
      4. Compare digest (hex) to the provided hmac value.

    Raises InvalidHmacError if the signature does not match.
    IMPORTANT: Do not log params, client_secret, or the provided hmac value.
    """
    provided_hmac = params.get("hmac", "")

    # Build the message: all params except 'hmac', sorted, joined.
    filtered = {k: v for k, v in params.items() if k != "hmac"}
    message = "&".join(
        f"{k}={v}" for k, v in sorted(filtered.items())
    ).encode("utf-8")

    expected = hmac.new(
        client_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, provided_hmac):
        # Do not include expected/provided values in the exception message.
        raise InvalidHmacError("Shopify callback HMAC verification failed")


# ---------------------------------------------------------------------------
# Authorize URL builder
# ---------------------------------------------------------------------------


def build_authorize_url(
    *,
    shop: str,
    client_id: str,
    redirect_uri: str,
    scopes: str,
    state: str,
) -> str:
    """Build the Shopify OAuth authorize URL for the given shop."""
    params = {
        "client_id": client_id,
        "scope": scopes,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    return f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"


# ---------------------------------------------------------------------------
# Token exchange
# ---------------------------------------------------------------------------


def exchange_code_for_token(
    *,
    shop: str,
    code: str,
    timeout_seconds: float = 15.0,
) -> str:
    """
    POST to https://{shop}/admin/oauth/access_token to exchange the
    authorization code for a permanent access token.

    Returns the access_token string.

    IMPORTANT: Never log the code, client_secret, or the returned token.
    """
    client_id = (os.getenv("SHOPIFY_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("SHOPIFY_CLIENT_SECRET") or "").strip()

    if not client_id:
        raise MissingConfigError("SHOPIFY_CLIENT_ID is not set")
    if not client_secret:
        raise MissingConfigError("SHOPIFY_CLIENT_SECRET is not set")
    if not code:
        raise TokenExchangeError("authorization code is empty")

    url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
    }

    try:
        resp = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        logger.warning("Shopify token exchange network error (shop=%s)", shop)
        raise TokenExchangeError("Network error contacting Shopify token endpoint") from exc

    if resp.status_code != 200:
        logger.warning(
            "Shopify token exchange returned HTTP %s (shop=%s)",
            resp.status_code, shop,
        )
        raise TokenExchangeError(
            f"Shopify token endpoint returned HTTP {resp.status_code}"
        )

    try:
        data = resp.json()
    except ValueError as exc:
        raise TokenExchangeError("Shopify token response was not valid JSON") from exc

    token = data.get("access_token", "")
    if not token:
        raise TokenExchangeError("Shopify token response missing access_token")

    # Never log the token value.
    return token


# ---------------------------------------------------------------------------
# Connection storage
# ---------------------------------------------------------------------------


class ShopifyConnectionStore(ABC):
    """
    Abstract store for persisted Shopify shop connections.

    Connections are keyed by (tenant, shop). Implementations must keep
    access tokens encrypted at rest.
    """

    @abstractmethod
    def save_connection(
        self,
        *,
        tenant: str,
        shop: str,
        access_token: str,
    ) -> None: ...

    @abstractmethod
    def has_connection(self, *, tenant: str, shop: str) -> bool: ...

    @abstractmethod
    def get_connection_meta(self, *, tenant: str) -> Optional[dict]:
        """
        Returns safe metadata for the most recent connection for this tenant,
        or None if no connection exists.

        Safe fields only: shop, tenant, obtained_at.
        MUST NEVER return access_token or any secret value.
        """
        ...

    @abstractmethod
    def delete_connection(self, *, tenant: str, shop: str) -> None:
        """Remove the connection and its metadata. Used by disconnect endpoint."""
        ...


# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# NOT PRODUCTION-DURABLE.
#
# App Runner's container filesystem is EPHEMERAL — anything written to disk
# is lost on every restart, deploy, and autoscale event.
# The local encrypted JSON store below is for LOCAL DEVELOPMENT ONLY.
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
class LocalEncryptedJsonShopifyConnectionStore(ShopifyConnectionStore):
    """
    Dev-only store. Encrypts the token with Fernet (AES-128-CBC + HMAC)
    using SHOPIFY_TOKEN_ENC_KEY, then writes ciphertext into a JSON file.

    The plaintext access_token is never written to disk unencrypted.
    """

    def __init__(self, *, file_path: Path, fernet: Fernet):
        self._file_path = file_path
        self._fernet = fernet

    @classmethod
    def from_env(
        cls, *, file_path: Optional[Path] = None
    ) -> "LocalEncryptedJsonShopifyConnectionStore":
        key = (os.getenv("SHOPIFY_TOKEN_ENC_KEY") or "").strip()
        if not key:
            raise MissingConfigError("SHOPIFY_TOKEN_ENC_KEY is not set")

        try:
            fernet = Fernet(key.encode("utf-8"))
        except (ValueError, TypeError) as exc:
            raise MissingConfigError(
                "SHOPIFY_TOKEN_ENC_KEY is not a valid Fernet key. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\""
            ) from exc

        if file_path is None:
            file_path = (
                Path(__file__).resolve().parent.parent
                / "data"
                / "shopify_connections.encrypted.json"
            )
        return cls(file_path=file_path, fernet=fernet)

    def _load(self) -> dict:
        if not self._file_path.exists():
            return {"version": 1, "connections": {}, "tenant_meta": {}}
        try:
            with open(self._file_path, "r", encoding="utf-8") as fh:
                obj = json.load(fh)
        except (OSError, ValueError) as exc:
            raise ConnectionStorageError(
                "Could not read local Shopify connections file"
            ) from exc
        if not isinstance(obj, dict):
            obj = {"version": 1, "connections": {}, "tenant_meta": {}}
        obj.setdefault("version", 1)
        obj.setdefault("connections", {})
        obj.setdefault("tenant_meta", {})
        return obj

    def _write(self, obj: dict) -> None:
        try:
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._file_path.with_suffix(self._file_path.suffix + ".tmp")
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(obj, fh, indent=2)
            os.replace(tmp, self._file_path)
        except OSError as exc:
            raise ConnectionStorageError(
                "Could not write local Shopify connections file"
            ) from exc

    @staticmethod
    def _key(tenant: str, shop: str) -> str:
        return f"{tenant}:{shop}"

    def save_connection(self, *, tenant: str, shop: str, access_token: str) -> None:
        now = int(time.time())
        secret_payload = {
            "access_token": access_token,
            "shop": shop,
            "tenant": tenant,
            "obtained_at": now,
        }
        try:
            ciphertext = self._fernet.encrypt(
                json.dumps(secret_payload).encode("utf-8")
            ).decode("utf-8")
        except (InvalidToken, ValueError) as exc:
            raise ConnectionStorageError("Failed to encrypt Shopify token") from exc

        obj = self._load()
        obj["connections"][self._key(tenant, shop)] = {
            "tenant": tenant,
            "shop": shop,
            "encrypted_payload": ciphertext,
            "updated_at": now,
        }
        # Safe metadata — no token values stored here.
        obj["tenant_meta"][tenant] = {
            "shop": shop,
            "tenant": tenant,
            "obtained_at": now,
        }
        self._write(obj)

    def has_connection(self, *, tenant: str, shop: str) -> bool:
        obj = self._load()
        return self._key(tenant, shop) in obj["connections"]

    def get_connection_meta(self, *, tenant: str) -> Optional[dict]:
        obj = self._load()
        return obj["tenant_meta"].get(tenant)

    def delete_connection(self, *, tenant: str, shop: str) -> None:
        obj = self._load()
        obj["connections"].pop(self._key(tenant, shop), None)
        if (obj["tenant_meta"].get(tenant) or {}).get("shop") == shop:
            obj["tenant_meta"].pop(tenant, None)
        self._write(obj)


class SecretsManagerShopifyConnectionStore(ShopifyConnectionStore):
    """
    Production store. Each shop connection is persisted as a single
    AWS Secrets Manager secret encrypted by the aws/secretsmanager KMS key.

    Secret naming:
        {SHOPIFY_SECRETS_PREFIX}/{tenant}/{shop}
    Default prefix:
        ecom-copilot/shopify
    Example:
        ecom-copilot/shopify/dev/my-store.myshopify.com

    Meta secret (safe fields only — no token):
        ecom-copilot/shopify/{tenant}/_meta

    Required App Runner instance-role permissions (scoped to prefix):
        secretsmanager:CreateSecret
        secretsmanager:PutSecretValue
        secretsmanager:GetSecretValue
        secretsmanager:DescribeSecret
        secretsmanager:DeleteSecret
        secretsmanager:TagResource
    """

    def __init__(self, *, client: object, prefix: str) -> None:
        self._client = client
        self._prefix = prefix.rstrip("/")

    @classmethod
    def from_env(cls) -> "SecretsManagerShopifyConnectionStore":
        try:
            import boto3  # type: ignore[import]
        except ImportError as exc:
            raise MissingConfigError(
                "boto3 is not installed. Add boto3 to api/requirements.txt."
            ) from exc

        prefix = (
            (os.getenv("SHOPIFY_SECRETS_PREFIX") or "ecom-copilot/shopify")
            .strip()
            .rstrip("/")
        )
        region = (
            os.getenv("AWS_DEFAULT_REGION")
            or os.getenv("AWS_REGION")
            or "us-east-1"
        ).strip()

        client = boto3.client("secretsmanager", region_name=region)
        return cls(client=client, prefix=prefix)

    def _secret_name(self, tenant: str, shop: str) -> str:
        return f"{self._prefix}/{tenant}/{shop}"

    def _meta_secret_name(self, tenant: str) -> str:
        return f"{self._prefix}/{tenant}/_meta"

    def _upsert_secret(self, name: str, payload: str, description: str, tags: list) -> None:
        """Create or update a Secrets Manager secret. Never logs payload."""
        try:
            self._client.create_secret(
                Name=name,
                SecretString=payload,
                Description=description,
                Tags=tags,
            )
        except self._client.exceptions.ResourceExistsException:
            self._client.put_secret_value(
                SecretId=name,
                SecretString=payload,
            )

    def save_connection(self, *, tenant: str, shop: str, access_token: str) -> None:
        now = int(time.time())
        # IMPORTANT: never log this payload.
        payload = json.dumps({
            "access_token": access_token,
            "shop": shop,
            "tenant": tenant,
            "obtained_at": now,
        })

        name = self._secret_name(tenant, shop)
        try:
            self._upsert_secret(
                name=name,
                payload=payload,
                description=f"Shopify shop connection (tenant={tenant})",
                tags=[
                    {"Key": "app", "Value": "ecom-navigation"},
                    {"Key": "tenant", "Value": tenant},
                    {"Key": "shop", "Value": shop},
                ],
            )
        except ConnectionStorageError:
            raise
        except Exception as exc:
            logger.error(
                "Secrets Manager save_connection failed (tenant=%s shop=%s)",
                tenant, shop,
            )
            raise ConnectionStorageError(
                "Could not save Shopify connection to Secrets Manager"
            ) from exc

        # Write safe metadata — non-fatal if this fails.
        meta_name = self._meta_secret_name(tenant)
        meta_payload = json.dumps({
            "shop": shop,
            "tenant": tenant,
            "obtained_at": now,
        })
        try:
            self._upsert_secret(
                name=meta_name,
                payload=meta_payload,
                description=f"Shopify connection metadata (tenant={tenant}) — non-sensitive",
                tags=[
                    {"Key": "app", "Value": "ecom-navigation"},
                    {"Key": "tenant", "Value": tenant},
                ],
            )
        except Exception:
            logger.warning(
                "Secrets Manager meta write failed (tenant=%s shop=%s) "
                "— status endpoint may be stale",
                tenant, shop,
            )

    def has_connection(self, *, tenant: str, shop: str) -> bool:
        """Uses DescribeSecret (metadata only) — does NOT retrieve the token."""
        name = self._secret_name(tenant, shop)
        try:
            self._client.describe_secret(SecretId=name)
            return True
        except self._client.exceptions.ResourceNotFoundException:
            return False
        except Exception as exc:
            logger.warning(
                "Secrets Manager has_connection check failed (tenant=%s shop=%s)",
                tenant, shop,
            )
            raise ConnectionStorageError(
                "Could not check Shopify connection in Secrets Manager"
            ) from exc

    def get_connection_meta(self, *, tenant: str) -> Optional[dict]:
        """
        Reads the safe metadata secret for this tenant.
        Returns {shop, tenant, obtained_at} or None.
        Does NOT read the token secret.
        """
        name = self._meta_secret_name(tenant)
        try:
            resp = self._client.get_secret_value(SecretId=name)
            data = json.loads(resp["SecretString"])
            return {
                "shop": data.get("shop"),
                "tenant": data.get("tenant", tenant),
                "obtained_at": data.get("obtained_at"),
            }
        except self._client.exceptions.ResourceNotFoundException:
            return None
        except Exception as exc:
            logger.warning(
                "Secrets Manager get_connection_meta failed (tenant=%s)", tenant
            )
            raise ConnectionStorageError(
                "Could not read Shopify connection metadata from Secrets Manager"
            ) from exc

    def delete_connection(self, *, tenant: str, shop: str) -> None:
        """Delete the token secret and meta secret. Used by disconnect endpoint."""
        names_to_delete = [
            self._secret_name(tenant, shop),
            self._meta_secret_name(tenant),
        ]
        errors = []
        for name in names_to_delete:
            try:
                self._client.delete_secret(
                    SecretId=name,
                    ForceDeleteWithoutRecovery=True,
                )
            except self._client.exceptions.ResourceNotFoundException:
                pass  # Already gone — that's fine.
            except Exception as exc:
                logger.error(
                    "Secrets Manager delete_connection failed (name=%s)", name
                )
                errors.append(name)

        if errors:
            raise ConnectionStorageError(
                f"Could not delete Shopify connection secrets: {errors}"
            )


def get_connection_store() -> ShopifyConnectionStore:
    """
    Factory. Selects the storage backend from SHOPIFY_CONNECTION_STORE:

        local            — LocalEncryptedJsonShopifyConnectionStore (dev only)
        secretsmanager   — SecretsManagerShopifyConnectionStore (production)

    Defaults to 'local' so local development works without AWS credentials.
    Set SHOPIFY_CONNECTION_STORE=secretsmanager in App Runner env vars.
    """
    backend = (os.getenv("SHOPIFY_CONNECTION_STORE") or "local").strip().lower()
    if backend == "secretsmanager":
        return SecretsManagerShopifyConnectionStore.from_env()
    return LocalEncryptedJsonShopifyConnectionStore.from_env()
