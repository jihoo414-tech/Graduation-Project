Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$VenvPath = Join-Path $BackendRoot ".venv"
$ExpectedRoot = [System.IO.Path]::GetFullPath($BackendRoot.Path)
$ExpectedVenv = [System.IO.Path]::GetFullPath($VenvPath)

if (-not $ExpectedVenv.StartsWith($ExpectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove a virtual environment outside the backend folder: $ExpectedVenv"
}

Set-Location $BackendRoot

if (Test-Path $VenvPath) {
    Remove-Item -LiteralPath $VenvPath -Recurse -Force
}

py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"

Write-Host ""
Write-Host "Backend virtual environment repaired."
Write-Host "Activate it with:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
