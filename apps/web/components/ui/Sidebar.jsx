"use client";

import Link from "next/link";

const nav = [
  { section: "Overview", items: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Alerts", href: "/dashboard/alerts" },
  ]},
  { section: "Marketplaces", items: [
    { label: "Amazon", href: "/dashboard/marketplaces/amazon" },
    { label: "Walmart", href: "/dashboard/marketplaces/walmart" },
    { label: "Shopify", href: "/dashboard/marketplaces/shopify" },
    { label: "eBay", href: "/dashboard/marketplaces/ebay" },
  ]},
  { section: "Suppliers", items: [
    { label: "Supplier Catalogs", href: "/dashboard/suppliers" },
    { label: "Feeds & Imports", href: "/dashboard/suppliers/imports" },
  ]},
  { section: "Ops", items: [
    { label: "Products", href: "/dashboard/products" },
    { label: "Inventory", href: "/dashboard/inventory" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Returns", href: "/dashboard/returns" },
  ]},
  { section: "Pricing", items: [
    { label: "Rules", href: "/dashboard/pricing/rules" },
    { label: "Min/Max", href: "/dashboard/pricing/minmax" },
    { label: "Repricer Jobs", href: "/dashboard/pricing/jobs" },
  ]},
  { section: "Reporting", items: [
    { label: "KPIs", href: "/dashboard/reports/kpis" },
    { label: "P&L Snapshot", href: "/dashboard/reports/pnl" },
    { label: "Exports", href: "/dashboard/reports/exports" },
  ]},
  { section: "Settings", items: [
    { label: "Account", href: "/dashboard/settings/account" },
    { label: "Integrations", href: "/dashboard/settings/integrations" },
    { label: "API Keys", href: "/dashboard/settings/keys" },
  ]},
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 260,
      borderRight: "1px solid #e8e8e8",
      padding: 16,
      background: "#0b1220",
      color: "#e6eefc",
      height: "100vh",
      position: "sticky",
      top: 0
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 12,
          background: "linear-gradient(135deg,#6ee7ff,#a78bfa)",
        }} />
        <div>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>EcomNavigation</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Subscriber Dashboard</div>
        </div>
      </div>

      <div style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 10,
        marginBottom: 14,
        background: "rgba(255,255,255,0.04)"
      }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Workspace</div>
        <div style={{ fontWeight: 700 }}>Bwaaack / Copy & Paste LLC</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          Status: <span style={{ fontWeight: 700 }}>Dev</span>
        </div>
      </div>

      <div style={{ overflowY: "auto", paddingRight: 6, height: "calc(100vh - 140px)" }}>
        {nav.map((group) => (
          <div key={group.section} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.65, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
              {group.section}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} style={{
                  textDecoration: "none",
                  color: "#e6eefc",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}