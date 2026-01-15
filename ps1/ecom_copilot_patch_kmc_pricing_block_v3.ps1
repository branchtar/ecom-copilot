# ecom_copilot_patch_kmc_pricing_block_v3.ps1
# Replaces the entire KMC detail block in SuppliersPage.tsx
# with a clean JSX version (preview + mapping UI).

$ErrorActionPreference = "Stop"

# Edit this if the project root ever moves
$root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
$file = Join-Path $root "ui-web\src\pages\SuppliersPage.tsx"

Write-Host "Patching KMC pricing block in SuppliersPage.tsx (v3)..." -ForegroundColor Cyan
Write-Host "Root:  $root"
Write-Host "File:  $file"
Write-Host ""

if (-not (Test-Path -LiteralPath $file)) {
    throw "File not found: $file"
}

$content = Get-Content -LiteralPath $file -Raw

# Replace from the existing "Detail mode" comment through the KMC block end marker
$pattern = "(?s)// Detail mode.*?// KMC_PRICING_BLOCK_END"

$replacement = @'
// Detail mode (includes KMC pricing preview + export when code === "KMC")
// KMC_PRICING_BLOCK_START
if (mode === "detail") {
  const isKmc = detail?.code?.toUpperCase() === "KMC";
  const kmcMargin = isKmc ? detail?.min_gross_margin ?? 0.25 : undefined;
  const kmcRows =
    isKmc && typeof kmcMargin === "number"
      ? computeKmcPrices(KMC_SAMPLE_ROWS, kmcMargin)
      : [];

  if (!detail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-500">
        Loading supplier detail...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Supplier detail header + back button */}
      <section className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Supplier Detail
          </div>
          <div className="text-sm text-slate-500">
            View supplier-level settings, margins, and (for KMC) pricing preview.
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
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">
          {detailError}
        </div>
      )}

      {/* Existing KMC pricing preview table */}
      {isKmc && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              KMC Pricing Preview
            </div>
            <div className="text-xs text-slate-400">
              Margin source:{" "}
              {typeof kmcMargin === "number"
                ? `${(kmcMargin * 100).toFixed(1)}% min gross margin`
                : "from supplier settings"}
            </div>
          </div>
          <div className="text-sm text-slate-500 mb-3">
            Uses KMC supplier min margin from Suppliers as the base margin. First
            step toward a full KMC pricing engine.
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-slate-600">
                    SKU
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-600">
                    Product
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-slate-600">
                    Brand
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    Cost
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    MSRP
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    Margin Used
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    Amazon Price
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    Shopify Price
                  </th>
                  <th className="px-2 py-1 text-right font-medium text-slate-600">
                    Walmart Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {kmcRows.map((row) => (
                  <tr key={row.sku} className="border-t border-slate-100">
                    <td className="px-2 py-1 whitespace-nowrap">{row.sku}</td>
                    <td className="px-2 py-1">{row.name}</td>
                    <td className="px-2 py-1">{row.brand}</td>
                    <td className="px-2 py-1 text-right">
                      ${row.cost.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      ${row.msrp.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {(row.margin_used * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 text-right">
                      ${row.amazon_price.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      ${row.shopify_price.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      ${row.walmart_price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* KMC CSV upload + mapping + export (v1 UI only) */}
      {isKmc && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              KMC pricing preview + export
            </div>
            <div className="text-xs text-slate-400">
              v1 – mapping UI, backend wiring next
            </div>
          </div>

          {/* Global fees & margin inputs (UI only for now) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Dropship fee per unit
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="e.g. 2.50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Handling fee per unit
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Misc fee per unit
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Min gross margin
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="0.25 = 25%"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Max gross margin
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="0.50 = 50%"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Min profit per unit (optional)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="e.g. 5.00"
              />
            </div>
          </div>

          {/* CSV upload + column mapping */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              KMC CSV upload
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Upload your KMC price list (CSV). Then map columns for SKU, product
              name, cost, brand, UPC, and dimensions. This v1 UI does not yet call
              the Python pricing engine – we&apos;ll wire that next.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <input type="file" className="text-xs" />
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 border border-slate-200">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      SKU column
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Product column
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Brand column (optional)
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Cost column
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      UPC column (optional)
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Length column (optional)
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Width column (optional)
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Height column (optional)
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-slate-600">
                      Weight column (optional)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-slate-200">
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <td key={idx} className="px-2 py-1">
                        <select className="w-full rounded-md border border-slate-300 px-1 py-0.5 text-xs">
                          <option value="">Select…</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs bg-slate-200 text-slate-500 cursor-not-allowed"
                disabled
                title="We’ll wire this to the pricing engine next."
              >
                Apply mapping &amp; preview (coming soon)
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs bg-slate-200 text-slate-500 cursor-not-allowed"
                disabled
                title="Use the desktop KMC pricing .bat for now."
              >
                Download repriced CSV (via engine)
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
// KMC_PRICING_BLOCK_END
'@

if ($content -notmatch $pattern) {
    throw "Could not find the existing KMC detail block in $file. Pattern did not match."
}

$newContent = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $pattern,
    $replacement
)

Set-Content -LiteralPath $file -Value $newContent -Encoding UTF8

Write-Host "✅ KMC pricing block updated (v3 mapping UI, syntax corrected)." -ForegroundColor Green
