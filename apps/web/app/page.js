import AuthPanel from "../components/AuthPanel";
import ConnectAmazonButton from "../components/ConnectAmazonButton";

export default function Page() {
  return (
    <main>
      <h1 style={{ marginBottom: 6 }}>Ecom Copilot</h1>
      <div style={{ color: "#666", marginBottom: 18 }}>
        Public sign-in + marketplace connections (start with Amazon).
      </div>

      <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16, marginBottom: 16 }}>
        <AuthPanel />
      </div>

      <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Integrations</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ConnectAmazonButton />
          <button disabled style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid #ccc", opacity: 0.5 }}>
            Walmart (later)
          </button>
          <button disabled style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid #ccc", opacity: 0.5 }}>
            Shopify (later)
          </button>
          <button disabled style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid #ccc", opacity: 0.5 }}>
            eBay (later)
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#777", fontSize: 13 }}>
          If the button errors in-browser, it’s usually CORS on the API or the API not returning authorize_url.
        </div>
      </div>
    </main>
  );
}