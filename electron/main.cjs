const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// In development, load from Vite dev server; in production, load built files
const isDev = !app.isPackaged;

let backendProcess = null;

function startBackend() {
  if (isDev) {
    console.log('Running in development mode. Assuming backend is started manually.');
    return;
  }

  // Correctly resolve the path in packaged app
  // extraResources: { from: "backend/dist/backend.exe", to: "backend.exe" } puts it in resources/
  const backendPath = path.join(process.resourcesPath, 'backend.exe');
  
  console.log(`Resources Path: ${process.resourcesPath}`);
  console.log(`Target Backend Path: ${backendPath}`);

  if (!fs.existsSync(backendPath)) {
    console.error(`ERROR: Backend executable not found at ${backendPath}`);
    return;
  }

  try {
    backendProcess = spawn(backendPath, [], {
      windowsHide: true,
      cwd: process.resourcesPath, // Set working directory to where the exe is
      env: {
        ...process.env,
        // Optional: Add any specific environment variables if needed
      }
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

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend process:', err);
    });
  } catch (err) {
    console.error('Exception starting backend process:', err);
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
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    backgroundColor: '#081221',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
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
