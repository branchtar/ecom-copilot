export const API_BASE = "";

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
    : "â€”";
