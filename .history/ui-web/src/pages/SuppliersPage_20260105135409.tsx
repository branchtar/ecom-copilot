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
    // KMC_PRICING_BLOCK_START
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
            â† Back to Suppliers
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
                    Handling time: {detail.handling_time_days ?? "â€”"} days â€¢ Min
                    margin:{" "}
                    {typeof detail.min_gross_margin === "number"
                      ? `${(detail.min_gross_margin * 100).toFixed(1)}%`
                      : "â€”"}{" "}
                    â€¢ Max margin:{" "}
                    {typeof detail.max_gross_margin === "number"
                      ? `${(detail.max_gross_margin * 100).toFixed(1)}%`
                      : "â€”"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">
                    Contact
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_name || "â€”"}
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_email || "â€”"}
                  </div>
                  <div className="text-slate-600">
                    {detail.contact_phone || "â€”"}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="font-semibold text-slate-700 mb-1">
                    Return Address
                  </div>
                  <div className="text-slate-600">
                    {detail.return_address1 || "â€”"}
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
                  : "â€”"}
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
            {rows.length} suppliers â€¢ this will eventually drive your pricing &
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
                    {s.last_import || "â€”"}
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
