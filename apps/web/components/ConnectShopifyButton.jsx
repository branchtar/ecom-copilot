"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

/**
 * ConnectShopifyButton
 *
 * Prompts the user for their Shopify store domain via window.prompt(),
 * normalises it, calls /api/integrations/shopify/start, and redirects
 * the browser to the Shopify OAuth authorize screen.
 *
 * No tokens are stored client-side. The OAuth callback is handled
 * server-side at /auth/shopify/callback.
 */
export default function ConnectShopifyButton() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Normalise a shop input to a bare domain.
   * Accepts:
   *   my-store               → my-store.myshopify.com
   *   my-store.myshopify.com → my-store.myshopify.com
   *   https://my-store.myshopify.com/admin → my-store.myshopify.com
   */
  function normalizeShop(raw) {
    let s = (raw || "").trim().toLowerCase();
    if (s.includes("://")) {
      try {
        s = new URL(s).hostname;
      } catch {
        s = s.replace(/^https?:\/\//, "").split("/")[0];
      }
    }
    s = s.split("/")[0].trim();
    if (s && !s.includes(".")) {
      s = `${s}.myshopify.com`;
    }
    return s;
  }

  async function handleConnect() {
    setError("");

    const raw = window.prompt("Enter your Shopify store domain:\n\nExample: my-store or my-store.myshopify.com");
    if (raw === null) return; // user cancelled

    const shop = normalizeShop(raw);
    if (!shop) {
      setError("Please enter a valid Shopify store domain.");
      return;
    }

    setLoading(true);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://5xhzibtfry.us-east-1.awsapprunner.com";

      const resp = await fetch(
        `${base}/api/integrations/shopify/start?tenant=dev&shop=${encodeURIComponent(shop)}`,
        {
          method: "GET",
          headers: session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {},
        }
      );

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
      setError(e?.message || "Failed to start Shopify OAuth");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: "var(--ec-radius-sm)",
          border: "none",
          background: loading ? "#aaa" : "#96BF48",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.01em",
        }}
      >
        {loading ? "Connecting…" : "Connect Shopify"}
      </button>
      {error && (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>
      )}
    </div>
  );
}
