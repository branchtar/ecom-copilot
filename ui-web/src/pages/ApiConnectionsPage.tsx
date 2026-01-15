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
                    {r.detail || "â€”"}
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
