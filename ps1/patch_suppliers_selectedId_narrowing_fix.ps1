# =========================================================
# Project: Ecom Copilot
# File: ps1\patch_suppliers_selectedId_narrowing_fix.ps1
# Purpose: Replace the two useEffect blocks so selectedId is narrowed correctly
# =========================================================

param(
  [Parameter(Mandatory=$false)]
  [string]$Root = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$file = Join-Path $Root "ui-web\src\pages\SuppliersPage.tsx"
if (!(Test-Path -LiteralPath $file)) { throw "Missing file: $file" }

# Backup
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -LiteralPath $file -Destination "$file.bak_$stamp" -Force
Write-Host "Backup created: $file.bak_$stamp"

$txt = Get-Content -Raw -LiteralPath $file

$detailEffectNew = @"
// Load supplier detail
  useEffect(() => {
    if (!selectedId) return;
    const sid: string = selectedId;

    let cancelled = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/suppliers/${encodeURIComponent(sid)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status} loading supplier detail`);

        const d = await res.json();
        const normalized: SupplierDetail = {
          id: String(d?.id ?? sid),
          key: d?.key ?? d?.supplier_key ?? d?.supplierKey,
          name: String(d?.name ?? d?.display_name ?? d?.displayName ?? "Supplier"),
          location: d?.location ?? d?.city ?? d?.state,
          notes: d?.notes ?? d?.description,
          margin: typeof d?.margin === "number" ? d.margin : undefined,
          kmcMargin: typeof d?.kmcMargin === "number" ? d.kmcMargin : undefined,
        };

        if (!cancelled) setDetail(normalized);
      } catch (e: any) {
        if (!cancelled) setDetailError(e?.message ?? "Failed to load supplier detail");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
"@

$kmcEffectNew = @"
// Load KMC pricing preview
  useEffect(() => {
    if (mode !== "detail") return;
    if (!selectedId) return;
    const sid: string = selectedId;

    if (!isKmc) {
      setKmcRows([]);
      setKmcError(null);
      setKmcLoading(false);
      return;
    }

    let cancelled = false;

    async function loadKmcPreview() {
      setKmcLoading(true);
      setKmcError(null);
      setKmcRows([]);

      try {
        const candidates = [
          `${API_BASE}/api/suppliers/${encodeURIComponent(sid)}/pricing_preview`,
          `${API_BASE}/api/kmc/pricing_preview`,
          `${API_BASE}/api/pricing/kmc_preview`,
        ];

        let payload: any = null;
        let lastErr: any = null;

        for (const url of candidates) {
          try {
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            payload = await res.json();
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
          }
        }

        if (lastErr && !payload) {
          throw new Error("Could not load KMC pricing preview (no endpoint responded).");
        }

        const list = Array.isArray(payload) ? payload : payload?.rows ?? payload?.data ?? [];
        const normalized = (Array.isArray(list) ? list : []).map(normalizeKmcRow);

        if (!cancelled) setKmcRows(normalized);
      } catch (e: any) {
        if (!cancelled) setKmcError(e?.message ?? "Failed to load KMC pricing preview");
      } finally {
        if (!cancelled) setKmcLoading(false);
      }
    }

    loadKmcPreview();
    return () => {
      cancelled = true;
    };
  }, [mode, selectedId, isKmc]);
"@

# Replace the whole "Load supplier detail" effect block
$txt2 = [regex]::Replace(
  $txt,
  '(?s)// Load supplier detail\s*useEffect\(\(\) => \{.*?\}, \[selectedId\]\);\s*',
  $detailEffectNew,
  1
)

if ($txt2 -eq $txt) { throw "Could not find/replace the 'Load supplier detail' useEffect block." }

# Replace the whole "Load KMC pricing preview" effect block
$txt3 = [regex]::Replace(
  $txt2,
  '(?s)// Load KMC pricing preview\s*useEffect\(\(\) => \{.*?\}, \[mode, selectedId, isKmc\]\);\s*',
  $kmcEffectNew,
  1
)

if ($txt3 -eq $txt2) { throw "Could not find/replace the 'Load KMC pricing preview' useEffect block." }

Set-Content -LiteralPath $file -Value $txt3 -Encoding UTF8
Write-Host "✅ Patched both useEffect blocks (selectedId narrowing) in: $file"
