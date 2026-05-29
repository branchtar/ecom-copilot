"use client";

import Link from "next/link";

// href: string  → real Next.js Link (route exists)
// href: null    → placeholder button (route not yet built — no 404)
// "Amazon" in Marketplaces → /dashboard#marketplaces scrolls to the
//   Marketplace Connections section on the dashboard page.

// ── Marketplace logo-style SVG placeholders ───────────────────────────────────
// These are brand-recognizable geometric interpretations, NOT official trademark
// assets. Replace each function with a licensed SVG/Image when available.
// Drop official files in apps/web/public/marketplace/ and swap <img> in.

function AmazonIcon() {
  // Orange square + Amazon smile-arrow in dark ink
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#FF9900"/>
      <path d="M9 22 Q18 29.5 27 22" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M24 19.5 L27 22 L24 24.5" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function ShopifyIcon() {
  // Green square + white shopping bag (bag body + arched handle)
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#96BF48"/>
      <path d="M10 17 L10 28 Q10 29.5 11.5 29.5 L24.5 29.5 Q26 29.5 26 28 L26 17 Z" fill="white"/>
      <path d="M14 17 L14 14 Q14 9.5 18 9.5 Q22 9.5 22 14 L22 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function WalmartIcon() {
  // Blue square + white 6-petal spark (6 rounded bars rotated 60° apart)
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
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

function EbayIcon() {
  // Light square + 2×2 grid in eBay's 4 brand colors (red, blue, yellow, green)
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#f3f3f3"/>
      <rect x="7"  y="7"  width="10" height="10" rx="2.5" fill="#E53238"/>
      <rect x="19" y="7"  width="10" height="10" rx="2.5" fill="#0064D2"/>
      <rect x="7"  y="19" width="10" height="10" rx="2.5" fill="#F5AF02"/>
      <rect x="19" y="19" width="10" height="10" rx="2.5" fill="#86B817"/>
    </svg>
  );
}

// Maps marketplace label → icon component
const MARKETPLACE_ICONS = {
  Amazon:  <AmazonIcon />,
  Walmart: <WalmartIcon />,
  Shopify: <ShopifyIcon />,
  eBay:    <EbayIcon />,
};

const nav = [
  { section: "Overview", items: [
    { label: "Dashboard",        href: "/dashboard" },
    { label: "Alerts",           href: null },
  ]},
  { section: "Marketplaces", items: [
    { label: "Amazon",  href: "/dashboard#marketplaces" },
    { label: "Walmart", href: null },
    { label: "Shopify", href: null },
    { label: "eBay",    href: null },
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
            {group.section === "Marketplaces" ? (
              /* Icon-only strip — SVG placeholders, see MARKETPLACE_ICONS above */
              <div style={{ display: "flex", flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {group.items.map((item) => {
                  const badgeStyle = {
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 36, height: 36, flexShrink: 0,
                    background: "transparent",
                    border: "none", padding: 0,
                    cursor: item.href ? "pointer" : "default",
                    opacity: item.href ? 1 : 0.35,
                    textDecoration: "none",
                    fontFamily: "inherit",
                  };
                  return item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      style={badgeStyle}
                      title={item.label}
                      aria-label={item.label}
                    >
                      {MARKETPLACE_ICONS[item.label]}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      style={badgeStyle}
                      title={`${item.label} – coming soon`}
                      aria-label={`${item.label} – coming soon`}
                      aria-disabled="true"
                      tabIndex={-1}
                    >
                      {MARKETPLACE_ICONS[item.label]}
                    </button>
                  );
                })}
              </div>
            ) : (
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
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
