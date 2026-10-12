const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  sendNotification: (title, body) => {
    ipcRenderer.send('notify', { title, body });
  }
});
