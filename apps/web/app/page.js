"use client";

export default function Page() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px 60px", color: "#111827" }}>
      <section style={{
        border: "1px solid #e8e8e8",
        borderRadius: 18,
        padding: 28,
        background: "linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)"
      }}>
        <div style={{
          display: "inline-block",
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          color: "#1d4ed8",
          fontSize: 12,
          fontWeight: 700
        }}>
          Amazon Seller Analytics + Automation
        </div>

        <h1 style={{ fontSize: 52, lineHeight: 1.05, margin: "18px 0 12px", maxWidth: 860 }}>
          Ecom Navigation helps Amazon sellers connect data, monitor performance, and automate operations.
        </h1>

        <div style={{ fontSize: 18, color: "#4b5563", maxWidth: 860, lineHeight: 1.6 }}>
          Connect Amazon and other marketplaces, review analytics, track inventory signals, monitor pricing, and manage supplier-driven workflows from one dashboard.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "14px 18px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 800,
              background: "#111827",
              color: "#fff",
              border: "1px solid #111827"
            }}
          >
            Open Dashboard
          </a>

          <a
            href="/features"
            style={{
              display: "inline-block",
              padding: "14px 18px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 800,
              background: "#fff",
              color: "#111827",
              border: "1px solid #d1d5db"
            }}
          >
            View Features
          </a>

          <a
            href="/pricing"
            style={{
              display: "inline-block",
              padding: "14px 18px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 800,
              background: "#fff",
              color: "#111827",
              border: "1px solid #d1d5db"
            }}
          >
            See Pricing
          </a>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 32, marginBottom: 8 }}>What Ecom Navigation does</h2>
        <div style={{ color: "#6b7280", maxWidth: 800, lineHeight: 1.6 }}>
          The platform is designed to help Amazon sellers understand business performance and reduce manual work through connected analytics and workflow tools.
        </div>
      </section>

      <footer style={{ marginTop: 34, paddingTop: 20, borderTop: "1px solid #e5e7eb", display: "flex", gap: 18, flexWrap: "wrap", color: "#4b5563" }}>
        <a href="/features" style={{ textDecoration: "none" }}>Features</a>
        <a href="/pricing" style={{ textDecoration: "none" }}>Pricing</a>
        <a href="/privacy" style={{ textDecoration: "none" }}>Privacy Policy</a>
        <a href="/contact" style={{ textDecoration: "none" }}>Contact</a>
        <a href="/dashboard" style={{ textDecoration: "none" }}>Dashboard</a>
      </footer>
    </main>
  );
}