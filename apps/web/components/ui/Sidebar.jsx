"use client";

import { useState } from "react";
import Link from "next/link";

// href: string  → real Next.js Link (route exists)
// href: null    → placeholder button (route not yet built — no 404)
// "Amazon" in Marketplaces → /dashboard#marketplaces scrolls to the
//   Marketplace Connections section on the dashboard page.

// ── Marketplace logo-style SVG placeholders ───────────────────────────────────
// These are brand-recognizable geometric interpretations, NOT official trademark
// assets. Replace each function with a licensed SVG/Image when available.
// Drop official files in apps/web/public/marketplace/ and swap <img> in.
// `size` prop controls rendered px; viewBox stays 36×36 so SVG scales cleanly.

function AmazonIcon({ size = 36 }) {
  // Orange square + Amazon smile-arrow in dark ink
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#FF9900"/>
      <path d="M9 22 Q18 29.5 27 22" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M24 19.5 L27 22 L24 24.5" stroke="#131921" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function ShopifyIcon({ size = 36 }) {
  // Green square + white shopping bag (body + arched handle) + green "S" mark inside bag
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#96BF48"/>
      {/* bag body */}
      <path d="M9 17 L9 29 Q9 30.5 10.5 30.5 L25.5 30.5 Q27 30.5 27 29 L27 17 Z" fill="white"/>
      {/* bag handle */}
      <path d="M13 17 L13 13 Q13 9 18 9 Q23 9 23 13 L23 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* S mark: upper bowl curves right, lower bowl curves left */}
      <path d="M22,20 Q23,18 18,18 Q13,18 13,21.5 Q13,24 18,24 Q23,24 23,27.5 Q23,30 18,30 Q13,30 12,28.5"
        stroke="#4a7a1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function WalmartIcon({ size = 36 }) {
  // Blue square + white 6-petal spark (6 rounded bars rotated 60° apart)
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
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

function EbayIcon({ size = 36 }) {
  // Light square + 2×2 grid in eBay's 4 brand colors (red, blue, yellow, green)
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#f3f3f3"/>
      <rect x="7"  y="7"  width="10" height="10" rx="2.5" fill="#E53238"/>
      <rect x="19" y="7"  width="10" height="10" rx="2.5" fill="#0064D2"/>
      <rect x="7"  y="19" width="10" height="10" rx="2.5" fill="#F5AF02"/>
      <rect x="19" y="19" width="10" height="10" rx="2.5" fill="#86B817"/>
    </svg>
  );
}

// Maps marketplace label → icon component (size=22 for compact sidebar rows)
const MARKETPLACE_ICONS = {
  Amazon:  <AmazonIcon  size={22} />,
  Shopify: <ShopifyIcon size={22} />,
  Walmart: <WalmartIcon size={22} />,
  eBay:    <EbayIcon    size={22} />,
};

const nav = [
  { section: "Overview", items: [
    { label: "Dashboard",        href: "/dashboard" },
    { label: "Alerts",           href: null },
  ]},
  { section: "Marketplaces", items: [
    { label: "Amazon",  href: "/dashboard#marketplaces" },
    { label: "Shopify", href: null },
    { label: "Walmart", href: null },
    { label: "eBay",    href: null },
  ]},
  { section: "Suppliers", items: [
    { label: "Suppliers",        href: "/dashboard/suppliers" },
    { label: "Catalog Imports",  href: "/dashboard/catalog" },
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

// ── WorkspaceSelector ─────────────────────────────────────────────────────
// Self-contained inline dropdown for viewing, switching, and creating workspaces.
// All state is local. Receives actions from useWorkspace() via Sidebar props.

function WorkspaceSelector({ workspace, profile, createWorkspace, setActiveWorkspace, saving }) {
  const [open,       setOpen]       = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [inputName,  setInputName]  = useState("");
  const [inputError, setInputError] = useState(null);

  const workspaces = profile?.workspaces ?? [];

  function handleToggle() {
    const willClose = open;
    setOpen((o) => !o);
    if (willClose) {
      setAdding(false);
      setInputName("");
      setInputError(null);
    }
  }

  async function handleSwitch(id) {
    if (id === profile?.active_workspace_id || saving) return;
    setOpen(false);
    setAdding(false);
    await setActiveWorkspace(id);
  }

  async function handleCreate() {
    const name = inputName.trim();
    if (!name || name.length < 2) {
      setInputError("Name must be at least 2 characters.");
      return;
    }
    if (name.length > 80) {
      setInputError("Name must be 80 characters or fewer.");
      return;
    }
    setInputError(null);
    const result = await createWorkspace(name);
    if (result.ok) {
      setInputName("");
      setAdding(false);
      setOpen(false);
    } else {
      setInputError(result.error || "Could not create workspace.");
    }
  }

  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      {/* Workspace block — click to open / close selector */}
      <button
        onClick={handleToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: open ? "12px 12px 0 0" : 12,
          padding: "9px 11px",
          background: "rgba(255,255,255,0.04)",
          color: "#e6eefc",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.75 }}>Workspace</div>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginTop: 2,
        }}>
          <div style={{
            fontWeight: 700, fontSize: 13,
            flex: 1, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {workspace?.name ?? "Workspace"}
          </div>
          <span style={{ opacity: 0.4, fontSize: 9, flexShrink: 0, marginLeft: 6 }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 5 }}>
          Status:{" "}
          <span style={{ fontWeight: 700, opacity: 1 }}>
            {workspace?.plan ?? "dev"}
          </span>
        </div>
      </button>

      {/* Dropdown panel — inline below the button */}
      {open && (
        <div style={{
          border: "1px solid rgba(255,255,255,0.10)",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          background: "#0c1628",
          overflow: "hidden",
          // zIndex ensures dropdown overlays nav items below it in the sidebar
          position: "relative",
          zIndex: 10,
        }}>
          {/* Workspace list */}
          {workspaces.map((ws) => {
            const isActive = ws.id === profile?.active_workspace_id;
            return (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "9px 12px",
                  background: isActive ? "rgba(110,231,255,0.06)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color: "#e6eefc",
                  textAlign: "left",
                  cursor: saving ? "wait" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: isActive ? "#6ee7ff" : "rgba(255,255,255,0.18)",
                }} />
                <span style={{
                  flex: 1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ws.name}
                </span>
                {isActive && (
                  <span style={{ fontSize: 9, opacity: 0.45, flexShrink: 0 }}>active</span>
                )}
              </button>
            );
          })}

          {/* Add business row */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              style={{
                display: "block",
                width: "100%",
                padding: "9px 12px",
                background: "transparent",
                border: "none",
                color: "rgba(110,231,255,0.65)",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
              }}
            >
              + Add business
            </button>
          ) : (
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <input
                autoFocus
                type="text"
                placeholder="Business name"
                maxLength={80}
                value={inputName}
                onChange={(e) => { setInputName(e.target.value); setInputError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  handleCreate();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setInputName("");
                    setInputError(null);
                  }
                }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 7,
                  padding: "6px 9px",
                  color: "#e6eefc",
                  fontSize: 12,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {inputError && (
                <div style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>
                  {inputError}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  onClick={handleCreate}
                  disabled={saving || !inputName.trim()}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    background: "rgba(110,231,255,0.12)",
                    border: "1px solid rgba(110,231,255,0.22)",
                    borderRadius: 6,
                    color: saving ? "rgba(110,231,255,0.45)" : "#6ee7ff",
                    fontSize: 12,
                    cursor: saving || !inputName.trim() ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: !inputName.trim() ? 0.55 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setAdding(false); setInputName(""); setInputError(null); }}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6,
                    color: "rgba(230,238,252,0.45)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ workspace, profile, createWorkspace, setActiveWorkspace, saving }) {
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

      {/* Workspace selector */}
      <WorkspaceSelector
        workspace={workspace}
        profile={profile}
        createWorkspace={createWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        saving={saving}
      />

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
              /* Icon + title rows — SVG placeholders, see MARKETPLACE_ICONS above */
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.items.map((item) => {
                  const rowStyle = item.href
                    ? { ...liveStyle,        display: "flex", alignItems: "center", gap: 10 }
                    : { ...placeholderStyle, display: "flex", alignItems: "center", gap: 10 };
                  return item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      style={rowStyle}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <span style={{ flexShrink: 0, display: "flex" }}>{MARKETPLACE_ICONS[item.label]}</span>
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      style={rowStyle}
                      title={`${item.label} – coming soon`}
                      aria-label={`${item.label} – coming soon`}
                      aria-disabled="true"
                      tabIndex={-1}
                    >
                      <span style={{ flexShrink: 0, display: "flex" }}>{MARKETPLACE_ICONS[item.label]}</span>
                      <span>{item.label}</span>
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
