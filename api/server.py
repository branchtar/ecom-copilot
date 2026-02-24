from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import json
import sqlite3
from pathlib import Path
from typing import Optional

import requests
from cryptography.fernet import Fernet, InvalidToken

from pricing_engine import compute_pricing

app = FastAPI()

# ============================================================
# CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Paths
# ============================================================
BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "pricing_config.json"
DB_PATH = BASE_DIR / "ecom_copilot.db"

# ============================================================
# Encryption (Fernet)
#   Set TOKEN_ENC_KEY in env (one-time)
# ============================================================
TOKEN_ENC_KEY = os.getenv("TOKEN_ENC_KEY", "").strip()
if not TOKEN_ENC_KEY:
    # Fail loudly for production; for local dev you can temporarily generate one.
    # But you should set it in your .env for persistence.
    raise RuntimeError(
        "Missing TOKEN_ENC_KEY in environment. Generate one with:\n"
        "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )

fernet = Fernet(TOKEN_ENC_KEY.encode("utf-8"))

# ============================================================
# DB helpers
# ============================================================
def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def db_init():
    with db_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sellers (
                seller_id TEXT PRIMARY KEY,
                amazon_refresh_token_enc TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()

db_init()

def encrypt_text(s: str) -> str:
    return fernet.encrypt(s.encode("utf-8")).decode("utf-8")

def decrypt_text(s: str) -> str:
    return fernet.decrypt(s.encode("utf-8")).decode("utf-8")

# ============================================================
# Pricing config
# ============================================================
def load_pricing_config() -> dict:
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"version": 1, "suppliers": {}}

def save_pricing_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

# ============================================================
# Health + Dashboard (single source of truth)
# ============================================================
@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dashboard/kpis")
def dashboard_kpis():
    # Keep ONE shape. Pick the UI shape you want and stick to it.
    return {
        "totalSales7d": 0,
        "orders7d": 0,
        "returns7d": 0,
        "itemsSold7d": 0
    }

@app.get("/dashboard/marketplace-balances")
def dashboard_marketplace_balances():
    return []

@app.get("/dashboard/recent-orders")
def dashboard_recent_orders():
    return []

@app.get("/dashboard/stock-alerts")
def dashboard_stock_alerts():
    return []

# ============================================================
# Suppliers (demo)
# ============================================================
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

# ============================================================
# Pricing endpoints (clean, unified)
# ============================================================
@app.get("/api/pricing/config")
def get_pricing_config(supplier_key: str = ""):
    cfg = load_pricing_config()
    if supplier_key:
        sup = (cfg.get("suppliers") or {}).get(supplier_key)
        return {"supplier_key": supplier_key, "config": sup}
    return cfg

@app.put("/api/pricing/config")
def put_pricing_config(payload: dict):
    supplier_key = (payload or {}).get("supplier_key")
    hard_costs = (payload or {}).get("hard_costs") or {}

    if not supplier_key:
        return {"ok": False, "error": "supplier_key required"}

    cfg = load_pricing_config()
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

    save_pricing_config(cfg)
    return {"ok": True, "supplier_key": supplier_key, "hard_costs": cfg["suppliers"][supplier_key]["hard_costs"]}

@app.post("/api/pricing/preview")
def pricing_preview(payload: dict):
    cfg = load_pricing_config()
    return compute_pricing(payload, cfg)

# ============================================================
# Amazon Multi-tenant “Connect” (V0 Launch)
#   Users paste their Refresh Token.
#   We validate by requesting an LWA access token.
# ============================================================
class AmazonConnectIn(BaseModel):
    seller_id: str
    refresh_token: str

def lwa_exchange_refresh_for_access(refresh_token: str) -> str:
    client_id = os.getenv("LWA_CLIENT_ID", "").strip()
    client_secret = os.getenv("LWA_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Missing LWA_CLIENT_ID or LWA_CLIENT_SECRET on server")

    url = "https://api.amazon.com/auth/o2/token"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    r = requests.post(url, data=data, timeout=30)
    if r.status_code != 200:
        # Don't leak full details—just enough for debugging
        raise HTTPException(status_code=400, detail=f"LWA token exchange failed: {r.status_code}")

    j = r.json()
    access_token = j.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="LWA token exchange returned no access_token")
    return access_token

@app.post("/amazon/connect")
def amazon_connect(inp: AmazonConnectIn):
    # 1) validate refresh token works
    _ = lwa_exchange_refresh_for_access(inp.refresh_token)

    # 2) store encrypted refresh token per seller
    token_enc = encrypt_text(inp.refresh_token)

    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO sellers (seller_id, amazon_refresh_token_enc)
            VALUES (?, ?)
            ON CONFLICT(seller_id) DO UPDATE SET amazon_refresh_token_enc=excluded.amazon_refresh_token_enc
            """,
            (inp.seller_id, token_enc),
        )
        conn.commit()

    return {"ok": True, "seller_id": inp.seller_id}

@app.get("/amazon/sellers")
def amazon_sellers():
    with db_conn() as conn:
        rows = conn.execute("SELECT seller_id, created_at FROM sellers ORDER BY created_at DESC").fetchall()
    return [{"seller_id": r["seller_id"], "created_at": r["created_at"]} for r in rows]
