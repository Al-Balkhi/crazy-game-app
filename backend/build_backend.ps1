# Build backend.exe for Electron packaging (run from repo root or backend folder)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }

Write-Host "Building backend.exe with PyInstaller..."
$iconPath = "$PSScriptRoot\..\public\favicon.ico"
python -m PyInstaller --noconfirm --onefile --name backend --distpath dist --workpath build/pyinstaller --specpath build `
  --icon="$iconPath" `
  --hidden-import=uvicorn.logging `
  --hidden-import=uvicorn.loops `
  --hidden-import=uvicorn.loops.auto `
  --hidden-import=uvicorn.protocols `
  --hidden-import=uvicorn.protocols.http `
  --hidden-import=uvicorn.protocols.http.auto `
  --hidden-import=uvicorn.protocols.websockets `
  --hidden-import=uvicorn.lifespan `
  --hidden-import=uvicorn.lifespan.on `
  --collect-submodules=uvicorn `
  --collect-submodules=fastapi `
  --collect-submodules=sqlalchemy `
  run_backend.py

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done: backend/dist/backend.exe"
