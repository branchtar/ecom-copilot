export default function PricingPage() {
  const card = { border: "1px solid #e8e8e8", borderRadius: 18, padding: 22, background: "#fff" };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 60px", color: "#111827" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>Pricing</h1>
      <div style={{ color: "#4b5563", marginBottom: 24, lineHeight: 1.6 }}>
        Pricing is being finalized as the platform expands. Early access and pilot availability may vary by account type and feature set.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
        <section style={card}>
          <h2>Starter</h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>$0</div>
          <p>Basic access for evaluation and initial product exploration.</p>
        </section>

        <section style={card}>
          <h2>Professional</h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Coming Soon</div>
          <p>Expanded analytics, integrations, and workflow tools for active sellers.</p>
        </section>

        <section style={card}>
          <h2>Enterprise</h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Custom</div>
          <p>Custom workflows, support, and advanced deployment needs.</p>
        </section>
      </div>
    </main>
  );
}