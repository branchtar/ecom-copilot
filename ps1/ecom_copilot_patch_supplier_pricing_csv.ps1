# ecom_copilot_patch_supplier_pricing_csv.ps1
# Adds: CSV upload + mapping + pricing fields + computed pricing_preview in api-stub (port 5000)

$ROOT = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$PS1_DIR = Join-Path $ROOT "ps1"
$STUB = Join-Path $ROOT "api-stub"
$DATA_DIR = Join-Path $STUB "data"
$UPLOADS_DIR = Join-Path $STUB "uploads"
$SERVER = Join-Path $STUB "server.cjs"

New-Item -ItemType Directory -Force -Path $PS1_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $STUB | Out-Null
New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $UPLOADS_DIR | Out-Null

Push-Location $STUB
try {
  if (!(Test-Path (Join-Path $STUB "package.json"))) { npm init -y | Out-Null }

  # deps: express/cors already, plus multer + csv-parse
  npm i express cors multer csv-parse | Out-Null

  $serverText = @'
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: "http://localhost:3000" }));

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const SUPPLIERS_JSON = path.join(DATA_DIR, "suppliers.json");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ensureDir(DATA_DIR);
ensureDir(UPLOADS_DIR);

function readSuppliers() {
  if (!fs.existsSync(SUPPLIERS_JSON)) {
    const seed = [
      {
        id: "KMC",
        key: "KMC",
        name: "KMC Music",
        location: "USA",
        notes: "Stub supplier (replace with real backend later).",
        pricing: {
          handlingFee: 0,
          dropshippingFee: 0,
          miscFee: 0,
          minGrossMarginPct: 0.22,
          maxGrossMarginPct: 0.45,
          targetGrossMarginPct: 0.22
        },
        mapping: { sku: "sku", cost: "cost", map: "map", name: "name", brand: "brand" },
        csv: { path: null, fileName: null, uploadedAt: null }
      },
      {
        id: "ENSOUL",
        key: "ENSOUL",
        name: "Ensoul Music",
        location: "USA",
        notes: "",
        pricing: {
          handlingFee: 0,
          dropshippingFee: 0,
          miscFee: 0,
          minGrossMarginPct: 0.25,
          maxGrossMarginPct: 0.50,
          targetGrossMarginPct: 0.30
        },
        mapping: { sku: "sku", cost: "cost", map: "map", name: "name", brand: "brand" },
        csv: { path: null, fileName: null, uploadedAt: null }
      }
    ];
    fs.writeFileSync(SUPPLIERS_JSON, JSON.stringify(seed, null, 2), "utf8");
  }

  return JSON.parse(fs.readFileSync(SUPPLIERS_JSON, "utf8"));
}

function writeSuppliers(list) {
  fs.writeFileSync(SUPPLIERS_JSON, JSON.stringify(list, null, 2), "utf8");
}

function upId(s) {
  return String(s || "").trim().toUpperCase();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toNum(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(/[$,]/g, "");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function getSupplierOr404(id, res) {
  const suppliers = readSuppliers();
  const s = suppliers.find(x => x.id === id);
  if (!s) {
    res.status(404).json({ error: `Supplier not found: ${id}` });
    return null;
  }
  return { suppliers, s };
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/api/suppliers", (req, res) => {
  const suppliers = readSuppliers();
  // keep list lightweight
  res.json(suppliers.map(s => ({
    id: s.id, key: s.key, name: s.name, location: s.location,
    hasCsv: !!(s.csv && s.csv.path)
  })));
});

app.get("/api/suppliers/:id", (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  res.json(out.s);
});

// Create supplier
app.post("/api/suppliers", (req, res) => {
  const suppliers = readSuppliers();
  const body = req.body || {};
  const id = upId(body.id || body.key || body.name);
  if (!id) return res.status(400).json({ error: "id/key/name required" });
  if (suppliers.find(x => x.id === id)) return res.status(409).json({ error: "Supplier already exists" });

  const s = {
    id,
    key: String(body.key || id),
    name: String(body.name || id),
    location: String(body.location || "USA"),
    notes: String(body.notes || ""),
    pricing: {
      handlingFee: Number(body?.pricing?.handlingFee ?? 0),
      dropshippingFee: Number(body?.pricing?.dropshippingFee ?? 0),
      miscFee: Number(body?.pricing?.miscFee ?? 0),
      minGrossMarginPct: Number(body?.pricing?.minGrossMarginPct ?? 0.25),
      maxGrossMarginPct: Number(body?.pricing?.maxGrossMarginPct ?? 0.50),
      targetGrossMarginPct: Number(body?.pricing?.targetGrossMarginPct ?? 0.30),
    },
    mapping: body.mapping || { sku: "sku", cost: "cost", map: "map", name: "name", brand: "brand" },
    csv: { path: null, fileName: null, uploadedAt: null }
  };

  suppliers.push(s);
  writeSuppliers(suppliers);
  res.json(s);
});

// Update supplier (including pricing fields)
app.put("/api/suppliers/:id", (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  const { suppliers, s } = out;
  const body = req.body || {};

  if (body.key !== undefined) s.key = String(body.key);
  if (body.name !== undefined) s.name = String(body.name);
  if (body.location !== undefined) s.location = String(body.location);
  if (body.notes !== undefined) s.notes = String(body.notes);

  if (body.pricing) {
    s.pricing = s.pricing || {};
    const p = body.pricing;

    if (p.handlingFee !== undefined) s.pricing.handlingFee = Number(p.handlingFee) || 0;
    if (p.dropshippingFee !== undefined) s.pricing.dropshippingFee = Number(p.dropshippingFee) || 0;
    if (p.miscFee !== undefined) s.pricing.miscFee = Number(p.miscFee) || 0;

    if (p.minGrossMarginPct !== undefined) s.pricing.minGrossMarginPct = Number(p.minGrossMarginPct);
    if (p.maxGrossMarginPct !== undefined) s.pricing.maxGrossMarginPct = Number(p.maxGrossMarginPct);
    if (p.targetGrossMarginPct !== undefined) s.pricing.targetGrossMarginPct = Number(p.targetGrossMarginPct);
  }

  writeSuppliers(suppliers);
  res.json(s);
});

// Update mapping
app.put("/api/suppliers/:id/mapping", (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  const { suppliers, s } = out;

  const m = req.body || {};
  s.mapping = {
    sku: String(m.sku || s.mapping?.sku || "sku"),
    cost: String(m.cost || s.mapping?.cost || "cost"),
    map: String(m.map || s.mapping?.map || "map"),
    name: String(m.name || s.mapping?.name || "name"),
    brand: String(m.brand || s.mapping?.brand || "brand"),
  };

  writeSuppliers(suppliers);
  res.json({ ok: true, mapping: s.mapping });
});

// Multer: store per supplier folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = upId(req.params.id);
    const dir = path.join(UPLOADS_DIR, id);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = String(file.originalname || "upload.csv").replace(/[^\w.\- ]/g, "_");
    cb(null, `${ts}__${safe}`);
  }
});
const upload = multer({ storage });

// Upload CSV
app.post("/api/suppliers/:id/upload_csv", upload.single("file"), (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  const { suppliers, s } = out;

  if (!req.file) return res.status(400).json({ error: "No file uploaded. Use multipart field name: file" });

  s.csv = {
    path: req.file.path,
    fileName: req.file.filename,
    uploadedAt: new Date().toISOString()
  };

  writeSuppliers(suppliers);
  res.json({ ok: true, csv: s.csv });
});

// Read CSV headers (first row)
app.get("/api/suppliers/:id/csv_headers", async (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  const s = out.s;

  if (!s.csv || !s.csv.path || !fs.existsSync(s.csv.path)) {
    return res.json({ headers: [] });
  }

  const headers = await new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(s.csv.path)
      .pipe(parse({ columns: true, bom: true, relax_column_count: true }))
      .on("error", reject)
      .on("data", (row) => {
        rows.push(row);
        // only need the first row to infer keys
        if (rows.length >= 1) {
          // stop stream early
          resolve(Object.keys(row || {}));
        }
      })
      .on("end", () => resolve([]));
  }).catch(() => []);

  res.json({ headers });
});

// Pricing preview (computed)
app.get("/api/suppliers/:id/pricing_preview", async (req, res) => {
  const id = upId(req.params.id);
  const out = getSupplierOr404(id, res);
  if (!out) return;
  const s = out.s;

  const limit = Math.max(1, Math.min(2000, Number(req.query.limit || 200)));

  if (!s.csv || !s.csv.path || !fs.existsSync(s.csv.path)) {
    // fallback demo rows
    return res.json({
      rows: [
        { sku: "SKU-001", name: "", brand: "", cost: 10.0, marginPct: 0.0, amazon: 0, shopify: 0, walmart: 0 },
        { sku: "SKU-002", name: "", brand: "", cost: 25.0, marginPct: 0.0, amazon: 0, shopify: 0, walmart: 0 },
        { sku: "SKU-003", name: "", brand: "", cost: 7.5,  marginPct: 0.0, amazon: 0, shopify: 0, walmart: 0 },
      ],
      note: "No CSV uploaded yet. Upload a CSV to get real preview rows."
    });
  }

  const p = s.pricing || {};
  const handling = Number(p.handlingFee || 0);
  const dropship = Number(p.dropshippingFee || 0);
  const misc = Number(p.miscFee || 0);

  const minM = Number(p.minGrossMarginPct);
  const maxM = Number(p.maxGrossMarginPct);
  const targetM = Number(p.targetGrossMarginPct);

  const minMargin = Number.isFinite(minM) ? clamp(minM, 0, 0.95) : 0.25;
  const maxMargin = Number.isFinite(maxM) ? clamp(maxM, minMargin, 0.95) : 0.50;
  const targetMargin = Number.isFinite(targetM) ? clamp(targetM, minMargin, maxMargin) : minMargin;

  const mapKey = s.mapping?.map || "map";
  const skuKey = s.mapping?.sku || "sku";
  const costKey = s.mapping?.cost || "cost";
  const nameKey = s.mapping?.name || "name";
  const brandKey = s.mapping?.brand || "brand";

  const rows = await new Promise((resolve, reject) => {
    const outRows = [];
    fs.createReadStream(s.csv.path)
      .pipe(parse({ columns: true, bom: true, relax_column_count: true }))
      .on("error", reject)
      .on("data", (row) => {
        if (outRows.length >= limit) return;

        const sku = String(row[skuKey] ?? "").trim();
        const name = String(row[nameKey] ?? "").trim();
        const brand = String(row[brandKey] ?? "").trim();

        const costRaw = toNum(row[costKey]);
        const mapRaw = toNum(row[mapKey]);

        if (!Number.isFinite(costRaw)) return;

        const fees = handling + dropship + misc;
        const totalCost = costRaw + fees;

        // start with target margin
        let price = totalCost / (1 - targetMargin);

        // clamp to min/max margin (min => higher price; max => lower price)
        const minPrice = totalCost / (1 - minMargin);
        const maxPrice = totalCost / (1 - maxMargin);
        // Note: maxMargin produces a LOWER maxPrice than minPrice? Actually higher margin -> higher price.
        // So for capping margin, we cap price at the price that yields maxMargin.
        // Therefore: price must be within [minPrice, maxPrice] where minMargin <= maxMargin implies minPrice <= maxPrice.
        price = clamp(price, minPrice, maxPrice);

        // enforce MAP if present
        if (Number.isFinite(mapRaw) && price < mapRaw) price = mapRaw;

        price = round2(price);

        const marginPct = price > 0 ? round2((price - totalCost) / price) : 0;

        outRows.push({
          sku,
          name,
          brand,
          cost: round2(costRaw),
          fees: round2(fees),
          totalCost: round2(totalCost),
          map: Number.isFinite(mapRaw) ? round2(mapRaw) : null,
          marginPct,
          amazon: price,
          shopify: price,
          walmart: price
        });
      })
      .on("end", () => resolve(outRows));
  }).catch((e) => {
    return [];
  });

  res.json({
    supplierId: s.id,
    pricing: {
      handlingFee: handling,
      dropshippingFee: dropship,
      miscFee: misc,
      minGrossMarginPct: minMargin,
      maxGrossMarginPct: maxMargin,
      targetGrossMarginPct: targetMargin
    },
    mapping: s.mapping,
    csv: s.csv,
    rows
  });
});

// Back-compat aliases your UI already uses
app.get("/api/kmc/pricing_preview", (req, res) => res.redirect("/api/suppliers/KMC/pricing_preview"));
app.get("/api/pricing/kmc_preview", (req, res) => res.redirect("/api/suppliers/KMC/pricing_preview"));

const PORT = 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Stub API running at http://127.0.0.1:${PORT}`);
  console.log(`Upload CSV: POST http://127.0.0.1:${PORT}/api/suppliers/KMC/upload_csv (multipart field name: file)`);
});
'@

  Set-Content -LiteralPath $SERVER -Value $serverText -Encoding UTF8

  Write-Host "✅ Updated: $SERVER" -ForegroundColor Green
  Write-Host "✅ Data file: $DATA_DIR\suppliers.json" -ForegroundColor Green
  Write-Host "✅ Uploads:   $UPLOADS_DIR\<SUPPLIER_ID>\*.csv" -ForegroundColor Green

  Write-Host ""
  Write-Host "Next:" -ForegroundColor Cyan
  Write-Host "1) Restart the stub if it's running (close that cmd window), then re-run LAUNCH_ECOM_COPILOT.bat"
  Write-Host "2) Upload a CSV (example PowerShell):"
  Write-Host '   curl -Method Post -InFile ".\yourfile.csv" -ContentType "text/csv" http://127.0.0.1:5000/api/suppliers/KMC/upload_csv'
  Write-Host ""
  Write-Host "Best upload method (recommended) with form-data in PowerShell:"
  Write-Host '   # use Postman OR use a browser tool; PS native multipart is annoying'
  Write-Host ""
  Write-Host "Then test:"
  Write-Host "   curl http://127.0.0.1:5000/api/suppliers/KMC/csv_headers -UseBasicParsing"
  Write-Host "   curl http://127.0.0.1:5000/api/suppliers/KMC/pricing_preview?limit=50 -UseBasicParsing"
}
finally {
  Pop-Location
}
