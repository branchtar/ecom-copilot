Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FileText([Parameter(Mandatory=$true)][string]$FilePath) {
  if (!(Test-Path -LiteralPath $FilePath)) { throw "File not found: $FilePath" }
  return Get-Content -LiteralPath $FilePath -Raw
}

function Set-FileTextUtf8([Parameter(Mandatory=$true)][string]$FilePath, [Parameter(Mandatory=$true)][string]$Content) {
  Set-Content -LiteralPath $FilePath -Value $Content -Encoding UTF8
}

function Get-BlockMarkers {
  param(
    [Parameter(Mandatory=$true)][string]$BlockName,
    [Parameter(Mandatory=$false)][ValidateSet("line","jsx")][string]$Style = "line"
  )
  if ($Style -eq "jsx") {
    return @{
      Start = "{/* " + $BlockName + "_BLOCK_START */}"
      End   = "{/* " + $BlockName + "_BLOCK_END */}"
    }
  } else {
    return @{
      Start = "// " + $BlockName + "_BLOCK_START"
      End   = "// " + $BlockName + "_BLOCK_END"
    }
  }
}

function Set-Block {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$BlockName,
    [Parameter(Mandatory=$true)][string]$NewInnerContent,
    [Parameter(Mandatory=$false)][ValidateSet("line","jsx")][string]$Style = "line"
  )

  $content = Get-FileText $FilePath
  $m = Get-BlockMarkers -BlockName $BlockName -Style $Style

  $start = $m.Start
  $end   = $m.End

  $pattern = "(?s)" + [regex]::Escape($start) + ".*?" + [regex]::Escape($end)

  if ($content -notmatch $pattern) {
    throw "Could not find block markers ($Style) for: $BlockName in $FilePath"
  }

  $replacement = $start + "`r`n" + $NewInnerContent.TrimEnd() + "`r`n" + $end

  $newContent = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement }
  )

  Set-FileTextUtf8 $FilePath $newContent
}

