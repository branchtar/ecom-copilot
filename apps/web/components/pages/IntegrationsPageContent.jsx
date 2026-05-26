"use client";

import Sidebar from "../ui/Sidebar";
import Topbar from "../ui/Topbar";
import Panel from "../ui/Panel";
import ConnectAmazonButton from "../ConnectAmazonButton";

function IntegrationCard({ title, status, description, children }) {
  const isReady = status === "Ready";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: isReady ? "#166534" : "#666",
            background: isReady ? "#dcfce7" : "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            padding: "6px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </div>
      </div>

      <div style={{ color: "#666", lineHeight: 1.6 }}>{description}</div>

      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

export default function IntegrationsPageContent() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f7fb" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: 16 }}>
        <Topbar />

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Integrations</div>
            <div style={{ color: "#666", marginTop: 4 }}>
              Connect marketplaces and services to Ecom Navigation.
            </div>
          </div>

          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 16,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back to Dashboard
          </a>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <IntegrationCard
            title="Amazon"
            status="Ready"
            description="Connect your Amazon Seller account using OAuth so Ecom Navigation can begin pulling marketplace data."
          >
            <ConnectAmazonButton />
          </IntegrationCard>

          <IntegrationCard
            title="Shopify"
            status="Coming Soon"
            description="Connect your Shopify store to sync products, inventory, and operational workflows."
          >
            <button
              disabled
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                border: "1px solid #ddd",
                background: "#f5f5f5",
                color: "#999",
                cursor: "not-allowed",
              }}
            >
              Coming Soon
            </button>
          </IntegrationCard>

          <IntegrationCard
            title="Walmart"
            status="Coming Soon"
            description="Future connection for Walmart marketplace workflows and analytics."
          >
            <button
              disabled
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                border: "1px solid #ddd",
                background: "#f5f5f5",
                color: "#999",
                cursor: "not-allowed",
              }}
            >
              Coming Soon
            </button>
          </IntegrationCard>

          <IntegrationCard
            title="eBay"
            status="Coming Soon"
            description="Future connection for eBay listings, order flow, and marketplace monitoring."
          >
            <button
              disabled
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                border: "1px solid #ddd",
                background: "#f5f5f5",
                color: "#999",
                cursor: "not-allowed",
              }}
            >
              Coming Soon
            </button>
          </IntegrationCard>
        </div>

        <div style={{ marginTop: 12 }}>
          <Panel title="What happens when you connect Amazon">
            <ol style={{ margin: 0, paddingLeft: 18, color: "#333", lineHeight: 1.8 }}>
              <li>You click the Amazon connect button.</li>
              <li>Your browser is redirected to Amazon Seller Central OAuth.</li>
              <li>You approve the app.</li>
              <li>Amazon sends you back to your callback URL.</li>
              <li>Your account is linked to Ecom Navigation.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
