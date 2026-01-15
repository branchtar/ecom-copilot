# ecom_copilot_split_app_into_pages.ps1
# One-time refactor: split big App.tsx into pages + shared helpers

$ErrorActionPreference = "Stop"

$root        = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$webDir      = Join-Path $root "ui-web"
$srcDir      = Join-Path $webDir "src"
$pagesDir    = Join-Path $srcDir "pages"
$componentsDir = Join-Path $srcDir "components"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Ecom Copilot - Split App into pages     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path -LiteralPath $srcDir)) {
  throw "Src folder not found at $srcDir"
}

New-Item -ItemType Directory -Force -Path $pagesDir, $componentsDir | Out-Null

$appPath    = Join-Path $srcDir "App.tsx"
$backupPath = Join-Path $srcDir "App.legacy_before_split.tsx"

if (-not (Test-Path -LiteralPath $appPath)) {
  throw "App.tsx not found at $appPath"
}

if (-not (Test-Path -LiteralPath $backupPath)) {
  Copy-Item -LiteralPath $appPath -Destination $backupPath
  Write-Host "📦 Backed up existing App.tsx to App.legacy_before_split.tsx" -ForegroundColor Yellow
} else {
  Write-Host "ℹ Backup App.legacy_before_split.tsx already exists. Leaving it as-is." -ForegroundColor Yellow
}

# --------------------------------------------------------------------
# shared.ts – shared types + API_BASE + formatMoney
# --------------------------------------------------------------------

$sharedPath = Join-Path $srcDir "shared.ts"
$sharedContent = @'
export const API_BASE = "http://127.0.0.1:8001";

export type Kpis = {
  total_sales_7d?: number;
  orders_7d?: number;
  returns_7d?: number;
  items_sold_7d?: number;
};

export type MarketplaceBalance = {
  marketplace: string;
  balance: number;
  next_payout: string;
};

export type RecentOrder = {
  order_id: string;
  customer: string;
  status: string;
  date: string;
  total: number;
};

export type StockAlert = {
  sku: string;
  product: string;
  stock: number;
  supplier: string;
};

export type SupplierSummary = {
  id: number;
  name: string;
  code: string;
  products: number;
  last_import?: string;
  primary_marketplaces: string[];
  active: boolean;
};

export type SupplierDetail = {
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

export type ApiStatus = {
  service: string;
  status: string;
  detail?: string | null;
};

export const formatMoney = (val?: number) =>
  typeof val === "number"
    ? `$${val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—";
'@

Set-Content -LiteralPath $sharedPath -Value $sharedContent -Encoding UTF8
Write-Host "✅ Wrote shared.ts" -ForegroundColor Green

# --------------------------------------------------------------------
# pages/DashboardPage.tsx
# --------------------------------------------------------------------

$dashboardPath = Join-Path $pagesDir "DashboardPage.tsx"
$dashboardContent = @'
import React, { useEffect, useState } from "react";
import {
  API_BASE,
  Kpis,
  MarketplaceBalance,
  RecentOrder,
  StockAlert,
  formatMoney,
} from "../shared";

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

export default DashboardPage;
'@

Set-Content -LiteralPath $dashboardPath -Value $dashboardContent -Encoding UTF8
Write-Host "✅ Wrote pages/DashboardPage.tsx" -ForegroundColor Green

# --------------------------------------------------------------------
# pages/SuppliersPage.tsx (with KMC pricing section)
# --------------------------------------------------------------------

$suppliersPath = Join-Path $pagesDir "SuppliersPage.tsx"
$suppliersContent = @'
import React, { useEffect, useState } from "react";
import { API_BASE, SupplierSummary, SupplierDetail, formatMoney } from "../shared";

// Sample KMC SKUs for pricing preview
type KmcSampleRow = {
  sku: string;
  product: string;
  brand: string;
  cost: number;
  msrp: number;
};

type KmcComputedRow = KmcSampleRow & {
  marginUsed: number;
  amazonPrice: number;
  shopifyPrice: number;
  walmartPrice: number;
};

const KMC_SAMPLE_ROWS: KmcSampleRow[] = [
  {
    sku: "KMC-DRUM-S4",
    product: "Drumstick S4 Hickory",
    brand: "KMC",
    cost: 4.2,
    msrp: 9.99,
  },
  {
    sku: "KMC-GTR-STRINGS-10",
    product: "Electric Guitar Strings 10-46",
    brand: "KMC",
    cost: 3.1,
    msrp: 7.99,
  },
  {
    sku: "KMC-KB-STAND",
    product: "Keyboard Stand Double Braced",
    brand: "KMC",
    cost: 24,
    msrp: 59.99,
  },
  {
    sku: "KMC-MIC-CABLE-25",
    product: "Mic Cable XLR 25ft",
    brand: "KMC",
    cost: 7.5,
    msrp: 19.99,
  },
];

const computeKmcPrices = (
  rows: KmcSampleRow[],
  margin: number
): KmcComputedRow[] => {
  const m = margin || 0.25;

  const priceFromCost = (cost: number, extraMargin: number): number => {
    const target = Math.min(0.85, Math.max(0.05, m + extraMargin));
    const base = cost / (1 - target);
    return Math.round(base * 100) / 100;
  };

  return rows.map((r) => ({
    ...r,
    marginUsed: m,
    amazonPrice: priceFromCost(r.cost, 0.02),
    shopifyPrice: priceFromCost(r.cost, 0.04),
    walmartPrice: priceFromCost(r.cost, 0.06),
  }));
};

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
      const json = await res.json();
      setDetail(json);
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

  // Detail mode (includes KMC pricing preview when code === "KMC")
  if (mode === "detail") {
    const isKmc = detail?.code?.toUpperCase() === "KMC";
    const kmcMargin = isKmc ? detail?.min_gross_margin ?? 0.25 : undefined;
    const kmcRows =
      isKmc && typeof kmcMargin === "number"
        ? computeKmcPrices(KMC_SAMPLE_ROWS, kmcMargin)
        : [];

    return (
      <div className="flex-1 flex flex-col">
        <section className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Supplier Detail
            </div>
            <div className="text-sm text-slate-500">
              View supplier-level settings, margins, and (for KMC) pricing
              preview.
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
          <section className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  KMC Pricing Preview
                </div>
                <div className="text-sm text-slate-500">
                  Uses KMC supplier min margin from Suppliers as the base
                  margin. First step toward a full KMC pricing engine.
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Margin source:{" "}
                {typeof kmcMargin === "number"
                  ? `${(kmcMargin * 100).toFixed(1)}% min gross margin`
                  : "—"}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
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
                      MSRP
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Margin Used
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Amazon Price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Shopify Price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Walmart Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kmcRows.map((r) => (
                    <tr key={r.sku} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{r.sku}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.product}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.brand}</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.cost)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.msrp)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {(r.marginUsed * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.amazonPrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.shopifyPrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatMoney(r.walmartPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isKmc && !detailLoading && detail && (
          <section className="bg-white rounded-xl shadow-sm p-4 mt-4 text-xs text-slate-500">
            Pricing preview for this supplier will be wired up later. For now,
            only KMC has a sample pricing table.
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

export default SuppliersPage;
'@

Set-Content -LiteralPath $suppliersPath -Value $suppliersContent -Encoding UTF8
Write-Host "✅ Wrote pages/SuppliersPage.tsx" -ForegroundColor Green

# --------------------------------------------------------------------
# pages/ApiConnectionsPage.tsx
# --------------------------------------------------------------------

$apiPagePath = Join-Path $pagesDir "ApiConnectionsPage.tsx"
$apiPageContent = @'
import React, { useEffect, useState } from "react";
import { API_BASE, ApiStatus } from "../shared";

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

export default ApiConnectionsPage;
'@

Set-Content -LiteralPath $apiPagePath -Value $apiPageContent -Encoding UTF8
Write-Host "✅ Wrote pages/ApiConnectionsPage.tsx" -ForegroundColor Green

# --------------------------------------------------------------------
# components/PlaceholderPage.tsx
# --------------------------------------------------------------------

$placeholderPath = Join-Path $componentsDir "PlaceholderPage.tsx"
$placeholderContent = @'
import React from "react";

interface PlaceholderProps {
  title: string;
  body: string;
}

const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, body }) => (
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

export default PlaceholderPage;
'@

Set-Content -LiteralPath $placeholderPath -Value $placeholderContent -Encoding UTF8
Write-Host "✅ Wrote components/PlaceholderPage.tsx" -ForegroundColor Green

# --------------------------------------------------------------------
# New slim App.tsx
# --------------------------------------------------------------------

$newAppContent = @'
import React, { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import SuppliersPage from "./pages/SuppliersPage";
import ApiConnectionsPage from "./pages/ApiConnectionsPage";
import PlaceholderPage from "./components/PlaceholderPage";

type NavKey =
  | "dashboard"
  | "suppliers"
  | "emails"
  | "marketplaces"
  | "settings"
  | "api";

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
'@

Set-Content -LiteralPath $appPath -Value $newAppContent -Encoding UTF8
Write-Host "✅ Replaced App.tsx with slim version that uses pages/" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Split complete." -ForegroundColor Green
Write-Host "   - App.legacy_before_split.tsx saved as backup in src/."
Write-Host "   - New files:" -ForegroundColor Green
Write-Host "       src/shared.ts"
Write-Host "       src/pages/DashboardPage.tsx"
Write-Host "       src/pages/SuppliersPage.tsx"
Write-Host "       src/pages/ApiConnectionsPage.tsx"
Write-Host "       src/components/PlaceholderPage.tsx"
Write-Host ""
Write-Host "👉 Restart your React dev server so it picks up the new structure." -ForegroundColor Yellow
