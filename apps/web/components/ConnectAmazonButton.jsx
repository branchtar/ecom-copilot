"use client";

import { useSession } from "next-auth/react";

export default function ConnectAmazonButton() {
  const { data: session } = useSession();

  const onConnect = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL not set");

      const resp = await fetch(${base}/api/integrations/amazon/start, {
        method: "GET",
        headers: session?.accessToken ? { Authorization: Bearer  } : {}
      });

      const data = await resp.json();
      if (!data?.ok || !data?.authorize_url) {
        console.error("Bad response:", data);
        alert("Amazon start failed. Check console + API logs.");
        return;
      }

      window.location.href = data.authorize_url; // redirect to Seller Central consent
    } catch (e) {
      console.error(e);
      alert(e.message || "Connect failed");
    }
  };

  return (
    <button
      onClick={onConnect}
      disabled={!session}
      title={!session ? "Sign in first" : "Connect Amazon"}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid #ccc",
        cursor: !session ? "not-allowed" : "pointer",
        opacity: !session ? 0.5 : 1
      }}
    >
      Connect Amazon (OAuth)
    </button>
  );
}