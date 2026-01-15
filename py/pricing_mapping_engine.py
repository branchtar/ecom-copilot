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
