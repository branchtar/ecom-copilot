# SNAPSHOT_SCRIPT_VERSION = 2
param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [switch]$Zip
)

$ErrorActionPreference = "Stop"

function RelPath([string]$full, [string]$root) {
  return $full.Substring($root.Length).TrimStart("\")
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logsRoot  = Join-Path $ProjectRoot "logs\project_snapshots"
$outDir    = Join-Path $logsRoot $timestamp

New-Item -ItemType Directory -Force -Path $logsRoot, $outDir | Out-Null

# Exclusions (folders)
$excludeDirs = @(
  "node_modules", ".git", ".venv", "venv", "__pycache__", "dist", "build", ".next", ".cache", "out",
  "coverage", "tmp", "temp", ".pytest_cache", ".mypy_cache", ".ruff_cache", "artifacts",
  "logs\project_snapshots"
)

$excludeRegex = ($excludeDirs | ForEach-Object { [regex]::Escape($_) }) -join "|"

Write-Host "==============================="
Write-Host "Project Snapshot (v2)"
Write-Host "==============================="
Write-Host ("Root: " + $ProjectRoot)
Write-Host ("Out:  " + $outDir)
Write-Host ""

# META
$meta = [ordered]@{
  snapshot_name  = "Project Snapshot"
  version        = 2
  created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  project_root   = $ProjectRoot
  computername   = $env:COMPUTERNAME
  username       = $env:USERNAME
  powershell     = $PSVersionTable.PSVersion.ToString()
}
($meta | ConvertTo-Json -Depth 4) | Set-Content -Encoding UTF8 (Join-Path $outDir "meta.json")

# Collect items
$items = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\($excludeRegex)\\" } |
  Sort-Object FullName

# TREE
$treePath = Join-Path $outDir "project_tree.txt"
@(
  ("Project root: " + $ProjectRoot)
  ("Snapshot UTC:  " + $meta.created_at_utc)
  ""
  "Excluded dirs:"
  ("  - " + ($excludeDirs -join "`r`n  - "))
  ""
) | Set-Content -Encoding UTF8 $treePath

foreach ($i in $items) {
  $rel = RelPath $i.FullName $ProjectRoot
  if ($i.PSIsContainer) {
    ("[D] " + $rel) | Add-Content -Encoding UTF8 $treePath
  } else {
    $kb = [Math]::Round($i.Length/1KB, 2)
    ("[F] " + $rel + "  (" + $kb + " KB)") | Add-Content -Encoding UTF8 $treePath
  }
}

# MANIFEST (CSV)
$maxHashMB = 10
$manifestPath = Join-Path $outDir "file_manifest.csv"

$rows = foreach ($f in ($items | Where-Object { -not $_.PSIsContainer })) {
  $rel = RelPath $f.FullName $ProjectRoot
  $sha = ""
  if (($f.Length / 1MB) -le $maxHashMB) {
    try { $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $f.FullName).Hash } catch { $sha = "" }
  }
  [pscustomobject]@{
    relative_path  = $rel
    size_bytes     = $f.Length
    last_write_utc = $f.LastWriteTimeUtc.ToString("o")
    sha256         = $sha
  }
}

$rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $manifestPath

# ENV KEYS (names only)
$envPath = Join-Path $ProjectRoot ".env"
$envOut  = Join-Path $outDir "env_keys.txt"
if (Test-Path $envPath) {
  $keys = Get-Content $envPath -ErrorAction SilentlyContinue |
    Where-Object { $_ -match "^\s*[A-Za-z_][A-Za-z0-9_]*\s*=" } |
    ForEach-Object { ($_ -split "=",2)[0].Trim() } |
    Select-Object -Unique
  $keys | Set-Content -Encoding UTF8 $envOut
} else {
  "No .env found." | Set-Content -Encoding UTF8 $envOut
}

# GIT (best-effort)
$gitStatusPath = Join-Path $outDir "git_status.txt"
$gitLogPath    = Join-Path $outDir "git_log.txt"
if (Test-Path (Join-Path $ProjectRoot ".git")) {
  cmd /c "git -C ""$ProjectRoot"" status --porcelain=v1 -b" > $gitStatusPath 2>&1
  cmd /c "git -C ""$ProjectRoot"" log -n 40 --oneline --decorate" > $gitLogPath 2>&1
} else {
  "No .git repo found." | Set-Content -Encoding UTF8 $gitStatusPath
  "No .git repo found." | Set-Content -Encoding UTF8 $gitLogPath
}

# MARKERS
$markerDir = Join-Path $outDir "_markers"
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
$markers = @("package.json","package-lock.json","pnpm-lock.yaml","yarn.lock","requirements.txt","pyproject.toml","Pipfile","Pipfile.lock","README.md","README.txt",".env.example",".gitignore")
foreach ($m in $markers) {
  $p = Join-Path $ProjectRoot $m
  if (Test-Path $p) { Copy-Item -Force -LiteralPath $p -Destination (Join-Path $markerDir $m) -ErrorAction SilentlyContinue }
}

# SCRIPTS (small files only)
$binaryExt = @(".zip",".7z",".rar",".exe",".msi",".iso",".dmg",".bin",".pdf",".png",".jpg",".jpeg",".webp",".mp4",".mov",".avi",".mkv",".psd")
$maxCopyMB = 2
$scriptsDir = Join-Path $outDir "_scripts"
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null

$copyFolders = @("run","diagnostic","ps1","py","js")
foreach ($folder in $copyFolders) {
  $src = Join-Path $ProjectRoot $folder
  if (-not (Test-Path $src)) { continue }

  Get-ChildItem -LiteralPath $src -Recurse -Force -File -ErrorAction SilentlyContinue | ForEach-Object {
    $ext = [IO.Path]::GetExtension($_.Name).ToLowerInvariant()
    if (($_.Length / 1MB) -gt $maxCopyMB) { return }
    if ($binaryExt -contains $ext) { return }

    $rel = RelPath $_.FullName $ProjectRoot
    $target = Join-Path $outDir ("_scripts\" + $rel)
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item -Force -LiteralPath $_.FullName -Destination $target -ErrorAction SilentlyContinue
  }
}

# SUMMARY
$summaryPath = Join-Path $outDir "SUMMARY.txt"
@"
Project Snapshot created (v2).

Snapshot folder:
$outDir

Upload the ZIP (or this folder) to ChatGPT to resume after clearing chat context.
"@ | Set-Content -Encoding UTF8 $summaryPath

# ZIP
if ($Zip) {
  $zipPath = Join-Path $logsRoot ("snapshot_" + $timestamp + ".zip")
  if (Test-Path $zipPath) { Remove-Item -Force $zipPath -ErrorAction SilentlyContinue }
  Compress-Archive -Path $outDir -DestinationPath $zipPath -Force
  Write-Host ("ZIP created: " + $zipPath)
}

Start-Process explorer.exe $outDir | Out-Null
