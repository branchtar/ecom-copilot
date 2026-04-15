import { NextResponse } from "next/server";

export function middleware(req) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl.clone();

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

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};