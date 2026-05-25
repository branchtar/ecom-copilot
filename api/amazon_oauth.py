"""
Amazon SP-API OAuth helpers for Ecom Copilot.

Responsibilities:
  * Decode and validate the `state` blob created by the /api/integrations/amazon/start
    endpoint in api/server.py.
  * Exchange the spapi_oauth_code for LWA access/refresh tokens.
  * Persist the resulting seller connection through a storage abstraction so that
    the durable backend can be swapped in later without touching the route code.

Generate a Fernet key for AMAZON_TOKEN_ENC_KEY:
    python api/amazon_oauth.py gen-key

Or equivalently:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import requests
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("ecom_copilot.amazon_oauth")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"

# Max age of an Amazon OAuth state blob, in seconds. Amazon's authorize flow
# is typically completed within a couple of minutes; 30 min is a generous cap.
STATE_MAX_AGE_SECONDS = 30 * 60


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class AmazonOAuthError(Exception):
    """Base class for Amazon OAuth errors. Safe to render to end users."""


class InvalidStateError(AmazonOAuthError):
    """The state parameter is missing, malformed, or expired."""


class MissingConfigError(AmazonOAuthError):
    """A required environment variable is not set."""


class TokenExchangeError(AmazonOAuthError):
    """Amazon's LWA token endpoint refused or failed the exchange."""


class ConnectionStorageError(AmazonOAuthError):
    """The connection could not be persisted."""


# ---------------------------------------------------------------------------
# State decoding
# ---------------------------------------------------------------------------


def _b64url_decode(data: str) -> bytes:
    # Re-pad before decoding; the start endpoint strips padding.
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def decode_state(state: Optional[str]) -> dict:
    """
    Decode and shape-validate the state blob produced by amazon_connect_start().

    Returns the decoded dict on success. Raises InvalidStateError otherwise.
    Does NOT verify a server-side nonce store yet (none exists); the goal
    here is to confirm the blob is well-formed and not absurdly stale.
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
# Token exchange
# ---------------------------------------------------------------------------


def exchange_code_for_tokens(
    *,
    spapi_oauth_code: str,
    redirect_uri: Optional[str] = None,
    timeout_seconds: float = 15.0,
) -> dict:
    """
    POST to https://api.amazon.com/auth/o2/token to exchange the OAuth code
    for an access_token + refresh_token.

    Returns the parsed JSON response from Amazon, e.g.:
        {
          "access_token": "Atza|...",
          "refresh_token": "Atzr|...",
          "token_type": "bearer",
          "expires_in": 3600
        }

    IMPORTANT: Never log the response body, the code, or the client secret.
    """
    client_id = (os.getenv("AMAZON_LWA_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("AMAZON_LWA_CLIENT_SECRET") or "").strip()

    if not client_id:
        raise MissingConfigError("AMAZON_LWA_CLIENT_ID is not set")
    if not client_secret:
        raise MissingConfigError("AMAZON_LWA_CLIENT_SECRET is not set")
    if not spapi_oauth_code:
        raise TokenExchangeError("spapi_oauth_code is empty")

    payload = {
        "grant_type": "authorization_code",
        "code": spapi_oauth_code,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    # redirect_uri is optional in the LWA spec but, when used at authorize
    # time, must be echoed back on exchange. Only include if we have one.
    if redirect_uri:
        payload["redirect_uri"] = redirect_uri

    try:
        resp = requests.post(
            LWA_TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        # No body details — could include the code or secret in headers/url.
        logger.warning("LWA token exchange network error")
        raise TokenExchangeError("Network error contacting Amazon LWA") from exc

    if resp.status_code != 200:
        # Log status only, never the body — Amazon sometimes echoes the code.
        logger.warning("LWA token exchange returned HTTP %s", resp.status_code)
        raise TokenExchangeError(
            f"Amazon LWA token endpoint returned HTTP {resp.status_code}"
        )

    try:
        data = resp.json()
    except ValueError as exc:
        raise TokenExchangeError("LWA response was not valid JSON") from exc

    for required in ("access_token", "refresh_token", "token_type", "expires_in"):
        if required not in data:
            raise TokenExchangeError(
                f"LWA response missing required field: {required}"
            )

    return data


# ---------------------------------------------------------------------------
# Connection storage
# ---------------------------------------------------------------------------


class AmazonConnectionStore(ABC):
    """
    Abstract store for persisted Amazon seller connections.

    Connections are keyed by (tenant, selling_partner_id). Implementations
    must keep access/refresh tokens encrypted at rest.
    """

    @abstractmethod
    def save_connection(
        self,
        *,
        tenant: str,
        selling_partner_id: str,
        access_token: str,
        refresh_token: str,
        token_type: str,
        expires_in: int,
    ) -> None: ...

    @abstractmethod
    def has_connection(self, *, tenant: str, selling_partner_id: str) -> bool: ...


# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# NOT PRODUCTION-DURABLE.
#
# This app is deployed on AWS App Runner. App Runner's container filesystem
# is EPHEMERAL — anything written to disk is lost on every restart, deploy,
# and autoscale event. The local encrypted JSON store below is intended for
# LOCAL DEVELOPMENT ONLY.
#
# Before going live, swap this for a durable backend (e.g. DynamoDB or
# Secrets Manager) by implementing AmazonConnectionStore and wiring it
# through get_connection_store().
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
class LocalEncryptedJsonAmazonConnectionStore(AmazonConnectionStore):
    """
    Dev-only store. Encrypts the token bundle with Fernet (AES-128-CBC + HMAC)
    using AMAZON_TOKEN_ENC_KEY, then writes the ciphertext into a JSON file.

    The plaintext access_token / refresh_token are never written to disk.
    """

    def __init__(self, *, file_path: Path, fernet: Fernet):
        self._file_path = file_path
        self._fernet = fernet

    @classmethod
    def from_env(
        cls, *, file_path: Optional[Path] = None
    ) -> "LocalEncryptedJsonAmazonConnectionStore":
        key = (os.getenv("AMAZON_TOKEN_ENC_KEY") or "").strip()
        if not key:
            raise MissingConfigError("AMAZON_TOKEN_ENC_KEY is not set")

        try:
            fernet = Fernet(key.encode("utf-8"))
        except (ValueError, TypeError) as exc:
            raise MissingConfigError(
                "AMAZON_TOKEN_ENC_KEY is not a valid Fernet key. "
                "Generate one with: python api/amazon_oauth.py gen-key"
            ) from exc

        if file_path is None:
            # Repo-relative: <repo_root>/data/amazon_connections.encrypted.json
            file_path = (
                Path(__file__).resolve().parent.parent
                / "data"
                / "amazon_connections.encrypted.json"
            )
        return cls(file_path=file_path, fernet=fernet)

    # -- internals -----------------------------------------------------------

    def _load(self) -> dict:
        if not self._file_path.exists():
            return {"version": 1, "connections": {}}
        try:
            with open(self._file_path, "r", encoding="utf-8") as fh:
                obj = json.load(fh)
        except (OSError, ValueError) as exc:
            raise ConnectionStorageError(
                "Could not read local connections file"
            ) from exc
        if not isinstance(obj, dict):
            obj = {"version": 1, "connections": {}}
        obj.setdefault("version", 1)
        obj.setdefault("connections", {})
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
                "Could not write local connections file"
            ) from exc

    @staticmethod
    def _key(tenant: str, selling_partner_id: str) -> str:
        return f"{tenant}:{selling_partner_id}"

    # -- AmazonConnectionStore interface -------------------------------------

    def save_connection(
        self,
        *,
        tenant: str,
        selling_partner_id: str,
        access_token: str,
        refresh_token: str,
        token_type: str,
        expires_in: int,
    ) -> None:
        now = int(time.time())
        secret_payload = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": token_type,
            "expires_in": int(expires_in),
            "obtained_at": now,
        }
        try:
            ciphertext = self._fernet.encrypt(
                json.dumps(secret_payload).encode("utf-8")
            ).decode("utf-8")
        except (InvalidToken, ValueError) as exc:
            raise ConnectionStorageError("Failed to encrypt token payload") from exc

        obj = self._load()
        obj["connections"][self._key(tenant, selling_partner_id)] = {
            "tenant": tenant,
            "selling_partner_id": selling_partner_id,
            "encrypted_payload": ciphertext,
            "updated_at": now,
        }
        self._write(obj)

    def has_connection(self, *, tenant: str, selling_partner_id: str) -> bool:
        obj = self._load()
        return self._key(tenant, selling_partner_id) in obj["connections"]


class SecretsManagerAmazonConnectionStore(AmazonConnectionStore):
    """
    Production store. Each seller connection is persisted as a single
    AWS Secrets Manager secret, encrypted at rest by the AWS-managed
    KMS key (aws/secretsmanager) — no Fernet key required.

    Secret naming:
        {AMAZON_SECRETS_PREFIX}/{tenant}/{selling_partner_id}
    Default prefix:
        ecom-copilot/amazon
    Example:
        ecom-copilot/amazon/dev/AXXXXXXXXXXXXX

    The secret value is a JSON string containing the token bundle.
    IMPORTANT: Never log the secret value, access token, or refresh token.

    Required App Runner instance-role permissions (scoped to prefix):
        secretsmanager:CreateSecret
        secretsmanager:PutSecretValue
        secretsmanager:GetSecretValue
        secretsmanager:DescribeSecret
        secretsmanager:TagResource
    Resource ARN pattern:
        arn:aws:secretsmanager:{region}:{account}:secret:{prefix}/*
    """

    def __init__(self, *, client: object, prefix: str) -> None:
        self._client = client
        self._prefix = prefix.rstrip("/")

    @classmethod
    def from_env(cls) -> "SecretsManagerAmazonConnectionStore":
        # Lazy import: boto3 is only required when this backend is active.
        # Local dev using AMAZON_CONNECTION_STORE=local never touches boto3.
        try:
            import boto3  # type: ignore[import]
        except ImportError as exc:
            raise MissingConfigError(
                "boto3 is not installed. Add boto3 to api/requirements.txt."
            ) from exc

        prefix = (
            (os.getenv("AMAZON_SECRETS_PREFIX") or "ecom-copilot/amazon")
            .strip()
            .rstrip("/")
        )
        # App Runner injects AWS_DEFAULT_REGION automatically when an
        # instance role is attached. Fall back to AWS_REGION, then us-east-1.
        region = (
            os.getenv("AWS_DEFAULT_REGION")
            or os.getenv("AWS_REGION")
            or "us-east-1"
        ).strip()

        client = boto3.client("secretsmanager", region_name=region)
        return cls(client=client, prefix=prefix)

    # -- internals -----------------------------------------------------------

    def _secret_name(self, tenant: str, selling_partner_id: str) -> str:
        return f"{self._prefix}/{tenant}/{selling_partner_id}"

    # -- AmazonConnectionStore interface -------------------------------------

    def save_connection(
        self,
        *,
        tenant: str,
        selling_partner_id: str,
        access_token: str,
        refresh_token: str,
        token_type: str,
        expires_in: int,
    ) -> None:
        name = self._secret_name(tenant, selling_partner_id)
        now = int(time.time())
        # Token bundle stored as the Secrets Manager secret value.
        # Secrets Manager encrypts this with the aws/secretsmanager KMS key.
        # IMPORTANT: never log this payload.
        payload = json.dumps(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": token_type,
                "expires_in": int(expires_in),
                "obtained_at": now,
                "tenant": tenant,
                "selling_partner_id": selling_partner_id,
            }
        )
        try:
            try:
                self._client.create_secret(
                    Name=name,
                    SecretString=payload,
                    Description=f"Amazon SP-API seller connection (tenant={tenant})",
                    Tags=[
                        {"Key": "app", "Value": "ecom-copilot"},
                        {"Key": "tenant", "Value": tenant},
                        {"Key": "selling_partner_id", "Value": selling_partner_id},
                    ],
                )
            except self._client.exceptions.ResourceExistsException:
                # Secret already exists from a previous OAuth — update it in place.
                self._client.put_secret_value(
                    SecretId=name,
                    SecretString=payload,
                )
        except ConnectionStorageError:
            raise
        except Exception as exc:
            # Log tenant/spid only — never the payload.
            logger.error(
                "Secrets Manager save_connection failed (tenant=%s selling_partner_id=%s)",
                tenant,
                selling_partner_id,
            )
            raise ConnectionStorageError(
                "Could not save connection to Secrets Manager"
            ) from exc

    def has_connection(self, *, tenant: str, selling_partner_id: str) -> bool:
        """
        Uses DescribeSecret (metadata only) — does NOT retrieve the secret
        value, so no token data is read from Secrets Manager just for a check.
        """
        name = self._secret_name(tenant, selling_partner_id)
        try:
            self._client.describe_secret(SecretId=name)
            return True
        except self._client.exceptions.ResourceNotFoundException:
            return False
        except Exception as exc:
            logger.warning(
                "Secrets Manager has_connection check failed (tenant=%s selling_partner_id=%s)",
                tenant,
                selling_partner_id,
            )
            raise ConnectionStorageError(
                "Could not check connection in Secrets Manager"
            ) from exc


def get_connection_store() -> AmazonConnectionStore:
    """
    Factory. Selects the storage backend from the AMAZON_CONNECTION_STORE
    environment variable:

        local            — LocalEncryptedJsonAmazonConnectionStore (dev only,
                           ephemeral on App Runner — NOT production-durable)
        secretsmanager   — SecretsManagerAmazonConnectionStore (production)

    Defaults to 'local' so local development works without AWS credentials.
    Set AMAZON_CONNECTION_STORE=secretsmanager in App Runner env vars.
    """
    backend = (os.getenv("AMAZON_CONNECTION_STORE") or "local").strip().lower()
    if backend == "secretsmanager":
        return SecretsManagerAmazonConnectionStore.from_env()
    return LocalEncryptedJsonAmazonConnectionStore.from_env()


# ---------------------------------------------------------------------------
# CLI: key generation
# ---------------------------------------------------------------------------


def _main() -> int:
    import sys

    args = sys.argv[1:]
    if args and args[0] == "gen-key":
        # Print only the key — easy to pipe into a secret store.
        print(Fernet.generate_key().decode("utf-8"))
        return 0

    print("Usage: python api/amazon_oauth.py gen-key")
    return 1


if __name__ == "__main__":
    raise SystemExit(_main())
