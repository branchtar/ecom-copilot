export default function FeaturesPage() {
  const section = { border: "1px solid #e8e8e8", borderRadius: 18, padding: 22, background: "#fff", marginBottom: 16 };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 60px", color: "#111827" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>Features</h1>
      <div style={{ color: "#4b5563", marginBottom: 24, lineHeight: 1.6 }}>
        Ecom Navigation provides connected analytics and operational tooling for Amazon-focused sellers.
      </div>

      <section style={section}>
        <h2>Marketplace Connections</h2>
        <p>Connect Amazon seller accounts through secure OAuth authorization and prepare for additional marketplace integrations.</p>
      </section>

      <section style={section}>
        <h2>Operational Dashboards</h2>
        <p>Review KPIs, product activity, pricing signals, and operational summaries from a centralized workspace.</p>
      </section>

      <section style={section}>
        <h2>Inventory Monitoring</h2>
        <p>Track stock-related signals, manage operational visibility, and reduce missed opportunities caused by inventory blind spots.</p>
      </section>

      <section style={section}>
        <h2>Supplier & Catalog Workflows</h2>
        <p>Organize supplier inputs and prepare product workflows that support listing, replenishment, and operational review.</p>
      </section>

      <section style={section}>
        <h2>AI-Guided Workflow Support</h2>
        <p>Use guided tooling to help streamline analysis, prioritization, and day-to-day marketplace operations.</p>
      </section>
    </main>
  );
}