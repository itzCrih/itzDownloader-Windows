import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Film,
  Music,
  Settings2,
  Subtitles,
  Image as ImageIcon,
  Gauge,
  KeyRound,
  Download,
  Terminal,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Link2,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { detectPlatform } from '../utils/platformDetect';
import { formatDuration } from '../utils/formatters';

export default function StudioTab({
  initialUrl = '',
  initialMediaInfo = null,
  onAddJob,
  onShowToast,
  defaultOutputDir,
  onNavigateToQueue,
  engineStatus,
}) {
  const [url, setUrl] = useState(initialUrl || '');
  const [isInspecting, setIsInspecting] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(initialMediaInfo);

  // Advanced Configurations
  const [mediaType, setMediaType] = useState('video'); // 'video' | 'audio'
  const [videoContainer, setVideoContainer] = useState('mp4'); // 'mp4' | 'mkv' | 'webm'
  const [resolution, setResolution] = useState('best'); // 'best' | '2160' | '1440' | '1080' | '720' | '480'
  const [fastReencode, setFastReencode] = useState(false); // User requested: Fast Re-encoding in MP4
  const [audioFormat, setAudioFormat] = useState('mp3'); // 'mp3' | 'flac' | 'wav' | 'aac' | 'opus' | 'ogg'
  const [audioBitrate, setAudioBitrate] = useState('320k'); // '320k' | '256k' | '192k' | '128k'
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [downloadSubtitles, setDownloadSubtitles] = useState(false);
  const [subLangs, setSubLangs] = useState('all');
  const [embedSubtitles, setEmbedSubtitles] = useState(true);
  const [rateLimit, setRateLimit] = useState('unlimited');
  const [cookiesBrowser, setCookiesBrowser] = useState('none');
  const [extraArgs, setExtraArgs] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialUrl && initialUrl !== url) {
      setUrl(initialUrl);
    }
    if (initialMediaInfo) {
      setMediaInfo(initialMediaInfo);
      if (initialMediaInfo.isAudioOnly) {
        setMediaType('audio');
      }
    }
  }, [initialUrl, initialMediaInfo]);

  const platform = detectPlatform(url);

  const handleInspect = async () => {
    const clean = url.trim();
    if (!clean || (!clean.startsWith('http://') && !clean.startsWith('https://'))) {
      onShowToast('Please enter a valid URL to inspect.', 'warning');
      return;
    }

    if (!platform.isAllowed) {
      onShowToast('This domain is not in the verified whitelist.', 'error');
      return;
    }

    setIsInspecting(true);
    try {
      const info = await window.itzDownloaderAPI.inspectUrl(clean, { cookiesBrowser });
      setMediaInfo(info);
      if (info.isAudioOnly) {
        setMediaType('audio');
      }
      onShowToast(`Loaded metadata for "${info.title}"`, 'info');
    } catch (err) {
      onShowToast(`Inspection failed: ${err.message}`, 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleStartCustomDownload = () => {
    const clean = url.trim();
    if (!clean) {
      onShowToast('Please enter a media URL.', 'warning');
      return;
    }

    if (!platform.isAllowed) {
      onShowToast('This domain is blocked by security policy.', 'error');
      return;
    }

    if (!engineStatus?.ytDlpAvailable) {
      onShowToast('yt-dlp engine is missing. Install it in Settings.', 'error');
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobConfig = {
      jobId,
      url: clean,
      outputDir: defaultOutputDir,
      preset: 'custom',
      title: mediaInfo?.title || clean,
      author: mediaInfo?.author || platform.name,
      thumbnail: mediaInfo?.thumbnail || null,
      platform: platform.id,
      duration: mediaInfo?.duration || 0,
      customOptions: {
        mediaType,
        format: videoContainer,
        resolution,
        fastReencode: mediaType === 'video' ? fastReencode : false,
        audioFormat,
        audioBitrate,
        embedThumbnail,
        downloadSubtitles,
        subLangs,
        embedSubtitles,
        rateLimit: rateLimit === 'unlimited' ? null : rateLimit,
        cookiesBrowser: cookiesBrowser === 'none' ? null : cookiesBrowser,
        extraArgs,
      },
      createdAt: Date.now(),
    };

    onAddJob(jobConfig);
    onShowToast(`Custom job queued: ${mediaInfo?.title || 'Media'}`, 'success');
  };

  return (
    <div className="tab-pane-container">
      {/* Advanced Header */}
      <div className="studio-header-bar">
        <div className="studio-header-left">
          <div className="studio-icon-badge">
            <Sliders size={18} color="#e6b422" />
          </div>
          <div>
            <h2 className="studio-title">Advanced Media Suite</h2>
            <p className="studio-subtitle">Granular control over codecs, hardware fast re-encoding, audio bitrates, and cookies.</p>
          </div>
        </div>
      </div>

      {/* Target Media Link Row */}
      <div className="studio-card">
        <div className="card-inner-header">
          <div className="card-title-group">
            <Link2 size={16} color="#e6b422" />
            <span className="card-title">Target Media Source</span>
          </div>
          {url.trim() && (
            <span
              className="platform-detected-pill"
              style={{
                background: platform.badgeBg,
                color: platform.color,
                borderColor: platform.badgeBorder,
              }}
            >
              {platform.name}
            </span>
          )}
        </div>

        <div className="studio-url-row">
          <input
            type="text"
            className="form-input"
            placeholder="Enter media URL (YouTube, TikTok, Instagram, Spotify, Vimeo, Twitter)..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={handleInspect}
            disabled={isInspecting || !url.trim() || !platform.isAllowed}
          >
            <span>{isInspecting ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>

        {url.trim() && !platform.isAllowed && (
          <div className="whitelist-blocked-banner">
            <AlertTriangle size={15} color="#f85149" />
            <span>Domain is not in the whitelist. Only verified platforms are supported.</span>
          </div>
        )}

        {mediaInfo && (
          <div className="studio-media-snippet">
            {mediaInfo.thumbnail && (
              <img src={mediaInfo.thumbnail} alt={mediaInfo.title} className="studio-snippet-thumb" />
            )}
            <div className="studio-snippet-info">
              <span className="snippet-title">{mediaInfo.title}</span>
              <span className="snippet-meta">
                {mediaInfo.author} • {formatDuration(mediaInfo.duration)}
                {mediaInfo.resolutions?.length > 0 && ` • Up to ${mediaInfo.resolutions[0].label}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Category Switcher */}
      <div className="studio-type-switcher-bar">
        <button
          className={`type-switch-btn ${mediaType === 'video' ? 'active' : ''}`}
          onClick={() => setMediaType('video')}
        >
          <Film size={18} />
          <div>
            <div className="type-switch-name">Video & Audio Merged</div>
            <div className="type-switch-desc">High resolution MP4, MKV, or WebM streams</div>
          </div>
        </button>

        <button
          className={`type-switch-btn ${mediaType === 'audio' ? 'active' : ''}`}
          onClick={() => setMediaType('audio')}
        >
          <Music size={18} />
          <div>
            <div className="type-switch-name">Audio Extraction Only</div>
            <div className="type-switch-desc">Pure MP3, FLAC, WAV, AAC, or Opus track</div>
          </div>
        </button>
      </div>

      {/* Video Options Panel */}
      {mediaType === 'video' && (
        <div className="studio-card">
          <div className="card-inner-header">
            <div className="card-title-group">
              <Film size={16} color="#e6b422" />
              <span className="card-title">Video Stream Configuration</span>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Container */}
            <div className="form-group">
              <label className="form-label">Container Format</label>
              <select
                className="form-select"
                value={videoContainer}
                onChange={(e) => setVideoContainer(e.target.value)}
              >
                <option value="mp4">MP4 (Universal compatibility, recommended)</option>
                <option value="mkv">MKV (Matroska, multi-track & full subtitle support)</option>
                <option value="webm">WebM (VP9 / AV1 web open container)</option>
              </select>
              <span className="form-hint">MP4 is universally recognized on Windows, Apple & Android devices.</span>
            </div>

            {/* Resolution Cap */}
            <div className="form-group">
              <label className="form-label">Max Resolution Ceiling</label>
              <select
                className="form-select"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="best">Best Available (Source Master / 4K UHD)</option>
                <option value="2160">4K UHD (2160p)</option>
                <option value="1440">2K QHD (1440p)</option>
                <option value="1080">Full HD (1080p 60fps)</option>
                <option value="720">HD (720p)</option>
                <option value="480">Standard SD (480p)</option>
              </select>
              <span className="form-hint">Cap the resolution to save disk space or download at maximum native source.</span>
            </div>
          </div>

          {/* Fast Re-encoding Option (User Requested!) */}
          <div className="reencode-highlight-card">
            <div className="reencode-highlight-left">
              <div className="reencode-icon-box">
                <Zap size={18} color="#e6b422" />
              </div>
              <div>
                <div className="reencode-title">Fast Re-encoding (FFmpeg H.264 MP4)</div>
                <div className="reencode-desc">
                  Re-encodes video stream to standard H.264 MP4 using hardware acceleration
                  {engineStatus?.hardwareAccels?.nvenc ? ' (NVIDIA NVENC active)' : engineStatus?.hardwareAccels?.qsv ? ' (Intel QSV active)' : ''}.
                  Guarantees 100% playback on video editors (Premiere, DaVinci, Vegas) and Discord.
                </div>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={fastReencode}
                onChange={(e) => setFastReencode(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Subtitles & Cover Art */}
          <div className="form-toggles-row">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
              />
              <span>Embed HD video thumbnail as file cover art</span>
            </label>

            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={downloadSubtitles}
                onChange={(e) => setDownloadSubtitles(e.target.checked)}
              />
              <span>Download Subtitles & Closed Captions</span>
            </label>
          </div>

          {downloadSubtitles && (
            <div className="form-grid-2 nested-sub-box">
              <div className="form-group">
                <label className="form-label">Subtitle Language</label>
                <select
                  className="form-select"
                  value={subLangs}
                  onChange={(e) => setSubLangs(e.target.value)}
                >
                  <option value="all">All Available Subtitles</option>
                  <option value="en">English (en)</option>
                  <option value="it">Italian (it)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                  <option value="ja">Japanese (ja)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subtitle Format</label>
                <select
                  className="form-select"
                  value={embedSubtitles ? 'embed' : 'external'}
                  onChange={(e) => setEmbedSubtitles(e.target.value === 'embed')}
                >
                  <option value="embed">Embed Directly into Video Container</option>
                  <option value="external">Save as Separate .SRT Files</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Options Panel */}
      {mediaType === 'audio' && (
        <div className="studio-card">
          <div className="card-inner-header">
            <div className="card-title-group">
              <Music size={16} color="#e6b422" />
              <span className="card-title">Audio Track Configuration</span>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Audio Format */}
            <div className="form-group">
              <label className="form-label">Audio Codec / Format</label>
              <select
                className="form-select"
                value={audioFormat}
                onChange={(e) => setAudioFormat(e.target.value)}
              >
                <option value="mp3">MP3 (MPEG Audio Layer III)</option>
                <option value="flac">FLAC (Free Lossless Audio Codec)</option>
                <option value="wav">WAV (Uncompressed PCM Studio Master)</option>
                <option value="m4a">AAC / M4A (Apple & Modern Devices)</option>
                <option value="opus">Opus (State-of-the-Art Low-Latency)</option>
                <option value="vorbis">OGG Vorbis</option>
              </select>
              <span className="form-hint">FLAC and WAV provide bit-perfect studio reproduction without loss.</span>
            </div>

            {/* Bitrate */}
            {audioFormat === 'mp3' && (
              <div className="form-group">
                <label className="form-label">MP3 Quality / Target Bitrate</label>
                <select
                  className="form-select"
                  value={audioBitrate}
                  onChange={(e) => setAudioBitrate(e.target.value)}
                >
                  <option value="320k">320 kbps CBR (Maximum Fidelity)</option>
                  <option value="256k">256 kbps (High Quality)</option>
                  <option value="192k">192 kbps (Standard Quality)</option>
                  <option value="128k">128 kbps (Compact Size)</option>
                </select>
                <span className="form-hint">320k matches studio broadcast standards for digital audio.</span>
              </div>
            )}
          </div>

          <div className="form-toggles-row">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
              />
              <span>Embed track cover art and ID3 metadata tags (Artist, Title, Year)</span>
            </label>
          </div>
        </div>
      )}

      {/* Advanced Power Settings Accordion */}
      <div className="studio-card">
        <div
          className="card-inner-header clickable"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="card-title-group">
            <Settings2 size={16} color="#e6b422" />
            <span className="card-title">Network & Engine Customization</span>
          </div>
          <ChevronDown
            size={16}
            style={{
              transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>

        {showAdvanced && (
          <div className="advanced-options-body">
            <div className="form-grid-2">
              {/* Speed Limit */}
              <div className="form-group">
                <label className="form-label">Bandwidth Throttle / Rate Limit</label>
                <select
                  className="form-select"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                >
                  <option value="unlimited">Unlimited (Maximum Connection Speed)</option>
                  <option value="25M">25 MB/s (High Speed)</option>
                  <option value="10M">10 MB/s (Balanced)</option>
                  <option value="5M">5 MB/s (Quiet Background)</option>
                  <option value="2M">2 MB/s (Low Bandwidth)</option>
                </select>
                <span className="form-hint">Prevents downloading from saturating your home network.</span>
              </div>

              {/* Browser Cookies */}
              <div className="form-group">
                <label className="form-label">Browser Cookies Integration</label>
                <select
                  className="form-select"
                  value={cookiesBrowser}
                  onChange={(e) => setCookiesBrowser(e.target.value)}
                >
                  <option value="none">None (Public anonymous access)</option>
                  <option value="chrome">Google Chrome (Age-restricted & logged-in content)</option>
                  <option value="firefox">Mozilla Firefox</option>
                  <option value="edge">Microsoft Edge</option>
                  <option value="brave">Brave Browser</option>
                </select>
                <span className="form-hint">Automatically bypasses YouTube 18+ sign-in walls using your browser session.</span>
              </div>
            </div>

            {/* Custom Arguments */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Custom yt-dlp Flags (Power User)</label>
              <input
                type="text"
                className="form-input form-mono"
                placeholder="--no-playlist --geo-bypass --concurrent-fragments 4"
                value={extraArgs}
                onChange={(e) => setExtraArgs(e.target.value)}
              />
              <span className="form-hint">Direct flags passed to yt-dlp runtime. Arguments with execution rights are blocked for security.</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="studio-action-bar">
        <div className="instant-action-left">
          <span className="output-target-label">Destination Directory:</span>
          <span className="output-target-path" title={defaultOutputDir}>
            {defaultOutputDir || 'Downloads/itzDownloader'}
          </span>
        </div>

        <div className="instant-action-right">
          <button
            className="btn-download-primary"
            onClick={handleStartCustomDownload}
            disabled={!url.trim() || !platform.isAllowed}
          >
            <Sparkles size={17} />
            <span>Start Advanced Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
