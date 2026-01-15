import React, { useEffect, useState, ChangeEvent } from "react";

const API_BASE = "";

// ---------- Shared types ----------

type Kpis = {
  total_sales_7d?: number;
  orders_7d?: number;
  returns_7d?: number;
  items_sold_7d?: number;
};

type MarketplaceBalance = {
  marketplace: string;
  balance: number;
  next_payout: string;
};

type RecentOrder = {
  order_id: string;
  customer: string;
  status: string;
  date: string;
  total: number;
};

type StockAlert = {
  sku: string;
  product: string;
  stock: number;
  supplier: string;
};

type SupplierSummary = {
  id: number;
  name: string;
  code: string;
  products: number;
  last_import?: string;
  primary_marketplaces: string[];
  active: boolean;
};

type SupplierDetail = {
  id?: number;
  code: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  return_address1?: string;
  return_address2?: string;
  return_city?: string;
  return_state?: string;
  return_postal_code?: string;
  return_country?: string;
  handling_time_days?: number;
  min_gross_margin?: number;
  max_gross_margin?: number;
};

type ApiStatus = {
  service: string;
  status: string;
  detail?: string | null;
};

type NavKey =
  | "dashboard"
  | "suppliers"
  | "emails"
  | "marketplaces"
  | "settings"
  | "api";

// ---------- KMC pricing types ----------

type KmcCsvInput = {
  sku: string;
  productName: string;
  brand: string;
  upc?: string;
  cost: number;
  msrp?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  weightLb?: number;
};

type KmcExportRow = KmcCsvInput & {
  supplierCode: string;
  dropshipFee: number;
  handlingFee: number;
  miscFee: number;
  baseCost: number;
  minMargin: number;
  maxMargin: number;
  minPriceAmazon: number;
  maxPriceAmazon: number;
  minPriceShopify: number;
  maxPriceShopify: number;
  minPriceWalmart: number;
  maxPriceWalmart: number;
};

type KmcMapping = {
  sku?: string;
  product?: string;
  cost?: string;
  brand?: string;
  upc?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
  msrp?: string;
};

type KmcFeeConfig = {
  dropshipFee: number;
  handlingFee: number;
  miscFee: number;
  minMargin: number;
  maxMargin: number;
  minProfit: number;
};

// ---------- Helpers ----------

const formatMoney = (val?: number) =>
  typeof val === "number"
    ? `$${val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseNumber = (raw: string | undefined): number | undefined => {
  if (raw == null) return undefined;
  const v = parseFloat(raw.toString().trim());
  return Number.isFinite(v) ? v : undefined;
};

// Very small CSV splitter that handles quotes.
// Good enough for clean price lists; we can swap to PapaParse later if needed.
const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Toggle quotes, or handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
};

const csvEscape = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// ---------- Dashboard Page ----------

const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [balances, setBalances] = useState<MarketplaceBalance[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [kpisRes, balancesRes, ordersRes, stockRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard/kpis`),
          fetch(`${API_BASE}/dashboard/marketplace-balances`),
          fetch(`${API_BASE}/dashboard/recent-orders`),
          fetch(`${API_BASE}/dashboard/stock-alerts`),
        ]);

        if (!kpisRes.ok) throw new Error("Failed to load KPIs");
        if (!balancesRes.ok) throw new Error("Failed to load balances");
        if (!ordersRes.ok) throw new Error("Failed to load orders");
        if (!stockRes.ok) throw new Error("Failed to load stock alerts");

        const kpisJson = await kpisRes.json();
        const balancesJson = await balancesRes.json();
        const ordersJson = await ordersRes.json();
        const stockJson = await stockRes.json();

        setKpis(kpisJson);
        setBalances(Array.isArray(balancesJson) ? balancesJson : []);
        setRecentOrders(Array.isArray(ordersJson) ? ordersJson : []);
        setStockAlerts(Array.isArray(stockJson) ? stockJson : []);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Could not reach Ecom Copilot API at " + API_BASE);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700 mb-4">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-col justify-between">
          <div className="text-xs text-slate-500 mb-1">Total Sales (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {formatMoney(kpis?.total_sales_7d)}
          </div>
          <div className="text-[11px] text-slate-500">All marketplaces</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <div className="text-xs text-slate-500 mb-1">Orders (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {kpis?.orders_7d ?? "—"}
          </div>
          <div className="text-[11px] text-emerald-600">Live from API</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <div className="text-xs text-slate-500 mb-1">Returns (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {kpis?.returns_7d ?? "—"}
          </div>
          <div className="text-[11px] text-rose-600">Processed returns</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <div className="text-xs text-slate-500 mb-1">Items Sold (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {kpis?.items_sold_7d ?? "—"}
          </div>
          <div className="text-[11px] text-emerald-600">Units shipped</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Sales Overview</div>
            <div className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              Last 30 days (placeholder)
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            Chart wiring comes later — for now this just proves the API → UI
            pipeline.
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold">Marketplace Balances</div>
            <div className="text-xs text-slate-500">View All</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {balances.map((b) => (
              <div
                key={b.marketplace}
                className="rounded-lg px-3 py-2 text-xs text-white"
                style={{
                  background: b.marketplace.toLowerCase().includes("amazon")
                    ? "linear-gradient(135deg,#f97316,#ea580c)"
                    : b.marketplace.toLowerCase().includes("walmart")
                    ? "linear-gradient(135deg,#0ea5e9,#0284c7)"
                    : b.marketplace.toLowerCase().includes("shopify")
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "linear-gradient(135deg,#6366f1,#4f46e5)",
                }}
              >
                <div className="font-semibold">{b.marketplace}</div>
                <div className="text-lg font-bold">
                  {formatMoney(b.balance)}
                </div>
                <div className="text-[10px] text-slate-100/80">
                  Paid on {b.next_payout}
                </div>
              </div>
            ))}
            {balances.length === 0 && (
              <div className="text-xs text-slate-500">
                No balances loaded yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Recent Orders</div>
            <div className="text-xs text-brand-600 cursor-default">View All</div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    #
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    Customer
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    Status
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    Date
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.order_id} className="border-t border-slate-100">
                    <td className="px-2 py-1 text-slate-600">{o.order_id}</td>
                    <td className="px-2 py-1 text-slate-700">{o.customer}</td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-slate-600">{o.date}</td>
                    <td className="px-2 py-1 text-right text-slate-700">
                      {formatMoney(o.total)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-3 text-center text-slate-400"
                    >
                      No orders loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Stock Alerts</div>
            <div className="text-xs text-brand-600 cursor-default">View All</div>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    SKU
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    Product
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-500">
                    Stock
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">
                    Supplier
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockAlerts.map((a) => (
                  <tr key={a.sku} className="border-t border-slate-100">
                    <td className="px-2 py-1 text-slate-700">{a.sku}</td>
                    <td className="px-2 py-1 text-slate-700 truncate max-w-xs">
                      {a.product}
                    </td>
                    <td className="px-2 py-1 text-right text-slate-700">
                      {a.stock}
                    </td>
                    <td className="px-2 py-1 text-slate-700">{a.supplier}</td>
                  </tr>
                ))}
                {stockAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-3 text-center text-slate-400"
                    >
                      No low stock alerts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {loading && (
        <div className="text-xs text-slate-500">
          Loading dashboard data from API...
        </div>
      )}
    </div>
  );
};

// ---------- Suppliers Page (with KMC detail + CSV export) ----------

const SuppliersPage: React.FC = () => {
  const [rows, setRows] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "edit" | "detail">("list");
  const [form, setForm] = useState<SupplierDetail>({
    code: "",
    name: "",
    return_country: "US",
    handling_time_days: 2,
    min_gross_margin: 0.25,
    max_gross_margin: 0.5,
  });

  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // KMC-only state
  const [kmcFeeConfig, setKmcFeeConfig] = useState<KmcFeeConfig>({
    dropshipFee: 0,
    handlingFee: 0,
    miscFee: 0,
    minMargin: 0.25,
    maxMargin: 0.5,
    minProfit: 0,
  });

  const [kmcHeaders, setKmcHeaders] = useState<string[]>([]);
  const [kmcRawRows, setKmcRawRows] = useState<string[][]>([]);
  const [kmcMapping, setKmcMapping] = useState<KmcMapping>({});
  const [kmcFileName, setKmcFileName] = useState<string>("");
  const [kmcExportRows, setKmcExportRows] = useState<KmcExportRow[]>([]);
  const [kmcPreviewError, setKmcPreviewError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/suppliers/summary`);
      if (!res.ok) throw new Error("Failed to load suppliers");
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Could not load suppliers from API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const startAddSupplier = () => {
    setForm({
      code: "",
      name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      return_address1: "",
      return_address2: "",
      return_city: "",
      return_state: "",
      return_postal_code: "",
      return_country: "US",
      handling_time_days: 2,
      min_gross_margin: 0.25,
      max_gross_margin: 0.5,
    });
    setMode("edit");
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "handling_time_days" ||
        name === "min_gross_margin" ||
        name === "max_gross_margin"
          ? value === ""
            ? undefined
            : Number(value)
          : value,
    }));
  };

  const saveSupplier = async () => {
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save supplier");
      await res.json();
      await loadSuppliers();
      setMode("list");
    } catch (err: any) {
      console.error(err);
      setError("Could not save supplier.");
    }
  };

  const openSupplierDetail = async (code: string) => {
    try {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      setMode("detail");

      const res = await fetch(`${API_BASE}/suppliers/${code}`);
      if (!res.ok) throw new Error("Failed to load supplier detail");
      const json: SupplierDetail = await res.json();
      setDetail(json);

      // Seed KMC fee config from supplier margins if KMC.
      if (code.toUpperCase() === "KMC") {
        const minMargin =
          typeof json.min_gross_margin === "number"
            ? json.min_gross_margin
            : 0.25;
        const maxMargin =
          typeof json.max_gross_margin === "number"
            ? json.max_gross_margin
            : 0.5;
        setKmcFeeConfig((prev) => ({
          ...prev,
          minMargin,
          maxMargin,
        }));
      }

      // Reset any previous KMC state when switching suppliers
      setKmcHeaders([]);
      setKmcRawRows([]);
      setKmcMapping({});
      setKmcFileName("");
      setKmcExportRows([]);
      setKmcPreviewError(null);
    } catch (err: any) {
      console.error(err);
      setDetailError("Could not load supplier detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const backToList = () => {
    setMode("list");
    setDetail(null);
    setDetailError(null);
  };

  // ---------- KMC helpers ----------

  const isKmcSupplier = detail?.code?.toUpperCase() === "KMC";

  const handleKmcFeeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setKmcFeeConfig((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

  const handleKmcFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
      if (!lines.length) {
        setKmcHeaders([]);
        setKmcRawRows([]);
        setKmcFileName("");
        setKmcPreviewError("The CSV file appears to be empty.");
        return;
      }

      const headers = splitCsvLine(lines[0]);
      const rawRows = lines.slice(1).map(splitCsvLine);

      setKmcHeaders(headers);
      setKmcRawRows(rawRows);
      setKmcFileName(file.name);
      setKmcMapping({});
      setKmcExportRows([]);
      setKmcPreviewError(null);
    };
    reader.readAsText(file);
  };

  const handleKmcMappingChange = (
    field: keyof KmcMapping,
    value: string
  ) => {
    setKmcMapping((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const buildKmcExportRows = () => {
    if (!isKmcSupplier) return;

    const { sku, product, cost } = kmcMapping;
    if (!sku || !product || !cost) {
      setKmcPreviewError(
        "Please map at least SKU, Product, and Cost columns before previewing."
      );
      setKmcExportRows([]);
      return;
    }

    const indexOf = (header?: string) =>
      header ? kmcHeaders.indexOf(header) : -1;

    const idxSku = indexOf(kmcMapping.sku);
    const idxProduct = indexOf(kmcMapping.product);
    const idxCost = indexOf(kmcMapping.cost);
    const idxBrand = indexOf(kmcMapping.brand);
    const idxUpc = indexOf(kmcMapping.upc);
    const idxLen = indexOf(kmcMapping.length);
    const idxWid = indexOf(kmcMapping.width);
    const idxHei = indexOf(kmcMapping.height);
    const idxWt = indexOf(kmcMapping.weight);
    const idxMsrp = indexOf(kmcMapping.msrp);

    if (idxSku < 0 || idxProduct < 0 || idxCost < 0) {
      setKmcPreviewError(
        "Could not find mapped columns in the CSV header. Please re-map and try again."
      );
      setKmcExportRows([]);
      return;
    }

    const supplierCode = detail?.code || "KMC";

    const minMargin = clamp(kmcFeeConfig.minMargin || 0.25, 0.01, 0.8);
    const maxMargin = clamp(kmcFeeConfig.maxMargin || 0.5, minMargin, 0.9);
    const dropshipFee = kmcFeeConfig.dropshipFee || 0;
    const handlingFee = kmcFeeConfig.handlingFee || 0;
    const miscFee = kmcFeeConfig.miscFee || 0;
    const minProfit = kmcFeeConfig.minProfit || 0;

    const exportRows: KmcExportRow[] = kmcRawRows
      .map((cols) => {
        const costRaw = cols[idxCost] ?? "";
        const costNum = parseNumber(costRaw) ?? 0;

        const baseCostRaw =
          costNum + dropshipFee + handlingFee + miscFee + 0 /* ship placeholder */;

        const minBase = Math.max(baseCostRaw, baseCostRaw + minProfit);

        const minPriceAmazon = minBase / (1 - minMargin);
        const maxPriceAmazon = baseCostRaw / (1 - maxMargin);

        const minPriceShopify = minBase / (1 - minMargin);
        const maxPriceShopify = baseCostRaw / (1 - maxMargin);

        const minPriceWalmart = minBase / (1 - minMargin);
        const maxPriceWalmart = baseCostRaw / (1 - maxMargin);

        const input: KmcCsvInput = {
          sku: cols[idxSku] ?? "",
          productName: cols[idxProduct] ?? "",
          brand:
            idxBrand >= 0 && cols[idxBrand]
              ? cols[idxBrand]
              : supplierCode.toUpperCase() === "KMC"
              ? "KMC"
              : supplierCode,
          upc: idxUpc >= 0 ? cols[idxUpc] ?? "" : undefined,
          cost: costNum,
          msrp: idxMsrp >= 0 ? parseNumber(cols[idxMsrp]) : undefined,
          lengthIn: idxLen >= 0 ? parseNumber(cols[idxLen]) : undefined,
          widthIn: idxWid >= 0 ? parseNumber(cols[idxWid]) : undefined,
          heightIn: idxHei >= 0 ? parseNumber(cols[idxHei]) : undefined,
          weightLb: idxWt >= 0 ? parseNumber(cols[idxWt]) : undefined,
        };

        const baseCost = Number(baseCostRaw.toFixed(2));

        return {
          ...input,
          supplierCode,
          dropshipFee,
          handlingFee,
          miscFee,
          baseCost,
          minMargin,
          maxMargin,
          minPriceAmazon: Number(minPriceAmazon.toFixed(2)),
          maxPriceAmazon: Number(maxPriceAmazon.toFixed(2)),
          minPriceShopify: Number(minPriceShopify.toFixed(2)),
          maxPriceShopify: Number(maxPriceShopify.toFixed(2)),
          minPriceWalmart: Number(minPriceWalmart.toFixed(2)),
          maxPriceWalmart: Number(maxPriceWalmart.toFixed(2)),
        };
      })
      .filter((r) => r.sku && r.productName);

    setKmcExportRows(exportRows);
    setKmcPreviewError(null);
  };

  const handleDownloadKmcCsv = () => {
    if (!kmcExportRows.length || !isKmcSupplier) return;

    const headers = [
      "supplier_code",
      "sku",
      "product_name",
      "brand",
      "upc",
      "cost",
      "length_in",
      "width_in",
      "height_in",
      "weight_lb",
      "dropship_fee",
      "handling_fee",
      "misc_fee",
      "base_cost",
      "min_margin",
      "max_margin",
      "amazon_min_price",
      "amazon_max_price",
      "shopify_min_price",
      "shopify_max_price",
      "walmart_min_price",
      "walmart_max_price",
    ];

    const lines: string[] = [];
    lines.push(headers.join(","));

    kmcExportRows.forEach((r) => {
      const rowValues = [
        r.supplierCode,
        r.sku,
        r.productName,
        r.brand,
        r.upc ?? "",
        r.cost,
        r.lengthIn ?? "",
        r.widthIn ?? "",
        r.heightIn ?? "",
        r.weightLb ?? "",
        r.dropshipFee,
        r.handlingFee,
        r.miscFee,
        r.baseCost,
        r.minMargin,
        r.maxMargin,
        r.minPriceAmazon,
        r.maxPriceAmazon,
        r.minPriceShopify,
        r.maxPriceShopify,
        r.minPriceWalmart,
        r.maxPriceWalmart,
      ];
      lines.push(rowValues.map(csvEscape).join(","));
    });

    const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `kmc_pricing_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------- Render modes ----------

  // Detail mode (includes KMC pricing preview + mapping when code === "KMC")
  if (mode === "detail") {
    const isKmc = isKmcSupplier;

    const previewRows =
      kmcExportRows.length > 0
        ? kmcExportRows.slice(0, 25)
        : ([] as KmcExportRow[]);

    return (
      <div className="flex-1 flex flex-col">
        <section className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Supplier Detail
            </div>
            <div className="text-sm text-slate-500">
              View supplier-level settings, margins, and (for KMC) pricing +
              CSV export.
            </div>
          </div>
          <button
            type="button"
            onClick={backToList}
            className="px-3 py-1.5 rounded-md text-xs bg-slate-100 text-slate-700"
          >
            ← Back to Suppliers
          </button>
        </section>

        {detailError && (
          <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700 mb-4">
            {detailError}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
          {detailLoading && (
            <div className="text-xs text-slate-500">Loading supplier...</div>
          )}

          {detail && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {detail.name} ({detail.code})
                  </div>
                  <div className="text-slate-500">
                    Handling time: {detail.handling_time_days ?? "—"} days • Min
                    margin:{" "}
                    {typeof detail.min_gross_margin === "number"
                      ? `${(detail.min_gross_margin * 100).toFixed(1)}%`
                      : "—"}{" "}
                    • Max margin:{" "}
                    {typeof detail.max_gross_margin === "number"
                      ? `${(detail.max_gross_margin * 100).toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">
                    Contact
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_name || "—"}
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_email || "—"}
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_phone || "—"}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="font-semibold text-slate-700 mb-1">
                    Return Address
                  </div>
                  <div className="text-slate-600">
                    {detail.return_address1 || "—"}
                  </div>
                  {detail.return_address2 && (
                    <div className="text-slate-600">
                      {detail.return_address2}
                    </div>
                  )}
                  <div className="text-slate-600">
                    {[detail.return_city, detail.return_state]
                      .filter(Boolean)
                      .join(", ")}{" "}
                    {detail.return_postal_code}
                  </div>
                  <div className="text-slate-600">
                    {detail.return_country || "US"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {isKmc && (
          <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  KMC Pricing Preview + Export
                </div>
                <div className="text-sm text-slate-500">
                  Uses supplier min/max margins plus your dropship/handling/misc
                  fees. Exports a repriced CSV you can feed into your master
                  sheet.
                </div>
              </div>
              <div className="text-[11px] text-slate-500 text-right">
                Margin source:{" "}
                {(kmcFeeConfig.minMargin * 100).toFixed(1)}%–{" "}
                {(kmcFeeConfig.maxMargin * 100).toFixed(1)}% gross margin
              </div>
            </div>

            {/* Fees / margins */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Dropship fee per unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="dropshipFee"
                  value={kmcFeeConfig.dropshipFee}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Handling fee per unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="handlingFee"
                  value={kmcFeeConfig.handlingFee}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Misc fee per unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="miscFee"
                  value={kmcFeeConfig.miscFee}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Min gross margin
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="minMargin"
                  value={kmcFeeConfig.minMargin}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
                <div className="text-[10px] text-slate-500 mt-0.5">
                  e.g. 0.25 = 25%
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Max gross margin
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="maxMargin"
                  value={kmcFeeConfig.maxMargin}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
                <div className="text-[10px] text-slate-500 mt-0.5">
                  e.g. 0.55 = 55%
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Min profit per unit (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="minProfit"
                  value={kmcFeeConfig.minProfit}
                  onChange={handleKmcFeeChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1"
                />
              </div>
            </div>

            {/* CSV upload + mapping */}
            <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-700">
                    KMC CSV upload
                  </div>
                  <div className="text-slate-500">
                    Upload your KMC price list (CSV). Then map columns for SKU,
                    product name, cost, brand, UPC, and dimensions.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1 cursor-pointer">
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleKmcFileChange}
                    />
                  </label>
                  <span className="text-slate-500 text-[11px] max-w-xs truncate">
                    {kmcFileName || "No file chosen"}
                  </span>
                </div>
              </div>

              {kmcHeaders.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      SKU column
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.sku || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("sku", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Product column
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.product || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("product", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Cost column
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.cost || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("cost", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Brand column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.brand || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("brand", e.target.value)
                      }
                    >
                      <option value="">(use supplier code)</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      UPC column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.upc || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("upc", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Length column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.length || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("length", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Width column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.width || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("width", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Height column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.height || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("height", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      Weight column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.weight || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("weight", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">
                      MSRP column (optional)
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1"
                      value={kmcMapping.msrp || ""}
                      onChange={(e) =>
                        handleKmcMappingChange("msrp", e.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {kmcHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-500">
                  This v1 export assumes shipping + marketplace fees are 0. Your
                  spreadsheet can layer in carrier + fee tables later.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={buildKmcExportRows}
                    className="px-3 py-1.5 rounded-md text-xs bg-slate-900 text-white"
                    disabled={!kmcHeaders.length}
                  >
                    Apply mapping &amp; preview
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadKmcCsv}
                    className="px-3 py-1.5 rounded-md text-xs bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-500"
                    disabled={!kmcExportRows.length}
                  >
                    Download repriced CSV
                  </button>
                </div>
              </div>

              {kmcPreviewError && (
                <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700">
                  {kmcPreviewError}
                </div>
              )}
            </div>

            {/* Simple on-screen preview of repriced rows */}
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs mt-3">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Product
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Brand
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Cost
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Base cost (cost + fees)
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Margin used
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Amazon min price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Shopify min price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Walmart min price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr
                      key={r.sku}
                      className="border-t border-slate-100 whitespace-nowrap"
                    >
                      <td className="px-3 py-2 text-slate-800">{r.sku}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.productName}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.brand}</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.cost)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.baseCost)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {(r.minMargin * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.minPriceAmazon)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.minPriceShopify)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.minPriceWalmart)}
                      </td>
                    </tr>
                  ))}
                  {!previewRows.length && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-3 text-center text-slate-400"
                      >
                        Upload a CSV and click &ldquo;Apply mapping &amp;
                        preview&rdquo; to see sample KMC rows here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isKmc && !detailLoading && detail && (
          <section className="bg-white rounded-xl shadow-sm p-4 mt-4 text-xs text-slate-500">
            Pricing preview + CSV export is currently wired for KMC only. Other
            suppliers will reuse the same engine later.
          </section>
        )}
      </div>
    );
  }

  // Edit mode (Add Supplier)
  if (mode === "edit") {
    return (
      <div className="flex-1 flex flex-col">
        <section className="mb-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Add Supplier
          </div>
          <div className="text-sm text-slate-500">
            Define supplier info, margins, and feed settings. This will drive
            pricing and inventory rules later.
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Supplier Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="KMC Music"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Code
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="KMC"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contact Name
              </label>
              <input
                name="contact_name"
                value={form.contact_name || ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="Rep name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contact Email
              </label>
              <input
                name="contact_email"
                value={form.contact_email || ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="rep@kmcmusic.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contact Phone
              </label>
              <input
                name="contact_phone"
                value={form.contact_phone || ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Handling Time (days)
              </label>
              <input
                type="number"
                name="handling_time_days"
                value={form.handling_time_days ?? ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                min={0}
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Return Address
              </label>
              <input
                name="return_address1"
                value={form.return_address1 || ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm mb-2"
                placeholder="Address line 1"
              />
              <input
                name="return_address2"
                value={form.return_address2 || ""}
                onChange={handleFormChange}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm mb-2"
                placeholder="Address line 2 (optional)"
              />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  name="return_city"
                  value={form.return_city || ""}
                  onChange={handleFormChange}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="City"
                />
                <input
                  name="return_state"
                  value={form.return_state || ""}
                  onChange={handleFormChange}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="State"
                />
                <input
                  name="return_postal_code"
                  value={form.return_postal_code || ""}
                  onChange={handleFormChange}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="ZIP"
                />
                <input
                  name="return_country"
                  value={form.return_country || ""}
                  onChange={handleFormChange}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="US"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Minimum Gross Margin
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  name="min_gross_margin"
                  value={form.min_gross_margin ?? ""}
                  onChange={handleFormChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-slate-500">
                  e.g. 0.25 = 25%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Maximum Gross Margin
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  name="max_gross_margin"
                  value={form.max_gross_margin ?? ""}
                  onChange={handleFormChange}
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-slate-500">
                  e.g. 0.55 = 55%
                </span>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-slate-600 mb-1">
                Product Feed (future step)
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Here we&apos;ll eventually let you upload the supplier CSV (like
                KMC price list) and map columns (SKU, cost, qty, etc.) to the
                pricing engine. For now this is just a placeholder so the layout
                is ready.
              </p>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-600 cursor-not-allowed"
              >
                Upload CSV (coming soon)
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setMode("list")}
              className="px-3 py-1.5 rounded-md text-xs bg-slate-100 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveSupplier}
              className="px-4 py-1.5 rounded-md text-xs bg-brand-600 text-white"
            >
              Save Supplier
            </button>
          </div>
        </section>
      </div>
    );
  }

  // List mode
  return (
    <div className="flex-1 flex flex-col">
      <section className="mb-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Suppliers
        </div>
        <div className="text-sm text-slate-500">
          Mirror of your SellerChamp-style supplier setup. This will drive
          pricing, feeds, and inventory.
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700 mb-4">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">
            {rows.length} suppliers • this will eventually drive your pricing &
            feeds.
          </div>
          <button
            type="button"
            onClick={startAddSupplier}
            className="text-xs px-3 py-1 rounded-full bg-brand-600 text-white"
          >
            + Add Supplier
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Supplier
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Code
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  Products
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Last Import
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Marketplaces
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">{s.name}</td>
                  <td className="px-3 py-2 text-slate-600">{s.code}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {s.products.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {s.last_import || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {s.primary_marketplaces.join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (s.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600")
                      }
                    >
                      {s.active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openSupplierDetail(s.code)}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-3 text-center text-slate-400"
                  >
                    No suppliers loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-xs text-slate-500 mt-3">
            Loading supplier summary from API...
          </div>
        )}
      </section>
    </div>
  );
};

// ---------- API Connections Page ----------

const ApiConnectionsPage: React.FC = () => {
  const [rows, setRows] = useState<ApiStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/settings/api-status`);
        if (!res.ok) throw new Error("Failed to load api status");
        const json = await res.json();
        setRows(Array.isArray(json) ? json : []);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Could not load API connection status.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const badgeClass = (status: string) => {
    if (status === "connected") return "bg-emerald-50 text-emerald-700";
    if (status === "warning") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="flex-1 flex flex-col">
      <section className="mb-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          API Connections
        </div>
        <div className="text-sm text-slate-500">
          High-level view of which marketplaces + services are wired into Ecom
          Copilot.
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700 mb-4">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold mb-3">
          Connections for your local build
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Service
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">{r.service}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        badgeClass(r.status)
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.detail || "—"}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-center text-slate-400"
                  >
                    No API connections defined yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-xs text-slate-500 mt-3">
            Loading API connection status...
          </div>
        )}
      </section>
    </div>
  );
};

// ---------- Placeholder pages ----------

const PlaceholderPage: React.FC<{ title: string; body: string }> = ({
  title,
  body,
}) => (
  <div className="flex-1 flex flex-col">
    <section className="mb-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
        {title}
      </div>
      <div className="text-sm text-slate-500">{body}</div>
    </section>
    <section className="bg-white rounded-xl shadow-sm p-6 text-xs text-slate-500">
      Wiring for this module will come next. For now this is just a placeholder
      so the shell matches your future app.
    </section>
  </div>
);

// ---------- Root App layout ----------

const App: React.FC = () => {
  const [active, setActive] = useState<NavKey>("dashboard");

  const renderPage = () => {
    if (active === "dashboard") return <DashboardPage />;
    if (active === "suppliers") return <SuppliersPage />;
    if (active === "api") return <ApiConnectionsPage />;
    if (active === "emails")
      return (
        <PlaceholderPage
          title="Emails"
          body="Local email automation and templates for marketplaces."
        />
      );
    if (active === "marketplaces")
      return (
        <PlaceholderPage
          title="Marketplaces"
          body="High-level marketplace settings, like which channels are live."
        />
      );
    if (active === "settings")
      return (
        <PlaceholderPage
          title="Settings"
          body="Global settings for Ecom Copilot."
        />
      );
    return null;
  };

  const topTitle =
    active === "dashboard"
      ? "Dashboard"
      : active === "suppliers"
      ? "Suppliers"
      : active === "emails"
      ? "Emails"
      : active === "marketplaces"
      ? "Marketplaces"
      : active === "settings"
      ? "Settings / API"
      : "API Connections";

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold">
              EC
            </div>
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Ecom Copilot
              </div>
              <div className="text-xs text-slate-400 truncate">
                Bwaaack • Copy and Paste
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "dashboard"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("dashboard")}
          >
            <span>Dashboard</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "suppliers"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("suppliers")}
          >
            <span>Suppliers</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "emails"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("emails")}
          >
            <span>Emails</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "marketplaces"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("marketplaces")}
          >
            <span>Marketplaces</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "settings"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("settings")}
          >
            <span>Settings</span>
          </button>
          <button
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg " +
              (active === "api"
                ? "bg-slate-800 text-white font-medium"
                : "text-slate-200 hover:bg-slate-800")
            }
            onClick={() => setActive("api")}
          >
            <span>API Connections</span>
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          Local build • {new Date().getFullYear()}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 px-8 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {topTitle}
            </div>
            <div className="text-lg font-semibold">Welcome back, Kyle!</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-500">
              <span className="mr-2">🔍</span> Search (coming soon)
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-semibold">
              K
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto space-y-6">{renderPage()}</div>
      </main>
    </div>
  );
};

export default App;
