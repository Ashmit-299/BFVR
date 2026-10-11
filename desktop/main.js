// Vyapar Saathi — desktop shell (Electron)
//
// The UI is served from a tiny localhost static server so that:
//  - absolute asset paths (/assets/...) resolve correctly,
//  - React Router (BrowserRouter) deep links like /pos keep working,
//  - localStorage (login token, server address, offline queue) persists.
//
// The server address itself is NOT baked in — the login screen asks for it
// on first run and remembers it, exactly like the Android APK.

const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, 'app');
const PORT = 5178; // fixed port keeps localStorage stable across launches

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  let file = path.join(DIST, urlPath);
  // SPA fallback: unknown paths (e.g. /pos) serve index.html
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'Vyapar Saathi',
    backgroundColor: '#FFF8F1',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  win.loadURL(`http://127.0.0.1:${PORT}/`);

  // Open external links (e.g. docs) in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${PORT}/`)) e.preventDefault();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    const server = http.createServer(serveStatic);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Vyapar Saathi UI on http://127.0.0.1:${PORT}`);
      createWindow();
    });
    server.on('error', (err) => {
      console.error('Local server failed:', err.message);
      app.quit();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
