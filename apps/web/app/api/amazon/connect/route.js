/**
 * GET /api/amazon/connect
 *
 * Server-side proxy for Amazon OAuth start — workspace-scoped (Phase 3C-1).
 *
 * Flow:
 *   1. Validate the caller's NextAuth/Cognito session via getToken().
 *      Unauthenticated requests → 401 (never reach FastAPI).
 *   2. Fetch the user's workspace profile from FastAPI to find the active workspace.
 *   3. Determine the amazon tenant ref:
 *        - If marketplace_tenant_refs.amazon is already set → reuse it (e.g. "dev" for Bwaaack).
 *        - If it is empty (new workspace) → tenant_ref = workspace.id,
 *          then pre-register it via PATCH /api/workspaces/marketplace-refs
 *          so the profile is updated before the user completes OAuth.
 *   4. Call FastAPI GET /api/integrations/amazon/start?tenant={tenant_ref}
 *      to obtain the Seller Central authorize URL.
 *   5. Return { ok: true, authorize_url, tenant_ref }.
 *
 * Security:
 *   - ECOM_INTERNAL_API_KEY is forwarded only in server-side fetch calls.
 *     It is NEVER returned to the browser.
 *   - No tokens or credentials are returned.
 *   - The tenant ref returned is safe metadata (a workspace slug).
 */

import { getToken } from "next-auth/jwt";

export async function GET(request) {
  // 1. Require a valid NextAuth/Cognito session.
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
  if (!userSub) {
    return Response.json({ ok: false, error: "No user sub in session" }, { status: 400 });
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    return Response.json({ ok: false, error: "API base URL not configured" }, { status: 503 });
  }

  const internalKey = process.env.ECOM_INTERNAL_API_KEY || "";
  if (!internalKey) {
    // Key missing in server environment — fail closed.
    return Response.json({ ok: false, error: "Amazon connect not configured" }, { status: 503 });
  }

  // Shared headers for all server-to-FastAPI calls. Never sent to browser.
  const proxyHeaders = {
    "x-ecom-internal-key": internalKey,
    "x-ecom-user-sub": userSub,
    "Content-Type": "application/json",
  };

  // 2. Fetch the user's workspace profile to find the active workspace.
  let profile;
  try {
    const profileResp = await fetch(`${apiBase}/api/workspaces`, {
      method: "GET",
      headers: proxyHeaders,
      cache: "no-store",
    });
    const profileData = await profileResp.json();
    if (!profileData.ok || !profileData.profile) {
      return Response.json(
        { ok: false, error: profileData.error || "Could not load workspace profile" },
        { status: 502 }
      );
    }
    profile = profileData.profile;
  } catch {
    return Response.json(
      { ok: false, error: "Could not reach workspaces API" },
      { status: 502 }
    );
  }

  // 3. Locate the active workspace.
  const activeId = profile.active_workspace_id;
  const activeWorkspace = (profile.workspaces ?? []).find((w) => w.id === activeId);
  if (!activeWorkspace) {
    return Response.json(
      { ok: false, error: "Active workspace not found in profile" },
      { status: 400 }
    );
  }

  // 4. Determine the amazon tenant ref.
  //    - Existing ref (e.g. "dev" for Bwaaack): reuse it unchanged.
  //    - No ref (new workspace): use workspace.id as the ref and pre-register it.
  let tenantRef = (activeWorkspace.marketplace_tenant_refs?.amazon ?? "").trim();

  if (!tenantRef) {
    // New workspace — set the ref to the workspace's own slug.
    tenantRef = activeWorkspace.id;

    // Pre-register marketplace_tenant_refs.amazon in the workspace profile.
    // This ensures the profile is consistent before the user completes OAuth,
    // so the dashboard status check will use the correct bucket on return.
    try {
      const patchResp = await fetch(`${apiBase}/api/workspaces/marketplace-refs`, {
        method: "PATCH",
        headers: proxyHeaders,
        body: JSON.stringify({ marketplace: "amazon", tenant_ref: tenantRef }),
        cache: "no-store",
      });
      const patchData = await patchResp.json();
      if (!patchData.ok) {
        return Response.json(
          { ok: false, error: patchData.error || "Could not register marketplace ref" },
          { status: 502 }
        );
      }
    } catch {
      return Response.json(
        { ok: false, error: "Could not reach workspaces API to register marketplace ref" },
        { status: 502 }
      );
    }
  }

  // 5. Get the Amazon OAuth authorize URL for this workspace's tenant ref.
  //    The FastAPI start endpoint has no side effects — it only builds the URL.
  let authorizeUrl;
  try {
    const startResp = await fetch(
      `${apiBase}/api/integrations/amazon/start?tenant=${encodeURIComponent(tenantRef)}`,
      { method: "GET", cache: "no-store" }
    );
    const startData = await startResp.json();
    if (!startData.ok || !startData.authorize_url) {
      return Response.json(
        { ok: false, error: startData.error || "Could not build Amazon authorize URL" },
        { status: 502 }
      );
    }
    authorizeUrl = startData.authorize_url;
  } catch {
    return Response.json(
      { ok: false, error: "Could not reach Amazon connect API" },
      { status: 502 }
    );
  }

  // 6. Return the authorize URL and safe tenant ref. Never return the internal key.
  return Response.json({ ok: true, authorize_url: authorizeUrl, tenant_ref: tenantRef });
}
