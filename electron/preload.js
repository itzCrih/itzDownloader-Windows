const { contextBridge, ipcRenderer, webUtils, clipboard } = require('electron');

contextBridge.exposeInMainWorld('itzDownloaderAPI', {
  // Safe dropped file path resolver for modern Electron
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (e) {}
    return file?.path || '';
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Dialogs & Shell
  selectFolderDialog: () => ipcRenderer.invoke('dialog:selectFolder'),
  showInFolder: (filePath) => ipcRenderer.invoke('shell:showInFolder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('shell:openFile', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getDefaultOutputDir: () => ipcRenderer.invoke('app:getDefaultOutputDir'),

  // Clipboard helper
  readClipboard: () => {
    try {
      return clipboard.readText();
    } catch (e) {
      return '';
    }
  },

  // Engine Status & Auto-Downloads (yt-dlp + FFmpeg)
  getEngineStatus: () => ipcRenderer.invoke('engine:getStatus'),
  downloadYtDlp: () => ipcRenderer.invoke('engine:downloadYtDlp'),
  updateYtDlp: () => ipcRenderer.invoke('engine:updateYtDlp'),
  downloadFfmpeg: () => ipcRenderer.invoke('engine:downloadFfmpeg'),
  ensureAllEngines: () => ipcRenderer.invoke('engine:ensureAll'),
  onEngineDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('engine:download-progress', listener);
    return () => ipcRenderer.removeListener('engine:download-progress', listener);
  },
  onEngineInstallProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('engine:install-progress', listener);
    return () => ipcRenderer.removeListener('engine:install-progress', listener);
  },

  // URL Inspection (metadata, formats, thumbnail, resolutions)
  inspectUrl: (url, options) => ipcRenderer.invoke('media:inspectUrl', { url, options }),

  // Jobs & Downloads
  startJob: (jobConfig) => ipcRenderer.invoke('job:start', jobConfig),
  cancelJob: (jobId) => ipcRenderer.invoke('job:cancel', jobId),

  // Realtime Events
  onJobProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('job:progress', listener);
    return () => ipcRenderer.removeListener('job:progress', listener);
  },
  onJobComplete: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('job:complete', listener);
    return () => ipcRenderer.removeListener('job:complete', listener);
  },
  onJobError: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('job:error', listener);
    return () => ipcRenderer.removeListener('job:error', listener);
  },
  onJobCanceled: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('job:canceled', listener);
    return () => ipcRenderer.removeListener('job:canceled', listener);
  },
  onJobLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('job:log', listener);
    return () => ipcRenderer.removeListener('job:log', listener);
  },

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('update:quitAndInstall'),
  onUpdateStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  onUpdateDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:download-progress', listener);
    return () => ipcRenderer.removeListener('update:download-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
});
