# install_project_snapshot.ps1
# Run this ONCE from your project root (or anywhere inside the project).
# It installs:
#   diagnostic\project_snapshot.ps1
#   run\snapshot_project.bat
#   logs\project_snapshots\ (output)
# And updates .gitignore to ignore snapshot outputs.

$ErrorActionPreference = "Stop"

# -----------------------------
# Resolve project root
# -----------------------------
$ProjectRoot = (Resolve-Path ".").Path

# If you run this from a nested folder (like .\ps1), you can uncomment this logic:
# Walk up until we find a folder that "looks like" a project root.
# (Contains run/diagnostic/py/js/ps1/.git/package.json etc.)
<# 
function Find-ProjectRoot([string]$start) {
  $cur = (Resolve-Path $start).Path
  while ($true) {
    $markers = @(
      (Join-Path $cur ".git"),
      (Join-Path $cur "package.json"),
      (Join-Path $cur "run"),
      (Join-Path $cur "diagnostic"),
      (Join-Path $cur "ps1"),
      (Join-Path $cur "py"),
      (Join-Path $cur "js")
    )
    if ($markers | Where-Object { Test-Path $_ } | Select-Object -First 1) { return $cur }
    $parent = Split-Path $cur -Parent
    if (-not $parent -or $parent -eq $cur) { return (Resolve-Path ".").Path }
    $cur = $parent
  }
}
$ProjectRoot = Find-ProjectRoot "."
#>

Write-Host "Installing Project Snapshot system into:" -ForegroundColor Cyan
Write-Host "  $ProjectRoot" -ForegroundColor Cyan

# -----------------------------
# Create folders
# -----------------------------
$diagnosticDir = Join-Path $ProjectRoot "diagnostic"
$runDir        = Join-Path $ProjectRoot "run"
$logsDir       = Join-Path $ProjectRoot "logs\project_snapshots"

New-Item -ItemType Directory -Force -Path $diagnosticDir, $runDir, $logsDir | Out-Null

# -----------------------------
# Write diagnostic\project_snapshot.ps1
# -----------------------------
$projectSnapshotPs1Path = Join-Path $diagnosticDir "project_snapshot.ps1"

$projectSnapshotPs1 = @'
param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [switch]$Zip
)

$ErrorActionPreference = "Stop"

function Try-Run([string]$File, [string[]]$Args) {
  try {
    $tmpOut = Join-Path $env:TEMP ("_snap_out_" + [guid]::NewGuid().ToString("N") + ".txt")
    $tmpErr = Join-Path $env:TEMP ("_snap_err_" + [guid]::NewGuid().ToString("N") + ".txt")
    $p = Start-Process -FilePath $File -ArgumentList $Args -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr
    $out = if (Test-Path $tmpOut) { Get-Content $tmpOut -Raw } else { "" }
    $err = if (Test-Path $tmpErr) { Get-Content $tmpErr -Raw } else { "" }
    Remove-Item -Force -ErrorAction SilentlyContinue $tmpOut, $tmpErr | Out-Null
    return [pscustomobject]@{ ok = $true; code = $p.ExitCode; stdout = $out; stderr = $err }
  } catch {
    return [pscustomobject]@{ ok = $false; code = -1; stdout = ""; stderr = $_.Exception.Message }
  }
}

function Safe-RelPath([string]$full, [string]$root) {
  $r = $full.Substring($root.Length).TrimStart("\")
  return $r
}

# -----------------------------
# Snapshot settings
# -----------------------------
$excludeDirs = @(
  "node_modules",".git",".venv","venv","__pycache__","dist","build",".next",".cache","out",
  "coverage","tmp","temp",".pytest_cache",".mypy_cache",".ruff_cache","artifacts"
)

# Extra exclusions for common large/binary folders (edit as you like):
$excludeDirs += @("downloads","data","datasets")

# Exclude file extensions often huge / binary (we still list them; we just avoid copying/hashing big ones)
$binaryExt = @(".zip",".7z",".rar",".exe",".msi",".iso",".dmg",".bin",".pdf",".png",".jpg",".jpeg",".webp",".mp4",".mov",".avi",".mkv",".psd")

# Size limits (tweakable)
$maxHashMB = 10      # only hash files <= 10MB
$maxCopyMB = 2       # only copy script/text files <= 2MB (prevents giant dumps)
$maxTreeItems = 250000  # safety valve for huge folders

# Output folders
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logsRoot  = Join-Path $ProjectRoot "logs\project_snapshots"
$outDir    = Join-Path $logsRoot $timestamp
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Build exclusion regex (directory segment match)
$excludeRegex = ($excludeDirs | ForEach-Object { [regex]::Escape($_) }) -join "|"

Write-Host "==============================="
Write-Host "📸 Project Snapshot"
Write-Host "==============================="
Write-Host "Root: $ProjectRoot"
Write-Host "Out:  $outDir"
Write-Host ""

# -----------------------------
# META
# -----------------------------
$meta = [ordered]@{
  snapshot_name  = "Project Snapshot"
  created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  project_root   = $ProjectRoot
  computername   = $env:COMPUTERNAME
  username       = $env:USERNAME
  powershell     = $PSVersionTable.PSVersion.ToString()
}

try {
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
  $meta.os = $os.Caption
} catch { }

$gitV  = Try-Run "git"    @("--version")
$nodeV = Try-Run "node"   @("--version")
$npmV  = Try-Run "npm"    @("--version")
$pyV   = Try-Run "python" @("--version")

$meta.git_version    = ($gitV.stdout + $gitV.stderr).Trim()
$meta.node_version   = ($nodeV.stdout + $nodeV.stderr).Trim()
$meta.npm_version    = ($npmV.stdout + $npmV.stderr).Trim()
$meta.python_version = ($pyV.stdout + $pyV.stderr).Trim()

($meta | ConvertTo-Json -Depth 6) | Set-Content -Encoding UTF8 (Join-Path $outDir "meta.json")

# -----------------------------
# Collect items (with exclusions)
# -----------------------------
$allItems = @()
try {
  $allItems = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\($excludeRegex)\\" }
} catch { }

if ($allItems.Count -gt $maxTreeItems) {
  $warning = "WARNING: Project is very large ($($allItems.Count) items). Output trimmed to first $maxTreeItems for tree/manifest stability."
  $warning | Set-Content -Encoding UTF8 (Join-Path $outDir "WARNING.txt")
  $allItems = $allItems | Select-Object -First $maxTreeItems
}

$allItems = $allItems | Sort-Object FullName

# -----------------------------
# TREE
# -----------------------------
$treePath = Join-Path $outDir "project_tree.txt"
@(
  "Project root: $ProjectRoot"
  "Snapshot UTC:  $($meta.created_at_utc)"
  ""
  "Excluded dirs: $($excludeDirs -join ', ')"
  ""
) | Set-Content -Encoding UTF8 $treePath

foreach ($i in $allItems) {
  $rel = Safe-RelPath $i.FullName $ProjectRoot
  if ($i.PSIsContainer) {
    "[D] $rel" | Add-Content -Encoding UTF8 $treePath
  } else {
    $kb = if ($i.Length -ge 0) { [Math]::Round($i.Length/1KB,2) } else { 0 }
    "[F] $rel  ($kb KB)" | Add-Content -Encoding UTF8 $treePath
  }
}

# -----------------------------
# MANIFEST (CSV)
# -----------------------------
$manifestCsv = Join-Path $outDir "file_manifest.csv"
"relative_path,type,size_bytes,last_write_utc,sha256" | Set-Content -Encoding UTF8 $manifestCsv

$files = $allItems | Where-Object { -not $_.PSIsContainer }

foreach ($f in $files) {
  $rel = Safe-RelPath $f.FullName $ProjectRoot
  $sha = ""
  if (($f.Length / 1MB) -le $maxHashMB) {
    try { $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $f.FullName).Hash } catch { $sha = "" }
  }
  $line = ('"{0}",file,{1},"{2}","{3}"' -f $rel, $f.Length, $f.LastWriteTimeUtc.ToString("o"), $sha)
  Add-Content -Encoding UTF8 $manifestCsv $line
}

# -----------------------------
# ENV keys (names only; no secrets)
# -----------------------------
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

# -----------------------------
# GIT snapshot (best-effort)
# -----------------------------
$gitStatusPath = Join-Path $outDir "git_status.txt"
$gitLogPath    = Join-Path $outDir "git_log.txt"

$gs = Try-Run "git" @("-C",$ProjectRoot,"status","--porcelain=v1","-b")
if ($gs.ok) { ($gs.stdout + $gs.stderr).Trim() | Set-Content -Encoding UTF8 $gitStatusPath } else { $gs.stderr | Set-Content -Encoding UTF8 $gitStatusPath }

$gl = Try-Run "git" @("-C",$ProjectRoot,"log","-n","40","--oneline","--decorate")
if ($gl.ok) { ($gl.stdout + $gl.stderr).Trim() | Set-Content -Encoding UTF8 $gitLogPath } else { $gl.stderr | Set-Content -Encoding UTF8 $gitLogPath }

# -----------------------------
# Dependency snapshots (best-effort)
# -----------------------------
$npmLsPath = Join-Path $outDir "npm_ls_depth0.txt"
if (Test-Path (Join-Path $ProjectRoot "package.json")) {
  $npmLs = Try-Run "npm" @("--prefix",$ProjectRoot,"ls","--depth=0")
  if ($npmLs.ok) { ($npmLs.stdout + $npmLs.stderr).Trim() | Set-Content -Encoding UTF8 $npmLsPath } else { $npmLs.stderr | Set-Content -Encoding UTF8 $npmLsPath }
} else {
  "No package.json found." | Set-Content -Encoding UTF8 $npmLsPath
}

$pipFreezePath = Join-Path $outDir "pip_freeze.txt"
$pip = Try-Run "python" @("-m","pip","freeze")
if ($pip.ok) { ($pip.stdout + $pip.stderr).Trim() | Set-Content -Encoding UTF8 $pipFreezePath } else { $pip.stderr | Set-Content -Encoding UTF8 $pipFreezePath }

# -----------------------------
# Copy key marker files (if present)
# -----------------------------
$markerDir = Join-Path $outDir "_markers"
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null

$markers = @(
  "package.json","package-lock.json","pnpm-lock.yaml","yarn.lock",
  "requirements.txt","pyproject.toml","Pipfile","Pipfile.lock",
  "README.md","README.txt",".env.example",".gitignore"
)

foreach ($m in $markers) {
  $p = Join-Path $ProjectRoot $m
  if (Test-Path $p) {
    try { Copy-Item -Force -LiteralPath $p -Destination (Join-Path $markerDir $m) -ErrorAction SilentlyContinue } catch { }
  }
}

# -----------------------------
# Copy important script folders (run/diagnostic/ps1/py/js) with size guard
# -----------------------------
$scriptsDir = Join-Path $outDir "_scripts"
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null

$copyFolders = @("run","diagnostic","ps1","py","js")
foreach ($folder in $copyFolders) {
  $src = Join-Path $ProjectRoot $folder
  if (-not (Test-Path $src)) { continue }

  $dst = Join-Path $scriptsDir $folder
  New-Item -ItemType Directory -Force -Path $dst | Out-Null

  $folderFiles = Get-ChildItem -LiteralPath $src -Recurse -Force -File -ErrorAction SilentlyContinue
  foreach ($ff in $folderFiles) {
    $ext = [IO.Path]::GetExtension($ff.Name).ToLowerInvariant()
    $tooBig = (($ff.Length / 1MB) -gt $maxCopyMB)
    $isBinaryish = $binaryExt -contains $ext

    # Copy only if reasonably small and not obvious binary
    if ($tooBig -or $isBinaryish) { continue }

    $rel = Safe-RelPath $ff.FullName $ProjectRoot
    $target = Join-Path $outDir ("_scripts\" + $rel)

    $targetDir = Split-Path $target -Parent
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

    try { Copy-Item -Force -LiteralPath $ff.FullName -Destination $target -ErrorAction SilentlyContinue } catch { }
  }
}

# -----------------------------
# SUMMARY
# -----------------------------
$summaryPath = Join-Path $outDir "SUMMARY.txt"

$summary = @"
✅ Project Snapshot created.

Snapshot folder:
$outDir

What this snapshot includes:
- project_tree.txt
- file_manifest.csv (paths/sizes/timestamps + hashes for <= $maxHashMB MB)
- git_status.txt + git_log.txt (best-effort)
- env_keys.txt (names only; no secrets)
- _markers\ (package.json, requirements, locks, README, etc. if present)
- _scripts\ (copies of run/diagnostic/ps1/py/js small files)

What to do later:
1) If you clear ChatGPT context, upload the snapshot folder (or the zip) here.
2) We'll reconstruct the project structure and continue exactly where we left off.

Notes:
- This is a SNAPSHOT/manifest for ChatGPT handoff, not a disaster-recovery backup.
"@

$summary | Set-Content -Encoding UTF8 $summaryPath

Write-Host $summary

# -----------------------------
# ZIP (optional)
# -----------------------------
if ($Zip) {
  $zipPath = Join-Path $logsRoot ("snapshot_" + $timestamp + ".zip")
  try {
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
    Compress-Archive -Path $outDir -DestinationPath $zipPath -Force
    Write-Host ""
    Write-Host "📦 Zipped snapshot:" -ForegroundColor Green
    Write-Host "  $zipPath" -ForegroundColor Green
  } catch {
    Write-Host "ZIP failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

# Open output folder
try { Start-Process explorer.exe $outDir | Out-Null } catch { }
'@

Set-Content -Encoding UTF8 -Path $projectSnapshotPs1Path -Value $projectSnapshotPs1

# -----------------------------
# Write run\snapshot_project.bat (clickable)
# -----------------------------
$batPath = Join-Path $runDir "snapshot_project.bat"

$bat = @"
@echo off
setlocal
cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File ".\diagnostic\project_snapshot.ps1" -ProjectRoot "%CD%" -Zip
endlocal
"@

Set-Content -Encoding ASCII -Path $batPath -Value $bat

# -----------------------------
# Update .gitignore (optional but recommended)
# -----------------------------
$gitignorePath = Join-Path $ProjectRoot ".gitignore"
$ignoreLines = @(
  "",
  "# Project Snapshot outputs (generated)",
  "logs/project_snapshots/",
  "logs/project_snapshots/*.zip"
)

if (Test-Path $gitignorePath) {
  $existing = Get-Content $gitignorePath -ErrorAction SilentlyContinue
  $needs = $ignoreLines | Where-Object { $_ -and ($existing -notcontains $_) }

  if ($needs.Count -gt 0) {
    Add-Content -Encoding UTF8 -Path $gitignorePath -Value ($ignoreLines -join "`r`n")
  }
} else {
  Set-Content -Encoding UTF8 -Path $gitignorePath -Value ($ignoreLines -join "`r`n")
}

Write-Host ""
Write-Host "✅ Installed Project Snapshot system:" -ForegroundColor Green
Write-Host " - $projectSnapshotPs1Path"
Write-Host " - $batPath"
Write-Host ""
Write-Host "Next step: double-click run\snapshot_project.bat" -ForegroundColor Cyan
Write-Host "Snapshots will appear in: logs\project_snapshots\" -ForegroundColor Cyan
