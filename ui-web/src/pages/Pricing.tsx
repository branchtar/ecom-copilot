import React, { useEffect, useMemo, useState } from "react";

  // EC_HARD_COSTS_HELPERS
  async function apiGet(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  async function apiPut(url: string, body: any) {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

type PricingConfig = {
  min_margin: number;
  max_margin: number;
  dim_divisor: number;
  rounding_mode: "cents" | ".99" | "none";
  sell_price_mode: "min" | "mid" | "max";
  shipping_rate_table: Array<{ max_wt: number; cost: number }>;
  marketplace_fee_table: Record<string, Record<string, number>>;
};

type PreviewPayload = {
  item_cost: number;
  marketplace: string;
  category: string;
  dims: {
    length_in: number;
    width_in: number;
    height_in: number;
    weight_lb: number;
  };
  supplier_fees: {
    dropship_fee: number;
    handling_fee: number;
    misc_fees: number[];
  };
};

export default function Pricing() {
  // EC_HARD_COSTS_STATE_START
  const [hardCosts, setHardCosts] = React.useState<any>({});
  const [hardCostsMsg, setHardCostsMsg] = React.useState<string>("");
  // EC_HARD_COSTS_STATE_END
// EC_LOAD_HARD_COSTS
  React.useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const supplierKey = (selectedSupplierKey || selectedSupplier?.key || "KMC");
        const data = await apiGet(`/api/pricing/config?supplier_key=${encodeURIComponent(supplierKey)}`);
        const cfg = data?.config;
        if (cfg?.hard_costs) setHardCosts(cfg.hard_costs);
      } catch {}
    })();
    // @ts-ignore
  }, [selectedSupplierKey, selectedSupplier]);
const [cfg, setCfg] = useState<PricingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [payload, setPayload] = useState<PreviewPayload>({
    item_cost: 10,
    marketplace: "amazon",
    category: "default",
    dims: { length_in: 10, width_in: 8, height_in: 4, weight_lb: 2 },
    supplier_fees: { dropship_fee: 0, handling_fee: 0, misc_fees: [] },
  });

  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  async function loadConfig() {
    setLoadingCfg(true);
    setErr(null);
    try {
      const r = await fetch("/pricing/config");
      if (!r.ok) throw new Error(`Config load failed (${r.status})`);
      const j = await r.json();
      setCfg(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to load config");
    } finally {
      setLoadingCfg(false);
    }
  }

  async function saveConfig() {
    if (!cfg) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/pricing/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!r.ok) throw new Error(`Config save failed (${r.status})`);
    } catch (e: any) {
      setErr(e?.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreviewing(true);
    setErr(null);
    try {
      const r = await fetch("/pricing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Preview failed (${r.status})`);
      const j = await r.json();
      setPreview(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to preview");
    } finally {
      setPreviewing(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const costBreakdown = useMemo(() => {
    if (!preview) return null;
    return {
      roi_cost: preview?.costs?.roi_cost,
      total_cost: preview?.costs?.total_cost,
      calculated_shipping: preview?.components?.calculated_shipping,
      marketplace_fee: preview?.components?.marketplace_fee,
      roi_percent: preview?.roi?.roi_percent,
      min_price: preview?.prices?.min_price,
      max_price: preview?.prices?.max_price,
      sell_price: preview?.prices?.sell_price,
    };
  }, [preview]);

  if (loadingCfg) {
    return <div style={{ padding: 24 }}>Loading pricing config...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h2 style={{ marginBottom: 8 }}>Pricing</h2>
      <div style={{ color: "#666", marginBottom: 16 }}>
        Min/Max price from Total Cost (includes marketplace fee). ROI excludes marketplace fee (your rule).
      </div>

      {err && (
        <div style={{ padding: 12, background: "#ffecec", border: "1px solid #ffb3b3", borderRadius: 8, marginBottom: 16 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Global Settings</h3>

          <label style={{ display: "block", marginBottom: 8 }}>
            Min Margin
            <input
              type="number"
              step="0.01"
              value={cfg?.min_margin ?? 0}
              onChange={(e) => setCfg((p) => (p ? { ...p, min_margin: Number(e.target.value) } : p))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            Max Margin
            <input
              type="number"
              step="0.01"
              value={cfg?.max_margin ?? 0}
              onChange={(e) => setCfg((p) => (p ? { ...p, max_margin: Number(e.target.value) } : p))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            DIM Divisor
            <input
              type="number"
              step="1"
              value={cfg?.dim_divisor ?? 139}
              onChange={(e) => setCfg((p) => (p ? { ...p, dim_divisor: Number(e.target.value) } : p))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            Sell Price Mode
            <select
              value={cfg?.sell_price_mode ?? "min"}
              onChange={(e) => setCfg((p) => (p ? { ...p, sell_price_mode: e.target.value as any } : p))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            >
              <option value="min">Min</option>
              <option value="mid">Mid</option>
              <option value="max">Max</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            Rounding
            <select
              value={cfg?.rounding_mode ?? "cents"}
              onChange={(e) => setCfg((p) => (p ? { ...p, rounding_mode: e.target.value as any } : p))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            >
              <option value="cents">Cents</option>
              <option value=".99">.99</option>
              <option value="none">None</option>
            </select>
          </label>

          <button
            onClick={saveConfig}
            disabled={saving || !cfg}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: saving ? "#f5f5f5" : "white",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Preview Inputs</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Item Cost
              <input
                type="number"
                step="0.01"
                value={payload.item_cost}
                onChange={(e) => setPayload((p) => ({ ...p, item_cost: Number(e.target.value) }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Marketplace
              <input
                value={payload.marketplace}
                onChange={(e) => setPayload((p) => ({ ...p, marketplace: e.target.value }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Category
              <input
                value={payload.category}
                onChange={(e) => setPayload((p) => ({ ...p, category: e.target.value }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Weight (lb)
              <input
                type="number"
                step="0.01"
                value={payload.dims.weight_lb}
                onChange={(e) => setPayload((p) => ({ ...p, dims: { ...p.dims, weight_lb: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Length (in)
              <input
                type="number"
                step="0.01"
                value={payload.dims.length_in}
                onChange={(e) => setPayload((p) => ({ ...p, dims: { ...p.dims, length_in: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Width (in)
              <input
                type="number"
                step="0.01"
                value={payload.dims.width_in}
                onChange={(e) => setPayload((p) => ({ ...p, dims: { ...p.dims, width_in: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Height (in)
              <input
                type="number"
                step="0.01"
                value={payload.dims.height_in}
                onChange={(e) => setPayload((p) => ({ ...p, dims: { ...p.dims, height_in: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Dropship Fee
              <input
                type="number"
                step="0.01"
                value={payload.supplier_fees.dropship_fee}
                onChange={(e) => setPayload((p) => ({ ...p, supplier_fees: { ...p.supplier_fees, dropship_fee: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Handling
              <input
                type="number"
                step="0.01"
                value={payload.supplier_fees.handling_fee}
                onChange={(e) => setPayload((p) => ({ ...p, supplier_fees: { ...p.supplier_fees, handling_fee: Number(e.target.value) } }))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>

            <label>
              Misc Fees (comma separated)
              <input
                value={(payload.supplier_fees.misc_fees || []).join(",")}
                onChange={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((x) => Number(x))
                    .filter((x) => !Number.isNaN(x));
                  setPayload((p) => ({ ...p, supplier_fees: { ...p.supplier_fees, misc_fees: parts } }));
                }}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
              />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={runPreview}
              disabled={previewing}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: previewing ? "#f5f5f5" : "white",
                cursor: previewing ? "not-allowed" : "pointer",
              }}
            >
              {previewing ? "Previewing..." : "Preview Pricing"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Results</h3>

        {!costBreakdown ? (
          <div style={{ color: "#666" }}>Run a preview to see output.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div><b>Sell Price</b><div>${Number(costBreakdown.sell_price ?? 0).toFixed(2)}</div></div>
            <div><b>Min Price</b><div>${Number(costBreakdown.min_price ?? 0).toFixed(2)}</div></div>
            <div><b>Max Price</b><div>${Number(costBreakdown.max_price ?? 0).toFixed(2)}</div></div>
            <div><b>ROI %</b><div>{Number(costBreakdown.roi_percent ?? 0).toFixed(2)}%</div></div>

            <div><b>ROI Cost</b><div>${Number(costBreakdown.roi_cost ?? 0).toFixed(2)}</div></div>
            <div><b>Total Cost</b><div>${Number(costBreakdown.total_cost ?? 0).toFixed(2)}</div></div>
            <div><b>Calc Shipping</b><div>${Number(costBreakdown.calculated_shipping ?? 0).toFixed(2)}</div></div>
            <div><b>Mkt Fee</b><div>${Number(costBreakdown.marketplace_fee ?? 0).toFixed(2)}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
      {/* EC_HARD_COSTS_START */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginTop: 16, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>Hard Costs (per item)</h3>
            <div style={{ color: "#6b7280", marginTop: 4 }}>
              Dropship + Handling + Misc + Shipping rule inputs + optional Marketplace fee override.
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                // @ts-ignore
                const supplierKey = (selectedSupplierKey || selectedSupplier?.key || "KMC");
                const payload = { supplier_key: supplierKey, hard_costs: hardCosts };
                const res = await apiPut("/api/pricing/config", payload);
                setHardCosts(res?.hard_costs || hardCosts);
                setHardCostsMsg("Saved âœ…");
                setTimeout(() => setHardCostsMsg(""), 1500);
              } catch (e: any) {
                setHardCostsMsg("Save failed: " + (e?.message || "unknown"));
              }
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #111827",
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Save Hard Costs
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          {[
            { k: "dropship_fee", label: "Dropship Fee ($)" },
            { k: "handling_fee", label: "Handling ($)" },
            { k: "misc_fee", label: "Misc Fee ($)" },
            { k: "marketplace_fee_pct_override", label: "Marketplace Fee Override (%)" },
            { k: "shipping_base", label: "Shipping Base ($)" },
            { k: "shipping_per_lb", label: "Shipping $ / lb" },
            { k: "dim_divisor", label: "Dim Divisor" }
          ].map((f: any) => (
            <div key={f.k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "#374151" }}>{f.label}</label>
              <input
                type="number"
                step="0.01"
                value={(hardCosts as any)?.[f.k] ?? 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setHardCosts((prev: any) => ({ ...(prev || {}), [f.k]: isNaN(v) ? 0 : v }));
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  outline: "none",
                  fontSize: 14
                }}
              />
            </div>
          ))}
        </div>

        {hardCostsMsg ? (
          <div style={{ marginTop: 10, color: hardCostsMsg.startsWith("Save failed") ? "#b91c1c" : "#065f46" }}>
            {hardCostsMsg}
          </div>
        ) : null}
      </div>
      {/* EC_HARD_COSTS_END */}
