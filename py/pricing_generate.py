import csv, json, os, sys, argparse
from datetime import datetime

def to_float(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "":
        return None
    # Remove currency symbols and commas
    s = s.replace("$","").replace(",","")
    try:
        return float(s)
    except:
        return None

def load_config(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_csv(path, fieldnames, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)

def main():
    ap = argparse.ArgumentParser(description="Generate priced CSV from supplier feed CSV using fees + margin.")
    ap.add_argument("--supplier", required=True, help="Supplier key, e.g. KMC, ENSOUL")
    ap.add_argument("--in", dest="in_path", required=True, help="Input supplier CSV path")
    ap.add_argument("--config", dest="config_path", required=True, help="Supplier config json path")

    # Column mapping (required)
    ap.add_argument("--sku", required=True, help="CSV column name for SKU")
    ap.add_argument("--cost", required=True, help="CSV column name for Cost")

    # Optional mapping
    ap.add_argument("--name", default=None, help="CSV column name for Product Name (optional)")
    ap.add_argument("--brand", default=None, help="CSV column name for Brand (optional)")
    ap.add_argument("--msrp", default=None, help="CSV column name for MSRP/List Price (optional)")

    ap.add_argument("--limit", type=int, default=0, help="Limit output rows (0 = all)")
    ap.add_argument("--outdir", default="output", help="Output directory (default: output)")

    args = ap.parse_args()

    cfg = load_config(args.config_path)

    handling = float(cfg.get("handling_fee", 0) or 0)
    dropship = float(cfg.get("dropship_fee", 0) or 0)
    misc     = float(cfg.get("misc_fee", 0) or 0)
    min_gm   = float(cfg.get("min_gross_margin_pct", 0) or 0) / 100.0
    max_gm   = float(cfg.get("max_gross_margin_pct", 0) or 0) / 100.0

    if min_gm >= 1.0:
        print("ERROR: min_gross_margin_pct must be < 100")
        sys.exit(1)
    if max_gm >= 1.0 and max_gm != 0:
        print("ERROR: max_gross_margin_pct must be < 100 (or 0 to disable)")
        sys.exit(1)

    in_path = args.in_path
    if not os.path.exists(in_path):
        print(f"ERROR: Input file not found: {in_path}")
        sys.exit(1)

    rows_out = []
    with open(in_path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        headers = r.fieldnames or []
        # Validate mapping
        for col in [args.sku, args.cost]:
            if col not in headers:
                print("ERROR: Missing required column mapping.")
                print(f"  Needed: {col}")
                print("  Available headers:")
                for h in headers:
                    print(f"   - {h}")
                sys.exit(1)

        for i, row in enumerate(r, start=1):
            if args.limit and i > args.limit:
                break

            sku = (row.get(args.sku) or "").strip()
            cost = to_float(row.get(args.cost))

            if not sku or cost is None:
                continue

            base_cost = cost + handling + dropship + misc

            # Price using min GM (floor)
            price_min = base_cost / (1.0 - min_gm) if min_gm > 0 else base_cost

            # Price using max GM (ceiling suggestion). If max_gm is 0, leave blank.
            price_max = ""
            if max_gm and max_gm > 0:
                price_max = base_cost / (1.0 - max_gm)

            # Optional MSRP clamp (if provided): do not exceed MSRP
            msrp_val = None
            if args.msrp and args.msrp in row:
                msrp_val = to_float(row.get(args.msrp))
                if msrp_val is not None:
                    if price_min > msrp_val:
                        price_min = msrp_val
                    if price_max != "" and price_max > msrp_val:
                        price_max = msrp_val

            out = {
                "supplier": args.supplier,
                "sku": sku,
                "cost": round(cost, 2),
                "base_cost_with_fees": round(base_cost, 2),
                "price_min_gm": round(price_min, 2),
                "price_max_gm": (round(price_max, 2) if price_max != "" else ""),
            }

            if args.name and args.name in row:
                out["name"] = (row.get(args.name) or "").strip()
            if args.brand and args.brand in row:
                out["brand"] = (row.get(args.brand) or "").strip()
            if msrp_val is not None:
                out["msrp"] = round(msrp_val, 2)

            rows_out.append(out)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_name = f"{args.supplier}_priced_{stamp}.csv"
    out_path = os.path.join(args.outdir, out_name)

    fieldnames = []
    # stable order
    for k in ["supplier","sku","name","brand","cost","base_cost_with_fees","msrp","price_min_gm","price_max_gm"]:
        if any(k in r for r in rows_out):
            fieldnames.append(k)

    write_csv(out_path, fieldnames, rows_out)

    print("OK")
    print(f"Rows: {len(rows_out)}")
    print(f"Out:  {out_path}")

if __name__ == "__main__":
    main()