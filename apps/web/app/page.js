"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const sectionTitleStyle = {
  fontSize: 32,
  fontWeight: 800,
  marginBottom: 10,
  color: "#0f172a",
};

const sectionBodyStyle = {
  color: "#6b7280",
  maxWidth: 860,
  lineHeight: 1.7,
  fontSize: 17,
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
};

const primaryButtonStyle = {
  display: "inline-block",
  padding: "14px 22px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 15,
  background: "#111827",
  color: "#ffffff",
  border: "1px solid #111827",
};

const secondaryButtonStyle = {
  display: "inline-block",
  padding: "14px 22px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 15,
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
};

// ─────────────────────────────────────────────────────────────────────────────
// Channel strip data
// ─────────────────────────────────────────────────────────────────────────────

const CHANNELS = [
  { name: "Amazon",    status: "live",     color: "#ff9900", bg: "#fff8ee", border: "#ffd591" },
  { name: "Shopify",   status: "planned",  color: "#96bf48", bg: "#f4f9ee", border: "#c8e0a0" },
  { name: "Walmart",   status: "planned",  color: "#0071ce", bg: "#eef6ff", border: "#a8d0f0" },
  { name: "eBay",      status: "planned",  color: "#e53238", bg: "#fff0f0", border: "#f5bcbe" },
  { name: "TikTok",    status: "roadmap",  color: "#555555", bg: "#f5f5f5", border: "#d0d0d0" },
  { name: "Instagram", status: "roadmap",  color: "#833ab4", bg: "#f8f0ff", border: "#d9b0f5" },
];

const STATUS_LABEL = {
  live:    { text: "Live",    dot: "#22c55e" },
  planned: { text: "Planned", dot: "#f59e0b" },
  roadmap: { text: "Roadmap", dot: "#94a3b8" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature pillar data
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "⊞",
    title: "Multi-Listing Management",
    body: "Create, sync, and manage product listings across marketplaces from one place — no more duplicate work per channel.",
    tag: null,
  },
  {
    icon: "↕",
    title: "Repricing & Buy Box Intelligence",
    body: "Stay competitive with automated repricing rules and real-time buy box signals that protect margin while chasing velocity.",
    tag: null,
  },
  {
    icon: "⚙",
    title: "Workflow Automation",
    body: "Build repeatable automations for order routing, inventory updates, and supplier-driven tasks — reduce manual effort at scale.",
    tag: null,
  },
  {
    icon: "◈",
    title: "Marketplace Analytics",
    body: "Track sales, margins, orders, and performance signals across all connected channels in a unified dashboard.",
    tag: null,
  },
  {
    icon: "↓",
    title: "Supplier Feed Imports",
    body: "Pull in distributor catalogs and pricing feeds directly so you can evaluate, list, and reprice without manual file handling.",
    tag: null,
  },
  {
    icon: "◉",
    title: "Inventory & Order Visibility",
    body: "See live stock levels, pending orders, and FBA metrics across channels so nothing slips through the cracks.",
    tag: null,
  },
  {
    icon: "✦",
    title: "AI Operations Assistant",
    body: "An intelligent layer that surfaces the actions that matter most — from pricing decisions to restocking alerts.",
    tag: "Roadmap",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap data
// ─────────────────────────────────────────────────────────────────────────────

const ROADMAP = [
  {
    phase: "NOW",
    phaseColor: "#2563eb",
    title: "Amazon connection and foundational workflows",
    items: [
      "Amazon OAuth — live end-to-end",
      "Seller dashboard with KPIs, alerts, and activity feed",
      "Supplier pipeline and feed imports",
      "Repricing and buy box visibility",
    ],
  },
  {
    phase: "NEXT",
    phaseColor: "#059669",
    title: "Shopify, Walmart, and eBay connectors",
    items: [
      "Shopify OAuth + order and inventory sync",
      "Walmart Seller API integration",
      "eBay OAuth + listing management",
      "Cross-channel multi-listing management",
    ],
  },
  {
    phase: "FUTURE",
    phaseColor: "#7c3aed",
    title: "TikTok, Instagram, AI automation, and advanced workflows",
    items: [
      "TikTok Shop and Instagram Shopping connectors",
      "AI operations assistant for intelligent action surfacing",
      "Advanced cross-channel automation rules",
      "Unified profitability and forecasting layer",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "32px 20px 70px",
        color: "#111827",
      }}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 24,
          padding: "40px 36px",
          background: "linear-gradient(160deg,#ffffff 0%,#f0f6ff 100%)",
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          Multi-Channel Ecommerce Operations Platform
        </div>

        <h1
          style={{
            fontSize: 54,
            lineHeight: 1.04,
            margin: "18px 0 16px",
            maxWidth: 880,
            color: "#0f172a",
            fontWeight: 900,
          }}
        >
          One command center for Amazon, Shopify, Walmart, eBay, and every channel that drives your business.
        </h1>

        <div
          style={{
            fontSize: 19,
            color: "#4b5563",
            maxWidth: 820,
            lineHeight: 1.75,
          }}
        >
          Ecom Navigation is built to unify your marketplace operations — multi-listing,
          repricing, supplier feeds, analytics, and workflow automation — so you can
          run a multi-channel business without running multiple disconnected systems.
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 28,
          }}
        >
          <a href="/dashboard" style={primaryButtonStyle}>
            Connect Amazon — Start Free
          </a>
          <a href="/features" style={secondaryButtonStyle}>
            Explore Features
          </a>
          <a href="/contact" style={secondaryButtonStyle}>
            Contact Us
          </a>
        </div>

        <div
          style={{
            marginTop: 16,
            color: "#6b7280",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Amazon is live today. Shopify, Walmart, and eBay connectors are planned next.
          TikTok and Instagram are on the roadmap.
        </div>
      </section>

      {/* ── Channel Strip ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#94a3b8",
            marginBottom: 16,
          }}
        >
          Built to connect your sales channels
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {CHANNELS.map((ch) => {
            const s = STATUS_LABEL[ch.status];
            return (
              <div
                key={ch.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 12,
                  border: `1px solid ${ch.border}`,
                  background: ch.bg,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: ch.color }}>{ch.name}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: s.dot,
                      display: "inline-block",
                    }}
                  />
                  {s.text}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Value Proposition ────────────────────────────────────────────── */}
      <section style={{ marginTop: 42 }}>
        <h2 style={sectionTitleStyle}>
          One system instead of scattered tools
        </h2>
        <div style={sectionBodyStyle}>
          Most multi-channel sellers end up splitting their operation across spreadsheets,
          marketplace portals, supplier files, standalone repricers, and manual follow-up.
          Ecom Navigation is built to collapse that fragmentation into one operating layer
          for your business.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {[
            { title: "Connected channel data", body: "Amazon live today. More channels rolling out." },
            { title: "Operational visibility", body: "KPIs, buy box signals, and inventory status in one place." },
            { title: "Workflow automation", body: "Reduce the repetitive work that slows down operations." },
            { title: "Supplier-ready architecture", body: "Built to handle distributor feeds, catalogs, and pricing pipelines." },
          ].map((item) => (
            <div key={item.title} style={cardStyle}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{item.title}</div>
              <div style={{ color: "#6b7280", lineHeight: 1.6, fontSize: 15 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Pillars ──────────────────────────────────────────────── */}
      <section style={{ marginTop: 46 }}>
        <h2 style={sectionTitleStyle}>Everything your operation needs</h2>
        <div style={sectionBodyStyle}>
          From listing management to supplier feed imports to AI-assisted operations,
          Ecom Navigation is built to grow with your business — not just connect one marketplace.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 22,
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} style={{ ...cardStyle, position: "relative" }}>
              {f.tag && (
                <span
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "#f3f0ff",
                    color: "#7c3aed",
                    border: "1px solid #ddd6fe",
                  }}
                >
                  {f.tag}
                </span>
              )}
              <div
                style={{
                  fontSize: 22,
                  marginBottom: 10,
                  color: "#374151",
                  lineHeight: 1,
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 15 }}>{f.title}</div>
              <div style={{ color: "#6b7280", lineHeight: 1.65, fontSize: 14 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: 46 }}>
        <h2 style={sectionTitleStyle}>Start with Amazon. Expand from there.</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {[
            {
              step: "STEP 1",
              title: "Connect your Amazon account",
              body: "Authorize securely via Amazon OAuth. Your seller data starts flowing into Ecom Navigation immediately.",
            },
            {
              step: "STEP 2",
              title: "Review the signals that matter",
              body: "Sales, margins, buy box status, inventory, supplier pipeline — all visible in one dashboard, not five tabs.",
            },
            {
              step: "STEP 3",
              title: "Expand to more channels",
              body: "As Shopify, Walmart, and eBay connectors roll out, add them to your operation without rebuilding your workflow.",
            },
          ].map((item) => (
            <div key={item.step} style={cardStyle}>
              <div
                style={{
                  fontSize: 12,
                  color: "#2563eb",
                  fontWeight: 800,
                  marginBottom: 10,
                  letterSpacing: 0.3,
                }}
              >
                {item.step}
              </div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{item.title}</div>
              <div style={{ color: "#6b7280", lineHeight: 1.65, fontSize: 14 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap ──────────────────────────────────────────────────────── */}
      <section style={{ marginTop: 46 }}>
        <h2 style={sectionTitleStyle}>Where we are and where we are going</h2>
        <div style={sectionBodyStyle}>
          Amazon is the live starting point. The platform is built to expand into every
          major sales and marketing channel — with AI-assisted operations on the horizon.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 22,
          }}
        >
          {ROADMAP.map((r) => (
            <div key={r.phase} style={cardStyle}>
              <div
                style={{
                  fontSize: 12,
                  color: r.phaseColor,
                  fontWeight: 800,
                  marginBottom: 10,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {r.phase}
              </div>
              <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>{r.title}</div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#6b7280", lineHeight: 1.8, fontSize: 14 }}>
                {r.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why sellers outgrow disconnected tools ───────────────────────── */}
      <section style={{ marginTop: 46 }}>
        <h2 style={sectionTitleStyle}>Why sellers outgrow disconnected tools</h2>
        <div style={sectionBodyStyle}>
          The problem is not the tools themselves — it is having too many of them with
          no way to see the full picture. Ecom Navigation is the operating layer that
          ties everything together.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          {[
            "Fewer disconnected systems to juggle",
            "Better visibility across channels and suppliers",
            "Less manual copy-and-paste work",
            "A clearer path toward automation",
          ].map((item) => (
            <div
              key={item}
              style={{
                ...cardStyle,
                padding: 18,
                fontWeight: 700,
                color: "#1f2937",
                fontSize: 15,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          marginTop: 46,
          border: "1px solid #e2e8f0",
          borderRadius: 24,
          padding: "36px 32px",
          background: "linear-gradient(160deg,#f8faff 0%,#eef4ff 100%)",
        }}
      >
        <h2 style={{ fontSize: 34, margin: "0 0 10px", color: "#0f172a", fontWeight: 900 }}>
          Start with Amazon. Build your multi-channel operation from there.
        </h2>
        <div style={{ ...sectionBodyStyle, maxWidth: 720 }}>
          Connect your Amazon account today and lay the foundation for a fully
          connected, automated seller operation — across every channel you sell on.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <a href="/dashboard" style={primaryButtonStyle}>
            Connect Amazon — Start Free
          </a>
          <a href="/contact" style={secondaryButtonStyle}>
            Contact Us
          </a>
        </div>

        <div style={{ marginTop: 14, color: "#94a3b8", fontSize: 13 }}>
          Amazon connector is live. Shopify, Walmart, and eBay are planned next.
          TikTok and Instagram are on the roadmap.
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: 36,
          paddingTop: 22,
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
          color: "#4b5563",
          fontSize: 15,
        }}
      >
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <a href="/features" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="/pricing"  style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
          <a href="/privacy"  style={{ textDecoration: "none", color: "inherit" }}>Privacy Policy</a>
          <a href="/terms"    style={{ textDecoration: "none", color: "inherit" }}>Terms of Service</a>
          <a href="/contact"  style={{ textDecoration: "none", color: "inherit" }}>Contact</a>
        </div>
        <div style={{ color: "#6b7280" }}>© 2026 Ecom Navigation. All rights reserved.</div>
      </footer>
    </main>
  );
}
