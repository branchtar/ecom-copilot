"use client";

export default function Panel({ title, right, children }) {
  return (
    <section style={{
      border: "1px solid #e8e8e8",
      borderRadius: 18,
      padding: 16,
      background: "#fff"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}