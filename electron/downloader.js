const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

class Downloader {
  constructor(engineManager) {
    this.engineManager = engineManager;
    this.activeJobs = new Map(); // jobId -> { proc, config, partialFiles }
  }

  /**
   * Quick inspection of URL metadata (title, duration, thumbnail, formats)
   */
  async inspectUrl(targetUrl, options = {}) {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Please enter a valid URL.');
    }
    const cleanUrl = targetUrl.trim();

    // Check for Spotify URLs
    if (cleanUrl.includes('spotify.com/')) {
      return await this._inspectSpotifyUrl(cleanUrl);
    }

    // Use yt-dlp to inspect media
    if (!this.engineManager.ytDlpPath) {
      await this.engineManager.detect();
    }
    if (!this.engineManager.ytDlpPath) {
      throw new Error('yt-dlp is not available. Please install it in Settings.');
    }

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--skip-download',
    ];

    if (options.cookiesBrowser && options.cookiesBrowser !== 'none') {
      args.push('--cookies-from-browser', options.cookiesBrowser);
    }

    args.push(cleanUrl);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.engineManager.ytDlpPath, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          const errDetail = stderr.trim() || 'Could not fetch metadata for this URL.';
          return reject(new Error(errDetail.split(/\r?\n/)[0] || 'Metadata fetch error'));
        }

        try {
          const info = JSON.parse(stdout);
          const platform = this._detectPlatform(cleanUrl, info.extractor);

          // Extract unique resolution formats
          const availableResolutions = [];
          if (Array.isArray(info.formats)) {
            const seenHeights = new Set();
            for (const f of info.formats) {
              if (f.height && !seenHeights.has(f.height) && f.vcodec !== 'none') {
                seenHeights.add(f.height);
                availableResolutions.push({
                  height: f.height,
                  fps: f.fps || 30,
                  label: f.height >= 2160 ? '4K UHD (2160p)' : f.height >= 1440 ? '2K QHD (1440p)' : f.height >= 1080 ? 'Full HD (1080p)' : `${f.height}p`,
                });
              }
            }
            availableResolutions.sort((a, b) => b.height - a.height);
          }

          resolve({
            url: cleanUrl,
            title: info.title || 'Untitled Media',
            author: info.uploader || info.channel || info.creator || platform,
            duration: info.duration || 0,
            thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : null),
            platform,
            isLive: !!info.is_live,
            viewCount: info.view_count || null,
            resolutions: availableResolutions,
            originalExtractor: info.extractor,
            isAudioOnly: false,
          });
        } catch (parseErr) {
          reject(new Error(`Failed to parse media metadata: ${parseErr.message}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  async _inspectSpotifyUrl(spotifyUrl) {
    // Spotify oEmbed API is public, official, fast, and does not require credentials
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;

    return new Promise((resolve, reject) => {
      https.get(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error('Could not retrieve Spotify track details. Check if the link is public.'));
        }

        let body = '';
        res.on('data', (d) => { body += d.toString(); });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            // Title is usually "Track Name" and author_name is "Artist"
            const title = data.title || 'Unknown Title';
            const author = data.author_name || 'Spotify Artist';

            resolve({
              url: spotifyUrl,
              title: title,
              author: author,
              duration: 0,
              thumbnail: data.thumbnail_url || null,
              platform: 'spotify',
              isLive: false,
              isAudioOnly: true,
              targetSearch: `ytsearch1:${author} - ${title} audio`,
              resolutions: [],
            });
          } catch (e) {
            reject(new Error('Failed to parse Spotify track details.'));
          }
        });
      }).on('error', (err) => {
        reject(new Error(`Network error contacting Spotify: ${err.message}`));
      });
    });
  }

  _detectPlatform(url, extractor = '') {
    const u = url.toLowerCase();
    const ext = (extractor || '').toLowerCase();

    if (u.includes('youtube.com') || u.includes('youtu.be') || ext.includes('youtube')) return 'youtube';
    if (u.includes('tiktok.com') || ext.includes('tiktok')) return 'tiktok';
    if (u.includes('spotify.com')) return 'spotify';
    if (u.includes('instagram.com') || ext.includes('instagram')) return 'instagram';
    if (u.includes('twitter.com') || u.includes('x.com') || ext.includes('twitter')) return 'twitter';
    if (u.includes('soundcloud.com') || ext.includes('soundcloud')) return 'soundcloud';
    if (u.includes('twitch.tv') || ext.includes('twitch')) return 'twitch';
    if (u.includes('facebook.com') || u.includes('fb.watch') || ext.includes('facebook')) return 'facebook';
    if (u.includes('reddit.com') || ext.includes('reddit')) return 'reddit';
    if (u.includes('vimeo.com') || ext.includes('vimeo')) return 'vimeo';
    return 'generic';
  }

  /**
   * Start a download job with real-time streaming progress
   */
  async startDownload(jobConfig, onProgress, onLog) {
    const {
      jobId,
      url,
      outputDir,
      preset = 'best_video', // 'best_video' | '1080p' | '4k' | 'mp3_320' | 'flac' | 'wav' | 'tiktok_clean' | 'custom'
      customOptions = {},
    } = jobConfig;

    if (!this.engineManager.ytDlpPath) {
      await this.engineManager.detect();
    }
    if (!this.engineManager.ytDlpPath) {
      throw new Error('yt-dlp is missing. Download it from the Settings tab.');
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let downloadUrl = url;
    let isSpotify = false;

    // Spotify track redirection
    if (url.includes('spotify.com/')) {
      isSpotify = true;
      try {
        const spotifyInfo = await this._inspectSpotifyUrl(url);
        downloadUrl = `ytsearch1:${spotifyInfo.author} - ${spotifyInfo.title} official audio`;
        if (onLog) onLog(`[Spotify Resolver] Found track "${spotifyInfo.title}" by ${spotifyInfo.author}`);
      } catch (e) {
        if (onLog) onLog(`[Spotify Warning] Direct track parse failed, attempting standard URL download`);
      }
    }

    const args = [
      '--newline',
      '--no-mtime',
      '--embed-metadata',
    ];

    // Point to ffmpeg if available
    if (this.engineManager.ffmpegPath) {
      const ffmpegDir = path.dirname(this.engineManager.ffmpegPath);
      args.push('--ffmpeg-location', ffmpegDir);
    }

    // Output naming template
    const templateName = isSpotify
      ? path.join(outputDir, '%(title)s.%(ext)s')
      : path.join(outputDir, '%(title)s [%(id)s].%(ext)s');
    args.push('-o', templateName);

    // Apply Presets
    if (preset === 'best_video') {
      args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '1080p') {
      args.push('-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4] / bv*[height<=1080]+ba/b');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '4k') {
      args.push('-f', 'bv*[height<=2160]+ba/b');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '720p') {
      args.push('-f', 'bv*[height<=720]+ba/b');
      args.push('--merge-output-format', 'mp4');
    } else if (preset === 'tiktok_clean') {
      args.push('-f', 'b/bv*+ba');
      args.push('--merge-output-format', 'mp4');
    } else if (preset === 'mp3_320') {
      args.push('-x');
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '0'); // 320k CBR / highest VBR
      args.push('--embed-thumbnail');
    } else if (preset === 'flac') {
      args.push('-x');
      args.push('--audio-format', 'flac');
      args.push('--audio-quality', '0');
      args.push('--embed-thumbnail');
    } else if (preset === 'wav') {
      args.push('-x');
      args.push('--audio-format', 'wav');
    } else if (preset === 'aac') {
      args.push('-x');
      args.push('--audio-format', 'm4a');
      args.push('--audio-quality', '0');
      args.push('--embed-thumbnail');
    } else if (preset === 'custom') {
      // Power user custom configurations
      const {
        mediaType = 'video', // 'video' | 'audio'
        format = 'mp4',
        resolution = 'best',
        audioFormat = 'mp3',
        audioBitrate = '320k',
        embedThumbnail = true,
        downloadSubtitles = false,
        subLangs = 'all',
        embedSubtitles = false,
        rateLimit = null,
        cookiesBrowser = null,
        extraArgs = '',
      } = customOptions;

      if (mediaType === 'audio') {
        args.push('-x');
        args.push('--audio-format', audioFormat);
        if (audioFormat === 'mp3') {
          args.push('--audio-quality', audioBitrate === '320k' ? '0' : audioBitrate === '256k' ? '1' : '2');
        }
        if (embedThumbnail) args.push('--embed-thumbnail');
      } else {
        if (resolution !== 'best') {
          const h = parseInt(resolution, 10);
          if (h > 0) {
            args.push('-f', `bv*[height<=${h}]+ba/b[height<=${h}] / bv*+ba/b`);
          }
        }
        args.push('--merge-output-format', format || 'mp4');
        if (embedThumbnail) args.push('--embed-thumbnail');

        if (downloadSubtitles) {
          args.push('--write-subs', '--write-auto-subs');
          args.push('--sub-langs', subLangs || 'all');
          if (embedSubtitles) {
            args.push('--embed-subs');
          }
        }
      }

      if (rateLimit && rateLimit !== 'unlimited') {
        args.push('--limit-rate', rateLimit);
      }

      if (cookiesBrowser && cookiesBrowser !== 'none') {
        args.push('--cookies-from-browser', cookiesBrowser);
      }

      // Safe parse extra arguments
      if (extraArgs && typeof extraArgs === 'string') {
        const extraList = extraArgs.trim().split(/\s+/).filter(Boolean);
        for (const ea of extraList) {
          // Block dangerous arguments that might attempt shell execution
          if (!ea.startsWith('--exec') && !ea.startsWith('--config-location')) {
            args.push(ea);
          }
        }
      }
    }

    // Global speed limits or browser cookies from config if provided
    if (jobConfig.globalRateLimit && jobConfig.globalRateLimit !== 'unlimited') {
      args.push('--limit-rate', jobConfig.globalRateLimit);
    }
    if (jobConfig.cookiesBrowser && jobConfig.cookiesBrowser !== 'none') {
      if (!args.includes('--cookies-from-browser')) {
        args.push('--cookies-from-browser', jobConfig.cookiesBrowser);
      }
    }

    args.push(downloadUrl);

    if (onLog) onLog(`[yt-dlp] Starting execution with args: ${args.slice(0, 8).join(' ')} ...`);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.engineManager.ytDlpPath, args, { windowsHide: true });
      let finalFilePath = null;
      let lastPercent = 0;

      this.activeJobs.set(jobId, { proc, config: jobConfig, outputDir });

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          if (onLog) onLog(line);

          // Parse download progress
          // e.g. [download]  45.3% of ~102.50MiB at  12.45MiB/s ETA 00:05
          if (line.includes('[download]')) {
            const percentMatch = line.match(/(\d+\.?\d*)%/);
            const sizeMatch = line.match(/of\s+~?(\d+\.?\d*)\s*([KkMmGgTt]i?B)/i);
            const speedMatch = line.match(/at\s+(\d+\.?\d*)\s*([KkMmGgTt]i?B\/s)/i);
            const etaMatch = line.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/i);

            if (percentMatch) {
              const percent = parseFloat(percentMatch[1]);
              lastPercent = percent;
              if (onProgress) {
                onProgress({
                  jobId,
                  status: percent >= 100 ? 'processing' : 'downloading',
                  percent: Math.min(100, percent),
                  totalSize: sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : null,
                  speed: speedMatch ? `${speedMatch[1]} ${speedMatch[2]}` : null,
                  eta: etaMatch ? etaMatch[1] : null,
                  rawLine: line,
                });
              }
            }

            // Capture output file path if destination logged
            const destMatch = line.match(/Destination:\s*(.+)$/i);
            if (destMatch && destMatch[1]) {
              finalFilePath = destMatch[1].trim();
            }
          }

          // Merge / Conversion progress
          if (line.includes('[Merger]') || line.includes('[ExtractAudio]')) {
            if (onProgress) {
              onProgress({
                jobId,
                status: 'converting',
                percent: 99,
                speed: null,
                eta: null,
                rawLine: line,
              });
            }
            const mergeMatch = line.match(/into\s+"?(.+?)"?$/i);
            if (mergeMatch && mergeMatch[1]) {
              finalFilePath = mergeMatch[1].trim();
            }
          }
        }
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        if (onLog) onLog(`[stderr] ${text}`);
      });

      proc.on('close', (code) => {
        this.activeJobs.delete(jobId);

        if (code === 0) {
          // If destination file path was not captured in stdout, look in outputDir for newly created files
          if (!finalFilePath || !fs.existsSync(finalFilePath)) {
            try {
              const files = fs.readdirSync(outputDir).map((f) => path.join(outputDir, f));
              files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
              const validFile = files.find((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
              if (validFile) finalFilePath = validFile;
            } catch (e) {}
          }

          let outputSize = 0;
          if (finalFilePath && fs.existsSync(finalFilePath)) {
            outputSize = fs.statSync(finalFilePath).size;
          }

          resolve({
            jobId,
            outputPath: finalFilePath,
            outputSize,
          });
        } else {
          reject(new Error(`Download failed with exit code ${code}. Check logs or verify link validity.`));
        }
      });

      proc.on('error', (err) => {
        this.activeJobs.delete(jobId);
        reject(err);
      });
    });
  }

  /**
   * Cancel an ongoing download cleanly and delete partial files
   */
  cancelDownload(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) return false;

    try {
      if (process.platform === 'win32' && job.proc.pid) {
        execSync(`taskkill /F /T /PID ${job.proc.pid}`, { stdio: 'ignore', windowsHide: true });
      } else {
        job.proc.kill('SIGKILL');
      }
    } catch (e) {}

    // Clean up partial .part or .ytdl files in outputDir
    try {
      if (job.outputDir && fs.existsSync(job.outputDir)) {
        const files = fs.readdirSync(job.outputDir);
        for (const file of files) {
          if (file.endsWith('.part') || file.endsWith('.ytdl')) {
            try { fs.unlinkSync(path.join(job.outputDir, file)); } catch (e) {}
          }
        }
      }
    } catch (e) {}

    this.activeJobs.delete(jobId);
    return true;
  }
}

module.exports = Downloader;
