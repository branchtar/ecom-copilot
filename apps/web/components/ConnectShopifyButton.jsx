"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

/**
 * ConnectShopifyButton
 *
 * Prompts the user for their Shopify store domain, normalises it to
 * *.myshopify.com format, calls /api/integrations/shopify/start, and
 * redirects the browser to the Shopify OAuth authorize screen.
 *
 * No tokens are stored client-side. The OAuth callback is handled server-side
 * at /auth/shopify/callback.
 */
export default function ConnectShopifyButton() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [error, setError] = useState("");

  /**
   * Normalise a shop input to a bare domain.
   * Accepts:
   *   my-store               → my-store.myshopify.com
   *   my-store.myshopify.com → my-store.myshopify.com
   *   https://my-store.myshopify.com/admin → my-store.myshopify.com
   */
  function normalizeShop(raw) {
    let s = raw.trim().toLowerCase();
    // Strip scheme
    if (s.includes("://")) {
      try {
        s = new URL(s).hostname;
      } catch {
        s = s.replace(/^https?:\/\//, "").split("/")[0];
      }
    }
    // Strip path
    s = s.split("/")[0].trim();
    // Append .myshopify.com if it looks like a bare store handle
    if (s && !s.includes(".")) {
      s = `${s}.myshopify.com`;
    }
    return s;
  }

  async function handleConnect() {
    setError("");
    const shop = normalizeShop(shopInput);

    if (!shop) {
      setError("Please enter your Shopify store domain.");
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

  if (!inputVisible) {
    return (
      <button
        onClick={() => setInputVisible(true)}
        style={{
          padding: "8px 16px",
          borderRadius: "var(--ec-radius-sm)",
          border: "none",
          background: "#96BF48",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
        }}
      >
        Connect Shopify
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          placeholder="my-store.myshopify.com"
          value={shopInput}
          onChange={(e) => { setShopInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: "var(--ec-radius-xs)",
            border: "1px solid var(--ec-border)",
            fontSize: 13,
            color: "var(--ec-text)",
            background: "var(--ec-bg)",
            outline: "none",
          }}
          autoFocus
        />
        <button
          onClick={handleConnect}
          disabled={loading || !shopInput.trim()}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--ec-radius-xs)",
            border: "none",
            background: loading ? "#aaa" : "#96BF48",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "..." : "Go"}
        </button>
        <button
          onClick={() => { setInputVisible(false); setShopInput(""); setError(""); }}
          disabled={loading}
          style={{
            padding: "6px 10px",
            borderRadius: "var(--ec-radius-xs)",
            border: "1px solid var(--ec-border)",
            background: "transparent",
            color: "var(--ec-text-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>
      )}
    </div>
  );
}
