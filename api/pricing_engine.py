from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
import math


@dataclass
class SupplierFees:
    dropship_fee: float = 0.0
    handling_fee: float = 0.0
    misc_fees: Optional[List[float]] = None  # any other misc fee inputs at supplier-level

    @property
    def misc_total(self) -> float:
        if not self.misc_fees:
            return 0.0
        return float(sum(self.misc_fees))


@dataclass
class ProductDims:
    length_in: float
    width_in: float
    height_in: float
    weight_lb: float

    def dim_weight_lb(self, dim_divisor: float) -> float:
        # inches-based divisor (typical: 139). Safe guards included.
        L = max(0.0, float(self.length_in))
        W = max(0.0, float(self.width_in))
        H = max(0.0, float(self.height_in))
        if dim_divisor <= 0:
            dim_divisor = 139.0
        return (L * W * H) / float(dim_divisor)

    def billable_weight_lb(self, dim_divisor: float) -> float:
        return max(float(self.weight_lb), self.dim_weight_lb(dim_divisor))


def round_price(price: float, mode: str = "cents") -> float:
    """
    mode:
      - cents: rounds to 2 decimals
      - .99: rounds up to next x.99
      - none: no rounding
    """
    p = float(price)
    if mode == ".99":
        whole = math.floor(p)
        if p <= whole + 0.99:
            return round(whole + 0.99, 2)
        return round(math.floor(p) + 1 + 0.99, 2)
    if mode == "none":
        return p
    return round(p, 2)


def shipping_from_rate_table(billable_weight_lb: float, rate_table: List[Dict[str, Any]]) -> float:
    """
    rate_table example:
      [{"max_wt":1,"cost":4.25},{"max_wt":2,"cost":5.10}, ...]
    First band where billable_weight <= max_wt is used.
    If none match, last band is used (or 0 if empty).
    """
    w = float(billable_weight_lb)
    if not rate_table:
        return 0.0

    bands = sorted(rate_table, key=lambda x: float(x.get("max_wt", 0)))
    for b in bands:
        if w <= float(b.get("max_wt", 0)):
            return float(b.get("cost", 0.0))
    return float(bands[-1].get("cost", 0.0))


def marketplace_fee_lookup(marketplace: str, category: str, fee_table: Dict[str, Dict[str, float]]) -> float:
    """
    fee_table example:
      {"amazon":{"guitar":3.25,"default":2.50}, "walmart": {...}}
    Later: replace this with real lookup via marketplace/category API.
    """
    m = (marketplace or "").strip().lower()
    c = (category or "").strip().lower()
    if not m:
        return 0.0

    mtable = fee_table.get(m, {})
    if not mtable:
        return 0.0

    if c in mtable:
        return float(mtable[c])
    if "default" in mtable:
        return float(mtable["default"])
    return 0.0


def compute_pricing(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Implements your locked pricing rules:

    total_cost = item_cost + dropship_fee + handling + calculated_shipping + misc_fees + marketplace_fee
    min_price  = total_cost * (1 + min_margin)
    max_price  = total_cost * (1 + max_margin)
    sell_price = min_price (default; configurable)

    calculated_shipping uses billable_weight = max(actual_weight, dim_weight)
      dim_weight = (L*W*H)/dim_divisor

    ROI uses "roi_cost" that EXCLUDES marketplace_fee:
      roi_cost = item_cost + dropship_fee + handling + calculated_shipping + misc_fees
      roi = (sell_price - roi_cost) / roi_cost
    """
    item_cost = float(payload.get("item_cost", 0.0))
    marketplace = payload.get("marketplace", "amazon")
    category = payload.get("category", "default")

    dims_in = payload.get("dims") or {}
    dims = ProductDims(
        length_in=float(dims_in.get("length_in", 0.0)),
        width_in=float(dims_in.get("width_in", 0.0)),
        height_in=float(dims_in.get("height_in", 0.0)),
        weight_lb=float(dims_in.get("weight_lb", 0.0)),
    )

    fees_in = payload.get("supplier_fees") or {}
    supplier_fees = SupplierFees(
        dropship_fee=float(fees_in.get("dropship_fee", 0.0)),
        handling_fee=float(fees_in.get("handling_fee", 0.0)),
        misc_fees=fees_in.get("misc_fees") or [],
    )

    min_margin = float(config.get("min_margin", 0.15))
    max_margin = float(config.get("max_margin", 0.35))
    dim_divisor = float(config.get("dim_divisor", 139.0))
    rounding_mode = str(config.get("rounding_mode", "cents"))
    sell_mode = str(config.get("sell_price_mode", "min")).lower()

    shipping_table = config.get("shipping_rate_table", [])
    fee_table = config.get("marketplace_fee_table", {})

    dim_wt = dims.dim_weight_lb(dim_divisor)
    billable_wt = dims.billable_weight_lb(dim_divisor)
    calculated_shipping = shipping_from_rate_table(billable_wt, shipping_table)
    marketplace_fee = marketplace_fee_lookup(str(marketplace), str(category), fee_table)

    roi_cost = (
        item_cost
        + supplier_fees.dropship_fee
        + supplier_fees.handling_fee
        + calculated_shipping
        + supplier_fees.misc_total
    )

    total_cost = roi_cost + marketplace_fee

    min_price = total_cost * (1.0 + min_margin)
    max_price = total_cost * (1.0 + max_margin)

    if sell_mode == "max":
        sell_price = max_price
    elif sell_mode == "mid":
        sell_price = (min_price + max_price) / 2.0
    else:
        sell_price = min_price

    min_price = round_price(min_price, rounding_mode)
    max_price = round_price(max_price, rounding_mode)
    sell_price = round_price(sell_price, rounding_mode)

    roi = 0.0
    if roi_cost > 0:
        roi = (sell_price - roi_cost) / roi_cost

    return {
        "inputs": {
            "item_cost": item_cost,
            "marketplace": marketplace,
            "category": category,
            "dims": {
                "length_in": dims.length_in,
                "width_in": dims.width_in,
                "height_in": dims.height_in,
                "weight_lb": dims.weight_lb,
                "dim_weight_lb": round(float(dim_wt), 4),
                "billable_weight_lb": round(float(billable_wt), 4),
            },
            "supplier_fees": {
                "dropship_fee": supplier_fees.dropship_fee,
                "handling_fee": supplier_fees.handling_fee,
                "misc_fees": supplier_fees.misc_fees or [],
                "misc_total": supplier_fees.misc_total,
            },
        },
        "components": {
            "calculated_shipping": round(float(calculated_shipping), 2),
            "marketplace_fee": round(float(marketplace_fee), 2),
        },
        "costs": {
            "roi_cost": round(float(roi_cost), 2),
            "total_cost": round(float(total_cost), 2),
        },
        "prices": {
            "min_price": float(min_price),
            "max_price": float(max_price),
            "sell_price": float(sell_price),
        },
        "roi": {
            "roi_percent": round(float(roi) * 100.0, 2),
        },
    }