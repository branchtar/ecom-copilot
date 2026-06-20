"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetch the signed-in user's workspace profile and expose workspace actions.
 *
 * Returns:
 *   workspace          — active workspace object (name, plan, marketplace_tenant_refs),
 *                        or null while loading / on error.
 *   profile            — full profile (workspaces array, active_workspace_id), or null.
 *   loading            — true while the initial profile fetch is in flight.
 *   error              — error message string, or null.
 *   saving             — true while a createWorkspace or setActiveWorkspace call is in flight.
 *   createWorkspace    — async (name: string) → { ok, error? }
 *                        POSTs new workspace; updates profile from response (no second round-trip).
 *   setActiveWorkspace — async (workspaceId: string) → { ok, error? }
 *                        PATCHes active workspace; optimistic update with rollback on error.
 *   suppliers          — active workspace's supplier directory array (Phase 4E),
 *                        or [] while loading / on error.
 *   saveSuppliers      — async (list: Array) → { ok, error? }
 *                        PATCHes the active workspace's suppliers; optimistic update
 *                        with rollback on error. Backend is the source of truth.
 *
 * Fallback contract:
 *   Callers must use  workspace?.marketplace_tenant_refs?.amazon ?? <fallback>
 *   so existing connections keep working if the fetch fails.
 */
export function useWorkspace() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    fetch("/api/workspaces", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.error || "Failed to load workspace");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach workspace API");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── createWorkspace ───────────────────────────────────────────────────────
  // POSTs the new workspace name; uses the profile returned in the response
  // to update state (avoids an extra round-trip GET).

  const createWorkspace = useCallback(async (name) => {
    setSaving(true);
    try {
      const resp = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Failed to create workspace");
      // Server returns the full updated profile — apply directly.
      if (data.profile) setProfile(data.profile);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Failed to create workspace" };
    } finally {
      setSaving(false);
    }
  }, []); // no profile dep — only writes, never reads profile

  // ── setActiveWorkspace ────────────────────────────────────────────────────
  // Optimistically updates local state, then persists via PATCH.
  // Rolls back to previous profile on any error.

  const setActiveWorkspace = useCallback(async (workspaceId) => {
    if (!profile) return { ok: false, error: "No profile loaded" };

    // Optimistic update — capture snapshot for rollback.
    const previous = profile;
    setProfile((p) => (p ? { ...p, active_workspace_id: workspaceId } : p));
    setSaving(true);

    try {
      const resp = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
        cache: "no-store",
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Failed to switch workspace");
      return { ok: true };
    } catch (err) {
      // Rollback optimistic update.
      setProfile(previous);
      return { ok: false, error: err.message || "Failed to switch workspace" };
    } finally {
      setSaving(false);
    }
  }, [profile]); // profile in deps so rollback snapshot is always current

  // ── saveSuppliers ─────────────────────────────────────────────────────────
  // Replaces the active workspace's supplier list. Optimistically updates local
  // state, then persists via PATCH. Rolls back to previous profile on any error.
  // Backend remains the source of truth — the response profile is applied.

  const saveSuppliers = useCallback(async (list) => {
    if (!profile) return { ok: false, error: "No profile loaded" };
    const workspaceId = profile.active_workspace_id;
    if (!workspaceId) return { ok: false, error: "No active workspace" };

    const next = Array.isArray(list) ? list : [];

    // Optimistic update — capture snapshot for rollback.
    const previous = profile;
    setProfile((p) =>
      p
        ? {
            ...p,
            workspaces: (p.workspaces ?? []).map((w) =>
              w.id === workspaceId ? { ...w, suppliers: next } : w
            ),
          }
        : p
    );
    setSaving(true);

    try {
      const resp = await fetch("/api/workspaces/suppliers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, suppliers: next }),
        cache: "no-store",
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Failed to save suppliers");
      // Server returns the full updated profile — apply directly (source of truth).
      if (data.profile) setProfile(data.profile);
      return { ok: true };
    } catch (err) {
      // Rollback optimistic update.
      setProfile(previous);
      return { ok: false, error: err.message || "Failed to save suppliers" };
    } finally {
      setSaving(false);
    }
  }, [profile]); // profile in deps so rollback snapshot is always current

  // ── Derive active workspace ───────────────────────────────────────────────

  const workspace = profile
    ? (profile.workspaces ?? []).find((w) => w.id === profile.active_workspace_id) ?? null
    : null;

  const suppliers = workspace?.suppliers ?? [];

  return {
    workspace,
    profile,
    loading,
    error,
    saving,
    createWorkspace,
    setActiveWorkspace,
    suppliers,
    saveSuppliers,
  };
}
