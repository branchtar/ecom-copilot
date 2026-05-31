/**
 * /api/workspaces — workspace profile proxy (GET / POST / PATCH)
 *
 * Security model (all three methods):
 *   1. Validates the caller's NextAuth/Cognito session via getToken().
 *      Unauthenticated requests → 401 (never reach FastAPI).
 *   2. Forwards X-Ecom-Internal-Key (server-only — never sent to browser),
 *      X-Ecom-User-Sub (Cognito sub from the JWT), and optionally
 *      X-Ecom-User-Email to FastAPI.
 *   3. Returns only safe workspace metadata — no tokens, no credentials.
 *
 * Routes:
 *   GET   → FastAPI GET  /api/workspaces          (read or auto-create profile)
 *   POST  → FastAPI POST /api/workspaces          (create new workspace)
 *   PATCH → FastAPI PATCH /api/workspaces/active  (switch active workspace)
 *
 * IMPORTANT: ECOM_INTERNAL_API_KEY has NO NEXT_PUBLIC_ prefix.
 * Never log the internal key, sub, or any token values.
 */

import { getToken } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Shared: validate session and build proxy headers
// ---------------------------------------------------------------------------

async function resolveAuth(request) {
  let token;
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    return { error: Response.json({ ok: false, error: "Session check failed" }, { status: 500 }) };
  }
  if (!token) {
    return { error: Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const userSub   = (token.sub   ?? "").trim();
  const userEmail = (token.email ?? "").trim();
  if (!userSub) {
    return { error: Response.json({ ok: false, error: "No user sub in session" }, { status: 400 }) };
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return { error: Response.json({ ok: false, error: "API base URL not configured" }, { status: 503 }) };
  }

  const internalKey = process.env.ECOM_INTERNAL_API_KEY || "";
  if (!internalKey) {
    return { error: Response.json({ ok: false, error: "Workspaces endpoint not configured" }, { status: 503 }) };
  }

  const headers = {
    "x-ecom-internal-key": internalKey,
    "x-ecom-user-sub": userSub,
    "Content-Type": "application/json",
  };
  if (userEmail) headers["x-ecom-user-email"] = userEmail;

  return { apiBase, headers };
}

async function proxyRequest(upstreamUrl, options) {
  let resp;
  try {
    resp = await fetch(upstreamUrl, { ...options, cache: "no-store" });
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

// ---------------------------------------------------------------------------
// GET — read (or auto-create) workspace profile
// ---------------------------------------------------------------------------

export async function GET(request) {
  const auth = await resolveAuth(request);
  if (auth.error) return auth.error;
  const { apiBase, headers } = auth;

  return proxyRequest(`${apiBase}/api/workspaces`, { method: "GET", headers });
}

// ---------------------------------------------------------------------------
// POST — create a new workspace
// Body: { "name": "Business Name" }
// ---------------------------------------------------------------------------

export async function POST(request) {
  const auth = await resolveAuth(request);
  if (auth.error) return auth.error;
  const { apiBase, headers } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  return proxyRequest(`${apiBase}/api/workspaces`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// PATCH — switch active workspace
// Body: { "workspace_id": "slug-id" }
// Proxies to FastAPI PATCH /api/workspaces/active
// ---------------------------------------------------------------------------

export async function PATCH(request) {
  const auth = await resolveAuth(request);
  if (auth.error) return auth.error;
  const { apiBase, headers } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  return proxyRequest(`${apiBase}/api/workspaces/active`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}
