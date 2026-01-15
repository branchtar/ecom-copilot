# Ecom Copilot - Patch Suppliers caption in App.tsx
$ErrorActionPreference = "Stop"

$path = "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot\ui-web\src\App.tsx"
Write-Host "Patching Suppliers caption in App.tsx..." -ForegroundColor Cyan
Write-Host "Path: $path"
Write-Host ""

if (-not (Test-Path -LiteralPath $path)) {
    Write-Host "❌ File not found: $path" -ForegroundColor Red
    exit 1
}

# Load full file as a single string
$content = Get-Content -LiteralPath $path -Raw

# Pattern: matches "supplier setup. This will drive" + any whitespace + "pricing, feeds, and inventory."
$pattern = 'supplier setup\. This will drive\s*pricing, feeds, and inventory\.'

# Replacement text: adds "and supplier pricing."
$replacement = 'supplier setup and supplier pricing. This will drive pricing, feeds, and inventory.'

$newContent = [regex]::Replace($content, $pattern, $replacement, 1)

if ($content -eq $newContent) {
    Write-Host "⚠️  No changes were made. Could not find the expected sentence in App.tsx." -ForegroundColor Yellow
} else {
    Set-Content -LiteralPath $path -Value $newContent -Encoding UTF8
    Write-Host "✅ Caption updated successfully." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done."
