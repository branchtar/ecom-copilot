# patch_pricing_mapping.ps1
# Adds Pricing + Mapping (CSV upload -> map -> preview -> run -> download)
# Root: C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

$ErrorActionPreference = "Stop"

$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

function Ensure-Dir($p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
function Backup-File($p) {
  if (Test-Path $p) {
    $bak = "$p.bak_{0}" -f (Get-Date -Format "yyyyMMdd_HHmmss")
    Copy-Item -Force $p $bak
    Write-Host "Backed up: $p -> $bak"
  }
}

if (-not (Test-Path $root)) { throw "Root not found: $root" }
Set-Location $root

Ensure-Dir "$root\data"
Ensure-Dir "$root\data\mappings"
Ensure-Dir "$root\data\uploads"
Ensure-Dir "$root\output\pricing"
Ensure-Dir "$root\config"
Ensure-Dir "$root\logs"

# -----------------------------
# 1) Write config defaults
# -----------------------------
$feeDefaultsPath = "$root\config\marketplace_fees.json"
if (-not (Test-Path $feeDefaultsPath)) {
@'
{
  "amazon":  { "type": "percent_of_price", "percent": 0.15, "per_item": 0.00 },
  "ebay":    { "type": "percent_of_price", "percent": 0.13, "per_item": 0.00 },
  "walmart": { "type": "percent_of_price", "percent": 0.15, "per_item": 0.00 },
  "shopify": { "type": "percent_of_price", "percent": 0.03, "per_item": 0.00 }
}
'@ | Set-Content -Encoding UTF8 $feeDefaultsPath
  Write-Host "Created: $feeDefaultsPath"
}

$pricingDefaultsPath = "$root\config\pricing_defaults.json"
if (-not (Test-Path $pricingDefaultsPath)) {
@'
{
  "rounding": { "mode": "ends_in_99" },
  "shipping": { "mode": "placeholder_zero_until_carrier_feeds" },
  "defaults": {
    "min_margin": 0.18,
    "max_margin": 0.35,
    "dropship_fee": 0.00
  }
}
'@ | Set-Content -Encoding UTF8 $pricingDefaultsPath
  Write-Host "Created: $pricingDefaultsPath"
}

# -----------------------------
# 2) Write Python engine
# -----------------------------
$enginePath = "$root\py\pricing_mapping_engine.py"
Ensure-Dir "$root\py"

@'
# pricing_mapping_engine.py
# Canonical pipeline:
#   CSV -> preview headers/rows -> mapping -> normalize -> price -> output
#
# Price model:
#   total_cost = supplier_cost + dropship_fee + shipping_estimate + marketplace_fee
#   min_price  = total_cost / (1 - min_margin)
#   max_price  = total_cost / (1 - max_margin)

from __future__ import annotations

import csv
import io
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
MAPPINGS_DIR = os.path.join(DATA_DIR, "mappings")
CONFIG_DIR = os.path.join(ROOT, "config")
OUTPUT_DIR = os.path.join(ROOT, "output", "pricing")

REQUIRED_FIELDS = ["supplier_sku", "supplier_cost", "qty_available"]
OPTIONAL_FIELDS = ["upc", "title", "brand", "map_price", "msrp", "weight_oz", "length_in", "width_in", "height_in"]

def _ensure_dirs() -> None:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(MAPPINGS_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def _read_json(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _safe_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    s = str(v).strip()
    if s == "":
        return None
    # Remove currency symbols/commas
    s = s.replace("$", "").replace(",", "")
    try:
        return float(s)
    except Exception:
        return None

def _safe_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    s = str(v).strip()
    if s == "":
        return None
    try:
        return int(float(s))
    except Exception:
        return None

def decode_bytes_guess(data: bytes) -> str:
    # Try UTF-8 with BOM first, then plain UTF-8, then latin-1 fallback
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            pass
    # last resort
    return data.decode("latin-1", errors="replace")

def save_upload_bytes(csv_bytes: bytes) -> Tuple[str, str]:
    _ensure_dirs()
    upload_id = str(uuid.uuid4())
    path = os.path.join(UPLOADS_DIR, f"{upload_id}.csv")
    with open(path, "wb") as f:
        f.write(csv_bytes)
    return upload_id, path

def preview_upload(upload_path: str, max_rows: int = 25) -> Tuple[List[str], List[Dict[str, str]]]:
    with open(upload_path, "rb") as f:
        text = decode_bytes_guess(f.read())

    # Use csv.DictReader so headers are preserved
    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    headers = reader.fieldnames or []
    rows: List[Dict[str, str]] = []
    for i, r in enumerate(reader):
        if i >= max_rows:
            break
        # normalize None -> ""
        rows.append({k: ("" if r.get(k) is None else str(r.get(k))) for k in headers})
    return headers, rows

def load_mapping(supplier_code: str) -> Optional[Dict[str, str]]:
    path = os.path.join(MAPPINGS_DIR, f"{supplier_code}.json")
    if not os.path.exists(path):
        return None
    return _read_json(path, None)

def save_mapping(supplier_code: str, mapping: Dict[str, str]) -> str:
    _ensure_dirs()
    path = os.path.join(MAPPINGS_DIR, f"{supplier_code}.json")
    payload = {
        "supplier_code": supplier_code,
        "saved_at_utc": datetime.utcnow().isoformat() + "Z",
        "mapping": mapping
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return path

def _normalize_row(row: Dict[str, str], mapping: Dict[str, str]) -> Tuple[Dict[str, Any], List[str]]:
    warnings: List[str] = []

    def pick(field: str) -> str:
        col = mapping.get(field, "")
        if not col:
            return ""
        return row.get(col, "")

    supplier_sku = pick("supplier_sku").strip()
    cost = _safe_float(pick("supplier_cost"))
    qty = _safe_int(pick("qty_available"))

    if supplier_sku == "":
        warnings.append("Missing supplier_sku")
    if cost is None:
        warnings.append("Invalid supplier_cost")
    if qty is None:
        warnings.append("Invalid qty_available")

    rec: Dict[str, Any] = {
        "supplier_sku": supplier_sku,
        "supplier_cost": cost,
        "qty_available": qty,
        "upc": pick("upc").strip(),
        "title": pick("title").strip(),
        "brand": pick("brand").strip(),
        "map_price": _safe_float(pick("map_price")),
        "msrp": _safe_float(pick("msrp")),
        "weight_oz": _safe_float(pick("weight_oz")),
        "length_in": _safe_float(pick("length_in")),
        "width_in": _safe_float(pick("width_in")),
        "height_in": _safe_float(pick("height_in")),
    }
    return rec, warnings

def _marketplace_fee(price: float, fee_cfg: Dict[str, Any]) -> float:
    # Simple fee models; extend later (category-based, tiered, etc.)
    typ = fee_cfg.get("type", "percent_of_price")
    if typ == "percent_of_price":
        pct = float(fee_cfg.get("percent", 0.0))
        per_item = float(fee_cfg.get("per_item", 0.0))
        return price * pct + per_item
    return 0.0

def _apply_rounding(price: float, rounding_mode: str) -> float:
    if rounding_mode == "ends_in_99":
        # e.g., 12.34 -> 12.99, 12.01 -> 12.99
        whole = int(price)
        return float(f"{whole}.99") if price <= (whole + 0.99) else float(f"{whole+1}.99")
    return round(price, 2)

def compute_prices(
    normalized: Dict[str, Any],
    marketplace: str,
    min_margin: float,
    max_margin: float,
    dropship_fee: float,
    shipping_estimate: float,
    fee_table: Dict[str, Any],
    rounding_mode: str = "ends_in_99"
) -> Tuple[Dict[str, Any], List[str]]:

    warnings: List[str] = []
    cost = normalized.get("supplier_cost")
    if cost is None:
        return {**normalized}, ["Cannot price: missing supplier_cost"]

    total_cost = float(cost) + float(dropship_fee) + float(shipping_estimate)

    # Solve price for margin: price = total_cost / (1 - margin)
    def solve(m: float) -> float:
        if m >= 0.999:
            return 0.0
        return total_cost / (1.0 - m)

    # Initial min/max price BEFORE fee inclusion:
    min_price_pre = solve(float(min_margin))
    max_price_pre = solve(float(max_margin))

    # Marketplace fee depends on price, so we approximate with 1-pass:
    fee_cfg = fee_table.get(marketplace, {"type": "percent_of_price", "percent": 0.0, "per_item": 0.0})
    min_fee = _marketplace_fee(min_price_pre, fee_cfg)
    max_fee = _marketplace_fee(max_price_pre, fee_cfg)

    min_total_cost = total_cost + min_fee
    max_total_cost = total_cost + max_fee

    min_price = solve(float(min_margin)) + min_fee  # rough
    max_price = solve(float(max_margin)) + max_fee  # rough

    # Clamp MAP if present
    map_price = normalized.get("map_price")
    if map_price is not None and map_price > 0:
        if min_price < map_price:
            warnings.append("MAP clamp applied to min_price")
            min_price = float(map_price)
        if max_price < map_price:
            warnings.append("MAP clamp applied to max_price")
            max_price = float(map_price)

    min_price = _apply_rounding(float(min_price), rounding_mode)
    max_price = _apply_rounding(float(max_price), rounding_mode)
    if max_price < min_price:
        warnings.append("max_price < min_price (adjusted)")
        max_price = min_price

    out = {**normalized}
    out.update({
        "marketplace": marketplace,
        "dropship_fee": round(float(dropship_fee), 2),
        "shipping_estimate": round(float(shipping_estimate), 2),
        "base_total_cost": round(total_cost, 2),
        "min_price": round(float(min_price), 2),
        "max_price": round(float(max_price), 2),
        "warnings": "; ".join(warnings)
    })
    return out, warnings

def price_preview_rows(
    preview_rows: List[Dict[str, str]],
    mapping: Dict[str, str],
    marketplace: str,
    min_margin: float,
    max_margin: float,
    dropship_fee: float,
    fee_table: Dict[str, Any],
    rounding_mode: str = "ends_in_99"
) -> List[Dict[str, Any]]:

    out: List[Dict[str, Any]] = []
    for r in preview_rows:
        normalized, warn1 = _normalize_row(r, mapping)
        shipping_estimate = 0.0  # placeholder until carrier feeds
        priced, warn2 = compute_prices(
            normalized,
            marketplace=marketplace,
            min_margin=min_margin,
            max_margin=max_margin,
            dropship_fee=dropship_fee,
            shipping_estimate=shipping_estimate,
            fee_table=fee_table,
            rounding_mode=rounding_mode
        )
        priced["_row_warnings"] = "; ".join(warn1)
        out.append(priced)
    return out

def run_full_pricing(
    upload_path: str,
    mapping: Dict[str, str],
    marketplace: str,
    min_margin: float,
    max_margin: float,
    dropship_fee: float,
    fee_table: Dict[str, Any],
    rounding_mode: str = "ends_in_99"
) -> str:

    headers, _ = preview_upload(upload_path, max_rows=0)  # just headers
    with open(upload_path, "rb") as f:
        text = decode_bytes_guess(f.read())

    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    rows_out: List[Dict[str, Any]] = []

    for r in reader:
        normalized, warn1 = _normalize_row(r, mapping)
        shipping_estimate = 0.0
        priced, warn2 = compute_prices(
            normalized,
            marketplace=marketplace,
            min_margin=min_margin,
            max_margin=max_margin,
            dropship_fee=dropship_fee,
            shipping_estimate=shipping_estimate,
            fee_table=fee_table,
            rounding_mode=rounding_mode
        )
        if warn1:
            priced["_row_warnings"] = "; ".join(warn1)
        rows_out.append(priced)

    # Output CSV
    _ensure_dirs()
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(OUTPUT_DIR, f"pricing_{marketplace}_{ts}.csv")

    # Stable columns
    cols = [
        "supplier_sku", "upc", "title", "brand",
        "supplier_cost", "qty_available",
        "dropship_fee", "shipping_estimate", "base_total_cost",
        "min_price", "max_price", "marketplace",
        "map_price", "msrp",
        "_row_warnings", "warnings"
    ]

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for row in rows_out:
            w.writerow(row)

    return out_path
'@ | Set-Content -Encoding UTF8 $enginePath

Write-Host "Wrote: $enginePath"

# -----------------------------
# 3) Patch FastAPI: py\ecom_copilot_api.py
# -----------------------------
$apiPath = "$root\py\ecom_copilot_api.py"
if (-not (Test-Path $apiPath)) { throw "Missing: $apiPath" }
Backup-File $apiPath

$api = Get-Content $apiPath -Raw

$marker = "# === PRICING_MAPPING_API_V1 ==="
if ($api -notmatch [regex]::Escape($marker)) {

$append = @"

$marker
# Auto-added endpoints for Pricing + Mapping wizard
# Safe to re-run patch; marker prevents duplication.

from fastapi import UploadFile, File, Body
from fastapi.responses import FileResponse
import os
import json

try:
    from py.pricing_mapping_engine import (
        save_upload_bytes, preview_upload, load_mapping, save_mapping,
        price_preview_rows, run_full_pricing, CONFIG_DIR
    )
except Exception:
    # fallback if running with different working dir
    from pricing_mapping_engine import (
        save_upload_bytes, preview_upload, load_mapping, save_mapping,
        price_preview_rows, run_full_pricing, CONFIG_DIR
    )

# In-memory index of generated outputs (simple + fast for local dev)
_OUTPUT_INDEX = {}

def _read_fee_table():
    path = os.path.join(CONFIG_DIR, "marketplace_fees.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

@app.get("/api/suppliers")
def api_suppliers():
    # Best-effort: read data/suppliers.json first; else config/suppliers.csv
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_json = os.path.join(root, "data", "suppliers.json")
    cfg_csv = os.path.join(root, "config", "suppliers.csv")

    if os.path.exists(data_json):
        try:
            with open(data_json, "r", encoding="utf-8") as f:
                return {"suppliers": json.load(f)}
        except Exception:
            pass

    suppliers = []
    if os.path.exists(cfg_csv):
        import csv
        with open(cfg_csv, "r", encoding="utf-8-sig") as f:
            r = csv.DictReader(f)
            for row in r:
                suppliers.append(row)
    return {"suppliers": suppliers}

@app.post("/api/feeds/preview")
async def api_feeds_preview(file: UploadFile = File(...), max_rows: int = 25):
    content = await file.read()
    upload_id, path = save_upload_bytes(content)
    headers, rows = preview_upload(path, max_rows=max_rows)
    return {
        "upload_id": upload_id,
        "filename": file.filename,
        "headers": headers,
        "preview_rows": rows
    }

@app.get("/api/mappings/{supplier_code}")
def api_get_mapping(supplier_code: str):
    m = load_mapping(supplier_code)
    return {"mapping": None if not m else m}

@app.post("/api/mappings/{supplier_code}")
def api_save_mapping(supplier_code: str, payload: dict = Body(...)):
    mapping = payload.get("mapping") or payload
    path = save_mapping(supplier_code, mapping)
    return {"ok": True, "path": path}

@app.post("/api/pricing/preview")
def api_pricing_preview(payload: dict = Body(...)):
    upload_id = payload.get("upload_id")
    supplier_code = payload.get("supplier_code", "")
    mapping = payload.get("mapping") or {}
    marketplace = payload.get("marketplace", "amazon")
    min_margin = float(payload.get("min_margin", 0.18))
    max_margin = float(payload.get("max_margin", 0.35))
    dropship_fee = float(payload.get("dropship_fee", 0.0))
    rounding_mode = (payload.get("rounding_mode") or "ends_in_99")

    if not upload_id:
        return {"ok": False, "error": "Missing upload_id"}

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    upload_path = os.path.join(root, "data", "uploads", f"{upload_id}.csv")
    if not os.path.exists(upload_path):
        return {"ok": False, "error": "Upload not found. Re-upload the CSV."}

    # Get preview rows again (stable)
    _, preview_rows = preview_upload(upload_path, max_rows=int(payload.get("max_rows", 25)))

    fee_table = _read_fee_table()
    computed = price_preview_rows(
        preview_rows=preview_rows,
        mapping=mapping,
        marketplace=marketplace,
        min_margin=min_margin,
        max_margin=max_margin,
        dropship_fee=dropship_fee,
        fee_table=fee_table,
        rounding_mode=rounding_mode
    )
    return {"ok": True, "rows": computed}

@app.post("/api/pricing/run")
def api_pricing_run(payload: dict = Body(...)):
    upload_id = payload.get("upload_id")
    mapping = payload.get("mapping") or {}
    marketplace = payload.get("marketplace", "amazon")
    min_margin = float(payload.get("min_margin", 0.18))
    max_margin = float(payload.get("max_margin", 0.35))
    dropship_fee = float(payload.get("dropship_fee", 0.0))
    rounding_mode = (payload.get("rounding_mode") or "ends_in_99")

    if not upload_id:
        return {"ok": False, "error": "Missing upload_id"}

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    upload_path = os.path.join(root, "data", "uploads", f"{upload_id}.csv")
    if not os.path.exists(upload_path):
        return {"ok": False, "error": "Upload not found. Re-upload the CSV."}

    fee_table = _read_fee_table()
    out_path = run_full_pricing(
        upload_path=upload_path,
        mapping=mapping,
        marketplace=marketplace,
        min_margin=min_margin,
        max_margin=max_margin,
        dropship_fee=dropship_fee,
        fee_table=fee_table,
        rounding_mode=rounding_mode
    )

    out_id = os.path.basename(out_path).replace(".csv","")
    _OUTPUT_INDEX[out_id] = out_path
    return {"ok": True, "out_id": out_id, "download_url": f"/api/pricing/download/{out_id}", "out_path": out_path}

@app.get("/api/pricing/download/{out_id}")
def api_pricing_download(out_id: str):
    path = _OUTPUT_INDEX.get(out_id)
    if not path or not os.path.exists(path):
        return {"ok": False, "error": "Output not found (restart may have cleared index). Re-run pricing."}
    return FileResponse(path, media_type="text/csv", filename=os.path.basename(path))
"@

  $api = $api + $append
  Set-Content -Encoding UTF8 $apiPath $api
  Write-Host "Patched API: $apiPath"
} else {
  Write-Host "API already contains pricing marker; skipping API patch."
}

# -----------------------------
# 4) Write React Pricing Wizard page
# -----------------------------
$pricingPagePath = "$root\ui-web\src\pages\Pricing.tsx"
Ensure-Dir "$root\ui-web\src\pages"

@'
import React, { useEffect, useMemo, useState } from "react";

type Supplier = { Supplier?: string; supplier?: string; Code?: string; code?: string; [k: string]: any };

type PreviewResponse = {
  upload_id: string;
  filename: string;
  headers: string[];
  preview_rows: Record<string, string>[];
};

const API_BASE = "http://127.0.0.1:8001";

function pctToNum(v: string) {
  const n = Number(v);
  if (isNaN(n)) return 0;
  return n / 100;
}

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 999,
        display: "grid", placeItems: "center",
        background: "#0b1220", color: "white", fontWeight: 700
      }}>
        {step}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
    </div>
  );
}

export default function PricingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierCode, setSupplierCode] = useState("");
  const [marketplace, setMarketplace] = useState<"amazon"|"ebay"|"walmart"|"shopify">("amazon");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [uploadId, setUploadId] = useState<string>("");

  const [step, setStep] = useState(1);

  // Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({
    supplier_sku: "",
    supplier_cost: "",
    qty_available: "",
    upc: "",
    title: "",
    brand: "",
    map_price: "",
    msrp: ""
  });
  const [saveMapping, setSaveMapping] = useState(true);

  // Pricing settings
  const [minMarginPct, setMinMarginPct] = useState("18");
  const [maxMarginPct, setMaxMarginPct] = useState("35");
  const [dropshipFee, setDropshipFee] = useState("0.00");
  const [roundingMode, setRoundingMode] = useState<"ends_in_99"|"none">("ends_in_99");

  // Preview results
  const [pricedRows, setPricedRows] = useState<any[]>([]);
  const [runResult, setRunResult] = useState<{ download_url?: string; out_path?: string } | null>(null);

  const headers = preview?.headers ?? [];
  const headerOptions = useMemo(() => ["", ...headers], [headers]);

  async function loadSuppliers() {
    try {
      const r = await fetch(`${API_BASE}/api/suppliers`);
      const j = await r.json();
      setSuppliers(j.suppliers ?? []);
    } catch (e) {
      setSuppliers([]);
    }
  }

  useEffect(() => { loadSuppliers(); }, []);

  function supplierLabel(s: Supplier) {
    return (s.Supplier || s.supplier || "Supplier");
  }
  function supplierCodeFrom(s: Supplier) {
    return (s.Code || s.code || "").toString();
  }

  async function doUploadAndPreview() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_BASE}/api/feeds/preview?max_rows=25`, { method: "POST", body: fd });
    const j = await r.json();
    setPreview(j);
    setUploadId(j.upload_id);
    setStep(2);
  }

  async function doLoadSavedMapping() {
    if (!supplierCode) return;
    const r = await fetch(`${API_BASE}/api/mappings/${encodeURIComponent(supplierCode)}`);
    const j = await r.json();
    if (j?.mapping?.mapping) setMapping((prev) => ({ ...prev, ...j.mapping.mapping }));
  }

  async function doSaveMapping() {
    if (!supplierCode) return;
    await fetch(`${API_BASE}/api/mappings/${encodeURIComponent(supplierCode)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping })
    });
  }

  function mappingIsValid() {
    return mapping.supplier_sku && mapping.supplier_cost && mapping.qty_available;
  }

  async function doPricingPreview() {
    if (!uploadId) return;
    const payload = {
      upload_id: uploadId,
      supplier_code: supplierCode,
      mapping,
      marketplace,
      min_margin: pctToNum(minMarginPct),
      max_margin: pctToNum(maxMarginPct),
      dropship_fee: Number(dropshipFee),
      rounding_mode: roundingMode,
      max_rows: 25
    };
    const r = await fetch(`${API_BASE}/api/pricing/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.ok) setPricedRows(j.rows || []);
    setStep(4);
  }

  async function doRunPricing() {
    const payload = {
      upload_id: uploadId,
      mapping,
      marketplace,
      min_margin: pctToNum(minMarginPct),
      max_margin: pctToNum(maxMarginPct),
      dropship_fee: Number(dropshipFee),
      rounding_mode: roundingMode
    };
    const r = await fetch(`${API_BASE}/api/pricing/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.ok) setRunResult({ download_url: `${API_BASE}${j.download_url}`, out_path: j.out_path });
    setStep(5);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Pricing</div>
      <div style={{ color: "#667085", marginBottom: 18 }}>
        Upload a supplier CSV, map fields once, preview pricing, then export a priced CSV.
      </div>

      {/* Stepper */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 18
      }}>
        {[
          { n: 1, t: "Upload" },
          { n: 2, t: "Map" },
          { n: 3, t: "Pricing Rules" },
          { n: 4, t: "Preview" },
          { n: 5, t: "Results" }
        ].map(x => (
          <div key={x.n} style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: step === x.n ? "#0b1220" : "#f3f4f6",
            color: step === x.n ? "white" : "#111827",
            fontWeight: 700,
            cursor: x.n <= step ? "pointer" : "default"
          }}
            onClick={() => { if (x.n <= step) setStep(x.n); }}
          >
            {x.n}. {x.t}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18 }}>
          <StepHeader step={1} title="Upload supplier feed CSV" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Supplier</div>
              <select
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s, idx) => {
                  const code = supplierCodeFrom(s);
                  const label = supplierLabel(s);
                  return <option key={idx} value={code}>{label} ({code})</option>;
                })}
              </select>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={doLoadSavedMapping}
                  disabled={!supplierCode}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontWeight: 700 }}
                >
                  Load saved mapping
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Marketplace</div>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as any)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
              >
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="walmart">Walmart</option>
                <option value="shopify">Shopify</option>
              </select>
            </div>
          </div>

          <div style={{ fontWeight: 700, marginBottom: 6 }}>CSV file</div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div style={{ marginTop: 14 }}>
            <button
              onClick={doUploadAndPreview}
              disabled={!file || !supplierCode}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: (!file || !supplierCode) ? "#e5e7eb" : "#2563eb",
                color: (!file || !supplierCode) ? "#6b7280" : "white",
                fontWeight: 800
              }}
            >
              Upload + Preview
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#667085" }}>
            Tip: pick supplier first so we can save mapping to that supplier.
          </div>
        </div>
      )}

      {/* STEP 2: Map */}
      {step === 2 && preview && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18 }}>
          <StepHeader step={2} title="Map columns (required first)" />

          <div style={{ display: "grid", gap: 10 }}>
            {[
              { key: "supplier_sku", label: "Supplier SKU (required)" },
              { key: "supplier_cost", label: "Supplier Cost (required)" },
              { key: "qty_available", label: "Qty Available (required)" },
            ].map(f => (
              <div key={f.key} style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{f.label}</div>
                <select
                  value={mapping[f.key]}
                  onChange={(e) => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                >
                  {headerOptions.map(h => <option key={h} value={h}>{h || "— select —"}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Optional fields (recommended)</div>

            {[
              { key: "upc", label: "UPC" },
              { key: "title", label: "Title" },
              { key: "brand", label: "Brand" },
              { key: "map_price", label: "MAP Price" },
              { key: "msrp", label: "MSRP" }
            ].map(f => (
              <div key={f.key} style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{f.label}</div>
                <select
                  value={mapping[f.key]}
                  onChange={(e) => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                >
                  {headerOptions.map(h => <option key={h} value={h}>{h || "— none —"}</option>)}
                </select>
              </div>
            ))}

            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <input type="checkbox" checked={saveMapping} onChange={(e) => setSaveMapping(e.target.checked)} />
              <span style={{ fontWeight: 700 }}>Save this mapping for this supplier</span>
            </label>
          </div>

          {!mappingIsValid() && (
            <div style={{ marginTop: 12, color: "#b42318", fontWeight: 700 }}>
              Required mappings are missing. Map SKU, Cost, and Qty to continue.
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 800 }}
            >
              Back
            </button>

            <button
              onClick={async () => {
                if (!mappingIsValid()) return;
                if (saveMapping) await doSaveMapping();
                setStep(3);
              }}
              disabled={!mappingIsValid()}
              style={{
                padding: "10px 14px", borderRadius: 12, border: "none",
                background: mappingIsValid() ? "#2563eb" : "#e5e7eb",
                color: mappingIsValid() ? "white" : "#6b7280",
                fontWeight: 900
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pricing Rules */}
      {step === 3 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18 }}>
          <StepHeader step={3} title="Pricing rules (simple defaults)" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Min Margin (%)</div>
              <input value={minMarginPct} onChange={(e) => setMinMarginPct(e.target.value)}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }} />
              <div style={{ color: "#667085", marginTop: 6 }}>Example: 18 means target 18% gross margin.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Max Margin (%)</div>
              <input value={maxMarginPct} onChange={(e) => setMaxMarginPct(e.target.value)}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }} />
              <div style={{ color: "#667085", marginTop: 6 }}>Used for repricing ceiling (optional).</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Dropship Fee ($)</div>
              <input value={dropshipFee} onChange={(e) => setDropshipFee(e.target.value)}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }} />
              <div style={{ color: "#667085", marginTop: 6 }}>Added per item.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Rounding</div>
              <select value={roundingMode} onChange={(e) => setRoundingMode(e.target.value as any)}
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}>
                <option value="ends_in_99">End in .99</option>
                <option value="none">No special rounding</option>
              </select>
              <div style={{ color: "#667085", marginTop: 6 }}>Shipping is placeholder 0.00 until carrier feeds are wired.</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep(2)}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 800 }}
            >
              Back
            </button>

            <button
              onClick={doPricingPreview}
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 900 }}
            >
              Preview Pricing
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preview */}
      {step === 4 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18 }}>
          <StepHeader step={4} title="Preview (first 25 rows)" />

          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["supplier_sku","supplier_cost","qty_available","base_total_cost","min_price","max_price","_row_warnings","warnings"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricedRows.slice(0, 25).map((r, idx) => (
                  <tr key={idx}>
                    {["supplier_sku","supplier_cost","qty_available","base_total_cost","min_price","max_price","_row_warnings","warnings"].map(k => (
                      <td key={k} style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                        {String(r?.[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {pricedRows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 12, color: "#667085" }}>No preview rows yet (click Preview Pricing).</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep(3)}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 800 }}
            >
              Back
            </button>

            <button
              onClick={doRunPricing}
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "#16a34a", color: "white", fontWeight: 900 }}
            >
              Run Pricing + Export CSV
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Results */}
      {step === 5 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18 }}>
          <StepHeader step={5} title="Results" />

          {!runResult && (
            <div style={{ color: "#667085" }}>Run pricing to generate an output CSV.</div>
          )}

          {runResult && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Output saved:</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                {runResult.out_path}
              </div>

              <a
                href={runResult.download_url}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 900,
                  textDecoration: "none",
                  width: "fit-content"
                }}
              >
                Download CSV
              </a>

              <button
                onClick={() => { setRunResult(null); setStep(1); setFile(null); setPreview(null); setUploadId(""); setPricedRows([]); }}
                style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 800, width: "fit-content" }}
              >
                Start over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 $pricingPagePath

Write-Host "Wrote: $pricingPagePath"

# -----------------------------
# 5) Patch ui-web/src/App.tsx to include Pricing (best-effort)
# -----------------------------
$appTsx = "$root\ui-web\src\App.tsx"
if (-not (Test-Path $appTsx)) { throw "Missing: $appTsx" }
Backup-File $appTsx

$src = Get-Content $appTsx -Raw

$addedImport = $false
if ($src -notmatch 'from\s+["'']\.\/pages\/Pricing["'']') {
  # insert after last import line
  $src2 = $src -replace "(import .*?;\s*)(\r?\n\r?\n)", "`$1import PricingPage from ""./pages/Pricing"";`r`n`r`n"
  if ($src2 -ne $src) { $src = $src2; $addedImport = $true }
}

$addedRoute = $false

# Try react-router Routes insertion
if ($src -match "<Routes>") {
  if ($src -notmatch 'path=["'']\/pricing["'']') {
    $src2 = $src -replace "(<Routes>\s*)", "`$1`r`n      <Route path=""/pricing"" element={<PricingPage />} />`r`n"
    if ($src2 -ne $src) { $src = $src2; $addedRoute = $true }
  }
}

# If there is no <Routes>, we won't guess further. We'll print instruction.
Set-Content -Encoding UTF8 $appTsx $src

Write-Host ""
Write-Host "React wiring results:"
Write-Host (" - Added Pricing import: " + $addedImport)
Write-Host (" - Added /pricing route:  " + $addedRoute)

if (-not $addedRoute) {
  Write-Host ""
  Write-Host "NOTE: Could not auto-add the /pricing route (App.tsx structure differs)." -ForegroundColor Yellow
  Write-Host "Manual add (1 minute):" -ForegroundColor Yellow
  Write-Host "  1) Add: import PricingPage from ""./pages/Pricing"";" -ForegroundColor Yellow
  Write-Host "  2) Add route: <Route path=""/pricing"" element={<PricingPage />} />" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Pricing + Mapping patch installed."
Write-Host "Next: restart API + UI, then open http://localhost:3000/pricing"
