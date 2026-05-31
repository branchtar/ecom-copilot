"""
Workspace profile storage for Ecom Navigation.

Responsibilities:
  * Read and write workspace profiles keyed by Cognito user sub.
  * Auto-create a default workspace profile on first access (idempotent).
  * Return only non-sensitive metadata: workspace name, plan, tenant refs.
    Token storage is handled separately by amazon_oauth.py / shopify_oauth.py.

Backends (WORKSPACE_BACKEND env var):
  "secretsmanager"  (default) — AWS Secrets Manager; production/staging
  "local"                     — JSON files on disk; local dev only

Secret naming (Secrets Manager):
    {WORKSPACE_SECRETS_PREFIX}/{sanitized_user_sub}
  Default prefix: ecom-navigation/workspaces
  Example:        ecom-navigation/workspaces/abc12345-1234-1234-abcd-123456789abc

Required App Runner instance-role permissions (scoped to prefix):
    secretsmanager:GetSecretValue
    secretsmanager:CreateSecret
    secretsmanager:PutSecretValue
    secretsmanager:DescribeSecret
    secretsmanager:TagResource
  Resource ARN pattern:
    arn:aws:secretsmanager:{region}:{account}:secret:ecom-navigation/workspaces/*
"""

from __future__ import annotations

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger("ecom_navigation.workspace_store")

# ---------------------------------------------------------------------------
# Default workspace template
# Phase 3B-1: one hardcoded default workspace per user.
# marketplace_tenant_refs preserve existing live secrets at tenant=dev.
# ---------------------------------------------------------------------------

_DEFAULT_WORKSPACE_ID = "bwaaack"
_DEFAULT_WORKSPACE_NAME = "Bwaaack / Copy & Paste LLC"


def _make_default_profile(user_sub: str, email: str) -> dict:
    return {
        "version": 1,
        "user_sub": user_sub,
        "email": email,
        "workspaces": [
            {
                "id": _DEFAULT_WORKSPACE_ID,
                "name": _DEFAULT_WORKSPACE_NAME,
                "plan": "dev",
                "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "marketplace_tenant_refs": {
                    "amazon": "dev",
                    "shopify": "dev",
                },
            }
        ],
        "active_workspace_id": _DEFAULT_WORKSPACE_ID,
    }


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class WorkspaceStoreError(Exception):
    """Base class for workspace store errors."""


class WorkspaceStorageError(WorkspaceStoreError):
    """Could not read or write the workspace profile."""


class MissingConfigError(WorkspaceStoreError):
    """A required environment variable or dependency is not set."""


# ---------------------------------------------------------------------------
# Abstraction
# ---------------------------------------------------------------------------


class WorkspaceStore(ABC):
    @abstractmethod
    def get_or_create_profile(self, *, user_sub: str, email: str) -> dict:
        """
        Return the workspace profile for this user, creating a default
        profile if none exists yet. Idempotent — safe to call on every
        dashboard load. Never returns raw tokens or marketplace credentials.
        """

    @abstractmethod
    def save_profile(self, *, user_sub: str, profile: dict) -> None:
        """
        Overwrite the stored profile for this user.
        Caller must ensure get_or_create_profile was called first so the
        storage record already exists. Never log profile contents.
        """


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sanitize_sub(user_sub: str) -> str:
    """Convert a Cognito sub to a safe path component (filesystem / secret name)."""
    return re.sub(r"[^a-zA-Z0-9\-]", "_", user_sub)


def slugify_workspace_name(name: str) -> str:
    """
    Convert a workspace display name to a URL-safe slug.
    Lowercase, alphanumeric and hyphens only, max 40 chars.
    Used server-side only — the client never generates workspace IDs.

      "Ethnic Musical Instruments"  →  "ethnic-musical-instruments"
      "Roosters"                    →  "roosters"
      "Copy & Paste LLC"            →  "copy-paste-llc"
    """
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")[:40]
    return slug or "workspace"


# ---------------------------------------------------------------------------
# Local file store — dev only
# ---------------------------------------------------------------------------


class LocalFileWorkspaceStore(WorkspaceStore):
    """
    Stores workspace profiles as JSON files on disk.
    Path: {data_dir}/workspaces/{sanitized_sub}.json
    For local development only — not for production.
    """

    def __init__(self, *, data_dir: str) -> None:
        self._dir = Path(data_dir) / "workspaces"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, user_sub: str) -> Path:
        return self._dir / f"{_sanitize_sub(user_sub)}.json"

    def get_or_create_profile(self, *, user_sub: str, email: str) -> dict:
        p = self._path(user_sub)
        if p.exists():
            try:
                profile = json.loads(p.read_text(encoding="utf-8"))
                logger.debug("LocalFileWorkspaceStore: loaded profile (sub=%s)", user_sub)
                return profile
            except Exception as exc:
                logger.warning(
                    "LocalFileWorkspaceStore: corrupt profile (sub=%s), recreating: %s",
                    user_sub, exc,
                )

        profile = _make_default_profile(user_sub, email)
        try:
            p.write_text(json.dumps(profile, indent=2), encoding="utf-8")
            logger.info("LocalFileWorkspaceStore: created default profile (sub=%s)", user_sub)
        except OSError as exc:
            raise WorkspaceStorageError(f"Could not write workspace profile: {exc}") from exc
        return profile

    def save_profile(self, *, user_sub: str, profile: dict) -> None:
        p = self._path(user_sub)
        try:
            p.write_text(json.dumps(profile, indent=2), encoding="utf-8")
            logger.debug("LocalFileWorkspaceStore: saved profile (sub=%s)", user_sub)
        except OSError as exc:
            raise WorkspaceStorageError(f"Could not write workspace profile: {exc}") from exc


# ---------------------------------------------------------------------------
# Secrets Manager store — production
# ---------------------------------------------------------------------------


class SecretsManagerWorkspaceStore(WorkspaceStore):
    """
    Stores one workspace profile JSON blob per user in AWS Secrets Manager.
    Secret name: {prefix}/{sanitized_user_sub}
    """

    def __init__(self, *, client: object, prefix: str) -> None:
        self._client = client
        self._prefix = prefix.rstrip("/")

    @classmethod
    def from_env(cls) -> "SecretsManagerWorkspaceStore":
        try:
            import boto3
        except ImportError as exc:
            raise MissingConfigError("boto3 is required for SecretsManagerWorkspaceStore") from exc

        region = os.getenv("AWS_REGION", "us-east-1").strip()
        prefix = (
            os.getenv("WORKSPACE_SECRETS_PREFIX", "ecom-navigation/workspaces")
            .strip()
            .rstrip("/")
        )
        client = boto3.client("secretsmanager", region_name=region)
        return cls(client=client, prefix=prefix)

    def _secret_name(self, user_sub: str) -> str:
        return f"{self._prefix}/{_sanitize_sub(user_sub)}"

    def _read_secret(self, name: str) -> Optional[dict]:
        try:
            resp = self._client.get_secret_value(SecretId=name)
            return json.loads(resp["SecretString"])
        except self._client.exceptions.ResourceNotFoundException:
            return None
        except Exception as exc:
            raise WorkspaceStorageError(f"Secrets Manager read failed: {exc}") from exc

    def _write_secret(self, name: str, payload: dict, user_sub: str) -> None:
        body = json.dumps(payload)
        try:
            self._client.create_secret(
                Name=name,
                SecretString=body,
                Description=f"Workspace profile (user_sub={user_sub})",
                Tags=[
                    {"Key": "app", "Value": "ecom-navigation"},
                    {"Key": "component", "Value": "workspace"},
                ],
            )
        except self._client.exceptions.ResourceExistsException:
            self._client.put_secret_value(SecretId=name, SecretString=body)
        except Exception as exc:
            raise WorkspaceStorageError(f"Secrets Manager write failed: {exc}") from exc

    def get_or_create_profile(self, *, user_sub: str, email: str) -> dict:
        name = self._secret_name(user_sub)
        existing = self._read_secret(name)
        if existing is not None:
            logger.debug("SecretsManagerWorkspaceStore: loaded profile (sub=%s)", user_sub)
            return existing

        profile = _make_default_profile(user_sub, email)
        self._write_secret(name, profile, user_sub)
        logger.info(
            "SecretsManagerWorkspaceStore: created default profile (sub=%s)", user_sub,
        )
        return profile

    def save_profile(self, *, user_sub: str, profile: dict) -> None:
        name = self._secret_name(user_sub)
        self._write_secret(name, profile, user_sub)
        logger.debug("SecretsManagerWorkspaceStore: saved profile (sub=%s)", user_sub)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def get_workspace_store() -> WorkspaceStore:
    """
    Select backend via WORKSPACE_BACKEND env var:
      "local"           → LocalFileWorkspaceStore (dev)
      "secretsmanager"  → SecretsManagerWorkspaceStore (default, production)
    """
    backend = os.getenv("WORKSPACE_BACKEND", "secretsmanager").lower().strip()
    if backend == "local":
        data_dir = os.getenv(
            "WORKSPACE_LOCAL_DIR",
            str(Path(__file__).parent / "local_data"),
        )
        return LocalFileWorkspaceStore(data_dir=data_dir)

    return SecretsManagerWorkspaceStore.from_env()
