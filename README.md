# Crazy Game Lounge

Desktop app for managing gaming lounge devices, sessions, products, and billing.

## Development

**Frontend + Electron (dev)**

```bash
npm install
npm run electron:dev
```

**Backend** (required in dev — Electron does not auto-start the API):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

## Production build (Windows installer)

1. Install dependencies:
   - Node.js 18+
   - Python 3.10+ with `pip install -r backend/requirements.txt pyinstaller`

2. Build the installer:

```bash
npm install
npm run electron:build
```

This will:
- Compile `backend.exe` into `backend/dist/`
- Build the React UI into `dist/`
- Package everything with electron-builder

**Output:** `dist-electron/Crazy Game Setup x.x.x.exe`

## Data

SQLite database: `%USERPROFILE%\.crazy_game_app\crazy_game.db`

## Features

- Device sessions (fixed duration, open session, early-end proration)
- Products with stock quantity and low-stock alerts (10% threshold)
- Optional password protection for settings
- Arabic / English UI
