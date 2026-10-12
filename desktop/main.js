const { app, BrowserWindow, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let localServer = null;
let localPort = null;

// Single-instance lock: only 1 instance of ARKA OS can run at a time
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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function getWebDistDir() {
  const possiblePaths = [
    path.join(__dirname, 'web-dist'),
    path.join(process.resourcesPath || '', 'web-dist'),
    path.join(app.getAppPath(), 'web-dist'),
    path.join(__dirname, '../artifacts/arka-os/dist/public')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return path.join(__dirname, 'web-dist');
}

function startLocalServer(callback) {
  const staticDir = getWebDistDir();

  localServer = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || !reqPath) reqPath = '/index.html';

    let filePath = path.join(staticDir, reqPath);

    // Single Page App (SPA) fallback: serve index.html if route doesn't match a static file
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(staticDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + reqPath);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      }
    });
  });

  localServer.listen(0, '127.0.0.1', () => {
    localPort = localServer.address().port;
    callback(localPort);
  });
}

function getAppIcon() {
  const possiblePaths = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, 'web-dist/assets/arkamedia-logo.png'),
    path.join(__dirname, '../artifacts/arka-os/public/assets/arkamedia-logo.png')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createMainWindow(port) {
  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
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

  // Load the ARKA OS local Single Page Application
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Minimize to tray when user clicks [X], preserving running shift & break timers
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (Notification.isSupported()) {
        try {
          new Notification({
            title: 'ARKA OS is still running',
            body: 'Minimized to system tray. Your 9-hour workday shift & break timer are still active.',
            icon: iconPath
          }).show();
        } catch {}
      }
      return false;
    }
  });

  // External URLs open in system web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes('127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
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
  // Configure Windows auto-start on boot
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } catch {}

  startLocalServer((port) => {
    createMainWindow(port);
    createSystemTray();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (localPort) {
        createMainWindow(localPort);
      } else {
        startLocalServer((port) => createMainWindow(port));
      }
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (localServer) {
    try { localServer.close(); } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});
