"use client";

import { useWorkspace } from "../../../lib/useWorkspace";
import Sidebar from "../../../components/ui/Sidebar";
import Topbar from "../../../components/ui/Topbar";

export default function CatalogPage() {
  const { workspace, profile, saving, createWorkspace, setActiveWorkspace } = useWorkspace();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ec-bg)" }}>
      <Sidebar
        workspace={workspace}
        profile={profile}
        createWorkspace={createWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        saving={saving}
      />

      <div style={{ flex: 1, padding: "16px 24px 60px", minWidth: 0, overflowX: "hidden" }}>
        <Topbar />

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ec-text)", letterSpacing: "-0.01em" }}>
            Catalog Imports
          </div>
          <div style={{ fontSize: 13, color: "var(--ec-text-muted)", marginTop: 3 }}>
            Upload CSV files and map supplier columns in the next phase.
          </div>
        </div>

        {/* ── Coming-soon card ─────────────────────────────────────────── */}
        <div style={{
          border: "1px solid var(--ec-border)",
          borderRadius: "var(--ec-radius)",
          background: "var(--ec-surface)",
          boxShadow: "var(--ec-shadow-sm)",
          padding: "48px 32px",
          textAlign: "center",
          maxWidth: 520,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ec-text)", marginBottom: 8 }}>
            Phase 4B — Catalog Mapping
          </div>
          <div style={{ fontSize: 13, color: "var(--ec-text-muted)", lineHeight: 1.65, marginBottom: 20 }}>
            Upload a supplier CSV, map each column to a catalog field (supplier SKU, UPC, title, cost,
            weight, dimensions, and more), then preview the mapped rows before running pricing.
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            textAlign: "left",
            background: "var(--ec-bg)",
            border: "1px solid var(--ec-border-light)",
            borderRadius: "var(--ec-radius-sm)",
            padding: "14px 16px",
            fontSize: 12,
            color: "var(--ec-text-muted)",
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, color: "var(--ec-text-subtle)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.08em", marginBottom: 4 }}>
              Planned fields
            </div>
            {[
              "Supplier SKU / Item ID",
              "UPC",
              "Title / Description",
              "Item Cost",
              "MAP Price (if present)",
              "Weight · Length · Width · Height",
              "Quantity Available",
              "Brand · Category · Image URL",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--ec-text-subtle)", fontSize: 11 }}>◦</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
