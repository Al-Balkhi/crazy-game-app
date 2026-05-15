const { app, BrowserWindow } = require('electron');
const path = require('path');

// In development, load from Vite dev server; in production, load built files
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
