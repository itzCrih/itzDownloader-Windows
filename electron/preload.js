const { contextBridge, ipcRenderer, webUtils } = require('electron');

/**
 * Subscribe helper: returns an unsubscribe function so React effects can clean up.
 */
function subscribe(channel) {
  return (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('itzDownloaderAPI', {
  // Safe dropped file path resolver for modern Electron
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (e) {}
    return '';
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
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  notify: (payload) => ipcRenderer.invoke('app:notify', payload),

  // Clipboard (handled in the main process so the renderer can stay sandboxed)
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

  // Engine Status & Auto-Downloads (yt-dlp + FFmpeg)
  getEngineStatus: (force = false) => ipcRenderer.invoke('engine:getStatus', force),
  downloadYtDlp: () => ipcRenderer.invoke('engine:downloadYtDlp'),
  updateYtDlp: () => ipcRenderer.invoke('engine:updateYtDlp'),
  downloadFfmpeg: () => ipcRenderer.invoke('engine:downloadFfmpeg'),
  ensureAllEngines: () => ipcRenderer.invoke('engine:ensureAll'),
  onEngineDownloadProgress: subscribe('engine:download-progress'),
  onEngineInstallProgress: subscribe('engine:install-progress'),

  // URL Inspection (metadata, formats, thumbnail, resolutions)
  inspectUrl: (url, options) => ipcRenderer.invoke('media:inspectUrl', { url, options }),

  // Jobs & Downloads
  startJob: (jobConfig) => ipcRenderer.invoke('job:start', jobConfig),
  cancelJob: (jobId) => ipcRenderer.invoke('job:cancel', jobId),

  // Realtime Events
  onJobProgress: subscribe('job:progress'),
  onJobComplete: subscribe('job:complete'),
  onJobError: subscribe('job:error'),
  onJobCanceled: subscribe('job:canceled'),
  // Logs arrive batched: [{ jobId, lines: string[] }]
  onJobLog: subscribe('job:log-batch'),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('update:quitAndInstall'),
  onUpdateStatus: subscribe('update:status'),
  onUpdateDownloadProgress: subscribe('update:download-progress'),
  onUpdateDownloaded: subscribe('update:downloaded'),
});
