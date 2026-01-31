
#
# 使い方
# > .\run-codex.ps1 -Prompt "index.htmlのファイルサイズを教えて"
#

param(
  [string]$Prompt,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$codexCmd = $null
if (Test-CommandExists "codex") {
  $codexCmd = "codex"
} elseif (Test-CommandExists "openai") {
  $codexCmd = "openai"
}

if (-not $codexCmd) {
  Write-Error "Codex CLI not found. Install or add it to PATH."
}

$allArgs = @()
if ($Prompt) {
  $allArgs += @($Prompt)
}
if ($Args) {
  $allArgs += @($Args)
}
$filteredArgs = @()
foreach ($arg in $allArgs) {
  if (-not [string]::IsNullOrEmpty($arg)) {
    $filteredArgs += $arg
  }
}

& $codexCmd @filteredArgs
$exitCode = $LASTEXITCODE

try {
  New-BurntToastNotification -Text "B.Click", "Codex process finished"
} catch {
  Write-Warning "Toast notification failed. Ensure BurntToast is installed."
}

exit $exitCode
