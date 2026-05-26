"use client";

export default function Panel({ title, right, children }) {
  return (
    <section style={{
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      padding: "18px 20px",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-sm)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--ec-text-muted)",
        }}>
          {title}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
