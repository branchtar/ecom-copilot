"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/ui/Sidebar";
import Topbar from "../../components/ui/Topbar";
import KpiCard from "../../components/ui/KpiCard";
import Panel from "../../components/ui/Panel";
import ConnectAmazonButton from "../../components/ConnectAmazonButton";

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [apiBase, setApiBase] = useState("");
  const [amazonStatus, setAmazonStatus] = useState({
    loading: true,
    connected: false,
    selling_partner_id: null,
  });

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "https://5xhzibtfry.us-east-1.awsapprunner.com";
    setApiBase(base);

    if (!base) {
      setApiStatus("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }

    fetch(`${base}/health`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Health failed")))
      .then(() => setApiStatus("Online"))
      .catch(() => setApiStatus("Offline"));
  }, []);

  // Fetch Amazon connection status once the API base is known.
  useEffect(() => {
    if (!apiBase) {
      setAmazonStatus({ loading: false, connected: false, selling_partner_id: null });
      return;
    }
    fetch(`${apiBase}/api/integrations/amazon/status?tenant=dev`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Status failed")))
      .then((data) => setAmazonStatus({
        loading: false,
        connected: !!data.connected,
        selling_partner_id: data.selling_partner_id || null,
      }))
      .catch(() => setAmazonStatus({ loading: false, connected: false, selling_partner_id: null }));
  }, [apiBase]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f7fb" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: 16 }}>
        <Topbar />

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Dashboard</div>
            <div style={{ color: "#666", marginTop: 4 }}>
              Connect marketplaces, monitor KPIs, and run automations.
            </div>
          </div>

          <div style={{
            border: "1px solid #e8e8e8",
            borderRadius: 18,
            background: "#fff",
            padding: "10px 12px",
            minWidth: 260
          }}>
            <div style={{ fontSize: 12, color: "#666" }}>Backend</div>
            <div style={{ fontWeight: 900 }}>Status: {apiStatus}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4, wordBreak: "break-all" }}>
              {apiBase || "(not set)"}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12
        }}>
          <KpiCard title="Gross Sales" value="$12,480" sub="Last 30 days" trend="+4.2%" />
          <KpiCard title="Net Profit" value="$2,310" sub="Est. after fees" trend="+2.1%" />
          <KpiCard title="Orders" value="186" sub="All channels" trend="+8" />
          <KpiCard title="Active Listings" value="1,942" sub="Amazon + Shopify" trend="+31" />
        </div>

        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12
        }}>
          <Panel
            title="Today’s Focus"
            right={<button style={{ padding: "10px 14px", borderRadius: 16, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Open Tasks</button>}
          >
            <ul style={{ margin: 0, paddingLeft: 18, color: "#333" }}>
              <li>Import supplier feed(s) → normalize UPC/SKU → dedupe</li>
              <li>Run profitability scan → create “Worth Listing” queue</li>
              <li>Push pricing rules → publish to marketplaces</li>
              <li>Review alerts: buy box, low stock, stranded inventory</li>
            </ul>
          </Panel>

          <Panel title="Connections">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Amazon — live status from API */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><b>Amazon</b></div>
                {amazonStatus.loading ? (
                  <span style={{ color: "#999", fontSize: 13 }}>Checking…</span>
                ) : amazonStatus.connected ? (
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      background: "#d1fae5", color: "#065f46",
                      padding: "2px 10px", borderRadius: 12,
                      fontSize: 13, fontWeight: 700,
                    }}>✓ Connected</span>
                    {amazonStatus.selling_partner_id && (
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                        {amazonStatus.selling_partner_id}
                      </div>
                    )}
                  </div>
                ) : (
                  <ConnectAmazonButton />
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><b>Shopify</b></div>
                <div style={{ color: "#999" }}>Not connected</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><b>Walmart</b></div>
                <div style={{ color: "#999" }}>Later</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><b>eBay</b></div>
                <div style={{ color: "#999" }}>Later</div>
              </div>
            </div>
          </Panel>
        </div>

        <div style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12
        }}>
          <Panel title="Supplier Pipeline">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 10, fontSize: 13 }}>
              <div style={{ fontWeight: 800, color: "#666" }}>Supplier</div>
              <div style={{ fontWeight: 800, color: "#666" }}>SKUs</div>
              <div style={{ fontWeight: 800, color: "#666" }}>Status</div>

              <div>Ensoul Music</div><div>12,840</div><div>Ready</div>
              <div>LPD Music</div><div>9,214</div><div>Queued</div>
              <div>Vernon Sales</div><div>4,110</div><div>Scrape</div>
            </div>
          </Panel>

          <Panel title="Alerts">
            <ul style={{ margin: 0, paddingLeft: 18, color: "#333" }}>
              <li>12 SKUs below min net threshold</li>
              <li>6 listings missing images</li>
              <li>3 products low stock (FBA)</li>
              <li>2 repricer jobs failed</li>
            </ul>
          </Panel>
        </div>

        <div style={{ marginTop: 12, color: "#777", fontSize: 12 }}>
          Next steps: wire KPIs to real API endpoints + add role-based menus for subscribers.
        </div>
      </div>
    </div>
  );
}