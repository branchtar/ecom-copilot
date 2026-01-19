import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/,"");

type Supplier = {
  key: string;
  name: string;
  location: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  website: string;
  return_address: string;
};

function slugKey(name: string) {
  const cleaned = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "SUPPLIER";
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
      />
    </label>
  );
}

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "key" | "location">("name");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [location, setLocation] = useState("USA");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [returnAddress, setReturnAddress] = useState("");

  // Detail/Edit modal
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);

  const [eName, setEName] = useState("");
  const [eLocation, setELocation] = useState("USA");
  const [eContactName, setEContactName] = useState("");
  const [eContactEmail, setEContactEmail] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eWebsite, setEWebsite] = useState("");
  const [eReturnAddress, setEReturnAddress] = useState("");

  const canSave = useMemo(
    () => name.trim().length > 0 && key.trim().length > 0,
    [name, key]
  );

  const canEditSave = useMemo(() => {
    if (!selected) return false;
    return eName.trim().length > 0;
  }, [selected, eName]);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const r = await fetch(`${API_BASE}/api/suppliers");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showAdd) return;
    if (key.trim().length === 0) setKey(slugKey(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, showAdd]);

  const filteredSorted = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const filtered = !qq
      ? items
      : items.filter((s) => {
          const hay = [
            s.name,
            s.key,
            s.location,
            s.contact_name,
            s.contact_email,
            s.phone,
            s.website,
            s.return_address,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(qq);
        });

    const sorted = [...filtered].sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      if (av < bv) return -1;
      if (av > bv) return 1;
      return (a.key || "").localeCompare(b.key || "");
    });

    return sorted;
  }, [items, q, sortBy]);

  function exportCsv() {
    const header = [
      "key",
      "name",
      "location",
      "contact_name",
      "contact_email",
      "phone",
      "website",
      "return_address",
    ];
    const lines = [
      header.join(","),
      ...filteredSorted.map((s) =>
        header.map((h) => csvEscape((s as any)[h])).join(",")
      ),
    ];
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadText(`suppliers_${stamp}.csv`, lines.join("\r\n"));
  }

  async function createSupplier() {
    if (!canSave) return;
    try {
      setSaving(true);
      setErr("");

      const payload = {
        name: name.trim(),
        key: key.trim(),
        location: location.trim() || "USA",
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        phone: phone.trim(),
        website: website.trim(),
        return_address: returnAddress.trim(),
      };

      const r = await fetch(`${API_BASE}/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }

      setShowAdd(false);
      setName("");
      setKey("");
      setLocation("USA");
      setContactName("");
      setContactEmail("");
      setPhone("");
      setWebsite("");
      setReturnAddress("");

      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function openDetail(s: Supplier) {
    setSelected(s);
    setErr("");
    setEName(s.name || "");
    setELocation(s.location || "USA");
    setEContactName(s.contact_name || "");
    setEContactEmail(s.contact_email || "");
    setEPhone(s.phone || "");
    setEWebsite(s.website || "");
    setEReturnAddress(s.return_address || "");
  }

  async function saveEdits() {
    if (!selected || !canEditSave) return;
    try {
      setEditSaving(true);
      setErr("");

      const payload = {
        name: eName.trim(),
        location: eLocation.trim() || "USA",
        contact_name: eContactName.trim(),
        contact_email: eContactEmail.trim(),
        phone: ePhone.trim(),
        website: eWebsite.trim(),
        return_address: eReturnAddress.trim(),
      };

      const r = await fetch(`/api/suppliers/${encodeURIComponent(selected.key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }

      setSelected(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteSupplier() {
    if (!selected) return;
    const ok = window.confirm(`Delete supplier "${selected.name}" (${selected.key})? This cannot be undone.`);
    if (!ok) return;

    try {
      setEditDeleting(true);
      setErr("");
      const r = await fetch(`/api/suppliers/${encodeURIComponent(selected.key)}`, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      setSelected(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setEditDeleting(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Suppliers</div>
          <div style={{ color: "#6b7280", marginTop: 4 }}>
            Search, sort, export â€” click a supplier to edit details.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search suppliers..."
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", minWidth: 240 }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "white" }}
          >
            <option value="name">Sort: Name</option>
            <option value="key">Sort: Key</option>
            <option value="location">Sort: Location</option>
          </select>

          <button
            onClick={exportCsv}
            disabled={filteredSorted.length === 0}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: filteredSorted.length ? "pointer" : "not-allowed",
              fontWeight: 700,
              opacity: filteredSorted.length ? 1 : 0.6,
            }}
          >
            Export CSV
          </button>

          <button
            onClick={load}
            style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 600 }}
          >
            Refresh
          </button>

          <button
            onClick={() => setShowAdd(true)}
            style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 800 }}
          >
            + Add Supplier
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
        Showing <b>{filteredSorted.length}</b> of <b>{items.length}</b>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading...</div>
        ) : filteredSorted.length === 0 ? (
          <div style={{ padding: 16, borderRadius: 14, background: "white", border: "1px solid #e5e7eb" }}>
            No suppliers match your search. Click <b>+ Add Supplier</b>.
          </div>
        ) : (
          filteredSorted.map((s) => (
            <button
              key={s.key}
              onClick={() => openDetail(s)}
              style={{
                textAlign: "left",
                padding: 16,
                borderRadius: 14,
                background: "white",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{s.key}</div>
              </div>

              <div style={{ marginTop: 6, color: "#374151" }}>
                Location: <b>{s.location || "USA"}</b>
              </div>

              <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
                {s.contact_email ? `Email: ${s.contact_email}` : "No contact details yet."}
              </div>

              <div style={{ marginTop: 8, color: "#111827", fontSize: 13, fontWeight: 700 }}>
                Click to edit â†’
              </div>
            </button>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAdd ? (
        <div
          onClick={() => !saving && setShowAdd(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 720, maxWidth: "100%", background: "white", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Add Supplier</div>
              <button onClick={() => !saving && setShowAdd(false)} style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 999, padding: "6px 10px", cursor: "pointer" }}>
                âœ•
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Supplier name" value={name} onChange={setName} />
                <Field label="Supplier key (unique)" value={key} onChange={setKey} />
              </div>

              <Field label="Location" value={location} onChange={setLocation} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Contact name" value={contactName} onChange={setContactName} />
                <Field label="Contact email" value={contactEmail} onChange={setContactEmail} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field label="Website" value={website} onChange={setWebsite} placeholder="https://..." />
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>Return address</span>
                <textarea
                  value={returnAddress}
                  onChange={(e) => setReturnAddress(e.target.value)}
                  placeholder={"Line 1\nLine 2\nCity, State ZIP"}
                  rows={4}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", resize: "vertical" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setShowAdd(false)}
                disabled={saving}
                style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 700, opacity: saving ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={createSupplier}
                disabled={!canSave || saving}
                style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 900, opacity: (!canSave || saving) ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Create Supplier"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Supplier Detail / Edit Modal */}
      {selected ? (
        <div
          onClick={() => !editSaving && !editDeleting && setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 760, maxWidth: "100%", background: "white", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>Edit Supplier</div>
                <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>
                  Key: <b>{selected.key}</b> (key is permanent)
                </div>
              </div>
              <button onClick={() => !editSaving && !editDeleting && setSelected(null)} style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 999, padding: "6px 10px", cursor: "pointer" }}>
                âœ•
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Supplier name" value={eName} onChange={setEName} />
                <Field label="Location" value={eLocation} onChange={setELocation} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Contact name" value={eContactName} onChange={setEContactName} />
                <Field label="Contact email" value={eContactEmail} onChange={setEContactEmail} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Phone" value={ePhone} onChange={setEPhone} />
                <Field label="Website" value={eWebsite} onChange={setEWebsite} placeholder="https://..." />
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>Return address</span>
                <textarea
                  value={eReturnAddress}
                  onChange={(e) => setEReturnAddress(e.target.value)}
                  rows={4}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", resize: "vertical" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={deleteSupplier}
                disabled={editSaving || editDeleting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid #ef4444",
                  background: "white",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontWeight: 900,
                  opacity: (editSaving || editDeleting) ? 0.6 : 1,
                }}
              >
                {editDeleting ? "Deleting..." : "Delete Supplier"}
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setSelected(null)}
                  disabled={editSaving || editDeleting}
                  style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 700, opacity: (editSaving || editDeleting) ? 0.6 : 1 }}
                >
                  Cancel
                </button>

                <button
                  onClick={saveEdits}
                  disabled={!canEditSave || editSaving || editDeleting}
                  style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 950, opacity: (!canEditSave || editSaving || editDeleting) ? 0.6 : 1 }}
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}