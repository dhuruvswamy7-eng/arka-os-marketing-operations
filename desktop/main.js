const { app, BrowserWindow, Tray, Menu, Notification, shell, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let localServer = null;
let localPort = null;

// Shift state tracked from frontend
let shiftState = {
  isLoggedIn: false,
  isCompleted: false,
  role: '',
  remainingMinutes: 540,
  totalMinutes: 0
};

ipcMain.on('shift:status', (event, data) => {
  if (data && typeof data === 'object') {
    shiftState = { ...shiftState, ...data };
  }
});

ipcMain.on('notify', (event, { title, body }) => {
  if (Notification.isSupported()) {
    try {
      new Notification({ title, body, icon: getAppIcon() }).show();
    } catch {}
  }
});

// Enforce single instance lock (prevents running duplicate instances)
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
      return path.resolve(p);
    }
  }
  return path.resolve(path.join(__dirname, 'web-dist'));
}

// Secure local loopback server with strict Path Traversal & CSP protection
function startSecureLocalServer(callback) {
  const staticDir = getWebDistDir();

  localServer = http.createServer((req, res) => {
    // Only accept GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || !reqPath) reqPath = '/index.html';

    // Strict Path Traversal defense: normalize and verify path stays within staticDir
    let safeFilePath = path.normalize(path.join(staticDir, reqPath));
    if (!safeFilePath.startsWith(staticDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // SPA fallback: if file does not exist, safely serve index.html
    if (!fs.existsSync(safeFilePath) || fs.statSync(safeFilePath).isDirectory()) {
      safeFilePath = path.join(staticDir, 'index.html');
    }

    const ext = path.extname(safeFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(safeFilePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading asset');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://arka-api-w9o0.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com data: blob:; connect-src 'self' https://arka-api-w9o0.onrender.com wss://arka-api-w9o0.onrender.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:;"
        });
        res.end(content);
      }
    });
  });

  // Strict binding to 127.0.0.1 (loopback only - cannot be reached from local network)
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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      devTools: !app.isPackaged, // Completely disables DevTools in production
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false
  });

  // Load the secure local loopback ARKA OS build
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Security: Block DevTools inspection shortcuts in production
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (source view)
      if (
        input.key === 'F12' ||
        (input.control && input.shift && (input.key === 'I' || input.key === 'i' || input.key === 'J' || input.key === 'j')) ||
        (input.control && (input.key === 'u' || input.key === 'U'))
      ) {
        event.preventDefault();
      }
    });

    // Disable default right-click context menu inspect
    mainWindow.webContents.on('context-menu', (e) => {
      e.preventDefault();
    });
  }

  // Security: Prevent navigation hijacking (cannot be redirected to malicious phishing pages)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // External URLs strictly open in user's default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      if (!url.includes(`127.0.0.1:${port}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'deny' };
  });

  // Enforce 9-Hour Workday policy on close [X]: cannot close until 9 hours completed, but can minimize!
  mainWindow.on('close', (event) => {
    const isFounder = shiftState.role === 'Founder';
    const isShiftDone = shiftState.isCompleted || (shiftState.totalMinutes >= 540);
    const isLocked = shiftState.isLoggedIn && !isFounder && !isShiftDone;

    if (isLocked) {
      event.preventDefault();
      // Strictly minimize window as requested ("without 9hr comption wecant close using thaytt red ok but we can minimise")
      mainWindow.minimize();

      const hoursLeft = Math.floor(shiftState.remainingMinutes / 60);
      const minsLeft = shiftState.remainingMinutes % 60;
      const timeLeftStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

      if (Notification.isSupported()) {
        try {
          new Notification({
            title: '⚠️ 9-Hour Shift Required — Exit Blocked',
            body: `You cannot close ARKA OS until your mandatory 9-hour workday is completed (${timeLeftStr} remaining). The app has been minimized to continue your shift timer.`,
            icon: iconPath
          }).show();
        } catch {}
      }
      return false;
    }

    if (!isQuitting) {
      // If user is founder or shift completed, or not logged in, allow quit
      if (isShiftDone || isFounder) {
        isQuitting = true;
        app.quit();
        return;
      }
      // If logged out or unauthenticated, hide to tray or minimize
      event.preventDefault();
      mainWindow.minimize();
      return false;
    }
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
          const isFounder = shiftState.role === 'Founder';
          const isShiftDone = shiftState.isCompleted || (shiftState.totalMinutes >= 540);
          const isLocked = shiftState.isLoggedIn && !isFounder && !isShiftDone;

          if (isLocked) {
            const hoursLeft = Math.floor(shiftState.remainingMinutes / 60);
            const minsLeft = shiftState.remainingMinutes % 60;
            const timeLeftStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

            dialog.showMessageBoxSync(mainWindow || undefined, {
              type: 'warning',
              title: 'Shift Incomplete — Exit Blocked',
              message: `Mandatory 9-Hour Workday Policy\n\nYou cannot exit ARKA OS until your full 9-hour work shift is completed.\nTime Remaining: ${timeLeftStr}.\n\nYou can keep ARKA OS minimized in the background while you work.`,
              buttons: ['Keep Minimized (Understood)']
            });
            if (mainWindow) {
              mainWindow.minimize();
            }
            return;
          }

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
  // Security: Restrict renderer permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Only allow notifications; deny microphone, camera, geolocation, media access
    if (permission === 'notifications') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Configure Windows auto-start on boot
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } catch {}

  startSecureLocalServer((port) => {
    createMainWindow(port);
    createSystemTray();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (localPort) {
        createMainWindow(localPort);
      } else {
        startSecureLocalServer((port) => createMainWindow(port));
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
