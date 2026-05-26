"use client";

export default function Topbar() {
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 14px",
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-xs)",
      position: "sticky",
      top: 12,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <input
          placeholder="Search SKU / UPC / ASIN / Supplier item…"
          style={{
            width: "100%",
            padding: "9px 14px",
            borderRadius: "var(--ec-radius-sm)",
            border: "1px solid var(--ec-border)",
            background: "var(--ec-border-light)",
            outline: "none",
            fontSize: 14,
            color: "var(--ec-text)",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={{
          padding: "9px 14px",
          borderRadius: "var(--ec-radius-sm)",
          border: "1px solid var(--ec-border)",
          background: "var(--ec-surface)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ec-text)",
          whiteSpace: "nowrap",
        }}>
          + Import Feed
        </button>

        <button style={{
          padding: "9px 14px",
          borderRadius: "var(--ec-radius-sm)",
          border: "1px solid var(--ec-border)",
          background: "var(--ec-surface)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ec-text)",
          whiteSpace: "nowrap",
        }}>
          Run Report
        </button>

        <div style={{
          width: 36,
          height: 36,
          borderRadius: "var(--ec-radius-sm)",
          background: "#111827",
          color: "#ffffff",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}>
          KM
        </div>
      </div>
    </header>
  );
}
