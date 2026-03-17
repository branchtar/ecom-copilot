"use client";

import { useEffect, useState } from "react";

export default function ScannerPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/scanner-demo")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load scanner data");
        setLoading(false);
      });
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px", color: "#111827" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>Opportunity Scanner</h1>
      <div style={{ color: "#4b5563", marginBottom: 24, lineHeight: 1.6 }}>
        Demo view of supplier catalog scoring results inside Ecom Navigation.
      </div>

      {loading ? <div>Loading scanner results...</div> : null}
      {error ? <div style={{ color: "#b91c1c", marginBottom: 16 }}>Error: {error}</div> : null}

      {!loading && !error ? (
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={{ padding: 14 }}>UPC</th>
                <th style={{ padding: 14 }}>Title</th>
                <th style={{ padding: 14 }}>Cost</th>
                <th style={{ padding: 14 }}>Price</th>
                <th style={{ padding: 14 }}>Profit</th>
                <th style={{ padding: 14 }}>Score</th>
                <th style={{ padding: 14 }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 14 }}>{row.UPC}</td>
                  <td style={{ padding: 14 }}>{row.Title}</td>
                  <td style={{ padding: 14 }}>${row.Cost}</td>
                  <td style={{ padding: 14 }}>${row.Price}</td>
                  <td style={{ padding: 14 }}>${row.Profit}</td>
                  <td style={{ padding: 14 }}>{row.Score}</td>
                  <td style={{ padding: 14, fontWeight: 800, color: row.Decision === "LIST" ? "#166534" : "#991b1b" }}>
                    {row.Decision}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}