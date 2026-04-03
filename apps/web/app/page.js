"use client";

const sectionTitleStyle = {
  fontSize: 32,
  marginBottom: 10,
  color: "#111827",
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
  padding: "14px 18px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 800,
  background: "#111827",
  color: "#ffffff",
  border: "1px solid #111827",
};

const secondaryButtonStyle = {
  display: "inline-block",
  padding: "14px 18px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 800,
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
};

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
      <section
        style={{
          border: "1px solid #e8e8e8",
          borderRadius: 24,
          padding: 32,
          background: "linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Amazon Seller Analytics + Automation
        </div>

        <h1
          style={{
            fontSize: 56,
            lineHeight: 1.02,
            margin: "18px 0 14px",
            maxWidth: 900,
            color: "#0f172a",
          }}
        >
          Connect Amazon. Monitor performance. Automate the work.
        </h1>

        <div
          style={{
            fontSize: 19,
            color: "#4b5563",
            maxWidth: 880,
            lineHeight: 1.7,
          }}
        >
          Ecom Navigation helps Amazon sellers connect marketplace data,
          monitor business performance, track pricing and inventory signals,
          and reduce manual work through automation.
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 24,
          }}
        >
          <a href="/dashboard" style={primaryButtonStyle}>
            Connect Amazon
          </a>

          <a href="/features" style={secondaryButtonStyle}>
            View Features
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
          Start with Amazon. Shopify, Walmart, and eBay support are planned
          next.
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <h2 style={sectionTitleStyle}>
          Built for sellers who want one system instead of scattered tools
        </h2>
        <div style={sectionBodyStyle}>
          Ecom Navigation is designed to bring seller data, operational
          visibility, and automation into one place so sellers can spend less
          time juggling systems and more time making decisions.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Connected data</div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Bring Amazon account data into one place.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Operational visibility
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Track the signals that matter across pricing, inventory, and workflows.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Workflow automation
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Reduce repetitive manual tasks with guided automation.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Built to expand</div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Start with Amazon and grow into a broader multi-marketplace system.
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 38 }}>
        <h2 style={sectionTitleStyle}>What Ecom Navigation helps you do</h2>
        <div style={sectionBodyStyle}>
          The platform is built to help sellers understand performance, stay on
          top of operational issues, and create more efficient workflows over
          time.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Connect marketplace data
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Start by connecting Amazon so your dashboard can become the home base
              for seller activity.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Monitor performance
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Review the business signals that matter most without bouncing between
              disconnected systems.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Track inventory and pricing signals
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Stay aware of changes that affect sales, margins, and fulfillment
              decisions.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Manage supplier-driven workflows
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Support operational processes that depend on distributor data,
              listings, and inventory movement.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Reduce manual work
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Move toward repeatable automations that save time and reduce mistakes.
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 38 }}>
        <h2 style={sectionTitleStyle}>How it works</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              STEP 1
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Connect your Amazon account
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Securely connect Amazon to begin bringing account data into Ecom
              Navigation.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              STEP 2
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Review the signals that matter
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              See performance, inventory, pricing, and workflow-related information
              in one place.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              STEP 3
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Take action faster
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Use the platform as the foundation for more efficient workflows and
              future automation.
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 38 }}>
        <h2 style={sectionTitleStyle}>Why sellers outgrow disconnected tools</h2>
        <div style={sectionBodyStyle}>
          Most sellers end up splitting their work across spreadsheets,
          marketplace portals, supplier files, repricers, notes, and manual
          follow-up. Ecom Navigation is being built to reduce that fragmentation
          and create one operating layer for the business.
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
            "Fewer disconnected systems",
            "Better visibility into business signals",
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
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 38 }}>
        <h2 style={sectionTitleStyle}>Built to start with Amazon and grow beyond it</h2>
        <div style={sectionBodyStyle}>
          Amazon is the first integration focus. Ecom Navigation is designed to
          expand into a broader operating system for sellers managing more
          platforms, more workflows, and more data.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              NOW
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Amazon connection and foundational workflows
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Start with Amazon account connection and the first layer of seller
              visibility.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              NEXT
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Shopify, Walmart, and eBay support
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Expand toward a broader multi-marketplace operating system.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 800, marginBottom: 10 }}>
              FUTURE
            </div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Deeper automation and cross-platform workflows
            </div>
            <div style={{ color: "#6b7280", lineHeight: 1.6 }}>
              Build toward more advanced operational tooling and automation.
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 42,
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 28,
          background: "#f9fafb",
        }}
      >
        <h2 style={{ fontSize: 34, margin: "0 0 10px", color: "#111827" }}>
          Ready to connect Amazon and build a more automated workflow?
        </h2>
        <div style={{ ...sectionBodyStyle, maxWidth: 760 }}>
          Start with Amazon and lay the foundation for a more connected seller
          operation.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <a href="/dashboard" style={primaryButtonStyle}>
            Connect Amazon
          </a>
          <a href="/contact" style={secondaryButtonStyle}>
            Contact Us
          </a>
        </div>
      </section>

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
          <a href="/features" style={{ textDecoration: "none", color: "inherit" }}>
            Features
          </a>
          <a href="/pricing" style={{ textDecoration: "none", color: "inherit" }}>
            Pricing
          </a>
          <a href="/privacy" style={{ textDecoration: "none", color: "inherit" }}>
            Privacy Policy
          </a>
          <a href="/terms" style={{ textDecoration: "none", color: "inherit" }}>
            Terms of Service
          </a>
          <a href="/contact" style={{ textDecoration: "none", color: "inherit" }}>
            Contact
          </a>
        </div>

        <div style={{ color: "#6b7280" }}>
          © 2026 Ecom Navigation. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
