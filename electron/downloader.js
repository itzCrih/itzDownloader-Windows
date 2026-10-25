const { spawn, execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const WHITELIST_DOMAINS = [
  // YouTube
  'youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com',
  // TikTok (including mobile shortlinks)
  'tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'v.tiktok.com', 'm.tiktok.com', 'mv.tiktok.com',
  // Spotify
  'spotify.com', 'open.spotify.com',
  // Instagram & Threads
  'instagram.com', 'instagr.am', 'threads.net',
  // Twitter (X)
  'twitter.com', 'x.com', 't.co',
  // SoundCloud
  'soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com',
  // Twitch
  'twitch.tv', 'clips.twitch.tv',
  // Facebook
  'facebook.com', 'fb.watch', 'fb.com', 'm.facebook.com',
  // Reddit
  'reddit.com', 'v.redd.it', 'redd.it',
  // Vimeo
  'vimeo.com', 'player.vimeo.com',
  // Pinterest
  'pinterest.com', 'pin.it',
  // Dailymotion
  'dailymotion.com', 'dai.ly',
  // Bilibili
  'bilibili.com', 'b23.tv',
  // Bandcamp & Audio
  'bandcamp.com', 'podcasts.apple.com',
  // Streamable & Kick
  'streamable.com', 'kick.com',
];

function isDomainAllowed(targetUrl = '') {
  try {
    const raw = (targetUrl || '').trim();
    if (!raw) return false;
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return WHITELIST_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch (e) {
    return false;
  }
}

function validateMediaUrl(targetUrl = '') {
  const clean = (targetUrl || '').trim();
  if (!clean) return { isValid: false, error: 'Please enter a URL.' };

  let parsed;
  try {
    parsed = new URL(clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`);
  } catch (e) {
    return { isValid: false, error: 'The entered text is not a valid URL.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');
  const search = parsed.search.toLowerCase();

  if (!isDomainAllowed(clean)) {
    return {
      isValid: false,
      error: 'This domain is not in the verified whitelist. Only safe, trusted platforms (YouTube, TikTok, Spotify, Instagram, Twitter, etc.) are allowed.',
    };
  }

  // Root domain check (e.g. https://youtube.com, https://tiktok.com, https://open.spotify.com)
  if ((pathname === '' || pathname === '/') && !search) {
    return {
      isValid: false,
      error: `You entered the home page (${host}). Please provide a direct link to a video, song, reel, or track.`,
    };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const isVideo = pathname === '/watch' && (parsed.searchParams.has('v') || search.includes('v='));
    const isShort = pathname.startsWith('/shorts/');
    const isLive = pathname.startsWith('/live/');
    const isEmbed = pathname.startsWith('/embed/');
    const isPlaylist = (pathname === '/playlist' || pathname.startsWith('/playlist') || pathname === '/watch') && (parsed.searchParams.has('list') || search.includes('list='));

    if (pathname.startsWith('/@') || pathname.startsWith('/channel/') || pathname.startsWith('/c/') || pathname.startsWith('/user/')) {
      return {
        isValid: false,
        error: 'This link points to a YouTube channel or creator profile. Please provide a direct video or shorts link.',
      };
    }
    if (pathname.startsWith('/feed') || pathname.startsWith('/trending') || pathname.startsWith('/explore')) {
      return {
        isValid: false,
        error: 'This link points to a YouTube feed tab, not a downloadable video.',
      };
    }
    if (!isVideo && !isShort && !isLive && !isEmbed && !isPlaylist) {
      return {
        isValid: false,
        error: 'Please enter a valid YouTube video link (e.g. https://youtube.com/watch?v=... or https://youtu.be/...)',
      };
    }
  } else if (host === 'youtu.be') {
    if (pathname === '' || pathname === '/') {
      return { isValid: false, error: 'Please provide a valid youtu.be video link with a video ID.' };
    }
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    if (pathname.startsWith('/@') && !pathname.includes('/video/') && !pathname.includes('/photo/')) {
      return {
        isValid: false,
        error: 'This link points to a TikTok user profile. Please provide a direct link to a TikTok video or sound.',
      };
    }
    if (pathname === '/foryou' || pathname === '/explore' || pathname === '/live') {
      return {
        isValid: false,
        error: 'This link points to a TikTok feed tab. Please provide a direct video link.',
      };
    }
  }

  if (host === 'spotify.com' || host.endsWith('.spotify.com')) {
    const isTrack = pathname.startsWith('/track/');
    const isAlbum = pathname.startsWith('/album/');
    const isPlaylist = pathname.startsWith('/playlist/');
    const isEpisode = pathname.startsWith('/episode/');
    if (!isTrack && !isAlbum && !isPlaylist && !isEpisode) {
      return {
        isValid: false,
        error: 'Please provide a direct Spotify track, album, or playlist link (e.g. open.spotify.com/track/...)',
      };
    }
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const isPost = pathname.startsWith('/p/') || pathname.startsWith('/reel/') || pathname.startsWith('/reels/') || pathname.startsWith('/tv/');
    if (!isPost) {
      return {
        isValid: false,
        error: 'This link points to an Instagram profile or feed. Please provide a direct reel, post, or video link.',
      };
    }
  }

  if (host === 'twitter.com' || host === 'x.com') {
    const isStatus = pathname.includes('/status/');
    if (!isStatus) {
      return {
        isValid: false,
        error: 'This link points to a Twitter/X profile or feed. Please provide a direct tweet or post link containing media.',
      };
    }
  }

  return { isValid: true };
}

function formatYtDlpError(errText = '') {
  const e = (errText || '').toLowerCase();
  if ((e.includes('could not copy') && e.includes('cookie')) || (e.includes('permission denied') && e.includes('cookie')) || e.includes('lockprofilecookiedatabase')) {
    return 'Browser cookie database is locked because the browser is currently running. Close the browser or select "None" under Settings > Browser Cookies.';
  }
  if (e.includes('sign in to confirm') || e.includes('not a bot') || e.includes('confirm you')) {
    return 'YouTube Bot Verification Check encountered. Please select your browser (Brave, Firefox, Chrome) under Settings > Browser Cookies, or use a network proxy.';
  }
  if (e.includes('unable to recognize tab page') || e.includes('the playlist does not exist') || e.includes('playlist does not exist')) {
    return 'The requested YouTube playlist was not found or is private. Please verify the URL.';
  }
  if (e.includes('sign in to confirm your age')) {
    return 'Age-restricted content detected. Select your browser in Cookies (under Advanced or Settings) to download seamlessly.';
  }
  if (e.includes('requiring login for access to this content') || e.includes('tiktok is requiring login')) {
    return 'TikTok requires authentication or was temporarily blocked. The built-in direct TikWM engine will download this without watermark.';
  }
  if (e.includes('private video') || e.includes('this video is private')) {
    return 'This video is marked Private by its uploader and cannot be accessed.';
  }
  if (e.includes('members-only') || e.includes('join this channel')) {
    return 'This video is restricted to channel members. Connect your browser cookies if you have a membership.';
  }
  if (e.includes('video unavailable') || e.includes('has been removed') || e.includes('not available')) {
    return 'This media is unavailable or was deleted by the creator.';
  }
  if (e.includes('http error 429') || e.includes('too many requests')) {
    return 'Platform rate limit encountered (HTTP 429). Please wait a moment before trying again.';
  }
  if (e.includes('live stream') || e.includes('is live')) {
    return 'This live stream is currently recording or broadcasting. Downloading will be available once the stream finishes.';
  }
  if (e.includes('georestricted') || e.includes('not available in your country')) {
    return 'This content is geo-blocked by the uploader in your region.';
  }
  if (e.includes('not a valid url') || e.includes('unsupported url')) {
    return 'The provided link is not recognized as a valid supported media URL.';
  }
  if (e.includes('404') || e.includes('not found')) {
    return 'Media not found (404). Please verify that the link is correct and still online.';
  }
  if (e.includes('copyright') || e.includes('takedown')) {
    return 'This media has been taken down due to a copyright claim.';
  }
  if (e.includes('connection refused') || e.includes('network is unreachable') || e.includes('timed out')) {
    return 'Network connection error. Please verify your internet connection.';
  }
  if (e.includes('drm') || e.includes('encrypted')) {
    return 'This stream is DRM-protected and cannot be extracted.';
  }
  return errText.split(/\r?\n/)[0] || 'Inspection failed. Please check the URL and network connection.';
}

class YouTubeAntiBlockManager {
  constructor(engineManager) {
    this.engineManager = engineManager;
    this.requestTimestamps = [];
    this.cachedWorkingBrowser = null;
    this.lastVerifiedTimestamp = 0;
    this.candidateBrowsers = ['firefox', 'brave', 'chrome', 'edge', 'opera', 'vivaldi'];
  }

  recordRequest() {
    const now = Date.now();
    this.requestTimestamps.push(now);
    // Keep last 60 seconds
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
  }

  isFrequentUsage() {
    // If 3 or more requests in the last 30 seconds
    const now = Date.now();
    const recentCount = this.requestTimestamps.filter((t) => now - t < 30000).length;
    return recentCount >= 3;
  }

  getWorkingBrowser() {
    return this.cachedWorkingBrowser;
  }

  setWorkingBrowser(browser) {
    if (browser && browser !== 'none' && browser !== 'auto') {
      this.cachedWorkingBrowser = browser;
      this.lastVerifiedTimestamp = Date.now();
    }
  }

  invalidateWorkingBrowser() {
    this.cachedWorkingBrowser = null;
    this.lastVerifiedTimestamp = 0;
  }

  findWorkingBrowser() {
    if (this.cachedWorkingBrowser && (Date.now() - this.lastVerifiedTimestamp < 600000)) {
      return this.cachedWorkingBrowser;
    }

    const ytDlp = this.engineManager?.ytDlpPath;
    if (!ytDlp) return null;

    for (const b of this.candidateBrowsers) {
      try {
        const testRes = spawnSync(ytDlp, [
          '--cookies-from-browser', b,
          '--skip-download',
          '--no-warnings',
          'https://www.youtube.com/robots.txt'
        ], { windowsHide: true, encoding: 'utf8', timeout: 3500 });

        const stderr = (testRes.stderr || '').toLowerCase();
        if (stderr.includes('could not copy') || stderr.includes('permission denied') || stderr.includes('lockprofilecookiedatabase')) {
          continue; // Cookie database locked by running browser, skip!
        }

        if (testRes.stdout && (testRes.stdout.includes('robots.txt') || testRes.stdout.includes('User-agent') || testRes.stdout.includes('Extracted'))) {
          this.cachedWorkingBrowser = b;
          this.lastVerifiedTimestamp = Date.now();
          return b;
        }
      } catch (e) {}
    }
    return null;
  }

  getAntiBlockArgs(isFrequent, chosenBrowser = null) {
    const antiBlockArgs = [
      '--socket-timeout', '30',
      '--retries', '10',
      '--fragment-retries', '10',
      '--retry-sleep', '429:5',
      '--js-runtimes', 'node',
    ];

    if (isFrequent) {
      // Gentle jitter pacing between rapid requests to avoid CDN IP bot-rate bans
      antiBlockArgs.push('--sleep-requests', '0.75');
    }

    // Only inject cookies proactively if the user explicitly selected a specific browser.
    // When 'auto', clean downloads run without cookies to avoid DB locks; bot challenge auto-rescue kicks in dynamically if needed.
    let effectiveBrowser = chosenBrowser;
    if (effectiveBrowser && effectiveBrowser !== 'none' && effectiveBrowser !== 'auto') {
      antiBlockArgs.push('--cookies-from-browser', effectiveBrowser);
    }

    return {
      args: antiBlockArgs,
      isFrequent,
      effectiveBrowser: (effectiveBrowser !== 'none' && effectiveBrowser !== 'auto') ? effectiveBrowser : null,
    };
  }
}

class Downloader {
  constructor(engineManager) {
    this.engineManager = engineManager;
    this.activeJobs = new Map(); // jobId -> { proc, config, abortFn, outputDir }
    this.youtubeAntiBlock = new YouTubeAntiBlockManager(engineManager);
  }

  _isYoutubeUrl(url = '') {
    const u = (url || '').toLowerCase();
    return u.includes('youtube.com') || u.includes('youtu.be') || u.startsWith('ytsearch');
  }

  _isTikTokUrl(url = '') {
    const u = (url || '').toLowerCase();
    return u.includes('tiktok.com');
  }

  async _probeMediaStreams(filePath) {
    if (!this.engineManager.ffprobePath || !fs.existsSync(filePath)) {
      return null;
    }
    return new Promise((resolve) => {
      const proc = spawn(this.engineManager.ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        filePath,
      ], { windowsHide: true });

      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code !== 0) return resolve(null);
        try {
          const data = JSON.parse(stdout);
          const vStream = (data.streams || []).find((s) => s.codec_type === 'video');
          const aStream = (data.streams || []).find((s) => s.codec_type === 'audio');
          resolve({
            videoCodec: (vStream?.codec_name || '').toLowerCase(),
            pixFmt: (vStream?.pix_fmt || '').toLowerCase(),
            audioCodec: (aStream?.codec_name || '').toLowerCase(),
            hasAudio: !!aStream,
            hasVideo: !!vStream,
          });
        } catch (e) {
          resolve(null);
        }
      });
      proc.on('error', () => resolve(null));
    });
  }

  async _ensureCompatibleH264Mp4(filePath, options = {}, onProgress, onLog) {
    const { fastReencode, noAudio, jobId, format } = options;
    if (!filePath || !fs.existsSync(filePath)) return filePath;

    const streams = await this._probeMediaStreams(filePath);
    if (!streams || !streams.hasVideo) return filePath;

    const isNonH264 = streams.videoCodec && streams.videoCodec !== 'h264';
    const isNonAac = streams.audioCodec && streams.audioCodec !== 'aac';
    const hasUnwantedAudio = noAudio && streams.hasAudio;
    const isNonYuv420p = streams.pixFmt && streams.pixFmt !== 'yuv420p';

    // Adobe After Effects, Premiere Pro, and standard Windows players cannot decode AV1 or VP9 in MP4
    const isAv1OrVp9 = streams.videoCodec === 'av01' || streams.videoCodec === 'av1' || streams.videoCodec === 'vp9';
    const isMp4Target = !format || format.toLowerCase() === 'mp4' || filePath.toLowerCase().endsWith('.mp4');

    const needsConversion = (fastReencode && (isNonH264 || isNonAac || hasUnwantedAudio || isNonYuv420p))
      || (isMp4Target && (isAv1OrVp9 || (isNonH264 && fastReencode)))
      || hasUnwantedAudio;

    if (!needsConversion) {
      if (onLog && streams.videoCodec === 'h264') {
        onLog(`[Codec Verification] Video is verified native H.264 (${streams.pixFmt || 'yuv420p'}) + ${streams.audioCodec?.toUpperCase() || 'AAC'}. 100% compatible with Adobe After Effects & Premiere Pro.`);
      }
      return filePath;
    }

    const encoder = this.engineManager.status?.hardwareAccels?.nvenc
      ? 'h264_nvenc'
      : this.engineManager.status?.hardwareAccels?.qsv
      ? 'h264_qsv'
      : this.engineManager.status?.hardwareAccels?.amf
      ? 'h264_amf'
      : 'libx264';

    if (onLog) {
      onLog(`[Fast Re-encode] Converting video track (${(streams.videoCodec || 'unknown').toUpperCase()}) to standard H.264 (${encoder}) and audio to AAC for 100% Adobe After Effects & Premiere compatibility...`);
    }

    if (onProgress) {
      onProgress({
        jobId,
        status: 'converting',
        percent: 92,
        speed: encoder,
        stage: `Re-encoding to H.264 (${encoder}) for After Effects & Premiere...`,
      });
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const tempOut = path.join(dir, `__ae_compat_${Date.now()}_${base}.mp4`);

    const ffmpegArgs = [
      '-y',
      '-i', filePath,
    ];

    if (isNonH264 || isNonYuv420p) {
      ffmpegArgs.push('-c:v', encoder, '-pix_fmt', 'yuv420p');
      if (encoder === 'h264_nvenc') {
        ffmpegArgs.push('-preset', 'p4', '-cq', '20');
      } else if (encoder === 'libx264') {
        ffmpegArgs.push('-preset', 'veryfast', '-crf', '20');
      }
    } else {
      ffmpegArgs.push('-c:v', 'copy');
    }

    if (noAudio) {
      ffmpegArgs.push('-an');
    } else if (isNonAac) {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
    } else {
      ffmpegArgs.push('-c:a', 'copy');
    }

    // Faststart ensures moov atom is at the beginning for immediate timeline scrubbing
    ffmpegArgs.push('-movflags', '+faststart');
    ffmpegArgs.push(tempOut);

    return new Promise((resolve) => {
      const proc = spawn(this.engineManager.ffmpegPath, ffmpegArgs, { windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (fCode) => {
        if (fCode === 0 && fs.existsSync(tempOut) && fs.statSync(tempOut).size > 1000) {
          try {
            fs.unlinkSync(filePath);
            const finalCleanPath = filePath.toLowerCase().endsWith('.mp4')
              ? filePath
              : path.join(dir, `${base}.mp4`);
            fs.renameSync(tempOut, finalCleanPath);
            if (onLog) {
              onLog(`[Fast Re-encode] Successfully created H.264 AVC + AAC MP4 (${encoder}). Ready for Adobe After Effects!`);
            }
            return resolve(finalCleanPath);
          } catch (swapErr) {
            if (onLog) onLog(`[Fast Re-encode Warning] File swap error: ${swapErr.message}`);
            return resolve(tempOut);
          }
        } else {
          if (onLog) onLog(`[Fast Re-encode Error] FFmpeg returned code ${fCode}. Keeping original file.`);
          try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch (e) {}
          return resolve(filePath);
        }
      });

      proc.on('error', (err) => {
        if (onLog) onLog(`[Fast Re-encode Error] Could not launch FFmpeg: ${err.message}`);
        return resolve(filePath);
      });
    });
  }

  /**
   * Quick inspection of URL metadata (title, duration, thumbnail, formats)
   */
  async inspectUrl(targetUrl, options = {}) {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Please enter a valid URL.');
    }
    const cleanUrl = targetUrl.trim();

    const validation = validateMediaUrl(cleanUrl);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // 1. Check for Spotify URLs
    if (cleanUrl.includes('spotify.com/')) {
      if (cleanUrl.includes('/playlist/') || cleanUrl.includes('/album/')) {
        return await this._inspectSpotifyPlaylistOrAlbum(cleanUrl);
      }
      return await this._inspectSpotifyUrl(cleanUrl);
    }

    // 2. Check for TikTok URLs - use TikWM API first to bypass login walls & mobile redirect issues
    if (this._isTikTokUrl(cleanUrl)) {
      try {
        return await this._inspectTikTok(cleanUrl);
      } catch (ttErr) {
        // Fallback to standard yt-dlp inspection if TikWM has a momentary hiccup
      }
    }

    // 3. Use yt-dlp to inspect media for YouTube, Twitter, Twitch, etc.
    return await this._executeInspectUrl(cleanUrl, options, false);
  }

  async _executeInspectUrl(cleanUrl, options = {}, isRetry = false) {
    if (!this.engineManager.ytDlpPath) {
      await this.engineManager.detect();
    }
    if (!this.engineManager.ytDlpPath) {
      throw new Error('yt-dlp is not available. Please install it in Settings.');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    } catch (e) {
      parsedUrl = null;
    }

    const host = parsedUrl ? parsedUrl.hostname.toLowerCase().replace(/^www\./, '') : '';
    const pathname = parsedUrl ? parsedUrl.pathname.toLowerCase().replace(/\/+$/, '') : '';
    const isYoutube = host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be';
    const hasListParam = parsedUrl && (parsedUrl.searchParams.has('list') || parsedUrl.search.includes('list='));
    const isPurePlaylist = isYoutube && (pathname === '/playlist' || pathname.startsWith('/playlist')) && hasListParam;
    const isVideoWithPlaylist = isYoutube && (pathname === '/watch' || host === 'youtu.be') && hasListParam;
    const isPlaylistInspection = isPurePlaylist || isVideoWithPlaylist;

    const args = [
      '--dump-single-json',
      '--no-warnings',
    ];

    if (isPlaylistInspection) {
      args.push('--flat-playlist');
    } else {
      args.push('--no-playlist');
      args.push('--skip-download');
    }

    const activeBrowser = options.cookiesBrowser;

    if (isYoutube) {
      this.youtubeAntiBlock.recordRequest();
      const isFrequent = this.youtubeAntiBlock.isFrequentUsage();
      const antiBlock = this.youtubeAntiBlock.getAntiBlockArgs(isFrequent, activeBrowser);
      args.push(...antiBlock.args);
    } else {
      if (activeBrowser && activeBrowser !== 'none' && activeBrowser !== 'auto') {
        args.push('--cookies-from-browser', activeBrowser);
      }
    }

    // Network Proxy Support
    if (options.proxy && typeof options.proxy === 'string' && options.proxy.trim()) {
      args.push('--proxy', options.proxy.trim());
    }

    args.push(cleanUrl);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.engineManager.ytDlpPath, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', async (code) => {
        if (code !== 0) {
          const errDetail = stderr.trim() || 'Could not fetch metadata for this URL.';
          const lowerErr = errDetail.toLowerCase();
          const isCookieLock = (lowerErr.includes('could not copy') && lowerErr.includes('cookie')) ||
                               (lowerErr.includes('permission denied') && lowerErr.includes('cookie')) ||
                               lowerErr.includes('lockprofilecookiedatabase');

          if (isCookieLock && !isRetry) {
            this.youtubeAntiBlock.invalidateWorkingBrowser();
            try {
              const cleanResult = await this._executeInspectUrl(cleanUrl, { ...options, cookiesBrowser: 'none' }, true);
              return resolve(cleanResult);
            } catch (cleanErr) {}
          }

          const isBotCheck = isYoutube && (lowerErr.includes('sign in to confirm') || lowerErr.includes('not a bot') || lowerErr.includes('bot'));

          if (isBotCheck && !isRetry) {
            const fallbackBrowsers = ['firefox', 'brave', 'chrome', 'edge'].filter((b) => b !== activeBrowser);
            for (const fb of fallbackBrowsers) {
              try {
                const rescueResult = await this._executeInspectUrl(cleanUrl, { ...options, cookiesBrowser: fb }, true);
                this.youtubeAntiBlock.setWorkingBrowser(fb);
                return resolve(rescueResult);
              } catch (rescueErr) {}
            }
          }

          return reject(new Error(formatYtDlpError(errDetail)));
        }

        try {
          const info = JSON.parse(stdout);

          // Proactive guard against playlist tabs, channel profiles, or empty recommendations feeds
          const isPlaylistResult = info._type === 'playlist' || (Array.isArray(info.entries) && info.entries.length > 0);
          if (!isPlaylistResult) {
            if (info.extractor && (info.extractor.includes(':channel') || (info.extractor.includes(':tab') && !info.extractor.includes('playlist')))) {
              return reject(new Error(`The provided link points to a channel or recommendations tab ("${info.title || 'Tab'}"), not a downloadable video.`));
            }
            if (info.title && ['recommended', 'home', 'feed', 'trending', 'explore'].includes(info.title.toLowerCase().trim())) {
              return reject(new Error('This link points to a recommendations feed, not a downloadable video. Please provide a direct video link.'));
            }
            if ((!info.formats || info.formats.length === 0) && !info.url && !info.direct_url) {
              return reject(new Error('No downloadable video or audio streams were found for this media link.'));
            }
          }

          const platform = this._detectPlatform(cleanUrl, info.extractor);

          // If playlist result detected
          if (isPlaylistResult) {
            const playlistEntries = (info.entries || []).map((entry, idx) => {
              const thumb = entry.thumbnails && entry.thumbnails.length > 0
                ? entry.thumbnails[entry.thumbnails.length - 1].url
                : null;
              const entryId = entry.id || `entry_${idx}`;
              let videoUrl;
              if (entryId && !entryId.startsWith('entry_')) {
                // Ensure clean YouTube video URL without recursive playlist parameter
                videoUrl = `https://www.youtube.com/watch?v=${entryId}`;
              } else if (entry.url && entry.url.startsWith('http')) {
                videoUrl = entry.url;
              } else if (entry.url && entry.url.startsWith('/')) {
                videoUrl = `https://www.youtube.com${entry.url}`;
              } else if (entry.url) {
                videoUrl = `https://www.youtube.com/watch?v=${entry.url}`;
              } else {
                videoUrl = cleanUrl;
              }

              return {
                index: idx + 1,
                id: entryId,
                title: entry.title || `Item ${idx + 1}`,
                author: entry.uploader || entry.channel || info.uploader || 'YouTube',
                duration: entry.duration || 0,
                thumbnail: thumb,
                url: videoUrl,
              };
            });

            const totalDuration = playlistEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
            const singleVideoId = parsedUrl ? (parsedUrl.searchParams.get('v') || (host === 'youtu.be' ? pathname.replace(/^\//, '') : null)) : null;
            const singleEntry = singleVideoId ? playlistEntries.find((e) => e.id === singleVideoId) : null;

            return resolve({
              url: cleanUrl,
              isPlaylist: true,
              isVideoAndPlaylist: !!isVideoWithPlaylist,
              singleVideoId,
              singleVideoTitle: singleEntry?.title || null,
              singleVideoThumbnail: singleEntry?.thumbnail || null,
              title: info.title || 'YouTube Playlist',
              author: info.uploader || info.channel || 'YouTube',
              duration: totalDuration,
              thumbnail: info.thumbnail || (playlistEntries[0]?.thumbnail) || null,
              platform,
              itemCount: playlistEntries.length,
              entries: playlistEntries,
              isLive: false,
              isAudioOnly: false,
              resolutions: [],
            });
          }

          // Extract unique resolution formats for single media
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
            isPlaylist: false,
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

  async _inspectSpotifyPlaylistOrAlbum(spotifyUrl) {
    const isAlbum = spotifyUrl.includes('/album/');
    const embedUrl = spotifyUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');

    return new Promise((resolve, reject) => {
      https.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this._inspectSpotifyPlaylistOrAlbum(res.headers.location));
        }

        let body = '';
        res.on('data', (d) => { body += d.toString(); });
        res.on('end', () => {
          try {
            const idx = body.indexOf('__NEXT_DATA__');
            if (idx === -1) {
              return this._inspectSpotifyUrl(spotifyUrl).then(resolve).catch(reject);
            }

            const start = body.indexOf('>', idx) + 1;
            const end = body.indexOf('</script>', start);
            const json = JSON.parse(body.slice(start, end));
            const entity = json.props?.pageProps?.state?.data?.entity;

            if (!entity || !Array.isArray(entity.trackList)) {
              return this._inspectSpotifyUrl(spotifyUrl).then(resolve).catch(reject);
            }

            const playlistTitle = entity.name || (isAlbum ? 'Spotify Album' : 'Spotify Playlist');
            const playlistAuthor = entity.subtitle || (entity.artists && entity.artists.map((a) => a.name).join(', ')) || 'Spotify';
            const playlistThumbnail = entity.coverArt?.sources?.[0]?.url || null;

            const entries = entity.trackList.map((track, i) => {
              const trackId = track.uri ? track.uri.replace('spotify:track:', '') : `track_${i}`;
              const trackUrl = `https://open.spotify.com/track/${trackId}`;
              const rawArtist = (track.subtitle || (track.artists ? track.artists.map((a) => a.name).join(', ') : playlistAuthor) || '').trim();
              const isGeneric = !rawArtist || rawArtist.toLowerCase() === 'spotify' || rawArtist.toLowerCase() === 'spotify artist';
              const artist = isGeneric ? '' : rawArtist;
              const title = track.title || `Track ${i + 1}`;
              const duration = Math.round((track.duration || 0) / 1000);
              const targetSearch = artist
                ? `ytsearch1:${artist} - ${title} official audio`
                : `ytsearch1:${title} official audio`;

              return {
                index: i + 1,
                id: trackId,
                title,
                author: artist || 'Unknown Artist',
                duration,
                thumbnail: playlistThumbnail,
                url: trackUrl,
                targetSearch,
              };
            });

            const totalDuration = entries.reduce((acc, curr) => acc + (curr.duration || 0), 0);

            resolve({
              url: spotifyUrl,
              title: playlistTitle,
              author: playlistAuthor,
              duration: totalDuration,
              thumbnail: playlistThumbnail,
              platform: 'spotify',
              isPlaylist: true,
              isAlbum,
              isLive: false,
              isAudioOnly: true,
              itemCount: entries.length,
              entries,
              resolutions: [],
            });
          } catch (err) {
            this._inspectSpotifyUrl(spotifyUrl).then(resolve).catch(reject);
          }
        });
      }).on('error', (err) => {
        this._inspectSpotifyUrl(spotifyUrl).then(resolve).catch(reject);
      });
    });
  }

  async _inspectSpotifyUrl(spotifyUrl) {
    return new Promise((resolve, reject) => {
      const trackMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      const trackId = trackMatch ? trackMatch[1] : null;
      const embedUrl = trackId
        ? `https://open.spotify.com/embed/track/${trackId}`
        : spotifyUrl.replace('open.spotify.com/track/', 'open.spotify.com/embed/track/').split('?')[0];

      https.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this._inspectSpotifyUrl(res.headers.location));
        }

        let body = '';
        res.on('data', (d) => { body += d.toString(); });
        res.on('end', () => {
          try {
            let title = '';
            let author = '';
            let duration = 0;
            let thumbnail = null;

            // 1. Try __NEXT_DATA__
            const idx = body.indexOf('__NEXT_DATA__');
            if (idx !== -1) {
              const start = body.indexOf('>', idx) + 1;
              const end = body.indexOf('</script>', start);
              const json = JSON.parse(body.slice(start, end));
              const entity = json.props?.pageProps?.state?.data?.entity;
              if (entity) {
                title = entity.name || entity.title || '';
                if (Array.isArray(entity.artists) && entity.artists.length > 0) {
                  author = entity.artists.map((a) => a.name).filter(Boolean).join(', ');
                } else if (entity.subtitle) {
                  author = entity.subtitle;
                }
                duration = Math.round((entity.duration || 0) / 1000);
                thumbnail = entity.visualIdentity?.image?.[0]?.url || entity.coverArt?.sources?.[0]?.url || null;
              }
            }

            // 2. Fallback to HTML meta tags
            if (!title || !author) {
              const ogTitleMatch = body.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
              const ogDescMatch = body.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
              const titleTagMatch = body.match(/<title>([^<]+)<\/title>/i);

              if (!title) {
                title = ogTitleMatch ? ogTitleMatch[1] : (titleTagMatch ? titleTagMatch[1].split(' - ')[0].trim() : 'Unknown Track');
              }

              if (!author && ogDescMatch) {
                // Spotify format: "Artist · Album · Song · Year"
                const parts = ogDescMatch[1].split('·').map((s) => s.trim());
                if (parts.length > 0 && parts[0]) {
                  author = parts[0];
                }
              }

              if (!author && titleTagMatch && titleTagMatch[1].includes(' by ')) {
                // Spotify format: "... by Artist | Spotify"
                const byParts = titleTagMatch[1].split(' by ');
                if (byParts.length > 1) {
                  author = byParts[1].split('|')[0].trim();
                }
              }
            }

            // Sanitize author: Never allow generic "Spotify" or "Spotify Artist"
            const cleanAuthor = (author || '').trim();
            const isGeneric = !cleanAuthor || cleanAuthor.toLowerCase() === 'spotify' || cleanAuthor.toLowerCase() === 'spotify artist';
            const validAuthor = isGeneric ? '' : cleanAuthor;

            // Build precision YouTube search query
            const targetSearch = validAuthor
              ? `ytsearch1:${validAuthor} - ${title} official audio`
              : `ytsearch1:${title} official audio`;

            resolve({
              url: spotifyUrl,
              title: title || 'Unknown Track',
              author: validAuthor || 'Unknown Artist',
              duration,
              thumbnail,
              platform: 'spotify',
              isPlaylist: false,
              isLive: false,
              isAudioOnly: true,
              targetSearch,
              resolutions: [],
            });
          } catch (e) {
            this._fallbackSpotifyOembed(spotifyUrl).then(resolve).catch(reject);
          }
        });
      }).on('error', (err) => {
        this._fallbackSpotifyOembed(spotifyUrl).then(resolve).catch(reject);
      });
    });
  }

  async _fallbackSpotifyOembed(spotifyUrl) {
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
            const title = data.title || 'Unknown Track';
            // Do NOT include "Spotify Artist" in search query!
            const targetSearch = `ytsearch1:${title} official audio`;

            resolve({
              url: spotifyUrl,
              title,
              author: 'Unknown Artist',
              duration: 0,
              thumbnail: data.thumbnail_url || null,
              platform: 'spotify',
              isPlaylist: false,
              isLive: false,
              isAudioOnly: true,
              targetSearch,
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

  async _resolveTikTokUrl(rawUrl = '') {
    const clean = (rawUrl || '').trim();
    // 1. Direct numeric video ID match (17-21 digits)
    const directMatch = clean.match(/(\d{17,21})/);
    if (directMatch) {
      return `https://www.tiktok.com/@tiktok/video/${directMatch[1]}`;
    }

    // 2. Follow redirects for mobile shortlinks (vt.tiktok.com, vm.tiktok.com, mv.tiktok.com, etc.)
    try {
      const res = await fetch(clean, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      const location = res.headers.get('location');
      if (location) {
        const locMatch = location.match(/(\d{17,21})/);
        if (locMatch) {
          return `https://www.tiktok.com/@tiktok/video/${locMatch[1]}`;
        }
        try {
          const parsed = new URL(location, clean);
          const redirectUrl = parsed.searchParams.get('redirect_url');
          if (redirectUrl) {
            const redMatch = redirectUrl.match(/(\d{17,21})/);
            if (redMatch) {
              return `https://www.tiktok.com/@tiktok/video/${redMatch[1]}`;
            }
          }
        } catch (e) {}
        return location;
      }
    } catch (e) {}

    return clean;
  }

  async _inspectTikTok(url) {
    const resolvedUrl = await this._resolveTikTokUrl(url);

    const queryTikWm = (targetUrl) => {
      return new Promise((resolve, reject) => {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`;
        const req = https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
          let body = '';
          res.on('data', (d) => { body += d.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (parsed.code === 0 && parsed.data) {
                const d = parsed.data;
                return resolve({
                  url,
                  title: d.title || 'TikTok Video',
                  author: d.author?.nickname || (d.author?.unique_id ? `@${d.author.unique_id}` : 'TikTok Creator'),
                  duration: d.duration || 0,
                  thumbnail: d.cover || d.origin_cover || null,
                  platform: 'tiktok',
                  isLive: false,
                  isAudioOnly: false,
                  resolutions: [{ height: 1080, fps: 30, label: 'Clean HD (No Watermark)' }],
                  tiktokDirectVideo: d.play,
                  tiktokDirectAudio: d.music,
                });
              }
            } catch (e) {}
            reject(new Error('TikTok API could not retrieve video'));
          });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(8000, () => {
          req.destroy();
          reject(new Error('TikTok API connection timed out'));
        });
      });
    };

    try {
      return await queryTikWm(resolvedUrl);
    } catch (err) {
      if (resolvedUrl !== url) {
        return await queryTikWm(url);
      }
      throw err;
    }
  }

  _detectPlatform(url, extractor = '') {
    const u = url.toLowerCase();
    const ext = (extractor || '').toLowerCase();

    if (u.includes('youtube.com') || u.includes('youtu.be') || ext.includes('youtube')) return 'youtube';
    if (u.includes('tiktok.com') || u.includes('vm.tiktok') || u.includes('vt.tiktok') || ext.includes('tiktok')) return 'tiktok';
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

  _buildVideoFormatSelector(resolution, customResolution, format = 'mp4', noAudio = false) {
    let filter = '';

    if (resolution === 'custom' && customResolution) {
      const cleanRes = customResolution.trim().toLowerCase();
      const whMatch = cleanRes.match(/^(\d+)\s*[xX*×]\s*(\d+)$/);
      if (whMatch) {
        const w = parseInt(whMatch[1], 10);
        const h = parseInt(whMatch[2], 10);
        filter = `[width<=${w}][height<=${h}]`;
      } else if (cleanRes === '4k') {
        filter = '[height<=2160]';
      } else if (cleanRes === '2k') {
        filter = '[height<=1440]';
      } else if (cleanRes === '8k') {
        filter = '[height<=4320]';
      } else {
        const hMatch = cleanRes.match(/^(\d+)\s*p?$/);
        if (hMatch) {
          const h = parseInt(hMatch[1], 10);
          filter = `[height<=${h}]`;
        } else if (cleanRes.includes('<') || cleanRes.includes('>') || cleanRes.includes('=')) {
          filter = `[${cleanRes}]`;
        }
      }
    } else if (resolution && resolution !== 'best' && resolution !== 'custom') {
      const h = parseInt(resolution, 10);
      if (h > 0) {
        filter = `[height<=${h}]`;
      }
    }

    if (noAudio) {
      if (filter) {
        return `bv*${filter}[ext=${format}] / bv*${filter} / bv*[ext=${format}] / bv*`;
      }
      return `bv*[ext=${format}] / bv*`;
    } else {
      if (filter) {
        return `bv*${filter}+ba / b${filter} / bv*+ba/b`;
      }
      return null;
    }
  }

  /**
   * Start a download job with real-time streaming progress
   */
  async startDownload(jobConfig, onProgress, onLog) {
    const {
      jobId,
      url,
      outputDir,
      preset = 'best_video',
      customOptions = {},
    } = jobConfig;

    if (!isDomainAllowed(url)) {
      throw new Error('This domain is blocked by security policy.');
    }

    const resolvedOutputDir = (outputDir && typeof outputDir === 'string' && outputDir.trim())
      ? outputDir
      : path.join(os.homedir(), 'Downloads', 'itzDownloader');

    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    // Safely destructure custom options with defaults to prevent ReferenceError
    const {
      mediaType = 'video',
      format = 'mp4',
      resolution = 'best',
      customResolution = '',
      fastReencode = false,
      noAudio = false,
      audioFormat = 'mp3',
      audioBitrate = '320k',
      embedThumbnail = true,
      downloadSubtitles = false,
      subLangs = 'all',
      embedSubtitles = false,
      rateLimit = null,
      cookiesBrowser = null,
      extraArgs = '',
    } = customOptions || {};

    const isTikTok = this._isTikTokUrl(url);

    // If it's a TikTok URL, use TikWM direct download to bypass login walls and get clean no-watermark video
    if (isTikTok) {
      try {
        const tikTokInfo = await this._inspectTikTok(url);
        const isAudioPreset = preset === 'mp3_320' || preset === 'flac' || preset === 'wav' || preset === 'aac'
          || (preset === 'custom' && mediaType === 'audio');

        if (isAudioPreset && (tikTokInfo.tiktokDirectAudio || tikTokInfo.tiktokDirectVideo)) {
          if (onLog) onLog('[TikTok Engine] Extracting clean audio track via TikWM stream...');
          return await this._downloadDirectTikTokAudio(
            tikTokInfo.tiktokDirectAudio || tikTokInfo.tiktokDirectVideo,
            resolvedOutputDir,
            jobConfig,
            tikTokInfo.title,
            preset,
            customOptions,
            onProgress,
            onLog
          );
        } else if (tikTokInfo.tiktokDirectVideo) {
          if (onLog) onLog('[TikTok Engine] Downloading clean MP4 video (No Watermark) via TikWM...');
          return await this._downloadDirectTikTokVideo(
            tikTokInfo.tiktokDirectVideo,
            resolvedOutputDir,
            jobConfig,
            tikTokInfo.title,
            fastReencode,
            noAudio,
            customResolution,
            onProgress,
            onLog
          );
        }
      } catch (ttErr) {
        if (onLog) onLog(`[TikTok Warning] Direct download fallback: ${ttErr.message}. Trying yt-dlp...`);
      }
    }

    // Standard download via yt-dlp
    if (!this.engineManager.ytDlpPath) {
      await this.engineManager.detect();
    }
    if (!this.engineManager.ytDlpPath) {
      throw new Error('yt-dlp is missing. Download it from the Settings tab.');
    }

    let downloadUrl = jobConfig.targetSearch || url;
    let isSpotify = false;

    // Spotify track redirection
    if (!jobConfig.targetSearch && url.includes('spotify.com/')) {
      isSpotify = true;
      try {
        const spotifyInfo = await this._inspectSpotifyUrl(url);
        downloadUrl = spotifyInfo.targetSearch;
        if (onLog) onLog(`[Spotify Resolver] Found track "${spotifyInfo.title}" by ${spotifyInfo.author}`);
      } catch (e) {
        if (onLog) onLog(`[Spotify Warning] Direct track parse failed, attempting standard URL download`);
      }
    } else if (jobConfig.targetSearch || jobConfig.platform === 'spotify' || url.includes('spotify.com/')) {
      isSpotify = true;
      if (downloadUrl && downloadUrl.includes('Spotify Artist - ')) {
        downloadUrl = downloadUrl.replace('Spotify Artist - ', '');
      }
      if (onLog && jobConfig.title) {
        onLog(`[Spotify Engine] Downloading track "${jobConfig.title}" by ${jobConfig.author || 'Artist'}`);
      }
    }

    const args = [
      '--newline',
      '--no-mtime',
      '--embed-metadata',
    ];

    // Guarantee that single track downloads never loop through playlists unintentionally
    if (!jobConfig.isPlaylist) {
      args.push('--no-playlist');
    }

    // Speed & Stream Stability Optimization: download 4 fragments concurrently and buffer chunks to stabilize speed
    args.push(
      '--concurrent-fragments', '4',
      '--buffer-size', '64K',
      '--http-chunk-size', '10M'
    );

    // YouTube / Search Anti-Block & Node.js Engine Optimization
    // Spotify resolves to YouTube audio search (ytsearch1:...) which runs anonymously and must NEVER pass browser cookies.
    const isYoutube = this._isYoutubeUrl(downloadUrl) || this._isYoutubeUrl(url);
    const chosenBrowser = isSpotify ? 'none' : (customOptions.cookiesBrowser || jobConfig.cookiesBrowser);

    if (isYoutube) {
      this.youtubeAntiBlock.recordRequest();
      const isFrequent = this.youtubeAntiBlock.isFrequentUsage();
      const antiBlock = this.youtubeAntiBlock.getAntiBlockArgs(isFrequent, chosenBrowser);
      args.push(...antiBlock.args);
      if (onLog && antiBlock.effectiveBrowser) {
        onLog(`[YouTube Shield] Active authenticated session via ${antiBlock.effectiveBrowser} cookies`);
      }
    } else {
      if (!isSpotify && chosenBrowser && chosenBrowser !== 'none' && chosenBrowser !== 'auto') {
        args.push('--cookies-from-browser', chosenBrowser);
      }
    }

    // Network Proxy Support
    const effectiveProxy = (jobConfig.proxy || customOptions.proxy || '').trim();
    if (effectiveProxy) {
      args.push('--proxy', effectiveProxy);
      if (onLog) {
        const maskedProxy = effectiveProxy.replace(/:([^@/]+)@/, ':****@');
        onLog(`[Network Proxy] Routing connection through ${maskedProxy}`);
      }
    }

    // Point to ffmpeg if available
    if (this.engineManager.ffmpegPath) {
      const ffmpegDir = path.dirname(this.engineManager.ffmpegPath);
      args.push('--ffmpeg-location', ffmpegDir);
    }

    // Output naming template
    const templateName = isSpotify
      ? path.join(resolvedOutputDir, '%(title)s.%(ext)s')
      : path.join(resolvedOutputDir, '%(title)s [%(id)s].%(ext)s');
    args.push('-o', templateName);

    // Apply Presets
    if (preset === 'best_video') {
      args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b');
      args.push('-S', 'vcodec:h264,res,acodec:m4a');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '1080p') {
      args.push('-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4] / bv*[height<=1080]+ba/b');
      args.push('-S', 'vcodec:h264,res,acodec:m4a');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '4k') {
      args.push('-f', 'bv*[height<=2160]+ba/b');
      args.push('--merge-output-format', 'mp4');
      args.push('--embed-thumbnail');
    } else if (preset === '720p') {
      args.push('-f', 'bv*[height<=720]+ba/b');
      args.push('-S', 'vcodec:h264,res,acodec:m4a');
      args.push('--merge-output-format', 'mp4');
    } else if (preset === 'tiktok_clean') {
      args.push('-f', 'b/bv*+ba');
      args.push('--merge-output-format', 'mp4');
    } else if (preset === 'mp3_320') {
      args.push('-x');
      args.push('--audio-format', 'mp3');
      args.push('--audio-quality', '0');
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
      if (mediaType === 'audio') {
        args.push('-x');
        args.push('--audio-format', audioFormat);
        if (audioFormat === 'mp3') {
          args.push('--audio-quality', audioBitrate === '320k' ? '0' : audioBitrate === '256k' ? '1' : '2');
        }
        if (embedThumbnail) args.push('--embed-thumbnail');
      } else {
        // Video mode: handle Custom / Preset resolution & No Audio option
        const customRes = (customResolution || '').trim();
        const videoFormatSelector = this._buildVideoFormatSelector(resolution, customRes, format, noAudio);
        if (videoFormatSelector) {
          args.push('-f', videoFormatSelector);
        }
        if (noAudio) {
          // Stripping audio with ffmpeg postprocessor
          args.push('--postprocessor-args', 'ffmpeg:-an');
        }

        if (format === 'mp4' || fastReencode) {
          args.push('-S', 'vcodec:h264,res,acodec:m4a');
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

      if (!isSpotify && cookiesBrowser && cookiesBrowser !== 'none' && cookiesBrowser !== 'auto') {
        if (!args.includes('--cookies-from-browser')) {
          args.push('--cookies-from-browser', cookiesBrowser);
        }
      }

      if (extraArgs && typeof extraArgs === 'string') {
        const extraList = extraArgs.trim().split(/\s+/).filter(Boolean);
        for (const ea of extraList) {
          if (!ea.startsWith('--exec') && !ea.startsWith('--config-location')) {
            args.push(ea);
          }
        }
      }
    }

    if (jobConfig.globalRateLimit && jobConfig.globalRateLimit !== 'unlimited') {
      args.push('--limit-rate', jobConfig.globalRateLimit);
    }
    if (!isSpotify && jobConfig.cookiesBrowser && jobConfig.cookiesBrowser !== 'none' && jobConfig.cookiesBrowser !== 'auto') {
      if (!args.includes('--cookies-from-browser')) {
        args.push('--cookies-from-browser', jobConfig.cookiesBrowser);
      }
    }

    args.push(downloadUrl);

    const sanitizedLogArgs = args.slice(0, 10).map((arg, idx, arr) => {
      if (arr[idx - 1] === '--proxy') {
        return arg.replace(/:([^@/]+)@/, ':****@');
      }
      return arg;
    });
    if (onLog) onLog(`[yt-dlp] Starting execution with args: ${sanitizedLogArgs.join(' ')} ...`);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.engineManager.ytDlpPath, args, { windowsHide: true });
      let finalFilePath = null;

      this.activeJobs.set(jobId, { proc, config: jobConfig, outputDir: resolvedOutputDir });
      let convertingInterval = null;

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);

        for (const line of lines) {
          if (onLog) onLog(line);

          if (line.includes('[download]')) {
            const percentMatch = line.match(/(\d+\.?\d*)%/);
            const sizeMatch = line.match(/of\s+~?(\d+\.?\d*)\s*([KkMmGgTt]i?B)/i);
            const speedMatch = line.match(/at\s+(\d+\.?\d*)\s*([KkMmGgTt]i?B\/s)/i);
            const etaMatch = line.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/i);

            if (percentMatch) {
              const percent = parseFloat(percentMatch[1]);
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

            const destMatch = line.match(/Destination:\s*(.+)$/i);
            if (destMatch && destMatch[1]) {
              finalFilePath = destMatch[1].trim();
            }
          }

          if (line.includes('[Merger]') || line.includes('[ExtractAudio]') || line.includes('[VideoConvertor]') || line.includes('[FixupM3u8]')) {
            const isAudio = line.includes('[ExtractAudio]');
            const isConvert = line.includes('[VideoConvertor]');
            const stageText = isAudio
              ? 'Extracting & encoding audio with FFmpeg...'
              : isConvert
              ? 'Converting video container & streams...'
              : 'Multiplexing audio & video streams...';

            if (!convertingInterval) {
              let convertPercent = 90;
              if (onProgress) {
                onProgress({
                  jobId,
                  status: 'converting',
                  percent: convertPercent,
                  speed: 'FFmpeg Active',
                  stage: stageText,
                  rawLine: line,
                });
              }
              convertingInterval = setInterval(() => {
                if (convertPercent < 98.5) {
                  convertPercent += 0.8;
                  if (onProgress) {
                    onProgress({
                      jobId,
                      status: 'converting',
                      percent: parseFloat(convertPercent.toFixed(1)),
                      speed: 'FFmpeg Encoding',
                      stage: stageText,
                    });
                  }
                }
              }, 400);
            }

            const mergeMatch = line.match(/into\s+"?(.+?)"?$/i);
            if (mergeMatch && mergeMatch[1]) {
              finalFilePath = mergeMatch[1].trim();
            }
          }
        }
      });

      let accumulatedStderr = '';
      proc.stderr.on('data', (data) => {
        const text = data.toString();
        accumulatedStderr += text;
        if (onLog) onLog(`[stderr] ${text}`);
      });

      proc.on('close', (code) => {
        if (convertingInterval) clearInterval(convertingInterval);
        this.activeJobs.delete(jobId);

        if (code === 0) {
          if (!finalFilePath || !fs.existsSync(finalFilePath)) {
            try {
              const files = fs.readdirSync(resolvedOutputDir).map((f) => path.join(resolvedOutputDir, f));
              files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
              const validFile = files.find((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
              if (validFile) finalFilePath = validFile;
            } catch (e) {}
          }

          const isVideoDownload = !isSpotify && preset !== 'mp3_320' && preset !== 'flac' && preset !== 'wav' && preset !== 'aac' && !(preset === 'custom' && mediaType === 'audio');

          if (isVideoDownload && finalFilePath && fs.existsSync(finalFilePath) && this.engineManager.ffmpegPath) {
            try {
              finalFilePath = await this._ensureCompatibleH264Mp4(finalFilePath, {
                fastReencode,
                noAudio,
                jobId,
                format,
                resolvedOutputDir,
              }, onProgress, onLog);
            } catch (reencodeErr) {
              if (onLog) onLog(`[Re-encode Warning] Post-processing check failed: ${reencodeErr.message}`);
            }
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
          const lowerErr = accumulatedStderr.toLowerCase();
          const isCookieLock = (lowerErr.includes('could not copy') && lowerErr.includes('cookie')) ||
                               (lowerErr.includes('permission denied') && lowerErr.includes('cookie')) ||
                               lowerErr.includes('lockprofilecookiedatabase');

          if (isCookieLock && !jobConfig._cookieLockRetried) {
            this.youtubeAntiBlock.invalidateWorkingBrowser();
            if (onLog) {
              onLog('[Cookie Shield] Browser cookie database is locked (browser is currently running). Automatically falling back to clean download without cookies...');
            }
            const retryConfig = {
              ...jobConfig,
              _cookieLockRetried: true,
              cookiesBrowser: 'none',
              customOptions: {
                ...(jobConfig.customOptions || {}),
                cookiesBrowser: 'none',
              },
            };
            return this.startDownload(retryConfig, onProgress, onLog).then(resolve).catch(reject);
          }

          const isBotChallenge = isYoutube && (lowerErr.includes('sign in to confirm') || lowerErr.includes('not a bot') || lowerErr.includes('bot'));
          if (isBotChallenge && !jobConfig._botRetried) {
            const workingBrowser = this.youtubeAntiBlock.findWorkingBrowser();
            if (workingBrowser) {
              if (onLog) {
                onLog(`[YouTube Shield] Bot challenge detected. Automatically rescuing download using ${workingBrowser} session...`);
              }
              this.youtubeAntiBlock.setWorkingBrowser(workingBrowser);
              const retryConfig = {
                ...jobConfig,
                _botRetried: true,
                cookiesBrowser: workingBrowser,
                customOptions: {
                  ...(jobConfig.customOptions || {}),
                  cookiesBrowser: workingBrowser,
                },
              };
              return this.startDownload(retryConfig, onProgress, onLog).then(resolve).catch(reject);
            }
          }
          const userFriendly = formatYtDlpError(accumulatedStderr);
          reject(new Error(userFriendly));
        }
      });

      proc.on('error', (err) => {
        if (convertingInterval) clearInterval(convertingInterval);
        this.activeJobs.delete(jobId);
        reject(err);
      });
    });
  }

  /**
   * Direct high-speed download for TikTok video streams (bypasses login wall, zero watermark)
   */
  async _downloadDirectTikTokVideo(videoUrl, outputDir, jobConfig, title, fastReencode, noAudio, customResolution = '', onProgress, onLog) {
    const { jobId } = jobConfig;
    const safeTitle = (title || 'TikTok_Video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 90).trim();
    const finalPath = path.join(outputDir, `${safeTitle}.mp4`);
    const tempPath = path.join(outputDir, `${safeTitle}_temp_${Date.now()}.mp4`);

    await this._downloadHttpMedia(videoUrl, tempPath, jobId, onProgress, onLog);

    // If noAudio and not re-encoding, strip audio track with instant stream copy
    if (noAudio && !fastReencode && this.engineManager.ffmpegPath) {
      if (onLog) onLog('[TikTok Engine] Stripping audio track (No Audio selected)...');
      if (onProgress) onProgress({ jobId, status: 'converting', percent: 92, speed: 'Stream Copy', stage: 'Removing audio track...' });

      const mutePath = path.join(outputDir, `${safeTitle}_muted_${Date.now()}.mp4`);
      await new Promise((res) => {
        const proc = spawn(this.engineManager.ffmpegPath, [
          '-y', '-i', tempPath,
          '-c:v', 'copy',
          '-an',
          mutePath,
        ], { windowsHide: true });
        proc.on('close', (code) => {
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (code === 0 && fs.existsSync(mutePath)) {
            if (fs.existsSync(finalPath)) try { fs.unlinkSync(finalPath); } catch (e) {}
            fs.renameSync(mutePath, finalPath);
          } else {
            if (fs.existsSync(tempPath)) fs.renameSync(tempPath, finalPath);
          }
          res();
        });
        proc.on('error', () => {
          if (fs.existsSync(tempPath)) fs.renameSync(tempPath, finalPath);
          res();
        });
      });
    } else if (fastReencode && this.engineManager.ffmpegPath) {
      if (onLog) onLog('[TikTok Engine] Fast re-encoding video with FFmpeg...');
      let reencodePercent = 15;
      const encoder = this.engineManager.status?.hardwareAccels?.nvenc ? 'h264_nvenc' : this.engineManager.status?.hardwareAccels?.qsv ? 'h264_qsv' : 'libx264';
      if (onProgress) onProgress({ jobId, status: 'converting', percent: reencodePercent, speed: encoder, stage: `Re-encoding video with ${encoder}...` });

      const reencodePath = path.join(outputDir, `${safeTitle}_reencoded.mp4`);

      const ffmpegArgs = [
        '-y', '-i', tempPath,
        '-c:v', encoder,
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-progress', 'pipe:1',
      ];
      if (customResolution) {
        const whMatch = customResolution.match(/^(\d+)\s*[xX*×]\s*(\d+)$/);
        if (whMatch) {
          ffmpegArgs.push('-vf', `scale=${whMatch[1]}:${whMatch[2]}:force_original_aspect_ratio=decrease,pad=${whMatch[1]}:${whMatch[2]}:(ow-iw)/2:(oh-ih)/2`);
        } else {
          const hMatch = customResolution.match(/^(\d+)\s*p?$/);
          if (hMatch) {
            ffmpegArgs.push('-vf', `scale=-2:${hMatch[1]}`);
          }
        }
      }
      if (noAudio) {
        ffmpegArgs.push('-an');
      } else {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
      }
      ffmpegArgs.push(reencodePath);

      await new Promise((res) => {
        const proc = spawn(this.engineManager.ffmpegPath, ffmpegArgs, { windowsHide: true });

        const tickTimer = setInterval(() => {
          if (reencodePercent < 97) {
            reencodePercent += 3.5;
            if (onProgress) {
              onProgress({
                jobId,
                status: 'converting',
                percent: parseFloat(reencodePercent.toFixed(0)),
                speed: encoder,
                stage: `Re-encoding video stream • ${reencodePercent.toFixed(0)}%`,
              });
            }
          }
        }, 280);

        proc.stdout.on('data', (d) => {
          const str = d.toString();
          const speedMatch = str.match(/speed=\s*([\d\.]+x)/);
          const fpsMatch = str.match(/fps=\s*([\d\.]+)/);
          if (speedMatch || fpsMatch) {
            if (onProgress) {
              onProgress({
                jobId,
                status: 'converting',
                percent: Math.min(98, Math.max(reencodePercent, 35)),
                speed: speedMatch ? speedMatch[1] : `${encoder} active`,
                stage: `Encoding: ${speedMatch ? speedMatch[1] : ''} ${fpsMatch ? `• ${fpsMatch[1]} FPS` : ''}`.trim(),
              });
            }
          }
        });

        proc.on('close', (code) => {
          clearInterval(tickTimer);
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (code === 0 && fs.existsSync(reencodePath)) {
            if (fs.existsSync(finalPath)) try { fs.unlinkSync(finalPath); } catch (e) {}
            fs.renameSync(reencodePath, finalPath);
            res();
          } else {
            // fallback to original temp file if re-encode failed
            if (fs.existsSync(tempPath)) fs.renameSync(tempPath, finalPath);
            res();
          }
        });
        proc.on('error', () => {
          clearInterval(tickTimer);
          if (fs.existsSync(tempPath)) fs.renameSync(tempPath, finalPath);
          res();
        });
      });
    } else {
      if (fs.existsSync(finalPath)) try { fs.unlinkSync(finalPath); } catch (e) {}
      fs.renameSync(tempPath, finalPath);
    }

    const outputSize = fs.existsSync(finalPath) ? fs.statSync(finalPath).size : 0;
    return { jobId, outputPath: finalPath, outputSize };
  }

  /**
   * Direct high-speed download for TikTok audio tracks (converted to MP3/FLAC via FFmpeg)
   */
  async _downloadDirectTikTokAudio(audioUrl, outputDir, jobConfig, title, preset, customOptions, onProgress, onLog) {
    const { jobId } = jobConfig;
    const safeTitle = (title || 'TikTok_Audio').replace(/[\\/:*?"<>|]/g, '_').slice(0, 90).trim();
    const isFlac = preset === 'flac' || (preset === 'custom' && customOptions?.audioFormat === 'flac');
    const ext = isFlac ? 'flac' : 'mp3';
    const finalPath = path.join(outputDir, `${safeTitle}.${ext}`);
    const tempPath = path.join(outputDir, `${safeTitle}_temp_${Date.now()}.bin`);

    await this._downloadHttpMedia(audioUrl, tempPath, jobId, onProgress, onLog);

    if (this.engineManager.ffmpegPath) {
      if (onLog) onLog(`[TikTok Engine] Converting audio to ${ext.toUpperCase()} with FFmpeg...`);
      let audioPercent = 20;
      if (onProgress) onProgress({ jobId, status: 'converting', percent: audioPercent, speed: 'FFmpeg Audio Encoder', stage: `Converting audio track to ${ext.toUpperCase()}...` });

      const audioTimer = setInterval(() => {
        if (audioPercent < 97) {
          audioPercent += 6;
          if (onProgress) {
            onProgress({
              jobId,
              status: 'converting',
              percent: audioPercent,
              speed: 'FFmpeg Audio Encoder',
              stage: `Encoding audio to ${ext.toUpperCase()} • ${audioPercent}%`,
            });
          }
        }
      }, 200);

      const ffmpegArgs = ['-y', '-i', tempPath, '-vn'];
      if (isFlac) {
        ffmpegArgs.push('-c:a', 'flac');
      } else {
        ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', '320k');
      }
      ffmpegArgs.push(finalPath);

      await new Promise((res, rej) => {
        const proc = spawn(this.engineManager.ffmpegPath, ffmpegArgs, { windowsHide: true });
        proc.on('close', (code) => {
          clearInterval(audioTimer);
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (code === 0 && fs.existsSync(finalPath)) res();
          else rej(new Error('Audio conversion failed.'));
        });
        proc.on('error', (err) => {
          clearInterval(audioTimer);
          try { fs.unlinkSync(tempPath); } catch (e) {}
          rej(err);
        });
      });
    } else {
      if (fs.existsSync(finalPath)) try { fs.unlinkSync(finalPath); } catch (e) {}
      fs.renameSync(tempPath, finalPath);
    }

    const outputSize = fs.existsSync(finalPath) ? fs.statSync(finalPath).size : 0;
    return { jobId, outputPath: finalPath, outputSize };
  }

  /**
   * Streaming HTTP downloader with realtime speed, ETA, and progress percent
   */
  _downloadHttpMedia(downloadUrl, destPath, jobId, onProgress, onLog) {
    return new Promise((resolve, reject) => {
      let abortController = new AbortController();
      let fileStream = fs.createWriteStream(destPath);
      let startTime = Date.now();
      let downloadedBytes = 0;
      let lastReportTime = Date.now();

      this.activeJobs.set(jobId, {
        abortFn: () => {
          try { abortController.abort(); } catch (e) {}
          try { fileStream.destroy(); } catch (e) {}
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) {}
        },
        outputDir: path.dirname(destPath),
      });

      const protocol = downloadUrl.startsWith('https') ? https : http;
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
        },
        signal: abortController.signal,
      };

      const req = protocol.get(downloadUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
          return resolve(this._downloadHttpMedia(res.headers.location, destPath, jobId, onProgress, onLog));
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          try { fs.unlinkSync(destPath); } catch (e) {}
          this.activeJobs.delete(jobId);
          return reject(new Error(`Download stream failed: HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || 0, 10);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();

          // Report progress every 200ms
          if (now - lastReportTime > 200) {
            lastReportTime = now;
            const elapsedSec = (now - startTime) / 1000;
            const bytesPerSec = elapsedSec > 0 ? downloadedBytes / elapsedSec : 0;
            const speedMb = (bytesPerSec / 1024 / 1024).toFixed(2);
            const percent = totalBytes > 0 ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
            const remainingSec = bytesPerSec > 0 && totalBytes > downloadedBytes ? Math.round((totalBytes - downloadedBytes) / bytesPerSec) : 0;
            const etaMins = Math.floor(remainingSec / 60);
            const etaSecs = remainingSec % 60;
            const eta = `${etaMins.toString().padStart(2, '0')}:${etaSecs.toString().padStart(2, '0')}`;

            if (onProgress) {
              onProgress({
                jobId,
                status: 'downloading',
                percent,
                speed: `${speedMb} MiB/s`,
                totalSize: totalBytes > 0 ? `${(totalBytes / 1024 / 1024).toFixed(1)} MiB` : null,
                eta,
              });
            }
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          this.activeJobs.delete(jobId);
          resolve();
        });

        fileStream.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch (e) {}
          this.activeJobs.delete(jobId);
          reject(err);
        });
      });

      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch (e) {}
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

    // Direct HTTP download abort
    if (job.abortFn) {
      try { job.abortFn(); } catch (e) {}
      this.activeJobs.delete(jobId);
      return true;
    }

    // Process kill
    if (job.proc) {
      try {
        if (process.platform === 'win32' && job.proc.pid) {
          execSync(`taskkill /F /T /PID ${job.proc.pid}`, { stdio: 'ignore', windowsHide: true });
        } else {
          job.proc.kill('SIGKILL');
        }
      } catch (e) {}
    }

    // Clean up partial .part or .ytdl files in outputDir
    try {
      if (job.outputDir && fs.existsSync(job.outputDir)) {
        const files = fs.readdirSync(job.outputDir);
        for (const file of files) {
          if (file.endsWith('.part') || file.endsWith('.ytdl') || file.includes('_temp_')) {
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
