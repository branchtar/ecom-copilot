"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/ui/Sidebar";
import Topbar from "../../components/ui/Topbar";
import KpiCard from "../../components/ui/KpiCard";
import Panel from "../../components/ui/Panel";
import ConnectAmazonButton from "../../components/ConnectAmazonButton";

// ---------------------------------------------------------------------------
// Shared card shell for marketplace connection cards
// ---------------------------------------------------------------------------
function MarketplaceCard({ iconBg, iconLetter, name, sub, statusBadge, children, faded }) {
  return (
    <div style={{
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      padding: "16px 18px",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-sm)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      opacity: faded ? 0.65 : 1,
    }}>
      {/* Top row: icon + name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "var(--ec-radius-sm)",
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 17, flexShrink: 0,
        }}>
          {iconLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ec-text)" }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--ec-text-muted)", marginTop: 1 }}>{sub}</div>
        </div>
        {statusBadge}
      </div>
      {/* Slot for seller ID, connect button, etc. */}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [apiBase, setApiBase] = useState("");
  const [amazonStatus, setAmazonStatus] = useState({
    loading: true,
    connected: false,
    selling_partner_id: null,
  });

  // Health check — preserve existing logic exactly
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

  // Amazon connection status — preserve existing logic exactly
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

  // API status pill color
  const dotColor =
    apiStatus === "Online"  ? "var(--ec-success)" :
    apiStatus === "Offline" ? "var(--ec-danger)"  :
    "var(--ec-text-subtle)";
  const pillTextColor =
    apiStatus === "Online"  ? "var(--ec-success)" :
    apiStatus === "Offline" ? "var(--ec-danger)"  :
    "var(--ec-text-muted)";

  // Amazon status badge
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

  // Reusable "coming soon" badge
  const comingSoonBadge = (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      background: "var(--ec-border-light)", flexShrink: 0,
    }}>
      Coming soon
    </div>
  );

  // Reusable "not connected" badge for non-live integrations
  const notConnectedBadge = (
    <div style={{
      fontSize: 12, color: "var(--ec-text-subtle)",
      padding: "3px 10px", borderRadius: 999,
      border: "1px solid var(--ec-border)", flexShrink: 0,
    }}>
      Not connected
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ec-bg)" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: 20, minWidth: 0, overflowX: "hidden" }}>
        <Topbar />

        {/* ── Page header ────────────────────────────────────────────── */}
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

          {/* API status pill — clean, no raw URL */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 13px",
            borderRadius: 999,
            border: "1px solid var(--ec-border)",
            background: "var(--ec-surface)",
            boxShadow: "var(--ec-shadow-xs)",
            fontSize: 13, fontWeight: 500,
            color: pillTextColor,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: dotColor, flexShrink: 0,
            }} />
            API {apiStatus}
          </div>
        </div>

        {/* ── KPI grid — auto-fit for responsiveness ──────────────────── */}
        <div style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}>
          <KpiCard title="Gross Sales"      value="$12,480" sub="Last 30 days"      trend="+4.2%" />
          <KpiCard title="Net Profit"       value="$2,310"  sub="Est. after fees"   trend="+2.1%" />
          <KpiCard title="Orders"           value="186"     sub="All channels"       trend="+8"    />
          <KpiCard title="Active Listings"  value="1,942"   sub="Amazon + Shopify"  trend="+31"   />
        </div>

        {/* ── Today's Focus ───────────────────────────────────────────── */}
        <div style={{ marginTop: 14 }}>
          <Panel
            title="Today's Focus"
            right={
              <button style={{
                padding: "7px 14px",
                borderRadius: "var(--ec-radius-sm)",
                border: "1px solid var(--ec-border)",
                background: "var(--ec-surface)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ec-text)",
              }}>
                Open Tasks
              </button>
            }
          >
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ec-text)", fontSize: 14, lineHeight: 1.85 }}>
              <li>Import supplier feed(s) → normalize UPC/SKU → dedupe</li>
              <li>Run profitability scan → create "Worth Listing" queue</li>
              <li>Push pricing rules → publish to marketplaces</li>
              <li>Review alerts: buy box, low stock, stranded inventory</li>
            </ul>
          </Panel>
        </div>

        {/* ── Marketplace connections ──────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "var(--ec-text-muted)", marginBottom: 12,
          }}>
            Marketplaces
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}>
            {/* Amazon — live API status */}
            <MarketplaceCard
              iconBg="#FF9900"
              iconLetter="A"
              name="Amazon"
              sub="Seller Central"
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
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  ID: {amazonStatus.selling_partner_id}
                </div>
              )}
              {!amazonStatus.loading && !amazonStatus.connected && (
                <ConnectAmazonButton />
              )}
            </MarketplaceCard>

            {/* Shopify — not connected */}
            <MarketplaceCard
              iconBg="#96BF48"
              iconLetter="S"
              name="Shopify"
              sub="Online Store"
              statusBadge={notConnectedBadge}
            />

            {/* Walmart — coming soon */}
            <MarketplaceCard
              iconBg="#0071CE"
              iconLetter="W"
              name="Walmart"
              sub="Marketplace"
              statusBadge={comingSoonBadge}
              faded
            />

            {/* eBay — coming soon */}
            <MarketplaceCard
              iconBg="#E43137"
              iconLetter="e"
              name="eBay"
              sub="Marketplace"
              statusBadge={comingSoonBadge}
              faded
            />
          </div>
        </div>

        {/* ── Supplier Pipeline + Alerts ──────────────────────────────── */}
        <div style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}>
          <Panel title="Supplier Pipeline">
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 64px 88px",
              rowGap: 10,
              columnGap: 10,
              fontSize: 13,
            }}>
              {/* Header row */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Supplier</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SKUs</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ec-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>

              {/* Rows */}
              <div style={{ color: "var(--ec-text)" }}>Ensoul Music</div>
              <div style={{ color: "var(--ec-text)" }}>12,840</div>
              <div>
                <span style={{ background: "var(--ec-success-bg)", color: "var(--ec-success-text)", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  Ready
                </span>
              </div>

              <div style={{ color: "var(--ec-text)" }}>LPD Music</div>
              <div style={{ color: "var(--ec-text)" }}>9,214</div>
              <div>
                <span style={{ background: "var(--ec-caution-bg)", color: "var(--ec-caution)", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  Queued
                </span>
              </div>

              <div style={{ color: "var(--ec-text)" }}>Vernon Sales</div>
              <div style={{ color: "var(--ec-text)" }}>4,110</div>
              <div>
                <span style={{ background: "var(--ec-border-light)", color: "var(--ec-text-muted)", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  Scrape
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Alerts">
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ec-text)", fontSize: 14, lineHeight: 1.85 }}>
              <li>12 SKUs below min net threshold</li>
              <li>6 listings missing images</li>
              <li>3 products low stock (FBA)</li>
              <li>2 repricer jobs failed</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
