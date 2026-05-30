"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/ui/Sidebar";
import Topbar from "../../components/ui/Topbar";
import KpiCard from "../../components/ui/KpiCard";
import Panel from "../../components/ui/Panel";
import ConnectAmazonButton from "../../components/ConnectAmazonButton";
import ConnectShopifyButton from "../../components/ConnectShopifyButton";

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace SVG icon placeholders (duplicated from Sidebar.jsx intentionally —
// extract to components/ui/MarketplaceIcons.jsx when shared usage grows).
// These are brand-recognizable geometric interpretations, NOT official trademark
// assets. Replace with licensed SVGs/Images when available.
// ─────────────────────────────────────────────────────────────────────────────
function MktAmazonIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#FF9900"/>
      <path d="M9 22 Q18 29.5 27 22" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M24 19.5 L27 22 L24 24.5" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function MktShopifyIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#96BF48"/>
      <path d="M9 17 L9 29 Q9 30.5 10.5 30.5 L25.5 30.5 Q27 30.5 27 29 L27 17 Z" fill="white"/>
      <path d="M13 17 L13 13 Q13 9 18 9 Q23 9 23 13 L23 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M22,20 Q23,18 18,18 Q13,18 13,21.5 Q13,24 18,24 Q23,24 23,27.5 Q23,30 18,30 Q13,30 12,28.5"
        stroke="#4a7a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function MktWalmartIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#0071CE"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(0 18 18)"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(60 18 18)"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(120 18 18)"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(180 18 18)"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(240 18 18)"/>
      <rect x="16.5" y="8" width="3" height="10" rx="1.5" fill="white" transform="rotate(300 18 18)"/>
    </svg>
  );
}
function MktEbayIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#f3f3f3"/>
      <rect x="7"  y="7"  width="10" height="10" rx="2.5" fill="#E53238"/>
      <rect x="19" y="7"  width="10" height="10" rx="2.5" fill="#0064D2"/>
      <rect x="7"  y="19" width="10" height="10" rx="2.5" fill="#F5AF02"/>
      <rect x="19" y="19" width="10" height="10" rx="2.5" fill="#86B817"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — replace with real API endpoints when ready
// ─────────────────────────────────────────────────────────────────────────────

const SPARKLINES = {
  sales:    [38400,41200,39800,42600,44100,43200,47800,45500,49200,51800,48100,52900,54400,55800],
  profit:   [7200, 6800, 7400, 8100, 7600, 8400, 7900, 8700, 9100, 8500, 9300, 9800,10200,10800],
  orders:   [142,  156,  148,  165,  158,  172,  168,  179,  185,  177,  191,  186,  198,  204],
  listings: [1840,1852, 1867, 1879, 1892, 1905, 1911, 1923, 1935, 1942, 1948, 1962, 1974, 1982],
};

const REVENUE_DATA = [28400,31200,29800,35600,32100,38200,41800,39500,44200,47800,45100,48900,52400,55800];

const ACTIVITIES = [
  { time: "2m",  icon: "✓", iconColor: "var(--ec-success)",      text: "Amazon order #112-4892 fulfilled" },
  { time: "14m", icon: "↑", iconColor: "var(--ec-success)",      text: "LPD Music — 9,214 SKUs imported" },
  { time: "1h",  icon: "✓", iconColor: "var(--ec-success)",      text: "Repricer job — 847 prices updated" },
  { time: "2h",  icon: "!",  iconColor: "var(--ec-caution)",     text: "Buy box lost on 3 ASINs" },
  { time: "3h",  icon: "→", iconColor: "var(--ec-text-subtle)",  text: "Ensoul catalog sync started" },
  { time: "5h",  icon: "↑", iconColor: "var(--ec-success)",      text: "Vernon Sales feed refreshed" },
];

const ALERTS = [
  { text: "12 SKUs below min net threshold", sev: "danger" },
  { text: "6 listings missing images",       sev: "caution" },
  { text: "3 products low stock (FBA)",      sev: "caution" },
  { text: "2 repricer jobs failed",          sev: "danger" },
  { text: "Buy box lost — 3 ASINs",          sev: "caution" },
  { text: "Import supplier feed(s)",         sev: "task" },
  { text: "Run profitability scan",          sev: "task" },
];

const OPS_METRICS = [
  { label: "Avg. Margin",    value: "18.5%", delta: "+0.8%", up: true  },
  { label: "Buy Box Rate",   value: "74%",   delta: "-2%",   up: false },
  { label: "FBA In Stock",   value: "1,204", delta: "+67",   up: true  },
  { label: "Pending Orders", value: "23",    delta: "",      up: null  },
  { label: "Open Alerts",    value: "8",     delta: "-3",    up: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SVG Revenue Trend Chart (inline — no library)
// ─────────────────────────────────────────────────────────────────────────────
function RevenueTrendChart() {
  const W = 400, H = 90;
  const min = Math.min(...REVENUE_DATA) * 0.93;
  const max = Math.max(...REVENUE_DATA) * 1.05;
  const range = max - min;

  const pts = REVENUE_DATA.map((v, i) => [
    (i / (REVENUE_DATA.length - 1)) * W,
    H - ((v - min) / range) * H,
  ]);

  const linePts = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPts = [
    `0,${H}`,
    ...pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
    `${W},${H}`,
  ].join(" ");

  return (
    <div style={{ marginTop: 4 }}>
      {/* Summary line */}
      <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--ec-text-muted)", marginBottom: 10 }}>
        <span>
          <span style={{ fontWeight: 800, color: "var(--ec-text)", fontSize: 16 }}>$55,800</span>
          {" "}today
        </span>
        <span style={{ color: "var(--ec-success)", fontWeight: 600 }}>↑ +4.2% vs prior period</span>
      </div>

      {/* Chart */}
      <svg
        width="100%" height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#059669" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0"    />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f}
            x1={0} y1={H * (1 - f)}
            x2={W} y2={H * (1 - f)}
            stroke="#f3f4f6" strokeWidth="1"
          />
        ))}
        <polygon points={areaPts} fill="url(#rev-grad)" />
        <polyline
          points={linePts}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* End dot */}
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="4" fill="#059669"
        />
      </svg>

      {/* X-axis labels */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 6, fontSize: 10, color: "var(--ec-text-subtle)",
      }}>
        {["Dec 10", "Dec 12", "Dec 15", "Dec 18", "Dec 20", "Dec 23"].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Donut Chart — marketplace revenue split (inline — no library)
// strokeDashoffset trick: positive offset skips that many units before drawing,
// effectively positioning each segment after the previous one.
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart() {
  const cx = 60, cy = 60, r = 42, sw = 13;
  const circ = 2 * Math.PI * r; // ≈ 263.9

  const segments = [
    { label: "Amazon",  pct: 72, color: "#FF9900" },
    { label: "Shopify", pct: 28, color: "#96BF48" },
  ];

  let cumArc = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--ec-border-light)"
          strokeWidth={sw}
        />
        {segments.map((seg) => {
          const arc = (seg.pct / 100) * circ - 1.5; // subtract gap
          const offset = cumArc;
          cumArc += (seg.pct / 100) * circ;
          return (
            <circle
              key={seg.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeDasharray={`${arc.toFixed(2)} ${circ.toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
        })}
        {/* Center label */}
        <text x={cx} y={cy - 4}  textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">72%</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9"  fill="#6b7280">Amazon</text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 160 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", fontSize: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 9, height: 9, borderRadius: 2,
                background: seg.color, flexShrink: 0,
              }} />
              <span style={{ color: "var(--ec-text-muted)" }}>{seg.label}</span>
            </div>
            <span style={{ fontWeight: 700, color: "var(--ec-text)" }}>{seg.pct}%</span>
          </div>
        ))}
        <div style={{
          borderTop: "1px solid var(--ec-border)",
          paddingTop: 8, marginTop: 2,
          fontSize: 11, color: "var(--ec-text-subtle)",
        }}>
          Revenue split · last 14 days
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace connection card
// ─────────────────────────────────────────────────────────────────────────────
// iconNode (SVG) takes priority over iconBg/iconLetter fallback
function MarketplaceCard({ iconBg, iconLetter, iconNode, name, sub, statusBadge, children, faded }) {
  return (
    <div style={{
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      padding: "16px 18px",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-sm)",
      display: "flex", flexDirection: "column", gap: 12,
      opacity: faded ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "var(--ec-radius-sm)",
          background: iconNode ? "transparent" : iconBg, color: "#fff",
          fontWeight: 800, fontSize: 16, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {iconNode ?? iconLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ec-text)" }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--ec-text-muted)", marginTop: 1 }}>{sub}</div>
        </div>
        {statusBadge}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [apiBase, setApiBase]     = useState("");
  const [amazonStatus, setAmazonStatus] = useState({
    loading: true,
    connected: false,
    selling_partner_id: null,
  });
  const [shopifyStatus, setShopifyStatus] = useState({
    loading: true,
    connected: false,
    shop: null,
  });

  // ── Health check — logic preserved exactly ───────────────────────────────
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "https://5xhzibtfry.us-east-1.awsapprunner.com";
    setApiBase(base);

    if (!base) {
      setApiStatus("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }

    fetch(`${base}/health`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Health failed")))
      .then(() => setApiStatus("Online"))
      .catch(() => setApiStatus("Offline"));
  }, []);

  // ── Amazon connection status — logic preserved exactly ───────────────────
  useEffect(() => {
    if (!apiBase) {
      setAmazonStatus({ loading: false, connected: false, selling_partner_id: null });
      return;
    }
    fetch(`${apiBase}/api/integrations/amazon/status?tenant=dev`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Status failed")))
      .then((data) => setAmazonStatus({
        loading: false,
        connected: !!data.connected,
        selling_partner_id: data.selling_partner_id || null,
      }))
      .catch(() => setAmazonStatus({ loading: false, connected: false, selling_partner_id: null }));
  }, [apiBase]);

  // ── Shopify connection status ─────────────────────────────────────────────
  useEffect(() => {
    if (!apiBase) {
      setShopifyStatus({ loading: false, connected: false, shop: null });
      return;
    }
    fetch(`${apiBase}/api/integrations/shopify/status?tenant=dev`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Status failed")))
      .then((data) => setShopifyStatus({
        loading: false,
        connected: !!data.connected,
        shop: data.shop || null,
      }))
      .catch(() => setShopifyStatus({ loading: false, connected: false, shop: null }));
  }, [apiBase]);

  // ── Derived style values ─────────────────────────────────────────────────
  const dotColor =
    apiStatus === "Online"  ? "var(--ec-success)" :
    apiStatus === "Offline" ? "var(--ec-danger)"  :
    "var(--ec-text-subtle)";

  const pillTextColor =
    apiStatus === "Online"  ? "var(--ec-success)" :
    apiStatus === "Offline" ? "var(--ec-danger)"  :
    "var(--ec-text-muted)";

  // ── Status badges ────────────────────────────────────────────────────────
  const amazonBadge = amazonStatus.loading ? (
    <span style={{ fontSize: 12, color: "var(--ec-text-subtle)", flexShrink: 0 }}>Checking…</span>
  ) : amazonStatus.connected ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      fontSize: 12, fontWeight: 600,
      background: "var(--ec-success-bg)", color: "var(--ec-success-text)",
      padding: "3px 10px", borderRadius: 999, flexShrink: 0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ec-success)" }} />
      Connected
    </div>
  ) : (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      border: "1px solid var(--ec-border)", flexShrink: 0,
    }}>
      Not connected
    </div>
  );

  const comingSoonBadge = (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      background: "var(--ec-border-light)", flexShrink: 0,
    }}>
      Coming soon
    </div>
  );

  const notConnectedBadge = (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      border: "1px solid var(--ec-border)", flexShrink: 0,
    }}>
      Not connected
    </div>
  );

  // Shopify badge — mirrors Amazon badge pattern
  const shopifyBadge = shopifyStatus.loading ? (
    <span style={{ fontSize: 12, color: "var(--ec-text-subtle)", flexShrink: 0 }}>Checking…</span>
  ) : shopifyStatus.connected ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      fontSize: 12, fontWeight: 600,
      background: "var(--ec-success-bg)", color: "var(--ec-success-text)",
      padding: "3px 10px", borderRadius: 999, flexShrink: 0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ec-success)" }} />
      Connected
    </div>
  ) : (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      border: "1px solid var(--ec-border)", flexShrink: 0,
    }}>
      Not connected
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ec-bg)" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "16px 24px 40px", minWidth: 0, overflowX: "hidden" }}>
        <Topbar />

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 20,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontSize: 22, fontWeight: 800,
              color: "var(--ec-text)", letterSpacing: "-0.01em",
            }}>
              Dashboard
            </div>
            <div style={{ fontSize: 13, color: "var(--ec-text-muted)", marginTop: 3 }}>
              Connect marketplaces, monitor KPIs, and run automations.
            </div>
          </div>

          {/* Date range + API status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              padding: "7px 13px",
              borderRadius: "var(--ec-radius-sm)",
              border: "1px solid var(--ec-border)",
              background: "var(--ec-surface)",
              boxShadow: "var(--ec-shadow-xs)",
              fontSize: 12, fontWeight: 500,
              color: "var(--ec-text-muted)",
              whiteSpace: "nowrap",
            }}>
              Dec 10 – Dec 23, 2025
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 13px",
              borderRadius: 999,
              border: "1px solid var(--ec-border)",
              background: "var(--ec-surface)",
              boxShadow: "var(--ec-shadow-xs)",
              fontSize: 13, fontWeight: 500,
              color: pillTextColor,
              flexShrink: 0, whiteSpace: "nowrap",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: dotColor, flexShrink: 0,
              }} />
              API {apiStatus}
            </div>
          </div>
        </div>

        {/* ── KPI cards with sparklines ───────────────────────────────────── */}
        <div style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}>
          <KpiCard
            title="Gross Sales"    value="$55,800" sub="Last 14 days"
            trend="+4.2%"         sparkline={SPARKLINES.sales}
          />
          <KpiCard
            title="Net Profit"    value="$10,800" sub="Est. after fees"
            trend="+2.1%"         sparkline={SPARKLINES.profit}
          />
          <KpiCard
            title="Orders"        value="204"     sub="All channels"
            trend="+8"            sparkline={SPARKLINES.orders}
          />
          <KpiCard
            title="Active Listings" value="1,982" sub="Amazon + Shopify"
            trend="+31"           sparkline={SPARKLINES.listings}
          />
        </div>

        {/* ── Charts row: Revenue Trend + Marketplace Split ───────────────── */}
        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12,
        }}>
          <Panel title="Revenue Trend">
            <RevenueTrendChart />
          </Panel>

          <Panel title="Marketplace Split">
            <DonutChart />
          </Panel>
        </div>

        {/* ── Marketplace Connections ─────────────────────────────────────── */}
        {/* id="marketplaces" — sidebar Amazon link scrolls here */}
        <div id="marketplaces" style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "var(--ec-text-muted)", marginBottom: 12,
          }}>
            Marketplace Connections
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}>
            {/* Amazon — live API status; ConnectAmazonButton OAuth preserved */}
            <MarketplaceCard
              iconNode={<MktAmazonIcon />}
              name="Amazon" sub="Seller Central"
              statusBadge={amazonBadge}
            >
              {amazonStatus.connected && amazonStatus.selling_partner_id && (
                <div style={{
                  fontSize: 11,
                  fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                  color: "var(--ec-text-muted)",
                  background: "var(--ec-bg)",
                  borderRadius: "var(--ec-radius-xs)",
                  padding: "5px 9px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  ID: {amazonStatus.selling_partner_id}
                </div>
              )}
              {!amazonStatus.loading && !amazonStatus.connected && (
                <ConnectAmazonButton />
              )}
            </MarketplaceCard>

            <MarketplaceCard
              iconNode={<MktShopifyIcon />}
              name="Shopify" sub="Online Store"
              statusBadge={shopifyBadge}
            >
              {shopifyStatus.connected && shopifyStatus.shop && (
                <div style={{
                  fontSize: 11,
                  fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                  color: "var(--ec-text-muted)",
                  background: "var(--ec-bg)",
                  borderRadius: "var(--ec-radius-xs)",
                  padding: "5px 9px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {shopifyStatus.shop}
                </div>
              )}
              {!shopifyStatus.loading && !shopifyStatus.connected && (
                <ConnectShopifyButton />
              )}
            </MarketplaceCard>

            <MarketplaceCard
              iconNode={<MktWalmartIcon />}
              name="Walmart" sub="Marketplace"
              statusBadge={comingSoonBadge}
              faded
            />

            <MarketplaceCard
              iconNode={<MktEbayIcon />}
              name="eBay" sub="Marketplace"
              statusBadge={comingSoonBadge}
              faded
            />
          </div>
        </div>

        {/* ── Supplier Pipeline | Recent Activity | Alerts & Tasks ─────────── */}
        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}>
          {/* Supplier Pipeline */}
          <Panel title="Supplier Pipeline">
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 56px 76px",
              rowGap: 10, columnGap: 8, fontSize: 13,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Supplier</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SKUs</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>

              {[
                { name: "Ensoul Music", skus: "12,840", status: "Ready",   sev: "success" },
                { name: "LPD Music",    skus: "9,214",  status: "Queued",  sev: "caution" },
                { name: "Vernon Sales", skus: "4,110",  status: "Scrape",  sev: "neutral" },
                { name: "Chesbro",      skus: "2,780",  status: "Pending", sev: "neutral" },
              ].map((row) => {
                const chipStyle =
                  row.sev === "success" ? { background: "var(--ec-success-bg)", color: "var(--ec-success-text)" } :
                  row.sev === "caution" ? { background: "var(--ec-caution-bg)", color: "var(--ec-caution)" } :
                  { background: "var(--ec-border-light)", color: "var(--ec-text-muted)" };
                return [
                  <div key={`${row.name}-n`} style={{ color: "var(--ec-text)", fontSize: 13 }}>{row.name}</div>,
                  <div key={`${row.name}-s`} style={{ color: "var(--ec-text)", fontSize: 13 }}>{row.skus}</div>,
                  <div key={`${row.name}-st`}>
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, ...chipStyle }}>
                      {row.status}
                    </span>
                  </div>,
                ];
              })}
            </div>
          </Panel>

          {/* Recent Activity */}
          <Panel title="Recent Activity">
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {ACTIVITIES.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "var(--ec-border-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    color: a.iconColor, flexShrink: 0,
                  }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--ec-text)", lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: "var(--ec-text-subtle)", marginTop: 2 }}>{a.time} ago</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Alerts & Tasks */}
          <Panel title="Alerts & Tasks">
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ALERTS.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                    background:
                      a.sev === "danger"  ? "var(--ec-danger)" :
                      a.sev === "caution" ? "var(--ec-caution)" :
                      "var(--ec-text-subtle)",
                  }} />
                  <div style={{ color: "var(--ec-text)", lineHeight: 1.45 }}>{a.text}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Ops metric strip ────────────────────────────────────────────── */}
        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
        }}>
          {OPS_METRICS.map((m) => (
            <div key={m.label} style={{
              border: "1px solid var(--ec-border)",
              borderRadius: "var(--ec-radius-sm)",
              padding: "12px 16px",
              background: "var(--ec-surface)",
              boxShadow: "var(--ec-shadow-xs)",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.07em",
                color: "var(--ec-text-muted)",
              }}>
                {m.label}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                letterSpacing: "-0.02em", marginTop: 6,
                color: "var(--ec-text)", lineHeight: 1,
              }}>
                {m.value}
              </div>
              {m.delta ? (
                <div style={{
                  fontSize: 11, fontWeight: 600, marginTop: 4,
                  color:
                    m.up === true  ? "var(--ec-success)" :
                    m.up === false ? "var(--ec-danger)"  :
                    "var(--ec-text-subtle)",
                }}>
                  {m.delta}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
