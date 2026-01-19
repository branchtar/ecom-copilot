"""
Ecom Copilot - Local API
Dashboard + Suppliers + KMC pricing backbone for the web UI.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json


# ---------------------------------------------------------
# Paths & helpers
# ---------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SUPPLIERS_FILE = DATA_DIR / "suppliers.json"

DATA_DIR.mkdir(exist_ok=True)


def _load_suppliers() -> List[dict]:
    if not SUPPLIERS_FILE.exists():
        return []
    try:
        with SUPPLIERS_FILE.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        suppliers = payload.get("suppliers", [])
        if not isinstance(suppliers, list):
            return []
        return suppliers
    except Exception:
        return []


def _save_suppliers(suppliers: List[dict]) -> None:
    SUPPLIERS_FILE.write_text(
        json.dumps({"suppliers": suppliers}, indent=2),
        encoding="utf-8",
    )


def _next_id(suppliers: List[dict]) -> int:
    existing = [s.get("id", 0) for s in suppliers if isinstance(s.get("id", 0), int)]
    return (max(existing) if existing else 0) + 1


def _get_supplier_by_code(code: str) -> Optional[dict]:
    suppliers = _load_suppliers()
    for s in suppliers:
        if str(s.get("code", "")).lower() == code.lower():
            return s
    return None


# ---------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------


class Supplier(BaseModel):
    code: str
    name: str

    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    return_address1: Optional[str] = None
    return_address2: Optional[str] = None
    return_city: Optional[str] = None
    return_state: Optional[str] = None
    return_postal_code: Optional[str] = None
    return_country: Optional[str] = "US"

    handling_time_days: Optional[int] = 2

    min_gross_margin: Optional[float] = 0.25  # 25%
    max_gross_margin: Optional[float] = 0.50  # 50%

    # For future pricing/feed wiring
    products: Optional[int] = 0
    last_import: Optional[str] = None
    primary_marketplaces: Optional[List[str]] = []
    active: bool = True

    # Placeholders for CSV + mapping
    feed_filename: Optional[str] = None
    feed_mapping: Optional[dict] = None

    id: Optional[int] = None  # assigned server-side


class SupplierSummary(BaseModel):
    id: int
    name: str
    code: str
    products: int
    last_import: Optional[str]
    primary_marketplaces: List[str]
    active: bool


class ApiStatusItem(BaseModel):
    service: str
    status: str
    detail: Optional[str] = None


class KmcPricingItem(BaseModel):
    sku: str
    product: str
    brand: str
    supplier_code: str
    cost: float
    msrp: Optional[float] = None
    margin_used: float
    price_amazon: float
    price_shopify: float
    price_walmart: float


# ---------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------

app = FastAPI(
    title="Ecom Copilot API",
    version="0.1.0",
    description="Local API backend for the Ecom Copilot dashboard.",
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Basic endpoints
# ---------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok", "root": str(ROOT)}


@app.get("/dashboard/kpis")
def dashboard_kpis():
    return {
        "total_sales_7d": 17542.73,
        "orders_7d": 167,
        "returns_7d": 12,
        "items_sold_7d": 212,
    }


@app.get("/dashboard/marketplace-balances")
def dashboard_marketplace_balances():
    return [
        {
            "marketplace": "Amazon",
            "balance": 1872.45,
            "next_payout": "2024-04-30",
        },
        {
            "marketplace": "Walmart",
            "balance": 948.25,
            "next_payout": "2024-04-27",
        },
        {
            "marketplace": "Shopify",
            "balance": 527.90,
            "next_payout": "2024-05-02",
        },
        {
            "marketplace": "Reverb",
            "balance": 316.75,
            "next_payout": "2024-04-25",
        },
    ]


@app.get("/dashboard/recent-orders")
def dashboard_recent_orders():
    return [
        {
            "order_id": "#1332",
            "customer": "Kyle Mulvey",
            "status": "Shipped",
            "date": "2024-04-24",
            "total": 42.60,
        },
        {
            "order_id": "#1381",
            "customer": "Jane Smith",
            "status": "Pending",
            "date": "2024-04-24",
            "total": 19.95,
        },
        {
            "order_id": "#1360",
            "customer": "Mike Johnson",
            "status": "Shipped",
            "date": "2024-04-23",
            "total": 87.90,
        },
        {
            "order_id": "#1379",
            "customer": "Emma Davis",
            "status": "Cancelled",
            "date": "2024-04-23",
            "total": 15.45,
        },
    ]


@app.get("/dashboard/stock-alerts")
def dashboard_stock_alerts():
    return [
        {
            "sku": "KMC-ABC123",
            "product": "Drumstick S4 Hickory",
            "stock": 3,
            "supplier": "KMC Music",
        },
        {
            "sku": "ENS-789",
            "product": "Guitar Tuner Clip-On",
            "stock": 5,
            "supplier": "Ensoul Music",
        },
        {
            "sku": "LPD-456",
            "product": "Harmonica Key of C",
            "stock": 7,
            "supplier": "LPD Music",
        },
    ]


@app.get("/settings/api-status", response_model=List[ApiStatusItem])
def settings_api_status():
    return [
        {"service": "Amazon SP-API", "status": "warning", "detail": "Diagnostics not wired yet"},
        {"service": "Amazon Advertising", "status": "not_configured", "detail": "API keys not set"},
        {"service": "Shopify Admin API", "status": "connected", "detail": "Local dev store"},
        {"service": "Walmart Seller API", "status": "not_configured", "detail": None},
        {"service": "Reverb API", "status": "not_configured", "detail": None},
    ]


# ---------------------------------------------------------
# Suppliers endpoints
# ---------------------------------------------------------


@app.get("/suppliers/summary", response_model=List[SupplierSummary])
def suppliers_summary():
    suppliers = _load_suppliers()

    if not suppliers:
        suppliers = [
            {
                "id": 1,
                "code": "KMC",
                "name": "KMC Music",
                "products": 1243,
                "last_import": "2024-04-25",
                "primary_marketplaces": ["Amazon Bwaaack", "Reverb"],
                "active": True,
                "handling_time_days": 2,
                "min_gross_margin": 0.25,
                "max_gross_margin": 0.50,
            },
            {
                "id": 2,
                "code": "ENSOUL",
                "name": "Ensoul Music",
                "products": 842,
                "last_import": "2024-04-24",
                "primary_marketplaces": ["Amazon Bwaaack", "Shopify Ethnic"],
                "active": True,
                "handling_time_days": 2,
                "min_gross_margin": 0.25,
                "max_gross_margin": 0.50,
            },
            {
                "id": 3,
                "code": "LPD",
                "name": "LPD Music",
                "products": 412,
                "last_import": "2024-04-10",
                "primary_marketplaces": ["Amazon Bwaaack"],
                "active": False,
                "handling_time_days": 3,
                "min_gross_margin": 0.20,
                "max_gross_margin": 0.45,
            },
        ]
        _save_suppliers(suppliers)

    summaries: List[SupplierSummary] = []
    for s in suppliers:
        summaries.append(
            SupplierSummary(
                id=int(s.get("id", 0) or 0),
                name=str(s.get("name", "")),
                code=str(s.get("code", "")),
                products=int(s.get("products", 0) or 0),
                last_import=s.get("last_import"),
                primary_marketplaces=list(s.get("primary_marketplaces") or []),
                active=bool(s.get("active", True)),
            )
        )
    return summaries


@app.get("/suppliers/{code}", response_model=Supplier)
def get_supplier(code: str):
    suppliers = _load_suppliers()
    for s in suppliers:
        if s.get("code", "").lower() == code.lower():
            return Supplier(**s)
    raise HTTPException(status_code=404, detail="Supplier not found")


@app.post("/suppliers", response_model=Supplier)
def upsert_supplier(supplier: Supplier):
    suppliers = _load_suppliers()

    if supplier.id is None:
        supplier.id = _next_id(suppliers)

    replaced = False
    new_list = []
    for s in suppliers:
        if s.get("code", "").lower() == supplier.code.lower():
            new_list.append(supplier.dict())
            replaced = True
        else:
            new_list.append(s)

    if not replaced:
        new_list.append(supplier.dict())

    _save_suppliers(new_list)
    return supplier


# ---------------------------------------------------------
# KMC Pricing preview endpoint
# ---------------------------------------------------------

KMC_FEED = [
    {
        "sku": "KMC-DRUM-S4",
        "product": "Drumstick S4 Hickory",
        "brand": "KMC",
        "cost": 4.20,
        "msrp": 9.99,
    },
    {
        "sku": "KMC-GTR-STRINGS-10",
        "product": "Electric Guitar Strings 10-46",
        "brand": "KMC",
        "cost": 3.10,
        "msrp": 7.99,
    },
    {
        "sku": "KMC-KB-STAND",
        "product": "Keyboard Stand Double Braced",
        "brand": "KMC",
        "cost": 24.00,
        "msrp": 59.99,
    },
    {
        "sku": "KMC-MIC-CABLE-25",
        "product": "Mic Cable XLR 25ft",
        "brand": "KMC",
        "cost": 7.50,
        "msrp": 19.99,
    },
]


def _price_from_margin(cost: float, margin: float) -> float:
    """
    margin = (price - cost) / price
    price = cost / (1 - margin)
    """
    margin = max(0.0, min(margin, 0.95))
    if margin >= 0.95:
        margin = 0.95
    if margin <= 0.0:
        return round(cost, 2)
    price = cost / (1.0 - margin)
    return round(price, 2)


@app.get("/pricing/kmc/preview", response_model=List[KmcPricingItem])
def pricing_kmc_preview():
    """
    Simple KMC pricing preview:
    - Uses KMC supplier's min_gross_margin if defined, else 0.25
    - Applies a small tweak per marketplace just to show differences.
    """
    supplier = _get_supplier_by_code("KMC")
    base_margin = 0.25
    if supplier is not None:
        try:
            mgm = supplier.get("min_gross_margin")
            if isinstance(mgm, (int, float)):
                base_margin = float(mgm)
        except Exception:
            pass

    items: List[KmcPricingItem] = []
    for row in KMC_FEED:
        cost = float(row["cost"])
        msrp = float(row.get("msrp") or 0.0) or None

        # simple per-channel tweaks
        margin_amz = base_margin
        margin_shp = base_margin + 0.03
        margin_wmt = base_margin + 0.01

        price_amz = _price_from_margin(cost, margin_amz)
        price_shp = _price_from_margin(cost, margin_shp)
        price_wmt = _price_from_margin(cost, margin_wmt)

        items.append(
            KmcPricingItem(
                sku=row["sku"],
                product=row["product"],
                brand=row["brand"],
                supplier_code="KMC",
                cost=cost,
                msrp=msrp,
                margin_used=base_margin,
                price_amazon=price_amz,
                price_shopify=price_shp,
                price_walmart=price_wmt,
            )
        )
    return items


# ---------------------------------------------------------
# Uvicorn entrypoint
# ---------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "ecom_copilot_api:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
    )

# === PRICING_MAPPING_API_V1 ===
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



----                                                                                     ----------
C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot\py\ecom_copilot_api.py        133


# EC_SUPPLIER_MODULE_START
from pathlib import Path
import csv
import re
from typing import Any, Dict, List, Optional

from fastapi import UploadFile, File, HTTPException
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SUPPLIER_DATA_DIR = PROJECT_ROOT / "data" / "suppliers"
_SUPPLIER_KEY_RE = re.compile(r"^[A-Za-z0-9_\-]+$")

def _safe_supplier_key(supplier_key: str) -> str:
    supplier_key = (supplier_key or "").strip()
    if not supplier_key or not _SUPPLIER_KEY_RE.match(supplier_key):
        raise HTTPException(status_code=400, detail="Invalid supplier_key (use letters, numbers, _ or -).")
    return supplier_key

def _supplier_dir(supplier_key: str) -> Path:
    supplier_key = _safe_supplier_key(supplier_key)
    d = SUPPLIER_DATA_DIR / supplier_key
    d.mkdir(parents=True, exist_ok=True)
    return d

def _read_csv_sample(path: Path, limit: int = 25) -> Dict[str, Any]:
    if not path.exists():
        raise HTTPException(status_code=404, detail="Feed file not found. Upload a CSV first.")

    rows: List[Dict[str, Any]] = []
    headers: List[str] = []
    total_rows = 0

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        for r in reader:
            total_rows += 1
            if len(rows) < limit:
                rows.append(r)

    return {"headers": headers, "rows": rows, "total_rows": total_rows}

class SupplierMapping(BaseModel):
    sku_col: str
    cost_col: str
    upc_col: Optional[str] = None
    brand_col: Optional[str] = None
    title_col: Optional[str] = None

@app.post("/api/suppliers/{supplier_key}/feed/upload")
async def upload_supplier_feed(supplier_key: str, file: UploadFile = File(...)):
    supplier_key = _safe_supplier_key(supplier_key)

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    d = _supplier_dir(supplier_key)
    feed_path = d / "feed.csv"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")
    feed_path.write_bytes(content)

    return {"supplier_key": supplier_key, "feed_path": str(feed_path), **_read_csv_sample(feed_path, limit=25)}

@app.get("/api/suppliers/{supplier_key}/feed/sample")
def get_supplier_feed_sample(supplier_key: str, limit: int = 25):
    supplier_key = _safe_supplier_key(supplier_key)
    d = _supplier_dir(supplier_key)
    feed_path = d / "feed.csv"
    limit = max(1, min(int(limit or 25), 200))
    return {"supplier_key": supplier_key, **_read_csv_sample(feed_path, limit=limit)}

@app.get("/api/suppliers/{supplier_key}/feed/status")
def get_supplier_feed_status(supplier_key: str):
    supplier_key = _safe_supplier_key(supplier_key)
    d = _supplier_dir(supplier_key)

    feed_path = d / "feed.csv"
    mapping_path = d / "mapping.json"

    status = {
        "supplier_key": supplier_key,
        "has_feed": feed_path.exists(),
        "has_mapping": mapping_path.exists(),
        "feed_path": str(feed_path),
        "mapping_path": str(mapping_path),
    }

    if feed_path.exists():
        try:
            status.update(_read_csv_sample(feed_path, limit=1))
        except Exception:
            pass

    if mapping_path.exists():
        try:
            import json
            status["mapping"] = json.loads(mapping_path.read_text(encoding="utf-8"))
        except Exception:
            status["mapping"] = None

    return status

@app.post("/api/suppliers/{supplier_key}/feed/mapping")
def set_supplier_feed_mapping(supplier_key: str, mapping: SupplierMapping):
    supplier_key = _safe_supplier_key(supplier_key)
    d = _supplier_dir(supplier_key)

    feed_path = d / "feed.csv"
    if not feed_path.exists():
        raise HTTPException(status_code=400, detail="Upload a CSV feed first.")

    sample = _read_csv_sample(feed_path, limit=1)
    headers = set(sample.get("headers") or [])
    required = [mapping.sku_col, mapping.cost_col]
    missing = [c for c in required if c not in headers]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns in CSV: {missing}")

    import json
    mapping_path = d / "mapping.json"
    mapping_path.write_text(mapping.model_dump_json(indent=2), encoding="utf-8")

    return {"supplier_key": supplier_key, "ok": True, "mapping": mapping.model_dump()}

@app.get("/api/suppliers/{supplier_key}/feed/mapping")
def get_supplier_feed_mapping(supplier_key: str):
    supplier_key = _safe_supplier_key(supplier_key)
    d = _supplier_dir(supplier_key)
    mapping_path = d / "mapping.json"
    if not mapping_path.exists():
        return {"supplier_key": supplier_key, "mapping": None}
    import json
    return {"supplier_key": supplier_key, "mapping": json.loads(mapping_path.read_text(encoding="utf-8"))}
# EC_SUPPLIER_MODULE_END


# =========================
# =========================
# =========================
# EC_SUPPLIERS_API_START
# =========================
import json
from typing import List, Optional
from pydantic import BaseModel

def _suppliers_path():
    # Store in project root /data/suppliers.json
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "suppliers.json")

def _load_suppliers() -> list:
    path = _suppliers_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []

def _save_suppliers(items: list):
    path = _suppliers_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

def _normalize_supplier(s: dict) -> dict:
    # Make sure older records still work after we add fields.
    return {
        "key": (s.get("key") or "").strip(),
        "name": (s.get("name") or "").strip(),
        "location": (s.get("location") or "USA").strip(),
        "contact_name": (s.get("contact_name") or "").strip(),
        "contact_email": (s.get("contact_email") or "").strip(),
        "phone": (s.get("phone") or "").strip(),
        "website": (s.get("website") or "").strip(),
        "return_address": (s.get("return_address") or "").strip(),
    }

class SupplierIn(BaseModel):
    key: str
    name: str
    location: Optional[str] = "USA"
    contact_name: Optional[str] = ""
    contact_email: Optional[str] = ""
    phone: Optional[str] = ""
    website: Optional[str] = ""
    return_address: Optional[str] = ""

class SupplierUpdate(BaseModel):
    # key is immutable (we update by key)
    name: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    return_address: Optional[str] = None

class SupplierOut(BaseModel):
    key: str
    name: str
    location: str
    contact_name: str
    contact_email: str
    phone: str
    website: str
    return_address: str

def _find_supplier(items: list, supplier_key: str):
    for i, s in enumerate(items):
        if (s.get("key") or "") == supplier_key:
            return i, s
    return None, None

@app.get("/api/suppliers", response_model=List[SupplierOut])
def api_list_suppliers():
    items = [_normalize_supplier(x) for x in _load_suppliers()]
    items = sorted(items, key=lambda x: ((x.get("name") or "").lower(), (x.get("key") or "")))
    return items

@app.get("/api/suppliers/{supplier_key}", response_model=SupplierOut)
def api_get_supplier(supplier_key: str):
    supplier_key = (supplier_key or "").strip()
    items = [_normalize_supplier(x) for x in _load_suppliers()]
    _, s = _find_supplier(items, supplier_key)
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return s

@app.post("/api/suppliers", response_model=SupplierOut)
def api_create_supplier(payload: SupplierIn):
    items = [_normalize_supplier(x) for x in _load_suppliers()]
    key = (payload.key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Supplier key is required.")
    if any((s.get("key") == key) for s in items):
        raise HTTPException(status_code=400, detail=f"Supplier key already exists: {key}")

    sup = _normalize_supplier({
        "key": key,
        "name": (payload.name or "").strip(),
        "location": (payload.location or "USA").strip(),
        "contact_name": payload.contact_name or "",
        "contact_email": payload.contact_email or "",
        "phone": payload.phone or "",
        "website": payload.website or "",
        "return_address": payload.return_address or "",
    })

    if not sup["name"]:
        raise HTTPException(status_code=400, detail="Supplier name is required.")

    items.append(sup)
    _save_suppliers(items)
    return sup

@app.put("/api/suppliers/{supplier_key}", response_model=SupplierOut)
def api_update_supplier(supplier_key: str, payload: SupplierUpdate):
    supplier_key = (supplier_key or "").strip()
    items = [_normalize_supplier(x) for x in _load_suppliers()]
    idx, existing = _find_supplier(items, supplier_key)
    if existing is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    updated = dict(existing)

    if payload.name is not None: updated["name"] = (payload.name or "").strip()
    if payload.location is not None: updated["location"] = (payload.location or "USA").strip()
    if payload.contact_name is not None: updated["contact_name"] = (payload.contact_name or "").strip()
    if payload.contact_email is not None: updated["contact_email"] = (payload.contact_email or "").strip()
    if payload.phone is not None: updated["phone"] = (payload.phone or "").strip()
    if payload.website is not None: updated["website"] = (payload.website or "").strip()
    if payload.return_address is not None: updated["return_address"] = (payload.return_address or "").strip()

    if not updated.get("name"):
        raise HTTPException(status_code=400, detail="Supplier name is required.")

    items[idx] = _normalize_supplier(updated)
    _save_suppliers(items)
    return items[idx]

@app.delete("/api/suppliers/{supplier_key}")
def api_delete_supplier(supplier_key: str):
    supplier_key = (supplier_key or "").strip()
    items = [_normalize_supplier(x) for x in _load_suppliers()]
    idx, existing = _find_supplier(items, supplier_key)
    if existing is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    items.pop(idx)
    _save_suppliers(items)
    return {"ok": True, "deleted_key": supplier_key}

# =========================
# EC_SUPPLIERS_API_END
# =========================
# =========================
# =========================