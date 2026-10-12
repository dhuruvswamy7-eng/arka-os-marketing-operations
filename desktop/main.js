const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Ensure single instance of ARKA OS runs
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  const possiblePaths = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '../artifacts/arka-os/public/assets/arkamedia-logo.png'),
    path.join(__dirname, '../artifacts/arka-os/dist/public/assets/arkamedia-logo.png')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createMainWindow() {
  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'ARKA OS — Marketing Operations Hub',
    icon: iconPath,
    backgroundColor: '#101010',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false
  });

  // Attempt to load the production web application; fall back to local bundle if offline
  const productionUrl = 'https://arkadigitalmedia.com';
  const localBundlePath = path.join(__dirname, 'web-dist/index.html');
  const fallbackBundlePath = path.join(__dirname, '../artifacts/arka-os/dist/public/index.html');

  const loadFallback = () => {
    if (fs.existsSync(localBundlePath)) {
      mainWindow.loadFile(localBundlePath);
    } else if (fs.existsSync(fallbackBundlePath)) {
      mainWindow.loadFile(fallbackBundlePath);
    }
  };

  // Load production site by default so all team members get real-time cloud updates
  mainWindow.loadURL(productionUrl).catch(() => {
    loadFallback();
  });

  // If network connection fails, gracefully switch to local bundle
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && validatedURL.includes('arkadigitalmedia.com')) {
      loadFallback();
    }
  });

  // Smooth appearance when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Intercept close button: minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (Notification.isSupported()) {
        try {
          new Notification({
            title: 'ARKA OS is running in background',
            body: 'ARKA OS is minimized to the system tray so your 9-hour shift and break timers continue tracking accurately.',
            icon: iconPath
          }).show();
        } catch {}
      }
      return false;
    }
  });

  // External links open in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createSystemTray() {
  const iconPath = getAppIcon();
  if (!iconPath) return;

  try {
    tray = new Tray(iconPath);
    tray.setToolTip('ARKA OS — Marketing Operations Hub');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open ARKA OS',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Auto-Start on Windows Boot',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Exit ARKA OS',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Could not initialize tray:', err);
  }
}

app.whenReady().then(() => {
  // Configure Windows auto-start on boot so employees never forget to open ARKA OS
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } catch {}

  createMainWindow();
  createSystemTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray unless explicit quit
    if (isQuitting) {
      app.quit();
    }
  }
});
