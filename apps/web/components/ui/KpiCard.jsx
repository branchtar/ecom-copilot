"use client";

export default function KpiCard({ title, value, sub, trend }) {
  return (
    <div style={{
      border: "1px solid #e8e8e8",
      borderRadius: 18,
      padding: 16,
      background: "#fff",
      minHeight: 92
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
        {trend ? (
          <div style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e8e8e8",
            color: "#111"
          }}>
            {trend}
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}