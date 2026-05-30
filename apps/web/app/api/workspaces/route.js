/**
 * GET /api/workspaces
 *
 * Server-side proxy for the user's workspace profile.
 *
 * Security model:
 *   1. Validates the caller's NextAuth/Cognito session via getToken().
 *      Unauthenticated requests → 401 (never reach FastAPI).
 *   2. Forwards X-Ecom-Internal-Key (server-only, same key as orders proxy),
 *      X-Ecom-User-Sub (Cognito sub from the JWT), and optionally
 *      X-Ecom-User-Email to FastAPI.
 *   3. Returns only the safe workspace profile — no tokens, no credentials.
 *
 * IMPORTANT:
 *   - ECOM_INTERNAL_API_KEY has NO NEXT_PUBLIC_ prefix — never sent to the browser.
 *   - Never log the internal key, sub, or any token values.
 */

import { getToken } from "next-auth/jwt";

export async function GET(request) {
  // 1. Require a valid NextAuth session.
  let token;
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    return Response.json({ ok: false, error: "Session check failed" }, { status: 500 });
  }

  if (!token) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userSub = (token.sub ?? "").trim();
  const userEmail = (token.email ?? "").trim();

  if (!userSub) {
    return Response.json({ ok: false, error: "No user sub in session" }, { status: 400 });
  }

  // 2. Build upstream request to FastAPI.
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return Response.json({ ok: false, error: "API base URL not configured" }, { status: 503 });
  }

  const internalKey = process.env.ECOM_INTERNAL_API_KEY || "";
  if (!internalKey) {
    return Response.json({ ok: false, error: "Workspaces endpoint not configured" }, { status: 503 });
  }

  const headers = {
    "x-ecom-internal-key": internalKey,
    "x-ecom-user-sub": userSub,
    "Content-Type": "application/json",
  };
  if (userEmail) {
    headers["x-ecom-user-email"] = userEmail;
  }

  let resp;
  try {
    resp = await fetch(`${apiBase}/api/workspaces`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return Response.json({ ok: false, error: "Could not reach workspaces API" }, { status: 502 });
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid response from workspaces API" }, { status: 502 });
  }

  return Response.json(data, { status: resp.status });
}
