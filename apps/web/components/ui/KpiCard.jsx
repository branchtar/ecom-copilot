"use client";

// Inline SVG sparkline — no library required.
function Sparkline({ data, color = "#059669" }) {
  if (!data || data.length < 2) return null;
  const W = 64, H = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 3) - 1.5,
  ]);

  const linePts = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPts = [
    `${pts[0][0].toFixed(1)},${H}`,
    ...pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
    `${pts[pts.length - 1][0].toFixed(1)},${H}`,
  ].join(" ");

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      <polygon points={areaPts} fill={color} fillOpacity={0.13} />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function KpiCard({ title, value, sub, trend, sparkline }) {
  const isPositive = trend && trend.startsWith("+");
  const isNegative = trend && trend.startsWith("-");

  const trendStyle = isPositive
    ? { background: "var(--ec-success-bg)", color: "var(--ec-success-text)" }
    : isNegative
    ? { background: "var(--ec-danger-bg)", color: "var(--ec-danger-text)" }
    : { background: "var(--ec-border-light)", color: "var(--ec-text-muted)" };

  const sparkColor = isNegative ? "var(--ec-danger)" : "var(--ec-success)";

  return (
    <div style={{
      border: "1px solid var(--ec-border)",
      borderRadius: "var(--ec-radius)",
      padding: "18px 20px",
      background: "var(--ec-surface)",
      boxShadow: "var(--ec-shadow-sm)",
      minHeight: 110,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      {/* Top row: label + sparkline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.07em",
          color: "var(--ec-text-muted)",
        }}>
          {title}
        </div>
        {sparkline && <Sparkline data={sparkline} color={sparkColor} />}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 28, fontWeight: 800,
        letterSpacing: "-0.02em",
        marginTop: 10,
        color: "var(--ec-text)",
        lineHeight: 1,
      }}>
        {value}
      </div>

      {/* Bottom row: sub-label + trend badge */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        gap: 8,
      }}>
        {sub ? (
          <div style={{ fontSize: 12, color: "var(--ec-text-subtle)" }}>{sub}</div>
        ) : <div />}
        {trend ? (
          <div style={{
            fontSize: 11, fontWeight: 600,
            padding: "3px 8px", borderRadius: 999,
            flexShrink: 0,
            ...trendStyle,
          }}>
            {trend}
          </div>
        ) : null}
      </div>
    </div>
  );
}
