const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// In development, load from Vite dev server; in production, load built files
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let backendProcess = null;

function startBackend() {
  if (isDev) {
    console.log('Running in development mode. Assuming backend is started manually.');
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'backend.exe');
  console.log(`Starting backend from: ${backendPath}`);

  try {
    backendProcess = spawn(backendPath, [], {
      windowsHide: true,
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend stdout: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend stderr: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  } catch (err) {
    console.error('Failed to start backend process:', err);
  }
}

function killBackend() {
  if (backendProcess) {
    console.log('Terminating backend process...');
    // Kill the process. On Windows, taskkill can sometimes be necessary if it's stubborn,
    // but standard kill usually works for simple FastAPI backends.
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Crazy Game Lounge',
    icon: path.join(__dirname, '..', 'public', 'favicon.svg'),
    backgroundColor: '#081221',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless for a more immersive gaming feel (optional)
    // frame: false,
    // titleBarStyle: 'hidden',
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Open DevTools in development
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Remove the default menu bar for a cleaner look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  killBackend();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
