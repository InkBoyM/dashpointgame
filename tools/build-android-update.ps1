# Builds www.zip for Android offline updates and bumps app-version.json.
# Run from anywhere, then upload www.zip + app-version.json next to index.html
# on the site (or just deploy the whole folder — both files sit in the root).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$verFile = Join-Path $root "app-version.json"
$ver = Get-Content $verFile -Raw | ConvertFrom-Json
$ver.www = [int]$ver.www + 1

$tmp = Join-Path ([IO.Path]::GetTempPath()) "dp-www-build"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory $tmp | Out-Null
$exclude = @(".git", "tools", "www.zip", "app-version.json", "serve.mjs", "README.md")
Get-ChildItem -Path $root -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $tmp $_.Name) -Recurse -Force
}
$zip = Join-Path $root "www.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $zip
Remove-Item -Recurse -Force $tmp
$ver | ConvertTo-Json -Compress | Set-Content $verFile -NoNewline
Write-Host "www.zip built. Site www version is now $($ver.www) — upload www.zip + app-version.json"
