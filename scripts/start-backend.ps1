# Stop any process listening on port 8000, then start the API with current code.
$ErrorActionPreference = "Stop"
$port = 8000

Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1
Set-Location "$PSScriptRoot\..\backend"
Write-Host "Starting Crazy Game API on http://127.0.0.1:$port ..."
python -m uvicorn main:app --host 127.0.0.1 --port $port --reload
