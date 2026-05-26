"use client";

import Link from "next/link";

// href: string  → real Next.js Link (route exists)
// href: null    → placeholder button (route not yet built — no 404)
// "Amazon" in Marketplaces → /dashboard#marketplaces scrolls to the
//   Marketplace Connections section on the dashboard page.

const nav = [
  { section: "Overview", items: [
    { label: "Dashboard",        href: "/dashboard" },
    { label: "Alerts",           href: null },
  ]},
  { section: "Marketplaces", items: [
    { label: "Amazon",           href: "/dashboard#marketplaces" },
    { label: "Walmart",          href: null },
    { label: "Shopify",          href: null },
    { label: "eBay",             href: null },
  ]},
  { section: "Suppliers", items: [
    { label: "Supplier Catalogs",href: null },
    { label: "Feeds & Imports",  href: null },
  ]},
  { section: "Ops", items: [
    { label: "Products",         href: null },
    { label: "Inventory",        href: null },
    { label: "Orders",           href: null },
    { label: "Returns",          href: null },
  ]},
  { section: "Pricing", items: [
    { label: "Rules",            href: null },
    { label: "Min/Max",          href: null },
    { label: "Repricer Jobs",    href: null },
  ]},
  { section: "Reporting", items: [
    { label: "KPIs",             href: null },
    { label: "P&L Snapshot",     href: null },
    { label: "Exports",          href: null },
  ]},
  { section: "Settings", items: [
    { label: "Account",          href: null },
    { label: "Integrations",     href: null },
    { label: "API Keys",         href: null },
  ]},
];

// Shared visual style for both live links and placeholders
const itemBase = {
  textDecoration: "none",
  display: "block",
  padding: "10px 12px",
  borderRadius: 14,
  fontSize: 13,
  lineHeight: 1,
};

const liveStyle = {
  ...itemBase,
  color: "#e6eefc",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const placeholderStyle = {
  ...itemBase,
  color: "rgba(230,238,252,0.38)",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.04)",
  cursor: "default",
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  fontWeight: "inherit",
};

export default function Sidebar() {
  return (
    <aside style={{
      width: 260,
      flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.06)",
      padding: 16,
      background: "#0b1220",
      color: "#e6eefc",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      {/* Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg,#6ee7ff,#a78bfa)",
        }} />
        <div>
          <div style={{ fontWeight: 800, letterSpacing: 0.3, fontSize: 14 }}>EcomNavigation</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>Subscriber Dashboard</div>
        </div>
      </div>

      {/* Workspace */}
      <div style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        padding: "9px 11px",
        marginBottom: 14,
        background: "rgba(255,255,255,0.04)",
      }}>
        <div style={{ fontSize: 11, opacity: 0.75 }}>Workspace</div>
        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>Bwaaack / Copy & Paste LLC</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 5 }}>
          Status: <span style={{ fontWeight: 700, opacity: 1 }}>Dev</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ overflowY: "auto", paddingRight: 4, height: "calc(100vh - 148px)" }}>
        {nav.map((group) => (
          <div key={group.section} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              opacity: 0.55, textTransform: "uppercase",
              letterSpacing: "0.09em", marginBottom: 6,
            }}>
              {group.section}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {group.items.map((item) =>
                item.href ? (
                  <Link key={item.label} href={item.href} style={liveStyle}>
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    style={placeholderStyle}
                    title="Coming soon"
                    tabIndex={-1}
                    aria-disabled="true"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
