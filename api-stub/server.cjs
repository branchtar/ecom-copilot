/* eslint-disable no-console */
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const PORT = 5000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SUPPLIERS_PATH = path.join(DATA_DIR, "suppliers.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

ensureDir(DATA_DIR);
ensureDir(UPLOADS_DIR);

function readSuppliers() {
  if (!fs.existsSync(SUPPLIERS_PATH)) return [];
  const raw = fs.readFileSync(SUPPLIERS_PATH, "utf8");
  try { return JSON.parse(raw); } catch { return []; }
}

function writeSuppliers(list) {
  fs.writeFileSync(SUPPLIERS_PATH, JSON.stringify(list, null, 2), "utf8");
}

function findSupplier(list, id) {
  return list.find(s => String(s.id).toUpperCase() === String(id).toUpperCase());
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function detectHeaders(records) {
  if (!records || records.length === 0) return [];
  return Object.keys(records[0] || {});
}

function parseCsvToRecords(csvText) {
  // Handles common CSVs with headers.
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  });
  return records;
}

function previewFromRecords(records, limit = 10) {
  return records.slice(0, limit);
}

function computePricingPreview(supplier, records, limit = 25) {
  const mapping = supplier.mapping || {};
  const fees = supplier.fees || {};
  const margins = supplier.margins || {};

  const skuCol = mapping.sku || "";
  const costCol = mapping.cost || "";
  const nameCol = mapping.name || "";
  const brandCol = mapping.brand || "";

  const handling = safeNumber(fees.handling, 0);
  const dropship = safeNumber(fees.dropship, 0);
  const misc = safeNumber(fees.misc, 0);

  const minGrossPct = clamp(safeNumber(margins.minGross, 0), 0, 99);
  const maxGrossPct = clamp(safeNumber(margins.maxGross, minGrossPct), minGrossPct, 99);

  const minGross = minGrossPct / 100;
  const maxGross = maxGrossPct / 100;

  const out = [];

  for (const r of records.slice(0, limit)) {
    const sku = String(r[skuCol] ?? "").trim();
    const name = String(r[nameCol] ?? "").trim();
    const brand = String(r[brandCol] ?? "").trim();

    // cost could be "$12.34" etc
    let rawCost = r[costCol];
    if (rawCost === undefined || rawCost === null) rawCost = "";
    const costNum = safeNumber(String(rawCost).replace(/[^0-9.\-]/g, ""), NaN);

    if (!sku || !Number.isFinite(costNum)) continue;

    const landed = costNum + handling + dropship + misc;

    // price for gross margin m: landed / (1 - m)
    const minPrice = landed / (1 - minGross);
    const maxPrice = landed / (1 - maxGross);

    // choose a default "target" price = minPrice (lowest allowed)
    const target = minPrice;

    const targetGross = (target - landed) / target; // should equal minGross

    out.push({
      sku,
      name,
      brand,
      cost: Number(costNum.toFixed(2)),
      landed: Number(landed.toFixed(2)),
      minGrossPct: Number(minGrossPct.toFixed(2)),
      maxGrossPct: Number(maxGrossPct.toFixed(2)),
      targetGrossPct: Number((targetGross * 100).toFixed(2)),
      targetPrice: Number(target.toFixed(2)),
      minPrice: Number(minPrice.toFixed(2)),
      maxPrice: Number(maxPrice.toFixed(2))
    });
  }

  return out;
}

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "5mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// list suppliers
app.get("/api/suppliers", (req, res) => {
  const suppliers = readSuppliers();
  // keep response small and stable
  const slim = suppliers.map(s => ({
    id: s.id,
    key: s.key,
    name: s.name,
    location: s.location
  }));
  res.json(slim);
});

// get supplier detail
app.get("/api/suppliers/:id", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });
  res.json(s);
});

// update supplier detail (fees/margins/mapping/notes)
app.put("/api/suppliers/:id", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });

  const body = req.body || {};

  if (typeof body.name === "string") s.name = body.name;
  if (typeof body.key === "string") s.key = body.key;
  if (typeof body.location === "string") s.location = body.location;
  if (typeof body.notes === "string") s.notes = body.notes;

  s.fees = s.fees || { handling: 0, dropship: 0, misc: 0 };
  if (body.fees) {
    if (body.fees.handling !== undefined) s.fees.handling = safeNumber(body.fees.handling, s.fees.handling);
    if (body.fees.dropship !== undefined) s.fees.dropship = safeNumber(body.fees.dropship, s.fees.dropship);
    if (body.fees.misc !== undefined) s.fees.misc = safeNumber(body.fees.misc, s.fees.misc);
  }

  s.margins = s.margins || { minGross: 22, maxGross: 45 };
  if (body.margins) {
    if (body.margins.minGross !== undefined) s.margins.minGross = safeNumber(body.margins.minGross, s.margins.minGross);
    if (body.margins.maxGross !== undefined) s.margins.maxGross = safeNumber(body.margins.maxGross, s.margins.maxGross);
  }

  s.mapping = s.mapping || { sku: "", cost: "", name: "", brand: "" };
  if (body.mapping) {
    if (typeof body.mapping.sku === "string") s.mapping.sku = body.mapping.sku;
    if (typeof body.mapping.cost === "string") s.mapping.cost = body.mapping.cost;
    if (typeof body.mapping.name === "string") s.mapping.name = body.mapping.name;
    if (typeof body.mapping.brand === "string") s.mapping.brand = body.mapping.brand;
  }

  writeSuppliers(suppliers);
  res.json({ ok: true, supplier: s });
});

// upload a CSV feed for supplier: returns headers + preview rows
app.post("/api/suppliers/:id/feed", upload.single("file"), (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });

  const origName = req.file.originalname || "feed.csv";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeId = String(s.id).toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  const folder = path.join(UPLOADS_DIR, safeId);
  ensureDir(folder);

  const storedName = `${stamp}__${origName}`.replace(/[^\w.\-__]/g, "_");
  const storedPath = path.join(folder, storedName);

  fs.writeFileSync(storedPath, req.file.buffer);

  const csvText = req.file.buffer.toString("utf8");
  let records = [];
  try {
    records = parseCsvToRecords(csvText);
  } catch (e) {
    console.error("CSV parse error:", e);
    return res.status(400).json({ error: "Could not parse CSV. Make sure it has a header row." });
  }

  const headers = detectHeaders(records);
  const preview = previewFromRecords(records, 10);

  s.lastFeed = s.lastFeed || { filename: "", storedPath: "", uploadedAt: "" };
  s.lastFeed.filename = origName;
  s.lastFeed.storedPath = storedPath;
  s.lastFeed.uploadedAt = new Date().toISOString();

  writeSuppliers(suppliers);

  res.json({ ok: true, headers, preview, storedPath });
});

// pricing preview: uses last uploaded feed + mapping + fees/margins
app.get("/api/suppliers/:id/pricing-preview", (req, res) => {
  const suppliers = readSuppliers();
  const s = findSupplier(suppliers, req.params.id);
  if (!s) return res.status(404).json({ error: "Supplier not found" });

  const limit = clamp(safeNumber(req.query.limit, 25), 1, 200);

  const lastPath = s.lastFeed?.storedPath;
  if (!lastPath || !fs.existsSync(lastPath)) {
    return res.json({ ok: true, rows: [], message: "No feed uploaded yet." });
  }

  let csvText = "";
  try {
    csvText = fs.readFileSync(lastPath, "utf8");
  } catch {
    return res.status(500).json({ error: "Could not read stored feed file." });
  }

  let records = [];
  try {
    records = parseCsvToRecords(csvText);
  } catch {
    return res.status(400).json({ error: "Stored CSV could not be parsed." });
  }

  if (!s.mapping?.sku || !s.mapping?.cost) {
    return res.json({
      ok: true,
      rows: [],
      message: "Mapping not set yet. Map SKU + Cost to generate preview."
    });
  }

  const rows = computePricingPreview(s, records, limit);
  res.json({ ok: true, rows });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Stub API running at http://127.0.0.1:${PORT}`);
});
