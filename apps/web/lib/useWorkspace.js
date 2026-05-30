"use client";

import { useEffect, useState } from "react";

/**
 * Fetch the signed-in user's workspace profile.
 *
 * Returns:
 *   workspace  — active workspace object (name, plan, marketplace_tenant_refs),
 *                or null while loading / on error.
 *   profile    — full profile (workspaces array, active_workspace_id), or null.
 *   loading    — true while the request is in flight.
 *   error      — error message string, or null.
 *
 * Falls back gracefully: callers should use
 *   workspace?.marketplace_tenant_refs?.amazon ?? "dev"
 * so existing connections continue to work if the fetch fails.
 */
export function useWorkspace() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

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

    return () => {
      cancelled = true;
    };
  }, []);

  const workspace = profile
    ? (profile.workspaces ?? []).find((w) => w.id === profile.active_workspace_id) ?? null
    : null;

  return { workspace, profile, loading, error };
}
