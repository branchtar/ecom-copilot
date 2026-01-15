# ecom_copilot_patch_supplier_pricing_and_mapping_v2.ps1
# One-shot patch: Supplier pricing settings + CSV upload + column mapping + preview
# Writes:
# - api-stub\server.cjs
# - api-stub\data\suppliers.json (if missing)
# - ui-web\src\pages\SuppliersPage.tsx (full replacement)
# - run\LAUNCH_ECOM_COPILOT.bat (fixes early-close + starts all services)
#
# Run:
#   & "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot\ps1\ecom_copilot_patch_supplier_pricing_and_mapping_v2.ps1"

$ErrorActionPreference = "Stop"

Write-Host "== Ecom Copilot patch: supplier pricing + CSV upload + mapping v2 ==" -ForegroundColor Cyan

$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$STUB = Join-Path $ROOT "api-stub"
$STUB_DATA = Join-Path $STUB "data"
$STUB_UPLOADS = Join-Path $STUB_DATA "uploads"
$UI = Join-Path $ROOT "ui-web"
$UI_PAGE = Join-Path $UI "src\pages\SuppliersPage.tsx"
$RUN = Join-Path $ROOT "run"
$BAT = Join-Path $RUN "LAUNCH_ECOM_COPILOT.bat"

if (!(Test-Path $ROOT)) { throw "ROOT not found: $ROOT" }

New-Item -ItemType Directory -Force -Path $STUB | Out-Null
New-Item -ItemType Directory -Force -Path $STUB_DATA | Out-Null
New-Item -ItemType Directory -Force -Path $STUB_UPLOADS | Out-Null
New-Item -ItemType Directory -Force -Path $RUN | Out-Null

# ------------------------------
# Ensure api-stub package.json + deps
# ------------------------------
$pkgPath = Join-Path $STUB "package.json"
if (!(Test-Path $pkgPath)) {
  Write-Host "Creating api-stub\package.json..." -ForegroundColor Yellow
  $pkg = @'
{
  "name": "ecom-copilot-api-stub",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "server.cjs",
  "scripts": {
    "start": "node server.cjs"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "csv-parse": "^5.5.6"
  }
}
'@
  Set-Content -LiteralPath $pkgPath -Value $pkg -Encoding UTF8
} else {
  # minimal "add deps" if missing (best-effort)
  Write-Host "Updating api-stub\package.json deps (best-effort)..." -ForegroundColor Yellow
  $pkgJson = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
  if (-not $pkgJson.dependencies) { $pkgJson | Add-Member -MemberType NoteProperty -Name dependencies -Value (@{}) }
  $need = @{
    "express"="^4.19.2"
    "cors"="^2.8.5"
    "multer"="^1.4.5-lts.1"
    "csv-parse"="^5.5.6"
  }
  foreach ($k in $need.Keys) {
    if (-not $pkgJson.dependencies.$k) { $pkgJson.dependencies | Add-Member -MemberType NoteProperty -Name $k -Value $need[$k] }
  }
  ($pkgJson | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $pkgPath -Encoding UTF8
}

Write-Host "Installing api-stub node deps (npm install)..." -ForegroundColor Yellow
Push-Location $STUB
try {
  & npm install | Out-Host
} finally {
  Pop-Location
}

# ------------------------------
# Default suppliers.json (if missing)
# ------------------------------
$suppliersPath = Join-Path $STUB_DATA "suppliers.json"
if (!(Test-Path $suppliersPath)) {
  Write-Host "Creating default suppliers.json..." -ForegroundColor Yellow
  $defaultSuppliers = @'
[
  {
    "id": "KMC",
    "key": "KMC",
    "name": "KMC Music",
    "location": "USA",
    "notes": "",
    "fees": { "handling": 0, "dropship": 0, "misc": 0 },
    "margins": { "minGross": 22, "maxGross": 45 },
    "mapping": { "sku": "", "cost": "", "name": "", "brand": "" },
    "lastFeed": { "filename": "", "storedPath": "", "uploadedAt": "" }
  },
  {
    "id": "ENSOUL",
    "key": "ENSOUL",
    "name": "Ensoul Music",
    "location": "USA",
    "notes": "",
    "fees": { "handling": 0, "dropship": 0, "misc": 0 },
    "margins": { "minGross": 22, "maxGross": 45 },
    "mapping": { "sku": "", "cost": "", "name": "", "brand": "" },
    "lastFeed": { "filename": "", "storedPath": "", "uploadedAt": "" }
  }
]
'@
  Set-Content -LiteralPath $suppliersPath -Value $defaultSuppliers -Encoding UTF8
}

# ------------------------------
# Write api-stub\server.cjs
# ------------------------------
Write-Host "Writing api-stub\server.cjs..." -ForegroundColor Yellow
$serverCjs = @'
/* eslint-disable no-console */
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const PORT = 5000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SUPPLIERS_PATH = path.join(DATA_DIR, "suppliers.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

ensureDir(DATA_DIR);
ensureDir(UPLOADS_DIR);

function readSuppliers() {
  if (!fs.existsSync(SUPPLIERS_PATH)) return [];
  const raw = fs.readFileSync(SUPPLIERS_PATH, "utf8");
  try { return JSON.parse(raw); } catch { return []; }
}

function writeSuppliers(list) {
  fs.writeFileSync(SUPPLIERS_PATH, JSON.stringify(list, null, 2), "utf8");
}

function findSupplier(list, id) {
  return list.find(s => String(s.id).toUpperCase() === String(id).toUpperCase());
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function detectHeaders(records) {
  if (!records || records.length === 0) return [];
  return Object.keys(records[0] || {});
}

function parseCsvToRecords(csvText) {
  // Handles common CSVs with headers.
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  });
  return records;
}

function previewFromRecords(records, limit = 10) {
  return records.slice(0, limit);
}

function computePricingPreview(supplier, records, limit = 25) {
  const mapping = supplier.mapping || {};
  const fees = supplier.fees || {};
  const margins = supplier.margins || {};

  const skuCol = mapping.sku || "";
  const costCol = mapping.cost || "";
  const nameCol = mapping.name || "";
  const brandCol = mapping.brand || "";

  const handling = safeNumber(fees.handling, 0);
  const dropship = safeNumber(fees.dropship, 0);
  const misc = safeNumber(fees.misc, 0);

  const minGrossPct = clamp(safeNumber(margins.minGross, 0), 0, 99);
  const maxGrossPct = clamp(safeNumber(margins.maxGross, minGrossPct), minGrossPct, 99);

  const minGross = minGrossPct / 100;
  const maxGross = maxGrossPct / 100;

  const out = [];

  for (const r of records.slice(0, limit)) {
    const sku = String(r[skuCol] ?? "").trim();
    const name = String(r[nameCol] ?? "").trim();
    const brand = String(r[brandCol] ?? "").trim();

    // cost could be "$12.34" etc
    let rawCost = r[costCol];
    if (rawCost === undefined || rawCost === null) rawCost = "";
    const costNum = safeNumber(String(rawCost).replace(/[^0-9.\-]/g, ""), NaN);

    if (!sku || !Number.isFinite(costNum)) continue;

    const landed = costNum + handling + dropship + misc;

    // price for gross margin m: landed / (1 - m)
    const minPrice = landed / (1 - minGross);
    const maxPrice = landed / (1 - maxGross);

    // choose a default "target" price = minPrice (lowest allowed)
    const target = minPrice;

    const targetGross = (target - landed) / target; // should equal minGross

    out.push({
      sku,
      name,
      brand,
      cost: Number(costNum.toFixed(2)),
      landed: Number(landed.toFixed(2)),
      minGrossPct: Number(minGrossPct.toFixed(2)),
      maxGrossPct: Number(maxGrossPct.toFixed(2)),
      targetGrossPct: Number((targetGross * 100).toFixed(2)),
      targetPrice: Number(target.toFixed(2)),
      minPrice: Number(minPrice.toFixed(2)),
      maxPrice: Number(maxPrice.toFixed(2))
    });
  }

  return out;
}

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "5mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// list suppliers
app.get("/api/suppliers", (req, res) => {
  const suppliers = readSuppliers();
  // keep response small and stable
  const slim = suppliers.map(s => ({
    id: s.id,
    key: s.key,
    name: s.name,
    location: s.location
  }));
  res.json(slim);
});

// get supplier detail
app.get("/api/suppliers/:id", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });
  res.json(s);
});

// update supplier detail (fees/margins/mapping/notes)
app.put("/api/suppliers/:id", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });

  const body = req.body || {};

  if (typeof body.name === "string") s.name = body.name;
  if (typeof body.key === "string") s.key = body.key;
  if (typeof body.location === "string") s.location = body.location;
  if (typeof body.notes === "string") s.notes = body.notes;

  s.fees = s.fees || { handling: 0, dropship: 0, misc: 0 };
  if (body.fees) {
    if (body.fees.handling !== undefined) s.fees.handling = safeNumber(body.fees.handling, s.fees.handling);
    if (body.fees.dropship !== undefined) s.fees.dropship = safeNumber(body.fees.dropship, s.fees.dropship);
    if (body.fees.misc !== undefined) s.fees.misc = safeNumber(body.fees.misc, s.fees.misc);
  }

  s.margins = s.margins || { minGross: 22, maxGross: 45 };
  if (body.margins) {
    if (body.margins.minGross !== undefined) s.margins.minGross = safeNumber(body.margins.minGross, s.margins.minGross);
    if (body.margins.maxGross !== undefined) s.margins.maxGross = safeNumber(body.margins.maxGross, s.margins.maxGross);
  }

  s.mapping = s.mapping || { sku: "", cost: "", name: "", brand: "" };
  if (body.mapping) {
    if (typeof body.mapping.sku === "string") s.mapping.sku = body.mapping.sku;
    if (typeof body.mapping.cost === "string") s.mapping.cost = body.mapping.cost;
    if (typeof body.mapping.name === "string") s.mapping.name = body.mapping.name;
    if (typeof body.mapping.brand === "string") s.mapping.brand = body.mapping.brand;
  }

  writeSuppliers(suppliers);
  res.json({ ok: true, supplier: s });
});

// upload a CSV feed for supplier: returns headers + preview rows
app.post("/api/suppliers/:id/feed", upload.single("file"), (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });

  const origName = req.file.originalname || "feed.csv";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeId = String(s.id).toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  const folder = path.join(UPLOADS_DIR, safeId);
  ensureDir(folder);

  const storedName = `${stamp}__${origName}`.replace(/[^\w.\-__]/g, "_");
  const storedPath = path.join(folder, storedName);

  fs.writeFileSync(storedPath, req.file.buffer);

  const csvText = req.file.buffer.toString("utf8");
  let records = [];
  try {
    records = parseCsvToRecords(csvText);
  } catch (e) {
    console.error("CSV parse error:", e);
    return res.status(400).json({ error: "Could not parse CSV. Make sure it has a header row." });
  }

  const headers = detectHeaders(records);
  const preview = previewFromRecords(records, 10);

  s.lastFeed = s.lastFeed || { filename: "", storedPath: "", uploadedAt: "" };
  s.lastFeed.filename = origName;
  s.lastFeed.storedPath = storedPath;
  s.lastFeed.uploadedAt = new Date().toISOString();

  writeSuppliers(suppliers);

  res.json({ ok: true, headers, preview, storedPath });
});

// pricing preview: uses last uploaded feed + mapping + fees/margins
app.get("/api/suppliers/:id/pricing-preview", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });

  const limit = clamp(safeNumber(req.query.limit, 25), 1, 200);

  const lastPath = s.lastFeed?.storedPath;
  if (!lastPath || !fs.existsSync(lastPath)) {
    return res.json({ ok: true, rows: [], message: "No feed uploaded yet." });
  }

  let csvText = "";
  try {
    csvText = fs.readFileSync(lastPath, "utf8");
  } catch {
    return res.status(500).json({ error: "Could not read stored feed file." });
  }

  let records = [];
  try {
    records = parseCsvToRecords(csvText);
  } catch {
    return res.status(400).json({ error: "Stored CSV could not be parsed." });
  }

  if (!s.mapping?.sku || !s.mapping?.cost) {
    return res.json({
      ok: true,
      rows: [],
      message: "Mapping not set yet. Map SKU + Cost to generate preview."
    });
  }

  const rows = computePricingPreview(s, records, limit);
  res.json({ ok: true, rows });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Stub API running at http://127.0.0.1:${PORT}`);
});
'@
Set-Content -LiteralPath (Join-Path $STUB "server.cjs") -Value $serverCjs -Encoding UTF8

# ------------------------------
# Write React SuppliersPage.tsx (full replacement)
# ------------------------------
if (!(Test-Path $UI)) { throw "UI folder not found: $UI" }
if (!(Test-Path (Split-Path $UI_PAGE -Parent))) { New-Item -ItemType Directory -Force -Path (Split-Path $UI_PAGE -Parent) | Out-Null }

Write-Host "Writing ui-web\src\pages\SuppliersPage.tsx..." -ForegroundColor Yellow
$tsx = @'
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

const STUB_BASE = "http://127.0.0.1:5000";
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
'@
Set-Content -LiteralPath $UI_PAGE -Value $tsx -Encoding UTF8

# ------------------------------
# Write launcher BAT (fixes early-close + one tab)
# ------------------------------
Write-Host "Writing run\LAUNCH_ECOM_COPILOT.bat..." -ForegroundColor Yellow
$bat = @'
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher (API 8001 + Stub 5000 + UI 3000)
REM  IMPORTANT: This script uses a :main section so function labels
REM             don't accidentally exit the script.
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

goto :main

REM ------------------------------
REM Helper: port check
REM Usage: call :is_listening 8001 && echo yes || echo no
REM ------------------------------
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%

:main
echo.
echo ==========================================
echo   Ecom Copilot Launcher
echo   Root: %ROOT%
echo ==========================================
echo.

REM ------------------------------
REM Start Python API (8001)
REM ------------------------------
call :is_listening 8001
if %errorlevel%==0 (
  echo [OK] API already listening on 8001
) else (
  echo [..] Starting API on 8001...
  set "PY=%ROOT%\api\.venv\Scripts\python.exe"
  if not exist "!PY!" set "PY=py"
  start "Ecom Copilot API (8001)" cmd /k ^
    "cd /d ""%ROOT%\api"" && !PY! -m uvicorn server:app --host 127.0.0.1 --port 8001"
)

REM ------------------------------
REM Start Suppliers Stub (5000)
REM ------------------------------
call :is_listening 5000
if %errorlevel%==0 (
  echo [OK] Suppliers Stub already listening on 5000
) else (
  echo [..] Starting Suppliers Stub on 5000...
  start "Ecom Copilot Suppliers Stub (5000)" cmd /k ^
    "cd /d ""%ROOT%\api-stub"" && node server.cjs"
)

REM ------------------------------
REM Start React UI (3000)
REM ------------------------------
call :is_listening 3000
if %errorlevel%==0 (
  echo [OK] UI already listening on 3000
) else (
  echo [..] Starting UI on 3000...
  start "Ecom Copilot UI (3000)" cmd /k ^
    "cd /d ""%ROOT%\ui-web"" && npm start"
)

REM Give servers a moment
timeout /t 2 /nobreak >nul

REM Open ONE tab
start "" "http://localhost:3000/suppliers"

echo.
echo Done.
echo  - UI:   http://localhost:3000/suppliers
echo  - API:  http://127.0.0.1:8001/docs
echo  - Stub: http://127.0.0.1:5000/health
echo.
exit /b 0
'@
Set-Content -LiteralPath $BAT -Value $bat -Encoding ASCII

Write-Host ""
Write-Host "✅ Patch complete." -ForegroundColor Green
Write-Host "Updated files:"
Write-Host " - $($STUB)\server.cjs"
Write-Host " - $suppliersPath"
Write-Host " - $UI_PAGE"
Write-Host " - $BAT"
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "1) Close old stub/api/ui terminals (optional)"
Write-Host "2) Double-click: $BAT"
Write-Host "3) Go to Suppliers"
Write-Host "4) Click Edit -> Upload CSV -> Map SKU + Cost -> Save"
Write-Host "5) Pricing Preview will populate from the uploaded feed"
