const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : fs.existsSync(pngIconPath) ? pngIconPath : undefined,
    backgroundColor: '#00000000',
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

function createWindow() {
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
      sandbox: false,
    },
  });

  // Intercept links to external browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('https:') || targetUrl.startsWith('http:')) {
      shell.openExternal(targetUrl);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (targetUrl.startsWith('https:') || targetUrl.startsWith('http:')) {
        shell.openExternal(targetUrl);
      }
    }
  });

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 600);

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
    // Show instant splash screen immediately
    createSplashWindow();

    const appDataPath = app.getPath('userData');
    engineManager = new EngineManager(appDataPath);
    downloader = new Downloader(engineManager);

    // Initial detection of yt-dlp & ffmpeg (checks local, system, and itzCut sibling)
    await engineManager.detect();

    setupIpcHandlers();
    createWindow();

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

  ipcMain.handle('shell:showInFolder', async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('shell:openFile', async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return false;
    await shell.openPath(filePath);
    return true;
  });

  ipcMain.handle('shell:openExternal', async (event, externalUrl) => {
    if (!externalUrl) return false;
    await shell.openExternal(externalUrl);
    return true;
  });

  ipcMain.handle('app:getDefaultOutputDir', () => {
    // Default to user's standard Downloads folder
    const downloads = app.getPath('downloads');
    const itzDownloaderDir = path.join(downloads, 'itzDownloader');
    if (!fs.existsSync(itzDownloaderDir)) {
      try {
        fs.mkdirSync(itzDownloaderDir, { recursive: true });
      } catch (e) {
        return downloads;
      }
    }
    return itzDownloaderDir;
  });

  // Engine Manager IPC
  ipcMain.handle('engine:getStatus', async () => {
    return await engineManager.detect();
  });

  ipcMain.handle('engine:downloadYtDlp', async () => {
    return await engineManager.downloadYtDlp((progress) => {
      if (mainWindow) mainWindow.webContents.send('engine:download-progress', { engine: 'yt-dlp', ...progress });
    });
  });

  ipcMain.handle('engine:updateYtDlp', async () => {
    return await engineManager.updateYtDlp((progress) => {
      if (mainWindow) mainWindow.webContents.send('engine:download-progress', { engine: 'yt-dlp', ...progress });
    });
  });

  ipcMain.handle('engine:downloadFfmpeg', async () => {
    return await engineManager.downloadFfmpeg((progress) => {
      if (mainWindow) mainWindow.webContents.send('engine:download-progress', { engine: 'ffmpeg', ...progress });
    });
  });

  ipcMain.handle('engine:ensureAll', async () => {
    return await engineManager.ensureAllEngines((progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('engine:install-progress', progress);
      }
    });
  });

  // Media Inspection
  ipcMain.handle('media:inspectUrl', async (event, { url, options }) => {
    return await downloader.inspectUrl(url, options);
  });

  // Job Execution & Downloads
  ipcMain.handle('job:start', async (event, jobConfig) => {
    const { jobId } = jobConfig;
    try {
      const result = await downloader.startDownload(
        jobConfig,
        (progress) => {
          if (mainWindow) mainWindow.webContents.send('job:progress', progress);
        },
        (logLine) => {
          if (mainWindow) mainWindow.webContents.send('job:log', { jobId, text: logLine });
        }
      );
      if (mainWindow) mainWindow.webContents.send('job:complete', result);
      return result;
    } catch (err) {
      if (mainWindow) mainWindow.webContents.send('job:error', { jobId, error: err.message });
      throw err;
    }
  });

  ipcMain.handle('job:cancel', (event, jobId) => {
    const canceled = downloader.cancelDownload(jobId);
    if (canceled && mainWindow) {
      mainWindow.webContents.send('job:canceled', { jobId });
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
