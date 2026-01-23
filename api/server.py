from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import json
from pathlib import Path
from pricing_engine import compute_pricing

app = FastAPI()





# === EC_AMAZON_CONNECT_START ===
# Amazon Connect (Step 1): generate the Seller Central consent URL.
# Env vars (set locally or in AWS App Runner):
#   AMAZON_SPAPI_APP_ID         (required)  e.g., amzn1.sellerapps.app....
#   AMAZON_SELLER_CENTRAL_BASE  (optional)  default https://sellercentral.amazon.com
#   AMAZON_SPAPI_REDIRECT_URI   (optional)  callback URL (we'll add callback endpoint next)
#   AMAZON_SPAPI_USE_BETA       (optional)  true/1 to append version=beta for draft apps
#
# This endpoint has NO side effects. It only returns an authorize_url.

@app.get("/api/integrations/amazon/start")
def amazon_connect_start(tenant: str = "dev"):
    import os, json, time, secrets, base64
    from urllib.parse import urlencode

    application_id = (os.getenv("AMAZON_SPAPI_APP_ID") or "").strip()
    if not application_id:
        return {"ok": False, "error": "Missing env var AMAZON_SPAPI_APP_ID"}

    seller_central = (os.getenv("AMAZON_SELLER_CENTRAL_BASE") or "https://sellercentral.amazon.com").rstrip("/")
    redirect_uri = (os.getenv("AMAZON_SPAPI_REDIRECT_URI") or "").strip()
    use_beta = (os.getenv("AMAZON_SPAPI_USE_BETA") or "").strip().lower() in ("1", "true", "yes", "y")

    state_obj = {"tenant": tenant, "ts": int(time.time()), "nonce": secrets.token_urlsafe(12)}
    state_json = json.dumps(state_obj, separators=(", ", ":")).encode("utf-8")
    state = base64.urlsafe_b64encode(state_json).decode("utf-8").rstrip("=")

    params = {
        "application_id": application_id,
        "state": state,
    }
    if redirect_uri:
        params["redirect_uri"] = redirect_uri
    if use_beta:
        params["version"] = "beta"

    authorize_url = f"{seller_central}/apps/authorize/consent?{urlencode(params)}"

    return {
        "ok": True,
        "authorize_url": authorize_url,
        "state": state,
        "seller_central": seller_central,
    }

# === EC_AMAZON_CONNECT_END ===

# === EC_PRICING_START ===
# Pricing feature: config + preview endpoints
# (Safe block; can be expanded later with real marketplace fee lookups)

CONFIG_PATH = Path(__file__).parent / "pricing_config.json"

def load_pricing_config() -> dict:
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}

def save_pricing_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

@app.get("/pricing/config")
def pricing_get_config():
    return load_pricing_config()

@app.post("/pricing/config")
def pricing_set_config(cfg: dict):
    save_pricing_config(cfg)
    return {"ok": True}

@app.post("/pricing/preview")
def pricing_preview(payload: dict):
    cfg = load_pricing_config()
    return compute_pricing(payload, cfg)

# === EC_PRICING_END ===
# === EC_DASHBOARD_START ===
# Minimal dashboard endpoints so the UI stops showing "Could not reach API".
# Expand these later with real data sources.

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dashboard/kpis")
def dashboard_kpis():
    return {
        "total_sales_7d": 0,
        "orders_7d": 0,
        "returns_7d": 0,
        "items_sold_7d": 0
    }

@app.get("/dashboard/marketplace-balances")
def dashboard_marketplace_balances():
    # UI can render "No balances loaded yet."
    return []

@app.get("/dashboard/recent-orders")
def dashboard_recent_orders():
    # UI can render "No orders loaded yet."
    return []

@app.get("/dashboard/stock-alerts")
def dashboard_stock_alerts():
    # UI can render "No low stock alerts yet."
    return []
# === EC_DASHBOARD_END ===





# Allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Demo endpoints used by SuppliersPage ---
@app.get("/api/suppliers")
def list_suppliers():
    return [
        {"id": "KMC", "key": "KMC", "name": "KMC Music", "location": "USA"},
        {"id": "ENSOUL", "key": "ENSOUL", "name": "Ensoul Music", "location": "USA"},
        {"id": "CHESBRO", "key": "CHESBRO", "name": "Chesbro Music", "location": "USA"},
    ]

@app.get("/api/suppliers/{supplier_id}")
def supplier_detail(supplier_id: str):
    return {
        "id": supplier_id,
        "key": supplier_id,
        "name": supplier_id,
        "location": "USA",
        "notes": "Demo detail endpoint",
    }

# Optional: pricing preview endpoints SuppliersPage probes
@app.get("/api/suppliers/{supplier_id}/pricing_preview")
def pricing_preview_supplier(supplier_id: str):
    return {"rows": []}

@app.get("/api/kmc/pricing_preview")
def pricing_preview_kmc():
    return {"rows": []}

@app.get("/api/pricing/kmc_preview")
def pricing_preview_kmc_alt():
    return {"rows": []}

# -------------------------------------------------------------------
# UI compatibility endpoints (React dashboard expects these)
# -------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dashboard/kpis")
def dashboard_kpis():
    # Placeholder metrics until real data wiring is implemented
    return {
        "totalSales7d": 0,
        "orders7d": 0,
        "returns7d": 0,
        "itemsSold7d": 0
    }

@app.get("/dashboard/orders_recent")
def dashboard_orders_recent():
    return []

@app.get("/dashboard/stock_alerts")
def dashboard_stock_alerts():
    return []


# === EC_PRICING_CONFIG_START ===
# Pricing config endpoints (safe, additive)
PRICING_CONFIG_PATH = Path(__file__).resolve().parent / "pricing_config.json"

def _load_pricing_config():
    try:
        with open(PRICING_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"version": 1, "suppliers": {}}

def _save_pricing_config(cfg: dict):
    with open(PRICING_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

@app.get("/api/pricing/config")
def get_pricing_config(supplier_key: str = ""):
    cfg = _load_pricing_config()
    if supplier_key:
        sup = (cfg.get("suppliers") or {}).get(supplier_key)
        return {"supplier_key": supplier_key, "config": sup}
    return cfg

@app.put("/api/pricing/config")
def put_pricing_config(payload: dict):
    """
    payload:
      { "supplier_key": "KMC", "hard_costs": {...} }
    """
    supplier_key = (payload or {}).get("supplier_key")
    hard_costs = (payload or {}).get("hard_costs") or {}

    if not supplier_key:
        return {"ok": False, "error": "supplier_key required"}

    cfg = _load_pricing_config()
    cfg.setdefault("version", 1)
    cfg.setdefault("suppliers", {})

    cfg["suppliers"].setdefault(supplier_key, {"key": supplier_key})
    cfg["suppliers"][supplier_key].setdefault("hard_costs", {})

    allowed = {
        "dropship_fee",
        "handling_fee",
        "misc_fee",
        "shipping_base",
        "shipping_per_lb",
        "dim_divisor",
        "marketplace_fee_pct_override",
    }

    for k, v in hard_costs.items():
        if k in allowed:
            try:
                cfg["suppliers"][supplier_key]["hard_costs"][k] = float(v)
            except Exception:
                pass

    _save_pricing_config(cfg)
    return {"ok": True, "supplier_key": supplier_key, "hard_costs": cfg["suppliers"][supplier_key]["hard_costs"]}
# === EC_PRICING_CONFIG_END ===
