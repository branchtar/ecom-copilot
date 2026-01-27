"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthPanel() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading session...</div>;

  if (!session) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => signIn("cognito")}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Sign in / Sign up
        </button>
        <span style={{ color: "#666" }}>Use your Cognito Hosted UI</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        Signed in as <b>{session.user?.email || session.user?.name || "user"}</b>
      </div>
      <button
        onClick={() => signOut()}
        style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
      >
        Sign out
      </button>
    </div>
  );
}