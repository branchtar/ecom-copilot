# ecom_copilot_patch_suppliers_csv_mapping.ps1
# One-shot patch:
# - api-stub: supplier settings + CSV upload + mapping endpoints (5000)
# - ui-web: SuppliersPage.tsx updated with settings + upload + mapping UI
# - run: LAUNCH_ECOM_COPILOT.bat kept clean (no duplicate stub start)

$ErrorActionPreference = "Stop"

$ROOT    = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$PS1_DIR = Join-Path $ROOT "ps1"
$RUN_DIR = Join-Path $ROOT "run"

$UI_PAGE = Join-Path $ROOT "ui-web\src\pages\SuppliersPage.tsx"

$STUB_DIR     = Join-Path $ROOT "api-stub"
$STUB_SERVER  = Join-Path $STUB_DIR "server.cjs"
$STUB_PKG     = Join-Path $STUB_DIR "package.json"
$STUB_DATA_DIR= Join-Path $STUB_DIR "data"
$STUB_DATA    = Join-Path $STUB_DATA_DIR "suppliers.json"
$STUB_UPLOADS = Join-Path $STUB_DIR "uploads"

New-Item -ItemType Directory -Force -Path $PS1_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $RUN_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $STUB_DATA_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $STUB_UPLOADS | Out-Null

Write-Host "== Ecom Copilot patch: suppliers settings + CSV mapping ==" -ForegroundColor Cyan
Write-Host "ROOT: $ROOT" -ForegroundColor DarkGray

# -------------------------------------------------------------------
# 1) Ensure api-stub package.json + deps (express, cors, multer)
# -------------------------------------------------------------------
if (!(Test-Path $STUB_PKG)) {
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
    "multer": "^1.4.5-lts.1"
  }
}
'@
  Set-Content -LiteralPath $STUB_PKG -Value $pkg -Encoding UTF8
} else {
  # Light-touch: ensure needed deps exist in package.json
  $pkgJson = Get-Content -LiteralPath $STUB_PKG -Raw | ConvertFrom-Json
  if (-not $pkgJson.dependencies) { $pkgJson | Add-Member -NotePropertyName dependencies -NotePropertyValue @{} }

  $changed = $false
  foreach ($dep in @("express","cors","multer")) {
    if (-not $pkgJson.dependencies.$dep) {
      $pkgJson.dependencies | Add-Member -NotePropertyName $dep -NotePropertyValue "*"
      $changed = $true
    }
  }
  if ($changed) {
    Write-Host "Updating api-stub\package.json deps..." -ForegroundColor Yellow
    ($pkgJson | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $STUB_PKG -Encoding UTF8
  }
}

# Install deps if missing
$needInstall = $false
if (!(Test-Path (Join-Path $STUB_DIR "node_modules\express"))) { $needInstall = $true }
if (!(Test-Path (Join-Path $STUB_DIR "node_modules\multer")))  { $needInstall = $true }
if ($needInstall) {
  Write-Host "Installing api-stub node deps (npm install)..." -ForegroundColor Yellow
  Push-Location $STUB_DIR
  npm install | Out-Host
  Pop-Location
} else {
  Write-Host "api-stub deps look installed." -ForegroundColor Green
}

# -------------------------------------------------------------------
# 2) Create default suppliers data file if missing
# -------------------------------------------------------------------
if (!(Test-Path $STUB_DATA)) {
  Write-Host "Creating default suppliers.json..." -ForegroundColor Yellow
  $defaultData = @'
{
  "suppliers": [
    {
      "id": "KMC",
      "key": "KMC",
      "name": "KMC Music",
      "location": "USA",
      "notes": "",
      "settings": {
        "handling_fee": 0,
        "dropship_fee": 0,
        "misc_fee": 0,
        "min_gross_margin_pct": 22,
        "max_gross_margin_pct": 60
      },
      "mapping": {
        "sku": "",
        "title": "",
        "brand": "",
        "upc": "",
        "cost": "",
        "msrp": "",
        "qty": "",
        "weight": ""
      },
      "feed": {
        "last_upload_name": "",
        "last_upload_path": "",
        "last_upload_at": "",
        "headers": [],
        "sample_rows": []
      }
    },
    {
      "id": "ENSOUL",
      "key": "ENSOUL",
      "name": "Ensoul Music",
      "location": "USA",
      "notes": "",
      "settings": {
        "handling_fee": 0,
        "dropship_fee": 0,
        "misc_fee": 0,
        "min_gross_margin_pct": 22,
        "max_gross_margin_pct": 60
      },
      "mapping": {
        "sku": "",
        "title": "",
        "brand": "",
        "upc": "",
        "cost": "",
        "msrp": "",
        "qty": "",
        "weight": ""
      },
      "feed": {
        "last_upload_name": "",
        "last_upload_path": "",
        "last_upload_at": "",
        "headers": [],
        "sample_rows": []
      }
    }
  ]
}
'@
  Set-Content -LiteralPath $STUB_DATA -Value $defaultData -Encoding UTF8
}

# -------------------------------------------------------------------
# 3) Write api-stub\server.cjs with settings + upload + mapping endpoints
# -------------------------------------------------------------------
Write-Host "Writing api-stub\server.cjs..." -ForegroundColor Yellow

$server = @'
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "10mb" }));

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "suppliers.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readData() {
  if (!fs.existsSync(DATA_FILE)) return { suppliers: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(k) {
  return String(k || "").trim().toUpperCase();
}

function ensureSupplierShape(s) {
  s.id = s.id || s.key;
  s.key = s.key || s.id;
  s.name = s.name || s.key;
  s.location = s.location || "";
  s.notes = s.notes || "";

  s.settings = s.settings || {};
  s.settings.handling_fee = Number(s.settings.handling_fee || 0);
  s.settings.dropship_fee = Number(s.settings.dropship_fee || 0);
  s.settings.misc_fee = Number(s.settings.misc_fee || 0);
  s.settings.min_gross_margin_pct = Number(s.settings.min_gross_margin_pct ?? 22);
  s.settings.max_gross_margin_pct = Number(s.settings.max_gross_margin_pct ?? 60);

  s.mapping = s.mapping || {};
  for (const k of ["sku","title","brand","upc","cost","msrp","qty","weight"]) {
    if (typeof s.mapping[k] !== "string") s.mapping[k] = "";
  }

  s.feed = s.feed || {};
  s.feed.last_upload_name = s.feed.last_upload_name || "";
  s.feed.last_upload_path = s.feed.last_upload_path || "";
  s.feed.last_upload_at = s.feed.last_upload_at || "";
  s.feed.headers = Array.isArray(s.feed.headers) ? s.feed.headers : [];
  s.feed.sample_rows = Array.isArray(s.feed.sample_rows) ? s.feed.sample_rows : [];
  return s;
}

// Minimal CSV line parser that handles quotes
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // escaped quote
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function inspectCsv(filePath, maxRows = 5) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], sampleRows: [] };

  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, "")); // remove BOM if any
  const sampleRows = [];

  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    sampleRows.push(row);
  }

  return { headers, sampleRows };
}

function suggestMapping(headers) {
  const h = headers.map(x => x.toLowerCase());
  const pick = (needles) => {
    const idx = h.findIndex(v => needles.some(n => v.includes(n)));
    return idx >= 0 ? headers[idx] : "";
  };

  return {
    sku:    pick(["sku","item sku","item_sku","seller sku","part","part #","mpn"]),
    title:  pick(["title","name","product","description","item"]),
    brand:  pick(["brand","manufacturer","mfr"]),
    upc:    pick(["upc","barcode","ean","gtin"]),
    cost:   pick(["cost","wholesale","dealer","price"]),
    msrp:   pick(["msrp","map","retail","list price"]),
    qty:    pick(["qty","quantity","stock","available","inventory","on hand"]),
    weight: pick(["weight","ship weight","shipping weight","lbs","oz"])
  };
}

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// List suppliers
app.get("/api/suppliers", (req, res) => {
  const data = readData();
  const list = (data.suppliers || []).map(ensureSupplierShape).map(s => ({
    id: s.id, key: s.key, name: s.name, location: s.location
  }));
  res.json(list);
});

// Get supplier detail
app.get("/api/suppliers/:key", (req, res) => {
  const key = normalizeKey(req.params.key);
  const data = readData();
  const s = (data.suppliers || []).map(ensureSupplierShape).find(x => normalizeKey(x.key) === key);
  if (!s) return res.status(404).json({ error: "Supplier not found" });
  res.json(s);
});

// Upsert supplier (settings + mapping + notes)
app.put("/api/suppliers/:key", (req, res) => {
  const key = normalizeKey(req.params.key);
  const body = req.body || {};
  const data = readData();
  data.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];

  let idx = data.suppliers.findIndex(x => normalizeKey(x.key) === key);
  if (idx < 0) {
    data.suppliers.push(ensureSupplierShape({ key, id: key, name: body.name || key }));
    idx = data.suppliers.length - 1;
  }

  const s = ensureSupplierShape(data.suppliers[idx]);

  if (typeof body.name === "string") s.name = body.name;
  if (typeof body.location === "string") s.location = body.location;
  if (typeof body.notes === "string") s.notes = body.notes;

  if (body.settings && typeof body.settings === "object") {
    s.settings.handling_fee = Number(body.settings.handling_fee ?? s.settings.handling_fee ?? 0);
    s.settings.dropship_fee = Number(body.settings.dropship_fee ?? s.settings.dropship_fee ?? 0);
    s.settings.misc_fee = Number(body.settings.misc_fee ?? s.settings.misc_fee ?? 0);
    s.settings.min_gross_margin_pct = Number(body.settings.min_gross_margin_pct ?? s.settings.min_gross_margin_pct ?? 22);
    s.settings.max_gross_margin_pct = Number(body.settings.max_gross_margin_pct ?? s.settings.max_gross_margin_pct ?? 60);
  }

  if (body.mapping && typeof body.mapping === "object") {
    for (const k of ["sku","title","brand","upc","cost","msrp","qty","weight"]) {
      if (typeof body.mapping[k] === "string") s.mapping[k] = body.mapping[k];
    }
  }

  data.suppliers[idx] = s;
  writeData(data);
  res.json(s);
});

// Upload CSV -> inspect headers + sample rows, store feed meta
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const key = normalizeKey(req.params.key);
    const dir = path.join(UPLOADS_DIR, key);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = (file.originalname || "feed.csv").replace(/[^\w.\- ]/g, "_");
    cb(null, `${ts}__${safe}`);
  }
});

const upload = multer({ storage });

app.post("/api/suppliers/:key/feed", upload.single("file"), (req, res) => {
  const key = normalizeKey(req.params.key);
  if (!req.file || !req.file.path) return res.status(400).json({ error: "No file uploaded" });

  const { headers, sampleRows } = inspectCsv(req.file.path, 5);
  const mappingSuggestion = suggestMapping(headers);

  const data = readData();
  data.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  let idx = data.suppliers.findIndex(x => normalizeKey(x.key) === key);

  if (idx < 0) {
    data.suppliers.push(ensureSupplierShape({ key, id: key, name: key }));
    idx = data.suppliers.length - 1;
  }

  const s = ensureSupplierShape(data.suppliers[idx]);
  s.feed.last_upload_name = req.file.originalname || path.basename(req.file.path);
  s.feed.last_upload_path = req.file.path;
  s.feed.last_upload_at = nowIso();
  s.feed.headers = headers;
  s.feed.sample_rows = sampleRows;

  // if mapping fields are empty, seed them with suggested mapping (non-destructive)
  for (const k of Object.keys(mappingSuggestion)) {
    if (!s.mapping[k] && mappingSuggestion[k]) s.mapping[k] = mappingSuggestion[k];
  }

  data.suppliers[idx] = s;
  writeData(data);

  res.json({
    ok: true,
    headers,
    sampleRows,
    suggestedMapping: mappingSuggestion
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Stub API running at http://127.0.0.1:${PORT}`);
  console.log(`CORS origin allowed: ${ALLOWED_ORIGIN}`);
});
'@

Set-Content -LiteralPath $STUB_SERVER -Value $server -Encoding UTF8

# -------------------------------------------------------------------
# 4) Update UI SuppliersPage.tsx
# -------------------------------------------------------------------
Write-Host "Writing ui-web\src\pages\SuppliersPage.tsx..." -ForegroundColor Yellow

$tsx = @'
import React, { useEffect, useMemo, useRef, useState } from "react";

type SupplierListItem = {
  id: string;
  key: string;
  name: string;
  location: string;
};

type SupplierSettings = {
  handling_fee: number;
  dropship_fee: number;
  misc_fee: number;
  min_gross_margin_pct: number;
  max_gross_margin_pct: number;
};

type SupplierMapping = {
  sku: string;
  title: string;
  brand: string;
  upc: string;
  cost: string;
  msrp: string;
  qty: string;
  weight: string;
};

type SupplierFeed = {
  last_upload_name: string;
  last_upload_at: string;
  headers: string[];
  sample_rows: Array<Record<string, string>>;
};

type SupplierDetail = {
  id: string;
  key: string;
  name: string;
  location: string;
  notes: string;
  settings: SupplierSettings;
  mapping: SupplierMapping;
  feed: SupplierFeed;
};

const STUB_BASE = (process.env.REACT_APP_STUB_API_BASE as string) || "http://127.0.0.1:5000";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number.isFinite(n) ? n : 0);

const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

const Card: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.06)",
      borderRadius: 14,
      padding: 18,
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      marginBottom: 16
    }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
};

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}> = ({ children, onClick, variant = "secondary", disabled }) => {
  const bg = variant === "primary" ? "#0f172a" : "#f1f5f9";
  const fg = variant === "primary" ? "#fff" : "#0f172a";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        background: disabled ? "#e2e8f0" : bg,
        color: disabled ? "#64748b" : fg,
        padding: "10px 14px",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700
      }}
    >
      {children}
    </button>
  );
};

const Input: React.FC<{
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  rightHint?: string;
}> = ({ label, value, onChange, placeholder, type = "text", rightHint }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{label}</div>
        {rightHint && <div style={{ fontSize: 12, color: "#64748b" }}>{rightHint}</div>}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 12,
          padding: "10px 12px",
          outline: "none"
        }}
      />
    </div>
  );
};

const Select: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  hint?: string;
}> = ({ label, value, options, onChange, hint }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 12,
          padding: "10px 12px",
          outline: "none",
          background: "#fff"
        }}
      >
        <option value="">— Not mapped —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
};

export default function SuppliersPage() {
  const [list, setList] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // view state
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [mode, setMode] = useState<"list" | "detail" | "edit">("list");

  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>("");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string>("");

  const mappingFields = useMemo(
    () => ([
      { key: "sku" as const, label: "SKU (required)" },
      { key: "title" as const, label: "Title / Name" },
      { key: "brand" as const, label: "Brand" },
      { key: "upc" as const, label: "UPC / Barcode" },
      { key: "cost" as const, label: "Cost (required)" },
      { key: "msrp" as const, label: "MSRP / MAP" },
      { key: "qty" as const, label: "Qty / Available" },
      { key: "weight" as const, label: "Weight" }
    ]),
    []
  );

  async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJSON<SupplierListItem[]>(`${STUB_BASE}/api/suppliers`);
      setList(data);
    } catch (e: any) {
      setError(`Failed to load suppliers from ${STUB_BASE}/api/suppliers`);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(key: string) {
    if (!key) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await fetchJSON<SupplierDetail>(`${STUB_BASE}/api/suppliers/${encodeURIComponent(key)}`);
      setDetail(data);
    } catch (e: any) {
      setDetailError(`Failed to load supplier detail for ${key}`);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  // When selectedKey changes, load detail
  useEffect(() => {
    if (selectedKey) loadDetail(selectedKey);
  }, [selectedKey]);

  function goList() {
    setMode("list");
    setSelectedKey("");
    setDetail(null);
    setDetailError("");
  }

  function openDetail(key: string) {
    setSelectedKey(key);
    setMode("detail");
  }

  function openEdit() {
    if (!selectedKey) return;
    setMode("edit");
  }

  function setDetailField<K extends keyof SupplierDetail>(k: K, v: SupplierDetail[K]) {
    setDetail((prev) => (prev ? ({ ...prev, [k]: v }) : prev));
  }

  function setSettingsField<K extends keyof SupplierSettings>(k: K, v: number) {
    setDetail((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, [k]: v } };
    });
  }

  function setMappingField<K extends keyof SupplierMapping>(k: K, v: string) {
    setDetail((prev) => {
      if (!prev) return prev;
      return { ...prev, mapping: { ...prev.mapping, [k]: v } };
    });
  }

  async function saveSupplier() {
    if (!detail) return;
    setUploadMsg("");
    try {
      const body = {
        name: detail.name,
        location: detail.location,
        notes: detail.notes,
        settings: detail.settings,
        mapping: detail.mapping
      };
      const saved = await fetchJSON<SupplierDetail>(`${STUB_BASE}/api/suppliers/${encodeURIComponent(detail.key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      setDetail(saved);
      setUploadMsg("Saved.");
      setMode("detail");
      loadList(); // refresh list names/locations
    } catch (e: any) {
      setUploadMsg("Save failed (check stub console).");
    }
  }

  async function handleUpload(file: File) {
    if (!detail) return;
    setUploadBusy(true);
    setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${STUB_BASE}/api/suppliers/${encodeURIComponent(detail.key)}/feed`, {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const out = await res.json();

      // reload detail so we pick up stored headers/sample + auto-seeded mapping
      await loadDetail(detail.key);

      setUploadMsg(`Uploaded: ${file.name}`);
      setUploadMsg((m) => m);
    } catch (e: any) {
      setUploadMsg("Upload failed (check stub console).");
    } finally {
      setUploadBusy(false);
    }
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  if (mode === "list") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Suppliers</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Manage supplier profiles, feed uploads, and pricing rules.</div>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              // Create a blank supplier quickly (user will edit key/name)
              const newKey = prompt("New supplier KEY (ex: KMC):");
              if (!newKey) return;
              const key = newKey.trim().toUpperCase();
              setSelectedKey(key);
              setMode("edit");
              // optimistic local detail
              setDetail({
                id: key,
                key,
                name: key,
                location: "",
                notes: "",
                settings: { handling_fee: 0, dropship_fee: 0, misc_fee: 0, min_gross_margin_pct: 22, max_gross_margin_pct: 60 },
                mapping: { sku: "", title: "", brand: "", upc: "", cost: "", msrp: "", qty: "", weight: "" },
                feed: { last_upload_name: "", last_upload_at: "", headers: [], sample_rows: [] }
              });
            }}
          >
            Add Supplier
          </Button>
        </div>

        {error && (
          <Card title="Failed to load suppliers">
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>
            <div style={{ marginTop: 10 }}>
              <Button onClick={loadList}>Retry</Button>
            </div>
          </Card>
        )}

        <Card title="Supplier List" right={loading ? <span style={{ color: "#64748b" }}>Loading…</span> : null}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {list.map((s) => (
              <div
                key={s.key}
                onClick={() => openDetail(s.key)}
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 14,
                  padding: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Key: <b>{s.key}</b> · Location: {s.location || "—"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Open →</div>
              </div>
            ))}
            {!loading && list.length === 0 && <div style={{ color: "#64748b" }}>No suppliers yet.</div>}
          </div>
        </Card>
      </div>
    );
  }

  // detail/edit shell
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Button onClick={goList}>← Back</Button>
        {mode === "detail" ? (
          <Button variant="primary" onClick={openEdit} disabled={!selectedKey}>
            Edit
          </Button>
        ) : (
          <Button variant="primary" onClick={saveSupplier} disabled={!detail}>
            Save
          </Button>
        )}
      </div>

      {detailLoading && (
        <Card>
          <div style={{ color: "#64748b" }}>Loading supplier…</div>
        </Card>
      )}

      {detailError && (
        <Card title="Error">
          <div style={{ color: "#b91c1c", fontWeight: 800 }}>{detailError}</div>
        </Card>
      )}

      {detail && mode === "detail" && (
        <>
          <Card
            title={detail.name}
            right={<div style={{ fontSize: 12, color: "#64748b" }}>Key: <b>{detail.key}</b> · Location: {detail.location || "—"}</div>}
          >
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {detail.notes || "No notes yet."}
            </div>
          </Card>

          <Card title="Pricing Rules Summary">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Handling fee</div>
                <div style={{ fontWeight: 800 }}>{money(detail.settings.handling_fee)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Dropship fee</div>
                <div style={{ fontWeight: 800 }}>{money(detail.settings.dropship_fee)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Misc fee</div>
                <div style={{ fontWeight: 800 }}>{money(detail.settings.misc_fee)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Min GM%</div>
                <div style={{ fontWeight: 800 }}>{pct(detail.settings.min_gross_margin_pct)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Max GM%</div>
                <div style={{ fontWeight: 800 }}>{pct(detail.settings.max_gross_margin_pct)}</div>
              </div>
            </div>
          </Card>

          <Card title="Feed Status">
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Last upload: <b>{detail.feed.last_upload_name || "—"}</b>
              {detail.feed.last_upload_at ? ` (${new Date(detail.feed.last_upload_at).toLocaleString()})` : ""}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Mapped SKU: <b>{detail.mapping.sku || "—"}</b> · Mapped Cost: <b>{detail.mapping.cost || "—"}</b>
            </div>
          </Card>
        </>
      )}

      {detail && mode === "edit" && (
        <>
          <Card title="Supplier Info">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Name" value={detail.name} onChange={(v) => setDetailField("name", v)} />
              <Input
                label="Key"
                value={detail.key}
                onChange={(v) => setDetailField("key", v.toUpperCase())}
                rightHint="Key is used in API paths"
              />
              <Input label="Location" value={detail.location} onChange={(v) => setDetailField("location", v)} placeholder="USA" />
              <div />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Notes</div>
              <textarea
                value={detail.notes || ""}
                onChange={(e) => setDetailField("notes", e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>
          </Card>

          <Card title="Pricing Rules">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
              <Input
                label="Handling fee ($)"
                type="number"
                value={detail.settings.handling_fee}
                onChange={(v) => setSettingsField("handling_fee", Number(v))}
              />
              <Input
                label="Dropshipping fee ($)"
                type="number"
                value={detail.settings.dropship_fee}
                onChange={(v) => setSettingsField("dropship_fee", Number(v))}
              />
              <Input
                label="Misc fee ($)"
                type="number"
                value={detail.settings.misc_fee}
                onChange={(v) => setSettingsField("misc_fee", Number(v))}
              />
              <Input
                label="Min gross margin (%)"
                type="number"
                value={detail.settings.min_gross_margin_pct}
                onChange={(v) => setSettingsField("min_gross_margin_pct", Number(v))}
              />
              <Input
                label="Max gross margin (%)"
                type="number"
                value={detail.settings.max_gross_margin_pct}
                onChange={(v) => setSettingsField("max_gross_margin_pct", Number(v))}
              />
            </div>
          </Card>

          <Card
            title="Upload Supplier CSV"
            right={
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploadBusy}
                variant="secondary"
              >
                {uploadBusy ? "Uploading…" : "Choose CSV"}
              </Button>
            }
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.currentTarget.value = "";
              }}
            />

            <div style={{ fontSize: 13, color: "#64748b" }}>
              Upload the supplier feed. We’ll extract headers + a small preview, then you can map columns below.
            </div>

            {uploadMsg && (
              <div style={{ marginTop: 10, fontWeight: 800, color: uploadMsg.includes("failed") ? "#b91c1c" : "#0f766e" }}>
                {uploadMsg}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
              Backend: {STUB_BASE}/api/suppliers/{detail.key}/feed
            </div>
          </Card>

          <Card title="Column Mapping">
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
              Pick which CSV column maps to each field. (At minimum, map <b>SKU</b> and <b>Cost</b>.)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {mappingFields.map((f) => (
                <Select
                  key={f.key}
                  label={f.label}
                  value={detail.mapping[f.key]}
                  options={detail.feed.headers || []}
                  onChange={(v) => setMappingField(f.key, v)}
                  hint={detail.feed.headers?.length ? `${detail.feed.headers.length} columns detected` : "Upload CSV first"}
                />
              ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <Button variant="primary" onClick={saveSupplier}>
                Save settings + mapping
              </Button>
              <Button
                onClick={() => {
                  // quick clear mapping
                  for (const k of ["sku","title","brand","upc","cost","msrp","qty","weight"] as const) {
                    setMappingField(k, "");
                  }
                }}
              >
                Clear mapping
              </Button>
            </div>
          </Card>

          <Card title="CSV Preview (first rows)">
            {!detail.feed.sample_rows?.length ? (
              <div style={{ color: "#64748b" }}>No preview yet. Upload a CSV to see sample rows.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {(detail.feed.headers || []).slice(0, 8).map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.feed.sample_rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {(detail.feed.headers || []).slice(0, 8).map((h) => (
                          <td key={h} style={{ padding: 8, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 12, color: "#334155" }}>
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  Showing first 8 columns only (to keep it readable).
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
'@

Set-Content -LiteralPath $UI_PAGE -Value $tsx -Encoding UTF8

# -------------------------------------------------------------------
# 5) Clean launcher (single tab, no duplicate stub start)
# -------------------------------------------------------------------
Write-Host "Writing run\LAUNCH_ECOM_COPILOT.bat..." -ForegroundColor Yellow
$batPath = Join-Path $RUN_DIR "LAUNCH_ECOM_COPILOT.bat"

$bat = @'
@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Ecom Copilot - One-click launcher
REM  - Python API: 8001 (FastAPI)
REM  - Suppliers Stub: 5000 (Node)
REM  - React UI: 3000
REM ============================================================

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

if not exist "%ROOT%" (
  echo ERROR: Project root not found:
  echo %ROOT%
  pause
  exit /b 1
)

REM ------------------------------
REM Helper: port check
REM ------------------------------
:is_listening
set "PORT=%~1"
netstat -ano | findstr /R /C:":%PORT% " | findstr /I "LISTENING" >nul
exit /b %errorlevel%

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

timeout /t 2 /nobreak >nul

REM ------------------------------
REM Open ONE tab
REM ------------------------------
start "" "http://localhost:3000/suppliers"

echo.
echo Done. Quick links:
echo  - UI:   http://localhost:3000/suppliers
echo  - API:  http://127.0.0.1:8001/docs
echo  - Stub: http://127.0.0.1:5000/health
echo.
exit /b 0
'@

Set-Content -LiteralPath $batPath -Value $bat -Encoding ASCII

Write-Host ""
Write-Host "✅ Patch complete." -ForegroundColor Green
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host " - $STUB_SERVER"
Write-Host " - $STUB_DATA"
Write-Host " - $UI_PAGE"
Write-Host " - $batPath"
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "1) Close old stub/api/ui terminals (optional)"
Write-Host "2) Double-click: $batPath"
Write-Host "3) Open Suppliers > pick KMC > Edit"
Write-Host "4) Upload CSV, confirm headers/preview, map SKU + Cost, then Save"
