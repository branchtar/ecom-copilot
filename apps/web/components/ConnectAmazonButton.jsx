"use client";

import { useSession } from "next-auth/react";

export default function ConnectAmazonButton() {
  const { data: session } = useSession();

  const onClick = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "https://5xhzibtfry.us-east-1.awsapprunner.com";
      if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL not set");

      // Start OAuth flow by asking API for authorize_url
      const resp = await fetch(`${base}/api/integrations/amazon/start?tenant=dev`, {
        method: "GET",
        headers: session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {},
      });

      const data = await resp.json();

      if (!resp.ok) {
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
