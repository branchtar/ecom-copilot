import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getApiBase() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8002"
  ).replace(/\/$/, "");
}

export async function GET(request) {
  const apiBase = getApiBase();

  try {
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get("tenant") || "dev";

    const upstreamUrl =
      `${apiBase}/api/integrations/amazon/start?tenant=${encodeURIComponent(tenant)}`;

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const raw = await upstream.text();

    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          {
            ok: false,
            step: "parse-upstream-json",
            api_base: apiBase,
            upstream_url: upstreamUrl,
            status: upstream.status,
            error: "Backend returned non-JSON",
            raw_preview: raw.slice(0, 800),
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        step: "fetch-upstream",
        api_base: apiBase,
        error: error?.message || "Unknown fetch failure",
        cause: error?.cause?.message || null,
        code: error?.code || null,
      },
      { status: 500 }
    );
  }
}
