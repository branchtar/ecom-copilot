"use client";

/**
 * ConnectAmazonButton — Phase 3C-1
 *
 * Calls the Next.js /api/amazon/connect server route instead of FastAPI directly.
 * The server route:
 *   1. Validates the user's NextAuth/Cognito session.
 *   2. Reads the active workspace's Amazon tenant ref from the workspace profile.
 *   3. Pre-registers the ref for new workspaces (idempotent for existing ones).
 *   4. Returns the Seller Central authorize_url for the correct tenant bucket.
 *
 * No tenant is hardcoded here. No FastAPI URL is called from the browser.
 * No credentials or internal keys are exposed client-side.
 *
 * workspaceId prop is accepted for documentation / future use.
 * The server route independently derives the active workspace from the user's session.
 */
export default function ConnectAmazonButton({ workspaceId }) {
  const onClick = async () => {
    try {
      // Session-validated, workspace-scoped — server determines the correct tenant.
      const resp = await fetch("/api/amazon/connect", {
        method: "GET",
        cache: "no-store",
      });

      const data = await resp.json();

      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }

      if (data?.authorize_url) {
        window.location.href = data.authorize_url;
        return;
      }

      throw new Error("API did not return authorize_url");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to start Amazon OAuth");
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--ec-radius-sm)",
        border: "none",
        background: "#111827",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.01em",
      }}
    >
      Connect Amazon
    </button>
  );
}
