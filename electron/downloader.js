const { spawn, execSync } = require('child_process');
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
    const isPlaylist = pathname === '/playlist' && (parsed.searchParams.has('list') || search.includes('list='));

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
  if (e.includes('sign in to confirm your age') || e.includes('confirm you’re not a bot') || e.includes('sign in to confirm you’re not a bot')) {
    return 'Age-restricted or verification check detected. Select your browser in Cookies (under Advanced or Settings) to download seamlessly.';
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

class Downloader {
  constructor(engineManager) {
    this.engineManager = engineManager;
    this.activeJobs = new Map(); // jobId -> { proc, config, abortFn, outputDir }
  }

  _isTikTokUrl(url = '') {
    const u = (url || '').toLowerCase();
    return u.includes('tiktok.com');
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
          return reject(new Error(formatYtDlpError(errDetail)));
        }

        try {
          const info = JSON.parse(stdout);

          // Proactive guard against playlist tabs, channel profiles, or empty recommendations feeds
          if (info.extractor && (info.extractor.includes(':tab') || info.extractor.includes(':channel'))) {
            return reject(new Error(`The provided link points to a channel or recommendations tab ("${info.title || 'Tab'}"), not a downloadable video.`));
          }
          if (info.title && ['recommended', 'home', 'feed', 'trending', 'explore'].includes(info.title.toLowerCase().trim())) {
            return reject(new Error('This link points to a recommendations feed, not a downloadable video. Please provide a direct video link.'));
          }
          if ((!info.formats || info.formats.length === 0) && !info.url && !info.direct_url) {
            return reject(new Error('No downloadable video or audio streams were found for this media link.'));
          }

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

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Safely destructure custom options with defaults to prevent ReferenceError
    const {
      mediaType = 'video',
      format = 'mp4',
      resolution = 'best',
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
            outputDir,
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
            outputDir,
            jobConfig,
            tikTokInfo.title,
            fastReencode,
            noAudio,
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
        // Video mode: handle No Audio option
        if (noAudio) {
          if (resolution !== 'best') {
            const h = parseInt(resolution, 10);
            if (h > 0) {
              args.push('-f', `bv*[height<=${h}][ext=${format}]/bv*[height<=${h}]/bv*`);
            } else {
              args.push('-f', `bv*[ext=${format}]/bv*`);
            }
          } else {
            args.push('-f', `bv*[ext=${format}]/bv*`);
          }
          // Stripping audio with ffmpeg postprocessor
          args.push('--postprocessor-args', 'ffmpeg:-an');
        } else {
          if (resolution !== 'best') {
            const h = parseInt(resolution, 10);
            if (h > 0) {
              args.push('-f', `bv*[height<=${h}]+ba/b[height<=${h}] / bv*+ba/b`);
            }
          }
        }

        if (fastReencode) {
          args.push('--recode-video', 'mp4');
          const encoder = this.engineManager.status?.hardwareAccels?.nvenc
            ? 'h264_nvenc'
            : this.engineManager.status?.hardwareAccels?.qsv
            ? 'h264_qsv'
            : 'libx264';
          const ppArgs = noAudio
            ? `VideoConvertor:-c:v ${encoder} -an`
            : `VideoConvertor:-c:v ${encoder}`;
          args.push('--postprocessor-args', ppArgs);
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

      this.activeJobs.set(jobId, { proc, config: jobConfig, outputDir });

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

      let accumulatedStderr = '';
      proc.stderr.on('data', (data) => {
        const text = data.toString();
        accumulatedStderr += text;
        if (onLog) onLog(`[stderr] ${text}`);
      });

      proc.on('close', (code) => {
        this.activeJobs.delete(jobId);

        if (code === 0) {
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
          const userFriendly = formatYtDlpError(accumulatedStderr);
          reject(new Error(userFriendly));
        }
      });

      proc.on('error', (err) => {
        this.activeJobs.delete(jobId);
        reject(err);
      });
    });
  }

  /**
   * Direct high-speed download for TikTok video streams (bypasses login wall, zero watermark)
   */
  async _downloadDirectTikTokVideo(videoUrl, outputDir, jobConfig, title, fastReencode, noAudio, onProgress, onLog) {
    const { jobId } = jobConfig;
    const safeTitle = (title || 'TikTok_Video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 90).trim();
    const finalPath = path.join(outputDir, `${safeTitle}.mp4`);
    const tempPath = path.join(outputDir, `${safeTitle}_temp_${Date.now()}.mp4`);

    await this._downloadHttpMedia(videoUrl, tempPath, jobId, onProgress, onLog);

    // If noAudio and not re-encoding, strip audio track with instant stream copy
    if (noAudio && !fastReencode && this.engineManager.ffmpegPath) {
      if (onLog) onLog('[TikTok Engine] Stripping audio track (No Audio selected)...');
      if (onProgress) onProgress({ jobId, status: 'converting', percent: 99, speed: null, eta: null });

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
      if (onProgress) onProgress({ jobId, status: 'converting', percent: 99, speed: null, eta: null });

      const encoder = this.engineManager.status?.hardwareAccels?.nvenc ? 'h264_nvenc' : this.engineManager.status?.hardwareAccels?.qsv ? 'h264_qsv' : 'libx264';
      const reencodePath = path.join(outputDir, `${safeTitle}_reencoded.mp4`);

      const ffmpegArgs = [
        '-y', '-i', tempPath,
        '-c:v', encoder,
        '-preset', 'fast',
      ];
      if (noAudio) {
        ffmpegArgs.push('-an');
      } else {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
      }
      ffmpegArgs.push(reencodePath);

      await new Promise((res, rej) => {
        const proc = spawn(this.engineManager.ffmpegPath, ffmpegArgs, { windowsHide: true });

        proc.on('close', (code) => {
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
      if (onProgress) onProgress({ jobId, status: 'converting', percent: 99, speed: null, eta: null });

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
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (code === 0 && fs.existsSync(finalPath)) res();
          else rej(new Error('Audio conversion failed.'));
        });
        proc.on('error', (err) => {
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
