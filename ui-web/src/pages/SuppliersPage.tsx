import React, { useEffect, useMemo, useState } from "react";

type SupplierSlim = { id: string; key: string; name: string; location: string };

type SupplierFull = {
  id: string;
  key: string;
  name: string;
  location: string;
  notes?: string;
  fees?: { handling: number; dropship: number; misc: number };
  margins?: { minGross: number; maxGross: number };
  mapping?: { sku: string; cost: string; name?: string; brand?: string };
  lastFeed?: { filename: string; storedPath: string; uploadedAt: string };
};

type PricingRow = {
  sku: string;
  name: string;
  brand: string;
  cost: number;
  landed: number;
  minGrossPct: number;
  maxGrossPct: number;
  targetGrossPct: number;
  targetPrice: number;
  minPrice: number;
  maxPrice: number;
};

const STUB_BASE = "";
const money = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";

function guessHeader(headers: string[], kind: "sku" | "cost" | "name" | "brand") {
  const norm = (s: string) => s.trim().toLowerCase();

  const h = headers.map((x) => ({ raw: x, n: norm(x) }));

  const pick = (pred: (n: string) => boolean) => h.find((x) => pred(x.n))?.raw ?? "";

  if (kind === "sku") {
    return (
      pick((n) => n === "sku") ||
      pick((n) => n.includes("sku")) ||
      pick((n) => n.includes("item") && n.includes("sku")) ||
      pick((n) => n.includes("product") && n.includes("sku")) ||
      ""
    );
  }

  if (kind === "cost") {
    return (
      pick((n) => n === "cost") ||
      pick((n) => n.includes("cost")) ||
      pick((n) => n.includes("wholesale")) ||
      pick((n) => n.includes("dealer")) ||
      pick((n) => n.includes("net")) ||
      ""
    );
  }

  if (kind === "name") {
    return pick((n) => n === "name") || pick((n) => n.includes("product") && n.includes("name")) || pick((n) => n.includes("title")) || "";
  }

  if (kind === "brand") {
    return pick((n) => n === "brand") || pick((n) => n.includes("manufacturer")) || "";
  }

  return "";
}

export default function SuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierSlim[]>([]);
  const [error, setError] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string>("");
  const [supplier, setSupplier] = useState<SupplierFull | null>(null);

  const [editMode, setEditMode] = useState(false);

  // CSV upload result
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string>("");

  // Pricing preview
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<string>("");
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);

  // form state
  const [form, setForm] = useState<SupplierFull | null>(null);

  async function fetchSuppliers() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${STUB_BASE}/api/suppliers`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as SupplierSlim[];
      setSuppliers(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (e: any) {
      setError(`Failed to load suppliers from ${STUB_BASE}/api/suppliers`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSupplier(id: string) {
    setSupplier(null);
    setEditMode(false);
    setCsvHeaders([]);
    setCsvPreview([]);
    setUploadMsg("");
    setPreviewMsg("");
    setPricingRows([]);
    try {
      const r = await fetch(`${STUB_BASE}/api/suppliers/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as SupplierFull;
      setSupplier(data);
      setForm(data);
    } catch (e: any) {
      setError(`Failed to load supplier ${id} from ${STUB_BASE}/api/suppliers/${id}`);
    }
  }

  async function fetchPricingPreview(id: string) {
    setPreviewBusy(true);
    setPreviewMsg("");
    try {
      const r = await fetch(`${STUB_BASE}/api/suppliers/${encodeURIComponent(id)}/pricing-preview?limit=25`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const rows = (data.rows || []) as PricingRow[];
      setPricingRows(rows);
      setPreviewMsg(data.message || (rows.length ? "" : "No rows returned."));
    } catch {
      setPreviewMsg("Failed to load pricing preview.");
      setPricingRows([]);
    } finally {
      setPreviewBusy(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) fetchSupplier(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (supplier?.id) fetchPricingPreview(supplier.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier?.id]);

  const canPreview = useMemo(() => {
    const m = supplier?.mapping;
    return Boolean(supplier?.lastFeed?.storedPath && m?.sku && m?.cost);
  }, [supplier]);

  const formFees = form?.fees ?? { handling: 0, dropship: 0, misc: 0 };
  const formMargins = form?.margins ?? { minGross: 22, maxGross: 45 };
  const formMapping = form?.mapping ?? { sku: "", cost: "", name: "", brand: "" };

  function setFormField<K extends keyof SupplierFull>(k: K, v: SupplierFull[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  function setFeesField(k: "handling" | "dropship" | "misc", v: string) {
    const n = Number(v);
    setForm((prev) => {
      if (!prev) return prev;
      const fees = { ...(prev.fees ?? { handling: 0, dropship: 0, misc: 0 }), [k]: Number.isFinite(n) ? n : 0 };
      return { ...prev, fees };
    });
  }

  function setMarginsField(k: "minGross" | "maxGross", v: string) {
    const n = Number(v);
    setForm((prev) => {
      if (!prev) return prev;
      const margins = { ...(prev.margins ?? { minGross: 22, maxGross: 45 }), [k]: Number.isFinite(n) ? n : 0 };
      return { ...prev, margins };
    });
  }

  function setMappingField(k: "sku" | "cost" | "name" | "brand", v: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const mapping = { ...(prev.mapping ?? { sku: "", cost: "", name: "", brand: "" }), [k]: v };
      return { ...prev, mapping };
    });
  }

  async function onUploadCsv(file: File) {
    if (!supplier?.id) return;
    setUploadBusy(true);
    setUploadMsg("");
    setCsvHeaders([]);
    setCsvPreview([]);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch(`${STUB_BASE}/api/suppliers/${encodeURIComponent(supplier.id)}/feed`, {
        method: "POST",
        body: fd
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setCsvHeaders(data.headers || []);
      setCsvPreview(data.preview || []);
      setUploadMsg("Upload OK. Now map the columns and click Save.");

      // Auto-guess mapping if empty
      setForm((prev) => {
        if (!prev) return prev;
        const headers = (data.headers || []) as string[];

        const prevMap = prev.mapping ?? { sku: "", cost: "", name: "", brand: "" };
        const nextMap = { ...prevMap };

        if (!nextMap.sku) nextMap.sku = guessHeader(headers, "sku");
        if (!nextMap.cost) nextMap.cost = guessHeader(headers, "cost");
        if (!nextMap.name) nextMap.name = guessHeader(headers, "name");
        if (!nextMap.brand) nextMap.brand = guessHeader(headers, "brand");

        return { ...prev, mapping: nextMap };
      });

      // refresh supplier (so lastFeed shows)
      await fetchSupplier(supplier.id);
    } catch (e: any) {
      setUploadMsg(`Upload failed: ${e?.message || "unknown error"}`);
    } finally {
      setUploadBusy(false);
    }
  }

  async function onSave() {
    if (!form?.id) return;
    setUploadMsg("");
    try {
      // basic validation
      const minG = Number(form.margins?.minGross ?? 0);
      const maxG = Number(form.margins?.maxGross ?? 0);

      if (!Number.isFinite(minG) || minG < 0 || minG > 99) {
        setUploadMsg("Min gross margin must be between 0 and 99.");
        return;
      }
      if (!Number.isFinite(maxG) || maxG < 0 || maxG > 99) {
        setUploadMsg("Max gross margin must be between 0 and 99.");
        return;
      }
      if (maxG < minG) {
        setUploadMsg("Max gross margin must be >= Min gross margin.");
        return;
      }

      if (!form.mapping?.sku || !form.mapping?.cost) {
        setUploadMsg("Mapping required: select SKU and Cost columns.");
        return;
      }

      const r = await fetch(`${STUB_BASE}/api/suppliers/${encodeURIComponent(form.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          key: form.key,
          location: form.location,
          notes: form.notes || "",
          fees: form.fees,
          margins: form.margins,
          mapping: form.mapping
        })
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setUploadMsg("Saved.");
      setEditMode(false);
      await fetchSupplier(form.id);
      await fetchPricingPreview(form.id);
    } catch (e: any) {
      setUploadMsg(`Save failed: ${e?.message || "unknown error"}`);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Suppliers</h2>
        <div>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Suppliers</h2>
        <div style={{ padding: 12, borderRadius: 12, background: "#ffecec", color: "#9b1c1c", maxWidth: 900 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Failed to load suppliers</div>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button onClick={fetchSuppliers} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #ddd" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Suppliers</h2>
          <div style={{ color: "#6b7280" }}>Manage supplier profiles, feed uploads, and pricing rules.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", minWidth: 260 }}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.key})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setEditMode((v) => !v);
              setUploadMsg("");
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              fontWeight: 700
            }}
            disabled={!supplier}
          >
            {editMode ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {!supplier ? (
        <div style={{ color: "#6b7280" }}>Select a supplier.</div>
      ) : (
        <>
          {/* Supplier card */}
          <div style={{ border: "1px solid #eef2f7", borderRadius: 16, padding: 16, background: "white", marginBottom: 14, maxWidth: 1100 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{supplier.name}</div>
                <div style={{ color: "#6b7280", marginTop: 4 }}>
                  Key: <b>{supplier.key}</b> • Location: <b>{supplier.location}</b>
                </div>
                {supplier.lastFeed?.filename ? (
                  <div style={{ color: "#6b7280", marginTop: 6 }}>
                    Last feed: <b>{supplier.lastFeed.filename}</b> • {supplier.lastFeed.uploadedAt ? new Date(supplier.lastFeed.uploadedAt).toLocaleString() : ""}
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", marginTop: 6 }}>No feed uploaded yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Edit area */}
          {editMode && form && (
            <div style={{ border: "1px solid #eef2f7", borderRadius: 16, padding: 16, background: "white", marginBottom: 14, maxWidth: 1100 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Supplier Settings</div>
                  <div style={{ color: "#6b7280" }}>Fees + margin rules + CSV mapping.</div>
                </div>
                <button
                  onClick={onSave}
                  style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 800 }}
                >
                  Save
                </button>
              </div>

              {uploadMsg && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#f7f7ff", border: "1px solid #e5e7eb" }}>
                  {uploadMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Name</div>
                  <input
                    value={form.name}
                    onChange={(e) => setFormField("name", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Key</div>
                  <input
                    value={form.key}
                    onChange={(e) => setFormField("key", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Location</div>
                  <input
                    value={form.location}
                    onChange={(e) => setFormField("location", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Notes</div>
                  <input
                    value={form.notes ?? ""}
                    onChange={(e) => setFormField("notes", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, fontWeight: 800 }}>Fees (per item)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Handling fee ($)</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formFees.handling}
                    onChange={(e) => setFeesField("handling", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Dropship fee ($)</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formFees.dropship}
                    onChange={(e) => setFeesField("dropship", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Misc fee ($)</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formFees.misc}
                    onChange={(e) => setFeesField("misc", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, fontWeight: 800 }}>Gross margin rules</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Min gross margin (%)</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formMargins.minGross}
                    onChange={(e) => setMarginsField("minGross", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Max gross margin (%)</div>
                  <input
                    type="number"
                    step="0.01"
                    value={formMargins.maxGross}
                    onChange={(e) => setMarginsField("maxGross", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, fontWeight: 800 }}>Upload CSV feed</div>
              <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadCsv(f);
                  }}
                  disabled={uploadBusy}
                />
                {uploadBusy && <span style={{ color: "#6b7280" }}>Uploading…</span>}
              </div>

              {csvHeaders.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 800 }}>CSV Mapping</div>
                  <div style={{ color: "#6b7280", marginTop: 4 }}>Pick which CSV columns represent SKU and Cost (required). Name/Brand are optional.</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>SKU column (required)</div>
                      <select
                        value={formMapping.sku || ""}
                        onChange={(e) => setMappingField("sku", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                      >
                        <option value="">— select —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Cost column (required)</div>
                      <select
                        value={formMapping.cost || ""}
                        onChange={(e) => setMappingField("cost", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                      >
                        <option value="">— select —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Name column (optional)</div>
                      <select
                        value={formMapping.name || ""}
                        onChange={(e) => setMappingField("name", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                      >
                        <option value="">— none —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Brand column (optional)</div>
                      <select
                        value={formMapping.brand || ""}
                        onChange={(e) => setMappingField("brand", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                      >
                        <option value="">— none —</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {csvPreview.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: 800 }}>Preview (first 10 rows)</div>
                      <div style={{ overflowX: "auto", marginTop: 8, border: "1px solid #eef2f7", borderRadius: 12 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              {csvHeaders.slice(0, 10).map((h) => (
                                <th key={h} style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, idx) => (
                              <tr key={idx}>
                                {csvHeaders.slice(0, 10).map((h) => (
                                  <td key={h} style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6" }}>
                                    {String(row?.[h] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pricing Preview */}
          <div style={{ border: "1px solid #eef2f7", borderRadius: 16, padding: 16, background: "white", maxWidth: 1100 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Pricing Preview</div>
                <div style={{ color: "#6b7280" }}>
                  Uses: Cost + fees → landed cost, then applies gross margin rules to compute a target price range.
                </div>
              </div>

              <button
                onClick={() => supplier?.id && fetchPricingPreview(supplier.id)}
                style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #e5e7eb", background: "white", fontWeight: 700 }}
                disabled={previewBusy}
              >
                {previewBusy ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {!canPreview && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
                To generate preview: upload a CSV feed, then map SKU + Cost and click Save.
              </div>
            )}

            {previewMsg && (
              <div style={{ marginTop: 12, color: "#6b7280" }}>
                {previewMsg}
              </div>
            )}

            <div style={{ overflowX: "auto", marginTop: 12, border: "1px solid #eef2f7", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>SKU</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Name</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Brand</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Cost</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Landed</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Target</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Min</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Max</th>
                    <th style={{ textAlign: "right", padding: 10, fontSize: 12, borderBottom: "1px solid #eef2f7" }}>Target GM%</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 12, color: "#6b7280" }}>
                        No preview rows yet.
                      </td>
                    </tr>
                  ) : (
                    pricingRows.map((r) => (
                      <tr key={r.sku}>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6" }}>{r.sku}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6" }}>{r.name || "—"}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6" }}>{r.brand || "—"}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{money(r.cost)}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{money(r.landed)}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{money(r.targetPrice)}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{money(r.minPrice)}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{money(r.maxPrice)}</td>
                        <td style={{ padding: 10, fontSize: 12, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{r.targetGrossPct.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


