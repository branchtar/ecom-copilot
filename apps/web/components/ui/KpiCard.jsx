"use client";

export default function KpiCard({ title, value, sub, trend }) {
  const isPositive = trend && trend.startsWith("+");
  const isNegative = trend && trend.startsWith("-");

  const trendStyle = isPositive
    ? { background: "var(--ec-success-bg)", color: "var(--ec-success-text)" }
    : isNegative
    ? { background: "var(--ec-danger-bg)", color: "var(--ec-danger-text)" }
    : { background: "var(--ec-border-light)", color: "var(--ec-text-muted)" };

  return (
    <div style={{
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      padding: "18px 20px",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-sm)",
      minHeight: 104,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--ec-text-muted)",
        }}>
          {title}
        </div>
        {trend ? (
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 999,
            flexShrink: 0,
            ...trendStyle,
          }}>
            {trend}
          </div>
        ) : null}
      </div>

      <div style={{
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        marginTop: 12,
        color: "var(--ec-text)",
      }}>
        {value}
      </div>

      {sub ? (
        <div style={{
          fontSize: 12,
          color: "var(--ec-text-subtle)",
          marginTop: 4,
        }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
