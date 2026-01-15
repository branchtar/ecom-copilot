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
            {kpis?.orders_7d ?? "â€”"}
          </div>
          <div className="text-[11px] text-emerald-600">Live from API</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <div className="text-xs text-slate-500 mb-1">Returns (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {kpis?.returns_7d ?? "â€”"}
          </div>
          <div className="text-[11px] text-rose-600">Processed returns</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <div className="text-xs text-slate-500 mb-1">Items Sold (7d)</div>
          <div className="text-2xl font-semibold mb-1">
            {kpis?.items_sold_7d ?? "â€”"}
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
            Chart wiring comes later â€” for now this just proves the API â†’ UI
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
