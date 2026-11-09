[CmdletBinding()]
param(
  [ValidateSet('status', 'test')]
  [string]$Command = 'status'
)

$ErrorActionPreference = 'Stop'

function Read-BridgeEnv {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "SWISH Vector configuration was not found at $Path. Copy .env.example to .env and configure it first."
  }

  $settings = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $match = [regex]::Match($line, '^(?<key>[^=\s]+)\s*=\s*(?<value>.*)$')
    if (-not $match.Success) { return }
    $value = $match.Groups['value'].Value.Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $settings[$match.Groups['key'].Value] = $value
  }
  return $settings
}

$bridgeRoot = Split-Path -Parent $PSScriptRoot
$settings = Read-BridgeEnv -Path (Join-Path $bridgeRoot '.env')
$secret = [string]$settings['BRIDGE_SHARED_SECRET']
if ($secret.Length -lt 32) {
  throw 'BRIDGE_SHARED_SECRET must be at least 32 characters before WirePod can invoke a local command.'
}

$port = if ($settings.ContainsKey('BRIDGE_PORT')) { [int]$settings['BRIDGE_PORT'] } else { 8788 }
$body = @{ command = $Command } | ConvertTo-Json -Compress
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:$port/v1/command" `
  -Headers @{ Authorization = "Bearer $secret" } `
  -ContentType 'application/json' `
  -Body $body

if (-not $response.ok) { throw 'The local SWISH Vector bridge did not confirm the command.' }
Write-Output "SWISH Vector $Command command completed."
