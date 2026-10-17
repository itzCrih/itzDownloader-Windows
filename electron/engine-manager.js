const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');
const os = require('os');

class EngineManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.binDir = path.join(appDataPath, 'bin');
    this.ytDlpPath = null;
    this.ffmpegPath = null;
    this.ffprobePath = null;

    this.status = {
      ytDlpAvailable: false,
      ytDlpVersion: null,
      ytDlpSource: null, // 'system' | 'local'

      ffmpegAvailable: false,
      ffmpegVersion: null,
      ffmpegSource: null,

      hardwareAccels: {
        nvenc: false,
        qsv: false,
        amf: false,
      },
      systemInfo: {
        cpuModel: '',
        cpuCores: 0,
        ramGb: 0,
        gpuDevices: [],
        primaryGpu: '',
      },
    };
  }

  ensureBinDir() {
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
  }

  /**
   * Detect installed binaries (yt-dlp, ffmpeg, ffprobe) in local bin or system PATH / WinGet
   */
  _findSiblingFfmpeg() {
    if (process.platform !== 'win32') return null;

    const candidateDirs = [
      path.join(process.env.APPDATA || '', 'itzCut Desktop', 'bin'),
      path.join(process.env.APPDATA || '', 'itzcut-desktop', 'bin'),
      path.join(process.env.APPDATA || '', 'itzCut', 'bin'),
      path.join(process.env.APPDATA || '', 'itzcut-windows', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'itzCut Desktop', 'resources', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'itzcut-desktop', 'resources', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'itzCut', 'resources', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'itzCut', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'itzCut Desktop', 'bin'),
      path.resolve(__dirname, '../../itzCut-Windows/bin'),
      path.resolve(__dirname, '../../itzCut/bin'),
      path.resolve(__dirname, '../../itzCut-Windows/release/win-unpacked/resources/bin'),
    ];

    for (const dir of candidateDirs) {
      const ffmpegPath = path.join(dir, 'ffmpeg.exe');
      const ffprobePath = path.join(dir, 'ffprobe.exe');
      if (fs.existsSync(ffmpegPath)) {
        return {
          dir,
          ffmpegPath,
          ffprobePath: fs.existsSync(ffprobePath) ? ffprobePath : ffmpegPath,
        };
      }
    }
    return null;
  }

  _findSiblingYtDlp() {
    if (process.platform !== 'win32') return null;

    const candidateDirs = [
      path.join(process.env.APPDATA || '', 'itzCut Desktop', 'bin'),
      path.join(process.env.APPDATA || '', 'itzcut-desktop', 'bin'),
      path.join(process.env.APPDATA || '', 'itzCut', 'bin'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'itzCut Desktop', 'resources', 'bin'),
      path.resolve(__dirname, '../../itzCut-Windows/bin'),
    ];

    for (const dir of candidateDirs) {
      const ytDlpPath = path.join(dir, 'yt-dlp.exe');
      if (fs.existsSync(ytDlpPath)) {
        return ytDlpPath;
      }
    }
    return null;
  }

  /**
   * Detect installed binaries (yt-dlp, ffmpeg, ffprobe) in local bin, system PATH / WinGet, or sibling itzCut
   */
  async detect() {
    this.ensureBinDir();

    // 1. Detect yt-dlp
    const localYtDlp = path.join(this.binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    if (fs.existsSync(localYtDlp)) {
      this.ytDlpPath = localYtDlp;
      this.status.ytDlpSource = 'local';
    } else {
      const systemYtDlp = this._findInPath('yt-dlp');
      if (systemYtDlp) {
        this.ytDlpPath = systemYtDlp;
        this.status.ytDlpSource = 'system';
      } else {
        const siblingYtDlp = this._findSiblingYtDlp();
        if (siblingYtDlp) {
          try {
            fs.copyFileSync(siblingYtDlp, localYtDlp);
            this.ytDlpPath = localYtDlp;
            this.status.ytDlpSource = 'itzCut (reused)';
          } catch (e) {
            this.ytDlpPath = siblingYtDlp;
            this.status.ytDlpSource = 'itzCut (linked)';
          }
        } else {
          this.ytDlpPath = null;
          this.status.ytDlpSource = null;
        }
      }
    }

    if (this.ytDlpPath) {
      try {
        const out = execSync(`"${this.ytDlpPath}" --version`, {
          encoding: 'utf8',
          timeout: 4000,
          windowsHide: true,
        }).trim();
        this.status.ytDlpVersion = out.split(/\r?\n/)[0];
        this.status.ytDlpAvailable = true;
      } catch (e) {
        this.status.ytDlpAvailable = false;
      }
    } else {
      this.status.ytDlpAvailable = false;
      this.status.ytDlpVersion = null;
    }

    // 2. Detect ffmpeg & ffprobe
    const localFfmpeg = path.join(this.binDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    const localFfprobe = path.join(this.binDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

    if (fs.existsSync(localFfmpeg) && fs.existsSync(localFfprobe)) {
      this.ffmpegPath = localFfmpeg;
      this.ffprobePath = localFfprobe;
      this.status.ffmpegSource = 'local';
    } else {
      const systemFfmpeg = this._findInPath('ffmpeg');
      const systemFfprobe = this._findInPath('ffprobe');
      if (systemFfmpeg) {
        this.ffmpegPath = systemFfmpeg;
        this.ffprobePath = systemFfprobe || systemFfmpeg;
        this.status.ffmpegSource = 'system';
      } else {
        const sibling = this._findSiblingFfmpeg();
        if (sibling) {
          try {
            fs.copyFileSync(sibling.ffmpegPath, localFfmpeg);
            if (sibling.ffprobePath && fs.existsSync(sibling.ffprobePath)) {
              fs.copyFileSync(sibling.ffprobePath, localFfprobe);
            }
            this.ffmpegPath = localFfmpeg;
            this.ffprobePath = localFfprobe;
            this.status.ffmpegSource = 'itzCut (reused)';
          } catch (e) {
            this.ffmpegPath = sibling.ffmpegPath;
            this.ffprobePath = sibling.ffprobePath;
            this.status.ffmpegSource = 'itzCut (linked)';
          }
        } else {
          this.ffmpegPath = null;
          this.ffprobePath = null;
          this.status.ffmpegSource = null;
        }
      }
    }

    if (this.ffmpegPath) {
      try {
        const versionOutput = execSync(`"${this.ffmpegPath}" -version`, {
          encoding: 'utf8',
          timeout: 4000,
          windowsHide: true,
        });
        const match = versionOutput.match(/ffmpeg version ([^\s]+)/i);
        this.status.ffmpegVersion = match ? match[1] : 'Detected';
        this.status.ffmpegAvailable = true;

        // Hardware Acceleration probes
        try {
          this.status.hardwareAccels.nvenc = this.testHardwareEncoder('h264_nvenc');
          this.status.hardwareAccels.qsv = this.testHardwareEncoder('h264_qsv');
          this.status.hardwareAccels.amf = this.testHardwareEncoder('h264_amf');
        } catch (e) {}

        this.detectSystemInfo();
      } catch (e) {
        this.status.ffmpegAvailable = false;
      }
    } else {
      this.status.ffmpegAvailable = false;
      this.status.ffmpegVersion = null;
    }

    return {
      ...this.status,
      ytDlpPath: this.ytDlpPath,
      ffmpegPath: this.ffmpegPath,
      ffprobePath: this.ffprobePath,
      binDir: this.binDir,
    };
  }

  _findInPath(binName) {
    const isWin = process.platform === 'win32';
    const ext = isWin ? '.exe' : '';
    const target = `${binName}${ext}`;

    // Common Windows directories (WinGet links, chocolatey, scoop, local appdata)
    if (isWin) {
      const userProfile = process.env.USERPROFILE || '';
      const localAppData = process.env.LOCALAPPDATA || '';
      const candidatePaths = [
        path.join(localAppData, 'Microsoft', 'WinGet', 'Links', target),
        path.join(userProfile, 'scoop', 'shims', target),
        path.join(process.env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin', target),
        path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python', 'Scripts', target),
        path.join(localAppData, 'Programs', binName, target),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }
    }

    try {
      const checkCmd = isWin ? `where ${binName}` : `which ${binName}`;
      const output = execSync(checkCmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
      }).trim();
      const firstLine = output.split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch (e) {}

    return null;
  }

  testHardwareEncoder(encoderName) {
    if (!this.ffmpegPath) return false;
    try {
      execSync(
        `"${this.ffmpegPath}" -f lavfi -i color=c=black:s=256x256:d=0.1 -c:v ${encoderName} -f null -`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 3500, windowsHide: true }
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  detectSystemInfo() {
    try {
      const cpus = os.cpus();
      this.status.systemInfo.cpuModel = cpus && cpus[0] ? cpus[0].model.trim() : 'Unknown CPU';
      this.status.systemInfo.cpuCores = cpus ? cpus.length : 0;
      this.status.systemInfo.ramGb = Math.round(os.totalmem() / 1024 / 1024 / 1024);

      if (process.platform === 'win32') {
        try {
          // Use PowerShell Get-CimInstance for Windows 10/11 compatibility (wmic is deprecated)
          const psOut = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController).Caption"', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 4000,
            windowsHide: true,
          });
          const lines = psOut
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.toLowerCase().includes('caption'));
          if (lines.length > 0) {
            this.status.systemInfo.gpuDevices = lines;
            const dedicated = lines.find(
              (g) => g.toLowerCase().includes('nvidia') || g.toLowerCase().includes('geforce') || g.toLowerCase().includes('rtx') || g.toLowerCase().includes('gtx') || g.toLowerCase().includes('radeon')
            );
            this.status.systemInfo.primaryGpu = dedicated || lines[0];
          }
        } catch (e) {
          // Fallback to wmic if powershell query fails
          try {
            const wmicOut = execSync('wmic path win32_VideoController get caption /format:table', {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'ignore'],
              timeout: 3000,
              windowsHide: true,
            });
            const lines = wmicOut
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter((l) => l && !l.toLowerCase().includes('caption'));
            if (lines.length > 0) {
              this.status.systemInfo.gpuDevices = lines;
              const dedicated = lines.find(
                (g) => g.toLowerCase().includes('nvidia') || g.toLowerCase().includes('rtx') || g.toLowerCase().includes('gtx') || g.toLowerCase().includes('radeon')
              );
              this.status.systemInfo.primaryGpu = dedicated || lines[0];
            }
          } catch (wErr) {}
        }
      }
    } catch (e) {}
  }

  /**
   * Download official yt-dlp standalone binary
   */
  async downloadYtDlp(progressCallback) {
    this.ensureBinDir();
    const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const destPath = path.join(this.binDir, 'yt-dlp.exe');
    const tempPath = path.join(this.binDir, 'yt-dlp.download.tmp');

    if (progressCallback) {
      progressCallback({ status: 'starting', percent: 0, message: 'Connecting to yt-dlp release server...' });
    }

    await this._downloadWithRedirects(downloadUrl, tempPath, progressCallback);

    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (e) {}
    }
    fs.renameSync(tempPath, destPath);

    if (progressCallback) {
      progressCallback({ status: 'completed', percent: 100, message: 'yt-dlp installed successfully!' });
    }

    return await this.detect();
  }

  /**
   * Update yt-dlp to latest release
   */
  async updateYtDlp(progressCallback) {
    if (!this.ytDlpPath) {
      return await this.downloadYtDlp(progressCallback);
    }

    if (progressCallback) {
      progressCallback({ status: 'updating', percent: 20, message: 'Checking yt-dlp updates...' });
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ytDlpPath, ['-U'], { windowsHide: true });
      let output = '';

      proc.stdout.on('data', (d) => {
        output += d.toString();
        if (progressCallback) {
          progressCallback({ status: 'updating', percent: 60, message: d.toString().trim() });
        }
      });
      proc.stderr.on('data', (d) => { output += d.toString(); });

      proc.on('close', async (code) => {
        // If system update failed or permission denied, fallback to downloading local copy
        if (code !== 0) {
          try {
            const res = await this.downloadYtDlp(progressCallback);
            return resolve(res);
          } catch (err) {
            return reject(new Error(`Update failed: ${output}`));
          }
        }
        const updatedStatus = await this.detect();
        resolve(updatedStatus);
      });

      proc.on('error', async () => {
        const res = await this.downloadYtDlp(progressCallback);
        resolve(res);
      });
    });
  }

  /**
   * Download static FFmpeg & FFprobe build (or reuse from itzCut Desktop if already present)
   */
  async downloadFfmpeg(progressCallback) {
    this.ensureBinDir();

    // 1. Check if user already has itzCut Desktop installed on this system!
    const sibling = this._findSiblingFfmpeg();
    if (sibling) {
      if (progressCallback) {
        progressCallback({ status: 'copying', percent: 60, message: 'Detected existing FFmpeg from itzCut Desktop! Reusing...' });
      }
      try {
        const localFfmpeg = path.join(this.binDir, 'ffmpeg.exe');
        const localFfprobe = path.join(this.binDir, 'ffprobe.exe');
        fs.copyFileSync(sibling.ffmpegPath, localFfmpeg);
        if (sibling.ffprobePath && fs.existsSync(sibling.ffprobePath)) {
          fs.copyFileSync(sibling.ffprobePath, localFfprobe);
        }
        if (progressCallback) {
          progressCallback({ status: 'completed', percent: 100, message: 'Reused FFmpeg from itzCut Desktop successfully!' });
        }
        return await this.detect();
      } catch (err) {}
    }

    // 2. Download from official static archive if not found in sibling
    const downloadUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    const tempZipPath = path.join(this.binDir, 'ffmpeg_download.zip');

    if (progressCallback) {
      progressCallback({ status: 'starting', percent: 0, message: 'Connecting to FFmpeg mirror...' });
    }

    await this._downloadWithRedirects(downloadUrl, tempZipPath, progressCallback);

    if (progressCallback) {
      progressCallback({ status: 'extracting', percent: 99, message: 'Extracting ffmpeg & ffprobe binaries...' });
    }

    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();

    let ffmpegFound = false;
    let ffprobeFound = false;

    for (const entry of zipEntries) {
      const entryName = entry.entryName.toLowerCase();
      if (entryName.endsWith('ffmpeg.exe')) {
        const data = entry.getData();
        fs.writeFileSync(path.join(this.binDir, 'ffmpeg.exe'), data);
        ffmpegFound = true;
      } else if (entryName.endsWith('ffprobe.exe')) {
        const data = entry.getData();
        fs.writeFileSync(path.join(this.binDir, 'ffprobe.exe'), data);
        ffprobeFound = true;
      }
    }

    try { fs.unlinkSync(tempZipPath); } catch (e) {}

    if (!ffmpegFound) {
      throw new Error('FFmpeg binary could not be found in archive.');
    }

    if (progressCallback) {
      progressCallback({ status: 'completed', percent: 100, message: 'FFmpeg ready!' });
    }

    return await this.detect();
  }

  /**
   * Automatically verifies and installs all required engines (yt-dlp + ffmpeg)
   */
  async ensureAllEngines(onProgress) {
    await this.detect();

    // 1. Ensure yt-dlp
    if (!this.status.ytDlpAvailable) {
      if (onProgress) {
        onProgress({
          isInstalling: true,
          engine: 'yt-dlp',
          title: 'Configuring Media Engine (yt-dlp)...',
          percent: 10,
          detail: 'Downloading official yt-dlp binary from GitHub...',
        });
      }
      await this.downloadYtDlp((p) => {
        if (onProgress) {
          onProgress({
            isInstalling: true,
            engine: 'yt-dlp',
            title: 'Configuring yt-dlp...',
            percent: Math.min(50, Math.round((p.percent || 0) * 0.5)),
            detail: p.message || 'Downloading yt-dlp...',
          });
        }
      });
    }

    // 2. Ensure FFmpeg
    if (!this.status.ffmpegAvailable) {
      if (onProgress) {
        onProgress({
          isInstalling: true,
          engine: 'ffmpeg',
          title: 'Configuring FFmpeg & Encoders...',
          percent: 55,
          detail: 'Checking itzCut installation or downloading static build...',
        });
      }
      await this.downloadFfmpeg((p) => {
        if (onProgress) {
          onProgress({
            isInstalling: true,
            engine: 'ffmpeg',
            title: 'Configuring FFmpeg...',
            percent: 50 + Math.min(48, Math.round((p.percent || 0) * 0.48)),
            detail: p.message || 'Setting up FFmpeg...',
          });
        }
      });
    }

    const finalStatus = await this.detect();
    if (onProgress) {
      onProgress({
        isInstalling: false,
        engine: 'all',
        title: 'Engines Ready',
        percent: 100,
        detail: 'yt-dlp and FFmpeg successfully verified!',
        status: finalStatus,
      });
    }
    return finalStatus;
  }

  _downloadWithRedirects(url, destinationPath, progressCallback, redirectCount = 0) {
    if (redirectCount > 8) {
      return Promise.reject(new Error('Too many redirects while downloading engine.'));
    }

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(url, { headers: { 'User-Agent': 'itzDownloader-Windows/1.0' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return resolve(this._downloadWithRedirects(response.headers.location, destinationPath, progressCallback, redirectCount + 1));
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || 0, 10);
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(destinationPath);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && progressCallback) {
            const percent = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
            progressCallback({
              status: 'downloading',
              percent,
              downloadedBytes,
              totalBytes,
              message: `Downloading: ${percent}% (${Math.round(downloadedBytes / 1024 / 1024)}MB / ${Math.round(totalBytes / 1024 / 1024)}MB)`,
            });
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(destinationPath, () => {});
          reject(err);
        });
      });

      request.on('error', (err) => {
        fs.unlink(destinationPath, () => {});
        reject(err);
      });
    });
  }
}

module.exports = EngineManager;
