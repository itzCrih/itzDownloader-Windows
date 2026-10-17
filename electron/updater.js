const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { app } = require('electron');

class AutoUpdater {
  constructor(mainWindow = null) {
    this.mainWindow = mainWindow;
    this.currentVersion = app.getVersion();
    this.isChecking = false;
    this.isDownloading = false;
    this.updateInfo = null;
    this.downloadedFilePath = null;
  }

  setWindow(win) {
    this.mainWindow = win;
  }

  send(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  isNewerVersion(remoteTag, localVer) {
    const cleanRemote = (remoteTag || '').replace(/^v/i, '').trim();
    const cleanLocal = (localVer || '').replace(/^v/i, '').trim();

    const rParts = cleanRemote.split('.').map((n) => parseInt(n, 10) || 0);
    const lParts = cleanLocal.split('.').map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
      const r = rParts[i] || 0;
      const l = lParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  }

  async checkForUpdates(manual = false) {
    if (this.isChecking) return { status: 'checking' };
    this.isChecking = true;
    this.send('update:status', { status: 'checking', manual });

    try {
      const release = await this.fetchLatestRelease();
      this.isChecking = false;

      if (!release || !release.tag_name) {
        this.send('update:status', { status: 'up-to-date', currentVersion: this.currentVersion, manual });
        return { status: 'up-to-date', currentVersion: this.currentVersion };
      }

      const hasUpdate = this.isNewerVersion(release.tag_name, this.currentVersion);

      if (hasUpdate) {
        // Find installer or portable asset
        const assets = release.assets || [];
        const setupAsset = assets.find((a) => a.name.endsWith('.exe') && a.name.toLowerCase().includes('setup'))
          || assets.find((a) => a.name.endsWith('.exe'));

        const downloadUrl = setupAsset ? setupAsset.browser_download_url : release.html_url;

        this.updateInfo = {
          version: release.tag_name.replace(/^v/i, ''),
          releaseNotes: release.body || 'New features and improvements.',
          downloadUrl,
          assetName: setupAsset ? setupAsset.name : null,
          releaseUrl: release.html_url,
        };

        this.send('update:status', {
          status: 'available',
          updateInfo: this.updateInfo,
          manual,
        });

        // Automatically start download if installer asset found
        if (setupAsset && downloadUrl && !app.isPackaged) {
          // in dev just report available
        } else if (setupAsset && downloadUrl) {
          this.downloadUpdate(downloadUrl);
        }

        return { status: 'available', updateInfo: this.updateInfo };
      } else {
        this.send('update:status', {
          status: 'up-to-date',
          currentVersion: this.currentVersion,
          latestVersion: release.tag_name.replace(/^v/i, ''),
          manual,
        });
        return { status: 'up-to-date', currentVersion: this.currentVersion };
      }
    } catch (err) {
      this.isChecking = false;
      this.send('update:status', { status: 'error', error: err.message, manual });
      return { status: 'error', error: err.message };
    }
  }

  fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/itzCrih/itzDownloader-Windows/releases/latest',
        headers: {
          'User-Agent': 'itzDownloader-Desktop',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      const req = https.get(options, (res) => {
        if (res.statusCode === 404) {
          return resolve(null);
        }
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return https.get(res.headers.location, { headers: options.headers }, (redirRes) => {
            let data = '';
            redirRes.on('data', (c) => (data += c));
            redirRes.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
          }).on('error', reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API returned status ${res.statusCode}`));
        }

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse release payload'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy();
        reject(new Error('Update check request timed out'));
      });
    });
  }

  async downloadUpdate(downloadUrl) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const tempDir = os.tmpdir();
    const fileName = `itzDownloader-Update-${this.updateInfo.version}.exe`;
    const targetPath = path.join(tempDir, fileName);
    this.downloadedFilePath = targetPath;

    try {
      await this.downloadFile(downloadUrl, targetPath, (progress) => {
        this.send('update:download-progress', progress);
      });

      this.isDownloading = false;
      this.send('update:downloaded', {
        filePath: targetPath,
        version: this.updateInfo.version,
      });
    } catch (err) {
      this.isDownloading = false;
      this.send('update:status', { status: 'error', error: `Download failed: ${err.message}` });
    }
  }

  downloadFile(url, dest, onProgress, redirectCount = 0) {
    if (redirectCount > 6) {
      return Promise.reject(new Error('Too many redirects while downloading update.'));
    }

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, { headers: { 'User-Agent': 'itzDownloader-Desktop' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.downloadFile(res.headers.location, dest, onProgress, redirectCount + 1));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download update: HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || 0, 10);
        let receivedBytes = 0;
        const file = fs.createWriteStream(dest);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            onProgress({
              percent,
              receivedBytes,
              totalBytes,
            });
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  }

  quitAndInstall() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      return false;
    }

    try {
      spawn(this.downloadedFilePath, ['/S'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      }).unref();

      setTimeout(() => {
        app.quit();
      }, 500);

      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = AutoUpdater;
