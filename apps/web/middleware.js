import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const host = req.headers.get("host") ?? "";
  const url  = req.nextUrl.clone();
  const { pathname } = req.nextUrl;

  // ── 1. www redirect (unchanged) ───────────────────────────────────────────
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".local");

  if (!isLocal && host === "ecomnavigation.com") {
    url.protocol = "https";
    url.hostname = "www.ecomnavigation.com";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // ── 2. Dashboard auth gate ────────────────────────────────────────────────
  // Protects /dashboard and all sub-paths.
  // Public routes (homepage, /features, /pricing, /contact, /api/auth/*,
  // /auth/amazon/*, /auth/shopify/*) are NOT matched here and pass through.
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const signInUrl = new URL("/api/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};