/**
 * GET /api/amazon/orders
 *
 * Server-side proxy for Amazon SP-API orders.
 *
 * Security model:
 *   1. Validates the caller's NextAuth/Cognito session via getToken().
 *      Unauthenticated requests → 401 (never reaches FastAPI).
 *   2. Forwards the request to FastAPI with X-Ecom-Internal-Key so the
 *      FastAPI orders endpoint rejects direct browser access.
 *
 * IMPORTANT:
 *   - ECOM_INTERNAL_API_KEY has NO NEXT_PUBLIC_ prefix — it is never sent to
 *     the browser. It exists only in the server-side Next.js runtime.
 *   - Never log the internal key or any token values.
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

  // 2. Proxy to FastAPI with the internal server-to-server key.
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return Response.json({ ok: false, error: "API base URL not configured" }, { status: 503 });
  }

  const internalKey = process.env.ECOM_INTERNAL_API_KEY || "";
  if (!internalKey) {
    // Key missing in server environment — fail closed.
    return Response.json({ ok: false, error: "Orders endpoint not configured" }, { status: 503 });
  }

  // Forward optional query params (tenant, days, max_results).
  const { searchParams } = new URL(request.url);
  const tenant     = searchParams.get("tenant")      || "dev";
  const days       = searchParams.get("days")        || "30";
  const maxResults = searchParams.get("max_results") || "50";

  const upstream = `${apiBase}/api/integrations/amazon/orders?tenant=${encodeURIComponent(tenant)}&days=${encodeURIComponent(days)}&max_results=${encodeURIComponent(maxResults)}`;

  let resp;
  try {
    resp = await fetch(upstream, {
      headers: {
        "x-ecom-internal-key": internalKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    return Response.json({ ok: false, error: "Could not reach orders API" }, { status: 502 });
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid response from orders API" }, { status: 502 });
  }

  return Response.json(data, { status: resp.status });
}
