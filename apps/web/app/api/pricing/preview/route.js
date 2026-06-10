/**
 * POST /api/pricing/preview
 *
 * Server-side proxy for the pricing calculator.
 *
 * Security model:
 *   1. Validates the caller's NextAuth/Cognito session via getToken().
 *      Unauthenticated requests → 401 (never reach FastAPI).
 *   2. Fans out each row payload to FastAPI POST /pricing/preview in parallel.
 *      No ECOM_INTERNAL_API_KEY required — the FastAPI /pricing/preview endpoint
 *      is a stateless calculation endpoint with no internal-key guard.
 *
 * Request body:  { rows: [ ...up to 20 pricing payloads... ] }
 * Response:      { ok: true, results: [ ...per-row results... ] }
 *                { ok: false, error: "..." }
 *
 * IMPORTANT:
 *   - No Amazon API calls.
 *   - No price writes to Amazon, Walmart, or Shopify.
 *   - No database reads or writes.
 *   - Results are returned to the browser for display only — not persisted.
 *   - Never log the token or any credential values.
 */

import { getToken } from "next-auth/jwt";

const MAX_ROWS = 20;

export async function POST(request) {
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

  // 2. Validate API base URL.
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return Response.json({ ok: false, error: "Pricing service not configured" }, { status: 503 });
  }

  // 3. Parse request body.
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawRows = Array.isArray(body?.rows) ? body.rows : [];
  if (rawRows.length === 0) {
    return Response.json({ ok: false, error: "No rows provided" }, { status: 400 });
  }

  // 4. Clamp to MAX_ROWS — never calculate more than 20 rows per request.
  const rows = rawRows.slice(0, MAX_ROWS);

  // 5. Fan out to FastAPI POST /pricing/preview — one call per row, all in parallel.
  //    Each row is an independent stateless calculation; no user data is forwarded.
  const upstream = `${apiBase}/pricing/preview`;

  const results = await Promise.all(
    rows.map(async (rowPayload) => {
      try {
        const resp = await fetch(upstream, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(rowPayload),
          cache:   "no-store",
        });
        if (!resp.ok) {
          return { ok: false, error: `Upstream status ${resp.status}` };
        }
        return await resp.json();
      } catch {
        return { ok: false, error: "Could not reach pricing service" };
      }
    })
  );

  return Response.json({ ok: true, results });
}
