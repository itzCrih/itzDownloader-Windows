const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const EngineManager = require('./engine-manager');
const Downloader = require('./downloader');
const AutoUpdater = require('./updater');

// Memory and performance optimizations
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

let splashWindow = null;
let mainWindow = null;
let engineManager = null;
let downloader = null;
let autoUpdater = null;

function createSplashWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  const pngIconPath = path.join(__dirname, '../public/logo.png');

  splashWindow = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    skipTaskbar: true,
    focusable: false, // Prevents splash from capturing focus or mouse events
    backgroundColor: '#07090e',
    icon: fs.existsSync(iconPath) ? iconPath : fs.existsSync(pngIconPath) ? pngIconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashPath = path.join(__dirname, 'splash.html');
  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath);
  }

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });
}

function createWindow(onReady = null) {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  const pngIconPath = path.join(__dirname, '../public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    icon: fs.existsSync(iconPath) ? iconPath : fs.existsSync(pngIconPath) ? pngIconPath : undefined,
    backgroundColor: '#07090e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Intercept links to external browser (only http/https ever leave the app)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isSafeExternalUrl(targetUrl)) shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternalUrl(targetUrl)) shell.openExternal(targetUrl);
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (onReady) {
      onReady();
    } else {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }

    autoUpdater = new AutoUpdater(mainWindow);
    // Background auto-update check on startup after 4 seconds
    setTimeout(() => {
      if (autoUpdater) {
        autoUpdater.checkForUpdates(false);
      }
    }, 4000);
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function isSafeExternalUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

function isSafeLocalPath(p) {
  return typeof p === 'string' && p.length > 0 && p.length < 1024 && path.isAbsolute(p) && !p.includes('\u0000');
}

/**
 * Strict Content-Security-Policy for the packaged app. Dev mode is skipped
 * because Vite's React refresh preamble relies on inline scripts.
 */
function applyContentSecurityPolicy() {
  if (!app.isPackaged) return;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
  ].join('; ');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * yt-dlp prints dozens of lines per second per job. Forwarding every line as
 * its own IPC message (and React state update) made the UI stutter with
 * several parallel downloads. Logs are batched and progress is throttled,
 * while status transitions are always delivered immediately.
 */
const LOG_FLUSH_MS = 150;
const PROGRESS_THROTTLE_MS = 120;
const pendingLogs = new Map(); // jobId -> string[]
const lastProgress = new Map(); // jobId -> { time, status }
let logFlushTimer = null;

function flushLogs() {
  logFlushTimer = null;
  if (pendingLogs.size === 0) return;
  const batch = [];
  for (const [jobId, lines] of pendingLogs) batch.push({ jobId, lines });
  pendingLogs.clear();
  sendToRenderer('job:log-batch', batch);
}

function queueLog(jobId, text) {
  if (!text) return;
  const lines = pendingLogs.get(jobId) || [];
  lines.push(String(text).slice(0, 2000));
  if (lines.length > 300) lines.shift();
  pendingLogs.set(jobId, lines);
  if (!logFlushTimer) logFlushTimer = setTimeout(flushLogs, LOG_FLUSH_MS);
}

function queueProgress(progress) {
  const now = Date.now();
  const prev = lastProgress.get(progress.jobId);
  const statusChanged = !prev || prev.status !== progress.status;
  if (!statusChanged && now - prev.time < PROGRESS_THROTTLE_MS) return;
  lastProgress.set(progress.jobId, { time: now, status: progress.status });
  sendToRenderer('job:progress', progress);
}

function finishJobChannel(jobId) {
  flushLogs();
  lastProgress.delete(jobId);
}

// Global Anti-Crash Exception & Rejection Handlers
process.on('uncaughtException', (err) => {
  console.error('[itzDownloader Core] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[itzDownloader Core] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const splashStartTime = Date.now();
    applyContentSecurityPolicy();
    if (process.platform === 'win32') app.setAppUserModelId('it.itzcrih.itzdownloader.desktop');
    // Show instant splash screen immediately
    createSplashWindow();

    const appDataPath = app.getPath('userData');
    engineManager = new EngineManager(appDataPath);
    downloader = new Downloader(engineManager);

    // Run engine & hardware detection in background while splash is shown
    const detectPromise = engineManager.detect().catch((err) => {
      console.error('Engine detection error:', err);
    });

    setupIpcHandlers();

    // Create and load main window in parallel immediately (same ultra-fast design as itzCut!)
    createWindow(async () => {
      await detectPromise;
      const elapsed = Date.now() - splashStartTime;
      const minSplashDuration = 1800; // Exact same 1.8s polished branding as itzCut Desktop
      const remainingDelay = Math.max(0, minSplashDuration - elapsed);

      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }, remainingDelay);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Window controls
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Shell & Dialogs
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Output Directory',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  // Opening files: only real absolute paths. Executables/scripts are revealed
  // in Explorer instead of being launched.
  const BLOCKED_OPEN_EXT = new Set(['.exe', '.bat', '.cmd', '.com', '.ps1', '.vbs', '.js', '.msi', '.scr', '.lnk', '.hta', '.jar']);

  ipcMain.handle('shell:showInFolder', async (event, filePath) => {
    if (!isSafeLocalPath(filePath) || !fs.existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('shell:openFile', async (event, filePath) => {
    if (!isSafeLocalPath(filePath) || !fs.existsSync(filePath)) return false;
    if (BLOCKED_OPEN_EXT.has(path.extname(filePath).toLowerCase())) {
      shell.showItemInFolder(filePath);
      return true;
    }
    const err = await shell.openPath(filePath);
    return !err;
  });

  ipcMain.handle('shell:openExternal', async (event, externalUrl) => {
    if (!isSafeExternalUrl(externalUrl)) return false;
    await shell.openExternal(externalUrl);
    return true;
  });

  ipcMain.handle('clipboard:read', () => {
    try {
      return clipboard.readText().slice(0, 4096);
    } catch (e) {
      return '';
    }
  });

  ipcMain.handle('clipboard:write', (event, text) => {
    try {
      clipboard.writeText(String(text ?? ''));
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:notify', (event, payload = {}) => {
    try {
      if (!Notification.isSupported()) return false;
      const iconPath = path.join(__dirname, '../public/logo.png');
      const notification = new Notification({
        title: String(payload.title || 'itzDownloader').slice(0, 120),
        body: String(payload.body || '').slice(0, 300),
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        silent: true,
      });
      notification.on('click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
        if (isSafeLocalPath(payload.filePath) && fs.existsSync(payload.filePath)) {
          shell.showItemInFolder(payload.filePath);
        }
      });
      notification.show();
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('app:getDefaultOutputDir', async () => {
    // Default to user's standard Downloads folder
    const downloads = app.getPath('downloads');
    const itzDownloaderDir = path.join(downloads, 'itzDownloader');
    try {
      await fs.promises.mkdir(itzDownloaderDir, { recursive: true });
      return itzDownloaderDir;
    } catch (e) {
      return downloads;
    }
  });

  // Engine Manager IPC
  const engineProgress = (engine) => (progress) => sendToRenderer('engine:download-progress', { engine, ...progress });

  ipcMain.handle('engine:getStatus', async (event, force) => {
    return await engineManager.detect(!!force);
  });

  ipcMain.handle('engine:downloadYtDlp', async () => {
    return await engineManager.downloadYtDlp(engineProgress('yt-dlp'));
  });

  ipcMain.handle('engine:updateYtDlp', async () => {
    return await engineManager.updateYtDlp(engineProgress('yt-dlp'));
  });

  ipcMain.handle('engine:downloadFfmpeg', async () => {
    return await engineManager.downloadFfmpeg(engineProgress('ffmpeg'));
  });

  ipcMain.handle('engine:ensureAll', async () => {
    return await engineManager.ensureAllEngines((progress) => sendToRenderer('engine:install-progress', progress));
  });

  // Media Inspection
  ipcMain.handle('media:inspectUrl', async (event, { url, options } = {}) => {
    return await downloader.inspectUrl(url, options || {});
  });

  // Job Execution & Downloads
  ipcMain.handle('job:start', async (event, jobConfig) => {
    if (!jobConfig || typeof jobConfig !== 'object' || typeof jobConfig.jobId !== 'string') {
      throw new Error('Invalid job configuration.');
    }
    const { jobId } = jobConfig;
    try {
      const result = await downloader.startDownload(
        jobConfig,
        queueProgress,
        (logLine) => queueLog(jobId, logLine)
      );
      finishJobChannel(jobId);
      sendToRenderer('job:complete', result);
      return result;
    } catch (err) {
      finishJobChannel(jobId);
      // A user-initiated cancel is not an error: job:canceled was already sent
      if (!err?.canceled) {
        sendToRenderer('job:error', { jobId, error: err.message });
      }
      return { jobId, error: err.message, canceled: !!err?.canceled };
    }
  });

  ipcMain.handle('job:cancel', (event, jobId) => {
    const canceled = downloader.cancelDownload(jobId);
    if (canceled) {
      finishJobChannel(jobId);
      sendToRenderer('job:canceled', { jobId });
    }
    return canceled;
  });

  // Auto-Updater
  ipcMain.handle('update:check', async () => {
    if (autoUpdater) {
      return await autoUpdater.checkForUpdates(true);
    }
    return { status: 'idle' };
  });

  ipcMain.handle('update:quitAndInstall', () => {
    if (autoUpdater) {
      return autoUpdater.quitAndInstall();
    }
    return false;
  });
}
