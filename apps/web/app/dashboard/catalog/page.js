"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../../../lib/useWorkspace";
import Sidebar from "../../../components/ui/Sidebar";
import Topbar from "../../../components/ui/Topbar";

// ─── Quote-aware CSV parser ───────────────────────────────────────────────────
// Handles UTF-8 BOM, Windows CRLF, and quoted fields containing commas.
// Does not support quoted fields with embedded newlines (rare in price sheets).
function parseCSV(rawText) {
  const text = rawText
    .replace(/^﻿/, "")       // strip UTF-8 BOM
    .replace(/\r\n/g, "\n")       // normalize Windows line endings
    .replace(/\r/g, "\n");

  function splitLine(line) {
    const fields = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return null; // need at least header + 1 data row
  return {
    headers: splitLine(lines[0]),
    rows:    lines.slice(1).map(splitLine),
  };
}

// ─── Normalized catalog field definitions ────────────────────────────────────
const CATALOG_FIELDS = [
  { key: "supplier_sku", label: "Supplier SKU / Item ID", required: true  },
  { key: "title",        label: "Title / Description",    required: true  },
  { key: "item_cost",    label: "Item Cost",              required: true  },
  { key: "upc",          label: "UPC / Barcode",          required: false },
  { key: "map_price",    label: "MAP Price",              required: false },
  { key: "weight",       label: "Weight (lbs)",           required: false },
  { key: "length",       label: "Length (in)",            required: false },
  { key: "width",        label: "Width (in)",             required: false },
  { key: "height",       label: "Height (in)",            required: false },
  { key: "quantity",     label: "Quantity Available",     required: false },
  { key: "brand",        label: "Brand",                  required: false },
  { key: "category",     label: "Category",               required: false },
  { key: "image_url",    label: "Image URL",              required: false },
];

const REQUIRED_KEYS = CATALOG_FIELDS.filter((f) => f.required).map((f) => f.key);

// ─── Auto-match: common header synonyms per target field ─────────────────────
const SYNONYMS = {
  supplier_sku: ["sku", "item #", "item#", "item id", "itemid", "item number",
                 "supplier sku", "supplier_sku", "part #", "part number", "part no"],
  upc:          ["upc", "barcode", "gtin", "ean", "upc code", "upc/ean"],
  title:        ["description", "title", "product name", "name", "item description",
                 "product title", "product description", "item name"],
  item_cost:    ["cost", "our price", "dealer price", "price", "unit cost",
                 "wholesale price", "dealer cost", "item cost", "cost price", "net price"],
  map_price:    ["map", "map price", "min advertised", "minimum advertised price",
                 "min advertised price", "min price"],
  weight:       ["weight", "weight lb", "weight lbs", "wt", "wt lb", "wt lbs",
                 "weight (lbs)", "weight(lbs)", "ship weight"],
  length:       ["l", "length", "length in", "length (in)", "length(in)", "dim l", "prod length"],
  width:        ["w", "width", "width in", "width (in)", "width(in)", "dim w", "prod width"],
  height:       ["h", "height", "height in", "height (in)", "height(in)", "dim h", "prod height"],
  quantity:     ["qty", "quantity", "stock", "qty available", "quantity available",
                 "inventory", "on hand", "qty on hand", "available qty"],
  brand:        ["brand", "manufacturer", "mfr", "brand name", "make"],
  category:     ["category", "class", "dept", "department", "product category",
                 "product class", "cat"],
  image_url:    ["image", "image url", "photo", "image link", "picture",
                 "img url", "photo url", "img"],
};

function autoMatchHeaders(headers) {
  const map = {};
  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    for (const [field, syns] of Object.entries(SYNONYMS)) {
      if (!map[field] && syns.includes(lower)) {
        map[field] = h;
        break;
      }
    }
  });
  return map;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
// Mapping config only — CSV row data is never stored.
function loadSavedSuppliers() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ec_suppliers_v1");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadSavedMapping(supplierId) {
  try {
    const raw = localStorage.getItem("ec_catalog_mapping_v1");
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved.supplier_id === supplierId ? saved : null;
  } catch { return null; }
}

function persistMapping(supplier, filename, colMap) {
  try {
    localStorage.setItem("ec_catalog_mapping_v1", JSON.stringify({
      supplier_id:   supplier.id || supplier.name,
      supplier_name: supplier.name,
      filename,
      column_map:    colMap,
    }));
  } catch {}
}

// ─── Row warning logic ────────────────────────────────────────────────────────
function getRowWarnings(rowArr, headers, colMap) {
  function val(key) {
    const h = colMap[key];
    if (!h) return "";
    const i = headers.indexOf(h);
    return i >= 0 ? (rowArr[i] ?? "").trim() : "";
  }
  const warnings = [];
  const sku    = val("supplier_sku");
  const cost   = val("item_cost");
  const weight = val("weight");
  const upc    = val("upc");

  if (!sku)                                         warnings.push({ label: "Missing SKU",  sev: "danger"  });
  if (!cost)                                        warnings.push({ label: "No cost",       sev: "danger"  });
  else if (isNaN(parseFloat(cost)))                 warnings.push({ label: "Invalid cost",  sev: "danger"  });
  if (colMap.weight && (!weight || parseFloat(weight) <= 0))
                                                    warnings.push({ label: "No weight",     sev: "caution" });
  if (colMap.upc && upc && !/^\d{12,13}$/.test(upc.replace(/\D/g, "")))
                                                    warnings.push({ label: "Check UPC",     sev: "caution" });
  return warnings;
}

// ─── Shared style atoms ───────────────────────────────────────────────────────
const cardStyle = {
  border:       "1px solid var(--ec-border)",
  borderRadius: "var(--ec-radius)",
  background:   "var(--ec-surface)",
  boxShadow:    "var(--ec-shadow-sm)",
};

const inputStyle = {
  width:        "100%",
  padding:      "8px 11px",
  borderRadius: "var(--ec-radius-xs)",
  border:       "1px solid var(--ec-border)",
  background:   "var(--ec-surface)",
  color:        "var(--ec-text)",
  fontSize:     13,
  outline:      "none",
  boxSizing:    "border-box",
};

const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

const thStyle = {
  textAlign:      "left",
  padding:        "0 12px 8px 0",
  fontSize:       10,
  fontWeight:     700,
  textTransform:  "uppercase",
  letterSpacing:  "0.08em",
  color:          "var(--ec-text-muted)",
  whiteSpace:     "nowrap",
};

const tdStyle = {
  padding:    "8px 12px 8px 0",
  color:      "var(--ec-text)",
  fontSize:   12,
  verticalAlign: "top",
};

// ─── Reusable button components ───────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      "9px 18px",
        borderRadius: "var(--ec-radius-sm)",
        border:       "none",
        background:   disabled ? "var(--ec-border-light)" : "#111827",
        color:        disabled ? "var(--ec-text-subtle)"  : "#fff",
        fontSize:     13,
        fontWeight:   600,
        cursor:       disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      "9px 16px",
        borderRadius: "var(--ec-radius-sm)",
        border:       "1px solid var(--ec-border)",
        background:   "var(--ec-surface)",
        color:        "var(--ec-text-muted)",
        fontSize:     13,
        cursor:       "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Step progress indicator ─────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ["Supplier", "CSV", "Mapping", "Preview"];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const n       = i + 1;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width:      28,
                height:     28,
                borderRadius: "50%",
                background: done   ? "var(--ec-success)"      :
                            active ? "#111827"                  :
                                     "var(--ec-border-light)",
                color:      (done || active) ? "#fff" : "var(--ec-text-subtle)",
                display:     "flex",
                alignItems:  "center",
                justifyContent: "center",
                fontSize:    12,
                fontWeight:  700,
                flexShrink:  0,
              }}>
                {done ? "✓" : n}
              </div>
              <div style={{
                fontSize:      10,
                fontWeight:    600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: active ? "var(--ec-text)" :
                       done   ? "var(--ec-success)" :
                                "var(--ec-text-subtle)",
                whiteSpace: "nowrap",
              }}>
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width:      40,
                height:     1,
                background: n < current ? "var(--ec-success)" : "var(--ec-border)",
                margin:     "0 6px",
                marginBottom: 20,
                flexShrink:  0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Completed step summary bar ───────────────────────────────────────────────
function CompletedStep({ stepNum, title, summary, onChange }) {
  return (
    <div style={{
      ...cardStyle,
      padding:        "10px 16px",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width:          22,
          height:         22,
          borderRadius:   "50%",
          background:     "var(--ec-success)",
          color:          "#fff",
          fontSize:       11,
          fontWeight:     700,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}>
          ✓
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ec-text-muted)", marginRight: 8 }}>
            Step {stepNum}: {title}
          </span>
          <span style={{ fontSize: 13, color: "var(--ec-text)" }}>{summary}</span>
        </div>
      </div>
      <button
        onClick={onChange}
        style={{
          background:     "none",
          border:         "none",
          color:          "var(--ec-text-muted)",
          fontSize:       12,
          cursor:         "pointer",
          textDecoration: "underline",
          flexShrink:     0,
        }}
      >
        Change
      </button>
    </div>
  );
}

// ─── Active step card wrapper ─────────────────────────────────────────────────
function StepCard({ stepNum, title, children }) {
  return (
    <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 8 }}>
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        color:         "var(--ec-text-subtle)",
        marginBottom:  4,
      }}>
        Step {stepNum}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ec-text)", marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Warning badge chip ───────────────────────────────────────────────────────
function WarnChip({ label, sev }) {
  const c = sev === "danger"
    ? { bg: "var(--ec-danger-bg)",  color: "var(--ec-danger)"  }
    : { bg: "var(--ec-caution-bg)", color: "var(--ec-caution)" };
  return (
    <span style={{
      padding:    "1px 7px",
      borderRadius: 999,
      fontSize:   10,
      fontWeight: 600,
      background: c.bg,
      color:      c.color,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const { workspace, profile, saving, createWorkspace, setActiveWorkspace } = useWorkspace();
  const fileInputRef = useRef(null);

  // Wizard state
  const [step,             setStep]             = useState(1);
  const [suppliers,        setSuppliers]        = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // { id?, name }
  const [manualName,       setManualName]       = useState("");
  const [csvData,          setCsvData]          = useState(null); // { name, headers, rows }
  const [parseError,       setParseError]       = useState(null);
  const [isDragOver,       setIsDragOver]       = useState(false);
  const [columnMap,        setColumnMap]        = useState({});
  const [restoredNotice,   setRestoredNotice]   = useState(false);

  // Hydrate supplier list from Supplier Directory (read-only)
  useEffect(() => { setSuppliers(loadSavedSuppliers()); }, []);

  // ── Step 1: Confirm supplier ────────────────────────────────────────────────
  function handleSupplierContinue() {
    const name = (selectedSupplier?.name || manualName).trim();
    if (!name) return;
    const supplier = selectedSupplier || { id: null, name };
    const suppId   = supplier.id || supplier.name;

    // Restore any previously saved column mapping for this supplier
    const saved = loadSavedMapping(suppId);
    if (saved?.column_map && Object.keys(saved.column_map).length > 0) {
      setColumnMap(saved.column_map);
      setRestoredNotice(true);
    } else {
      setColumnMap({});
      setRestoredNotice(false);
    }

    setSelectedSupplier(supplier);
    setStep(2);
  }

  // ── Step 2: Read and parse CSV ──────────────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please select a .csv file.");
      return;
    }
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result);
      if (!result || result.headers.length === 0) {
        setParseError("Could not parse CSV. Check the file format and try again.");
        return;
      }
      if (result.rows.length === 0) {
        setParseError("The file has column headers but no data rows.");
        return;
      }
      // Merge: auto-match fills gaps; any valid previously-saved/restored values take priority
      const autoMap = autoMatchHeaders(result.headers);
      setColumnMap((prev) => {
        const validSet  = new Set(result.headers);
        const validPrev = {};
        Object.entries(prev).forEach(([k, v]) => { if (v && validSet.has(v)) validPrev[k] = v; });
        return { ...autoMap, ...validPrev };
      });
      setCsvData({ name: file.name, headers: result.headers, rows: result.rows });
      setStep(3);
    };
    reader.onerror = () => setParseError("Failed to read the file.");
    reader.readAsText(file); // browser-only, no network request
  }

  function handleFileInput(e)  { handleFile(e.target.files?.[0]); }
  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  // ── Step 3: Update column map ───────────────────────────────────────────────
  function handleMappingChange(fieldKey, headerValue) {
    setColumnMap((prev) => {
      const next = { ...prev };
      if (headerValue) next[fieldKey] = headerValue;
      else delete next[fieldKey];
      return next;
    });
  }

  function handleConfirmMapping() {
    if (!canPreview) return;
    persistMapping(selectedSupplier, csvData.name, columnMap);
    setRestoredNotice(false);
    setStep(4);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function startOver() {
    setStep(1);
    setSelectedSupplier(null);
    setManualName("");
    setCsvData(null);
    setColumnMap({});
    setParseError(null);
    setRestoredNotice(false);
  }

  function changeSupplier() {
    setStep(1);
    setCsvData(null);
    setColumnMap({});
    setRestoredNotice(false);
    // selectedSupplier kept so dropdown pre-selects current value
  }

  function changeCsv() {
    setStep(2);
    // columnMap kept — will be re-merged with auto-match on new upload
  }

  function editMapping() { setStep(3); }

  // ── Derived values ──────────────────────────────────────────────────────────
  const canPreview     = REQUIRED_KEYS.every((k) => columnMap[k]);
  const supplierLabel  = selectedSupplier?.name || "";
  const totalRows      = csvData?.rows.length ?? 0;
  const mappedFields   = CATALOG_FIELDS.filter((f) => columnMap[f.key]);
  const mappedCount    = mappedFields.length;
  const previewRows    = csvData?.rows.slice(0, 20) ?? [];

  // Warning summary — counted over all rows at step 4
  const warnSummary = (() => {
    if (!csvData || step !== 4) return { sku: 0, cost: 0, weight: 0 };
    let sku = 0, cost = 0, weight = 0;
    for (const row of csvData.rows) {
      const w = getRowWarnings(row, csvData.headers, columnMap);
      if (w.some((x) => x.label === "Missing SKU"))                           sku++;
      if (w.some((x) => x.label === "No cost" || x.label === "Invalid cost")) cost++;
      if (w.some((x) => x.label === "No weight"))                             weight++;
    }
    return { sku, cost, weight };
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ec-bg)" }}>
      <Sidebar
        workspace={workspace}
        profile={profile}
        createWorkspace={createWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        saving={saving}
      />

      <div style={{ flex: 1, padding: "16px 24px 60px", minWidth: 0, overflowX: "hidden" }}>
        <Topbar />

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div style={{
          marginTop:  20,
          marginBottom: 24,
          display:    "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap:        16,
          flexWrap:   "wrap",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ec-text)", letterSpacing: "-0.01em" }}>
              Catalog Imports
            </div>
            <div style={{ fontSize: 13, color: "var(--ec-text-muted)", marginTop: 3 }}>
              Upload a supplier CSV and map its columns to catalog fields.
            </div>
          </div>
          {step > 1 && (
            <SecondaryBtn onClick={startOver}>↺ Start Over</SecondaryBtn>
          )}
        </div>

        {/* ── Step progress indicator ───────────────────────────────────── */}
        <StepIndicator current={step} />

        {/* ══ STEP 1: Choose Supplier ══════════════════════════════════════ */}

        {/* Completed summary */}
        {step > 1 && (
          <CompletedStep stepNum={1} title="Supplier" summary={supplierLabel} onChange={changeSupplier} />
        )}

        {/* Active card */}
        {step === 1 && (
          <StepCard stepNum={1} title="Choose Supplier">
            {suppliers.length > 0 ? (
              <div style={{ maxWidth: 380 }}>
                <label style={{
                  display:       "block",
                  fontSize:      11,
                  fontWeight:    600,
                  color:         "var(--ec-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom:  6,
                }}>
                  Supplier
                </label>
                <select
                  value={selectedSupplier ? (selectedSupplier.id || selectedSupplier.name) : ""}
                  onChange={(e) => {
                    const found = suppliers.find((s) => (s.id || s.name) === e.target.value) || null;
                    setSelectedSupplier(found);
                  }}
                  style={selectStyle}
                >
                  <option value="">— Choose supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ maxWidth: 380 }}>
                <div style={{ fontSize: 12, color: "var(--ec-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                  No suppliers saved yet. Enter a name to continue, or{" "}
                  <a href="/dashboard/suppliers" style={{ color: "var(--ec-text)", textDecoration: "underline" }}>
                    add one in Supplier Directory
                  </a>.
                </div>
                <label style={{
                  display:       "block",
                  fontSize:      11,
                  fontWeight:    600,
                  color:         "var(--ec-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom:  6,
                }}>
                  Supplier Name
                </label>
                <input
                  autoFocus
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSupplierContinue(); }}
                  placeholder="e.g. KMC Music"
                  style={inputStyle}
                />
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <PrimaryBtn
                onClick={handleSupplierContinue}
                disabled={!selectedSupplier && !manualName.trim()}
              >
                Continue →
              </PrimaryBtn>
            </div>
          </StepCard>
        )}

        {/* ══ STEP 2: Upload CSV ════════════════════════════════════════════ */}

        {step > 2 && (
          <CompletedStep
            stepNum={2}
            title="CSV File"
            summary={`${csvData?.name} · ${totalRows.toLocaleString()} rows · ${csvData?.headers.length} columns`}
            onChange={changeCsv}
          />
        )}

        {step === 2 && (
          <StepCard stepNum={2} title="Upload CSV">
            {/* Restored mapping notice */}
            {restoredNotice && (
              <div style={{
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                marginBottom: 14,
                padding:      "9px 12px",
                borderRadius: "var(--ec-radius-xs)",
                background:   "var(--ec-success-bg)",
                border:       "1px solid rgba(5,150,105,0.2)",
                fontSize:     12,
                color:        "var(--ec-success-text)",
              }}>
                <span>✓ Restored previous column mapping for {supplierLabel}. Upload the file to confirm.</span>
                <button
                  onClick={() => setRestoredNotice(false)}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                    color:      "var(--ec-success-text)",
                    fontSize:   16,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                border:       `2px dashed ${isDragOver ? "#111827" : "var(--ec-border)"}`,
                borderRadius: "var(--ec-radius)",
                padding:      "44px 32px",
                textAlign:    "center",
                cursor:       "pointer",
                background:   isDragOver ? "var(--ec-border-light)" : "var(--ec-bg)",
                transition:   "border-color 0.15s, background 0.15s",
                maxWidth:     480,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ec-text)", marginBottom: 4 }}>
                Drop a CSV file here, or click to browse
              </div>
              <div style={{ fontSize: 12, color: "var(--ec-text-muted)" }}>
                .csv files only · browser-only · no upload
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />

            {parseError && (
              <div style={{
                marginTop:    12,
                padding:      "9px 12px",
                borderRadius: "var(--ec-radius-xs)",
                background:   "var(--ec-danger-bg)",
                border:       "1px solid rgba(220,38,38,0.2)",
                fontSize:     13,
                color:        "var(--ec-danger)",
              }}>
                {parseError}
              </div>
            )}
          </StepCard>
        )}

        {/* ══ STEP 3: Map Columns ═══════════════════════════════════════════ */}

        {step > 3 && (
          <CompletedStep
            stepNum={3}
            title="Column Mapping"
            summary={`${mappedCount} of ${CATALOG_FIELDS.length} fields mapped`}
            onChange={editMapping}
          />
        )}

        {step === 3 && csvData && (
          <StepCard stepNum={3} title="Map Columns">
            <div style={{ fontSize: 12, color: "var(--ec-text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Match each catalog field to a column in <strong>{csvData.name}</strong>.{" "}
              Fields marked <span style={{ color: "var(--ec-danger)", fontWeight: 700 }}>*</span> are
              required to enable preview.
              {restoredNotice && (
                <span style={{ marginLeft: 8, color: "var(--ec-success-text)", fontWeight: 600 }}>
                  ✓ Previous mapping restored.
                </span>
              )}
            </div>

            {/* Field-to-column mapper */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560, marginBottom: 20 }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 8, paddingBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ec-text-subtle)" }}>
                  Catalog Field
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ec-text-subtle)" }}>
                  CSV Column
                </div>
              </div>

              {/* One row per field */}
              {CATALOG_FIELDS.map((field) => (
                <div
                  key={field.key}
                  style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 8, alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--ec-text)" }}>
                    {field.label}
                    {field.required && (
                      <span style={{ color: "var(--ec-danger)", fontSize: 11, fontWeight: 700 }}>*</span>
                    )}
                  </div>
                  <select
                    value={columnMap[field.key] || ""}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    style={{
                      ...selectStyle,
                      borderColor: field.required && !columnMap[field.key]
                        ? "rgba(217,119,6,0.6)"
                        : "var(--ec-border)",
                    }}
                  >
                    <option value="">— not mapped —</option>
                    {csvData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Required fields warning */}
            {!canPreview && (
              <div style={{
                marginBottom: 14,
                padding:      "9px 12px",
                borderRadius: "var(--ec-radius-xs)",
                background:   "var(--ec-caution-bg)",
                border:       "1px solid rgba(217,119,6,0.2)",
                fontSize:     12,
                color:        "var(--ec-caution)",
              }}>
                Map all required fields (*) to enable preview.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <PrimaryBtn onClick={handleConfirmMapping} disabled={!canPreview}>
                Preview Mapped Rows →
              </PrimaryBtn>
              <SecondaryBtn onClick={changeCsv}>← Change File</SecondaryBtn>
            </div>
          </StepCard>
        )}

        {/* ══ STEP 4: Preview ═══════════════════════════════════════════════ */}

        {step === 4 && csvData && (
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={{
              fontSize:      10,
              fontWeight:    700,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              color:         "var(--ec-text-subtle)",
              marginBottom:  4,
            }}>
              Step 4
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ec-text)", marginBottom: 14 }}>
              Preview Mapped Rows
            </div>

            {/* Warning summary strip */}
            {(warnSummary.cost > 0 || warnSummary.sku > 0 || warnSummary.weight > 0) && (
              <div style={{
                display:      "flex",
                flexWrap:     "wrap",
                alignItems:   "center",
                gap:          10,
                marginBottom: 14,
                padding:      "10px 14px",
                borderRadius: "var(--ec-radius-xs)",
                background:   "var(--ec-caution-bg)",
                border:       "1px solid rgba(217,119,6,0.2)",
                fontSize:     12,
                color:        "var(--ec-caution)",
              }}>
                {warnSummary.cost   > 0 && <span>⚠ {warnSummary.cost.toLocaleString()}   rows missing or invalid cost</span>}
                {warnSummary.cost   > 0 && warnSummary.sku    > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                {warnSummary.sku    > 0 && <span>⚠ {warnSummary.sku.toLocaleString()}    rows missing SKU</span>}
                {warnSummary.sku    > 0 && warnSummary.weight > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                {warnSummary.weight > 0 && <span>⚠ {warnSummary.weight.toLocaleString()} rows missing weight</span>}
              </div>
            )}

            {/* Row count */}
            <div style={{ fontSize: 12, color: "var(--ec-text-muted)", marginBottom: 12 }}>
              Showing first {Math.min(20, totalRows).toLocaleString()} of {totalRows.toLocaleString()} rows
              {" · "}{mappedCount} of {CATALOG_FIELDS.length} fields mapped
            </div>

            {/* Preview table */}
            <div style={{ overflowX: "auto", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 32 }}>#</th>
                    {mappedFields.map((f) => (
                      <th key={f.key} style={thStyle}>{f.label}</th>
                    ))}
                    <th style={thStyle}>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    const warnings = getRowWarnings(row, csvData.headers, columnMap);
                    return (
                      <tr
                        key={i}
                        style={{
                          borderTop:  "1px solid var(--ec-border)",
                          background: warnings.some((w) => w.sev === "danger")
                            ? "rgba(220,38,38,0.025)"
                            : "transparent",
                        }}
                      >
                        <td style={{ ...tdStyle, color: "var(--ec-text-subtle)" }}>{i + 1}</td>
                        {mappedFields.map((f) => {
                          const hdr = columnMap[f.key];
                          const idx = csvData.headers.indexOf(hdr);
                          const v   = idx >= 0 ? (row[idx] ?? "").trim() : "";
                          return (
                            <td
                              key={f.key}
                              style={{
                                ...tdStyle,
                                maxWidth:     160,
                                overflow:     "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace:   "nowrap",
                              }}
                              title={v}
                            >
                              {v || <span style={{ color: "var(--ec-text-subtle)" }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {warnings.length === 0
                              ? <span style={{ color: "var(--ec-text-subtle)", fontSize: 10 }}>—</span>
                              : warnings.map((w) => (
                                  <WarnChip key={w.label} label={w.label} sev={w.sev} />
                                ))
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryBtn onClick={editMapping}>← Edit Mapping</SecondaryBtn>
              <SecondaryBtn onClick={startOver}>↺ Start Over</SecondaryBtn>
            </div>

            {/* Phase note */}
            <div style={{
              marginTop:    16,
              padding:      "10px 14px",
              borderRadius: "var(--ec-radius-sm)",
              border:       "1px solid var(--ec-border-light)",
              background:   "var(--ec-bg)",
              fontSize:     12,
              color:        "var(--ec-text-subtle)",
              lineHeight:   1.5,
            }}>
              Phase 4B — Preview only. Pricing calculation and Amazon pricing rules arrive in Phase 4C.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
