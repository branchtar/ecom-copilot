"""
Supplier pricing engine for Ecom Copilot.

First pass:
- Reads config/suppliers.csv
- Reads data/supplier_products.csv
- Calculates Amazon min/max prices based on target gross margin and basic fee model.
- Writes output/supplier_prices_amazon.csv

Formulas (Amazon):

Let:
  P = listing price
  C = cost
  S = shipping_cost_estimate
  r = referral_fee_pct (e.g. 0.15 for 15%)
  F = fixed marketplace fee (per order), currently 0

Gross margin on sale price:
  margin = (P - C - S - F - r*P) / P

Solve for P given target margin m:
  m = 1 - (C+S+F)/P - r
  (C+S+F)/P = 1 - r - m
  P = (C+S+F) / (1 - r - m)

We use supplier-specific min/max margins and compute:
  amazon_min_price, amazon_max_price
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_SUPPLIERS = BASE_DIR / "config" / "suppliers.csv"
DATA_PRODUCTS = BASE_DIR / "data" / "supplier_products.csv"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_AMAZON = OUTPUT_DIR / "supplier_prices_amazon.csv"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class Supplier:
    code: str
    name: str
    origin_zip: str
    default_handling_days: int
    amazon_min_margin: float
    amazon_max_margin: float


def _parse_float(v: str, default: float = 0.0) -> float:
    try:
        v = v.strip()
        if not v:
            return default
        return float(v)
    except Exception:
        return default


def _parse_int(v: str, default: int = 0) -> int:
    try:
        v = v.strip()
        if not v:
            return default
        return int(float(v))
    except Exception:
        return default


def load_suppliers(path: Path) -> Dict[str, Supplier]:
    suppliers: Dict[str, Supplier] = {}
    if not path.is_file():
        print(f"âš  suppliers.csv not found at {path}")
        return suppliers

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("supplier_code") or "").strip()
            if not code:
                continue
            name = (row.get("supplier_name") or "").strip() or code
            origin_zip = (row.get("origin_zip") or "").strip()
            default_handling = _parse_int(row.get("default_handling_days") or "0", 0)
            min_margin = _parse_float(row.get("amazon_min_margin_pct") or "0", 0.2)
            max_margin = _parse_float(row.get("amazon_max_margin_pct") or "0", 0.35)

            suppliers[code] = Supplier(
                code=code,
                name=name,
                origin_zip=origin_zip,
                default_handling_days=default_handling,
                amazon_min_margin=min_margin,
                amazon_max_margin=max_margin,
            )

    print(f"Loaded {len(suppliers)} suppliers from {path}")
    return suppliers


def load_products(path: Path) -> List[dict]:
    products: List[dict] = []
    if not path.is_file():
        print(f"âš  supplier_products.csv not found at {path}")
        return products

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip completely empty lines
            if not any((v or "").strip() for v in row.values()):
                continue
            products.append(row)

    print(f"Loaded {len(products)} products from {path}")
    return products


def compute_price_for_margin(
    cost: float,
    shipping: float,
    target_margin: float,
    referral_pct: float,
    fixed_fee: float = 0.0,
) -> Optional[float]:
    """
    Compute price P such that gross margin â‰ˆ target_margin.
    Returns None if formula would divide by zero or negative.
    """
    denom = 1.0 - referral_pct - target_margin
    if denom <= 0:
        return None

    numerator = cost + shipping + fixed_fee
    if numerator <= 0:
        numerator = cost + shipping  # still allow 0 fee

    return numerator / denom


def compute_margin_for_price(
    price: float,
    cost: float,
    shipping: float,
    referral_pct: float,
    fixed_fee: float = 0.0,
) -> float:
    if price <= 0:
        return 0.0
    gross = price - cost - shipping - fixed_fee - (referral_pct * price)
    return gross / price


def main() -> None:
    print("=== Ecom Copilot Supplier Pricing (Amazon) ===")
    print(f"Root: {BASE_DIR}")
    print("")

    suppliers = load_suppliers(CONFIG_SUPPLIERS)
    products = load_products(DATA_PRODUCTS)

    if not suppliers or not products:
        print("Nothing to do (no suppliers or products).")
        return

    # Simple Amazon fee model for now (we can refine later or per-category)
    amazon_referral_pct = 0.15  # 15% referral
    amazon_fixed_fee = 0.0      # tweak later if needed

    rows_out: List[dict] = []

    for row in products:
        supplier_code = (row.get("supplier_code") or "").strip()
        sku = (row.get("sku") or "").strip()
        barcode = (row.get("barcode") or "").strip()

        if not supplier_code or supplier_code not in suppliers:
            print(f"âš  Skipping SKU {sku!r}: unknown supplier_code {supplier_code!r}")
            continue

        supplier = suppliers[supplier_code]

        cost = _parse_float(row.get("cost") or "0", 0.0)
        shipping_est = _parse_float(row.get("shipping_cost_estimate") or "0", 0.0)

        min_m = supplier.amazon_min_margin
        max_m = supplier.amazon_max_margin

        price_min = compute_price_for_margin(
            cost,
            shipping_est,
            min_m,
            amazon_referral_pct,
            amazon_fixed_fee,
        )
        price_max = compute_price_for_margin(
            cost,
            shipping_est,
            max_m,
            amazon_referral_pct,
            amazon_fixed_fee,
        )

        margin_at_min = (
            compute_margin_for_price(price_min, cost, shipping_est, amazon_referral_pct, amazon_fixed_fee)
            if price_min is not None
            else 0.0
        )
        margin_at_max = (
            compute_margin_for_price(price_max, cost, shipping_est, amazon_referral_pct, amazon_fixed_fee)
            if price_max is not None
            else 0.0
        )

        out = {
            "supplier_code": supplier_code,
            "supplier_name": supplier.name,
            "sku": sku,
            "barcode": barcode,
            "cost": f"{cost:.2f}",
            "shipping_cost_estimate": f"{shipping_est:.2f}",
            "amazon_referral_pct": amazon_referral_pct,
            "amazon_min_margin_target": min_m,
            "amazon_max_margin_target": max_m,
            "amazon_min_price": f"{price_min:.2f}" if price_min is not None else "",
            "amazon_max_price": f"{price_max:.2f}" if price_max is not None else "",
            "margin_at_min_price": f"{margin_at_min:.4f}" if price_min is not None else "",
            "margin_at_max_price": f"{margin_at_max:.4f}" if price_max is not None else "",
        }

        rows_out.append(out)

    if not rows_out:
        print("No rows to write (all skipped).")
        return

    fieldnames = list(rows_out[0].keys())
    with OUTPUT_AMAZON.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows_out)

    print("")
    print(f"Wrote Amazon supplier pricing CSV:")
    print(f"  {OUTPUT_AMAZON}")
    print("Open this in Excel or feed into your seller tools as needed.")
    print("Done.")
    

if __name__ == "__main__":
    main()
