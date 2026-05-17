const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

contextBridge.exposeInMainWorld('electronFS', {
  saveReport: (filename, data) => {
    try {
      const reportsDir = path.join(os.homedir(), '.crazy_game_app', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const filePath = path.join(reportsDir, filename);
      // data can be a string (CSV) or Uint8Array/Buffer (XLSX)
      fs.writeFileSync(filePath, Buffer.from(data));
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
});
