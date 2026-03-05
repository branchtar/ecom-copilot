"use client";

export default function Topbar() {
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "14px 16px",
      border: "1px solid #e8e8e8",
      borderRadius: 18,
      background: "#ffffff",
      position: "sticky",
      top: 12,
      zIndex: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <input
          placeholder="Search SKU / UPC / ASIN / Supplier item..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid #ddd",
            outline: "none"
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={{
          padding: "10px 14px",
          borderRadius: 16,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer"
        }}>
          + Import Feed
        </button>

        <button style={{
          padding: "10px 14px",
          borderRadius: 16,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer"
        }}>
          Run Report
        </button>

        <div style={{
          width: 38, height: 38, borderRadius: 16,
          border: "1px solid #ddd",
          display: "grid",
          placeItems: "center",
          fontWeight: 800
        }}>
          K
        </div>
      </div>
    </header>
  );
}