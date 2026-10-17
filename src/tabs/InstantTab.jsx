import React, { useState, useEffect } from 'react';
import {
  Link2,
  ClipboardPaste,
  Sparkles,
  ArrowRight,
  Film,
  Music,
  Headphones,
  Check,
  Loader2,
  ExternalLink,
  Layers,
  X,
  Play
} from 'lucide-react';
import { detectPlatform } from '../utils/platformDetect';
import { formatDuration } from '../utils/formatters';

export default function InstantTab({
  onAddJob,
  onShowToast,
  defaultOutputDir,
  onNavigateToStudio,
  onNavigateToQueue,
  activeJobs,
  engineStatus,
}) {
  const [url, setUrl] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('best_video');
  const [isDownloading, setIsDownloading] = useState(false);

  const platform = detectPlatform(url);

  // Auto-check clipboard for valid URLs on initial tab focus
  useEffect(() => {
    if (!url && window.itzDownloaderAPI?.readClipboard) {
      const text = window.itzDownloaderAPI.readClipboard().trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        // Only set if not already set
        // Don't auto-fetch, just ready to paste
      }
    }
  }, []);

  const handlePasteFromClipboard = () => {
    if (window.itzDownloaderAPI?.readClipboard) {
      const text = window.itzDownloaderAPI.readClipboard().trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text);
        inspectTargetUrl(text);
      } else {
        onShowToast('No valid URL found in clipboard.', 'warning');
      }
    }
  };

  const handleClear = () => {
    setUrl('');
    setMediaInfo(null);
    setIsDownloading(false);
  };

  const inspectTargetUrl = async (targetUrl = url) => {
    const clean = (targetUrl || '').trim();
    if (!clean || (!clean.startsWith('http://') && !clean.startsWith('https://'))) {
      onShowToast('Please enter a valid HTTP or HTTPS link.', 'warning');
      return;
    }

    if (!engineStatus?.ytDlpAvailable) {
      onShowToast('yt-dlp is not ready. Please download it in the Settings tab.', 'error');
      return;
    }

    setIsInspecting(true);
    setMediaInfo(null);

    try {
      const info = await window.itzDownloaderAPI.inspectUrl(clean, {});
      setMediaInfo(info);

      // Auto-select smart preset based on platform
      if (info.isAudioOnly || info.platform === 'spotify' || info.platform === 'soundcloud') {
        setSelectedPreset('mp3_320');
      } else if (info.platform === 'tiktok') {
        setSelectedPreset('tiktok_clean');
      } else {
        setSelectedPreset('best_video');
      }
    } catch (err) {
      onShowToast(`Failed to fetch media info: ${err.message}`, 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (mediaInfo) {
        handleStartDownload(selectedPreset);
      } else {
        inspectTargetUrl();
      }
    }
  };

  const handleStartDownload = async (presetToUse = selectedPreset) => {
    const targetUrl = url.trim();
    if (!targetUrl) {
      onShowToast('Please enter a media URL to download.', 'warning');
      return;
    }

    if (!engineStatus?.ytDlpAvailable) {
      onShowToast('yt-dlp engine is required. Check Settings to download it.', 'error');
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobConfig = {
      jobId,
      url: targetUrl,
      outputDir: defaultOutputDir,
      preset: presetToUse,
      title: mediaInfo?.title || targetUrl,
      author: mediaInfo?.author || platform.name,
      thumbnail: mediaInfo?.thumbnail || null,
      platform: platform.id,
      duration: mediaInfo?.duration || 0,
      createdAt: Date.now(),
    };

    onAddJob(jobConfig);
    onShowToast(`Started download: ${mediaInfo?.title || 'Media'}`, 'success');
    setIsDownloading(true);
  };

  // Check if current URL is already being downloaded
  const currentActiveJob = activeJobs.find(
    (j) => j.url === url.trim() && (j.status === 'downloading' || j.status === 'converting')
  );

  return (
    <div className="tab-pane-container">
      {/* Hero Header */}
      <div className="instant-hero-section">
        <div className="instant-badge-pill">
          <Sparkles size={13} className="sparkle-icon" />
          <span>Instant Media Engine • 100% Local & Offline</span>
        </div>
        <h1 className="instant-hero-title">
          Paste Link. Get <span className="text-gold-gradient">Instant Media</span>.
        </h1>
        <p className="instant-hero-subtitle">
          Lightning-fast downloads from YouTube, TikTok, Spotify, Instagram, SoundCloud, and 1,000+ sites.
        </p>
      </div>

      {/* Main Paste Bar */}
      <div className="paste-hero-card">
        <div className="paste-input-wrapper">
          <div className="paste-icon-badge" style={{ color: platform.color }}>
            <Link2 size={19} />
          </div>

          <input
            type="text"
            className="paste-input"
            placeholder="Paste video or audio link (e.g. YouTube, TikTok, Spotify, Instagram)..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {url ? (
            <button className="paste-action-btn-subtle" onClick={handleClear} title="Clear link">
              <X size={16} />
            </button>
          ) : (
            <button
              className="paste-action-btn"
              onClick={handlePasteFromClipboard}
              title="Paste link from clipboard"
            >
              <ClipboardPaste size={15} />
              <span>Paste</span>
            </button>
          )}

          <button
            className="btn-fetch"
            disabled={isInspecting || !url.trim()}
            onClick={() => inspectTargetUrl()}
          >
            {isInspecting ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>Inspect</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Dynamic Platform Pills */}
        <div className="platform-pills-bar">
          <div className="platform-detected-pill" style={{ background: platform.badgeBg, borderColor: platform.badgeBorder, color: platform.color }}>
            <span className="platform-dot" style={{ background: platform.color }} />
            <span>{platform.name}</span>
          </div>

          <div className="platforms-supported-tags">
            <span className="supported-tag">YouTube 4K</span>
            <span className="supported-tag">TikTok Clean</span>
            <span className="supported-tag">Spotify MP3/FLAC</span>
            <span className="supported-tag">Instagram Reels</span>
            <span className="supported-tag">SoundCloud</span>
            <span className="supported-tag">Twitter/X</span>
          </div>
        </div>
      </div>

      {/* Media Inspection Result Card */}
      {mediaInfo && (
        <div className="media-preview-card">
          <div className="media-preview-left">
            {mediaInfo.thumbnail ? (
              <div className="media-thumb-box">
                <img src={mediaInfo.thumbnail} alt={mediaInfo.title} className="media-thumb-img" />
                {mediaInfo.duration > 0 && (
                  <span className="media-duration-badge">{formatDuration(mediaInfo.duration)}</span>
                )}
              </div>
            ) : (
              <div className="media-thumb-placeholder">
                {mediaInfo.isAudioOnly ? <Music size={32} color="#e6b422" /> : <Film size={32} color="#e6b422" />}
              </div>
            )}

            <div className="media-meta-details">
              <div className="media-title-row">
                <span className="media-title-text" title={mediaInfo.title}>{mediaInfo.title}</span>
              </div>
              <div className="media-subtitle-row">
                <span className="media-author-pill">{mediaInfo.author}</span>
                {mediaInfo.platform && (
                  <span className="media-platform-pill" style={{ color: platform.color }}>
                    {platform.name}
                  </span>
                )}
                {mediaInfo.isLive && <span className="media-live-badge">LIVE</span>}
              </div>
            </div>
          </div>

          <div className="media-preview-right">
            <button
              className="btn-studio-shortcut"
              onClick={() => onNavigateToStudio(url, mediaInfo)}
              title="Open in Studio for full audio/video bitrate & container customization"
            >
              <span>Custom Studio</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Preset Action Grid (1-Click Downloads) */}
      <div className="preset-grid-section">
        <div className="section-header-bar">
          <span className="section-label">Quick Download Presets</span>
          <span className="section-hint">Select a preset to download with optimized local settings</span>
        </div>

        <div className="preset-cards-grid">
          {/* Preset 1: Best Video MP4 */}
          <div
            className={`preset-card ${selectedPreset === 'best_video' ? 'selected' : ''}`}
            onClick={() => setSelectedPreset('best_video')}
          >
            <div className="preset-card-top">
              <div className="preset-icon-box gold">
                <Film size={20} />
              </div>
              <span className="preset-badge gold">Recommended</span>
            </div>
            <div className="preset-title">Best Video (MP4)</div>
            <div className="preset-desc">Highest available resolution (up to 4K / 60fps) with AAC stereo audio merged.</div>
            <div className="preset-specs">
              <span>H.264 / Auto</span>
              <span>•</span>
              <span>Stereo Audio</span>
              <span>•</span>
              <span>.MP4</span>
            </div>
          </div>

          {/* Preset 2: 1080p MP4 */}
          <div
            className={`preset-card ${selectedPreset === '1080p' ? 'selected' : ''}`}
            onClick={() => setSelectedPreset('1080p')}
          >
            <div className="preset-card-top">
              <div className="preset-icon-box blue">
                <Film size={20} />
              </div>
              <span className="preset-badge">Standard</span>
            </div>
            <div className="preset-title">Full HD 1080p (MP4)</div>
            <div className="preset-desc">Balanced file size and crystal-clear 1080p quality. Fastest download speed.</div>
            <div className="preset-specs">
              <span>1080p Max</span>
              <span>•</span>
              <span>Fastest</span>
              <span>•</span>
              <span>.MP4</span>
            </div>
          </div>

          {/* Preset 3: MP3 320k Audio */}
          <div
            className={`preset-card ${selectedPreset === 'mp3_320' ? 'selected' : ''}`}
            onClick={() => setSelectedPreset('mp3_320')}
          >
            <div className="preset-card-top">
              <div className="preset-icon-box purple">
                <Headphones size={20} />
              </div>
              <span className="preset-badge purple">Music</span>
            </div>
            <div className="preset-title">MP3 Audio (320 kbps)</div>
            <div className="preset-desc">Highest MP3 bitrate with embedded artist, title tags and HD album artwork.</div>
            <div className="preset-specs">
              <span>320 kbps</span>
              <span>•</span>
              <span>ID3 Metadata</span>
              <span>•</span>
              <span>.MP3</span>
            </div>
          </div>

          {/* Preset 4: Lossless FLAC */}
          <div
            className={`preset-card ${selectedPreset === 'flac' ? 'selected' : ''}`}
            onClick={() => setSelectedPreset('flac')}
          >
            <div className="preset-card-top">
              <div className="preset-icon-box green">
                <Music size={20} />
              </div>
              <span className="preset-badge green">Audiophile</span>
            </div>
            <div className="preset-title">Studio FLAC (Lossless)</div>
            <div className="preset-desc">Bit-perfect audio quality without compression artifacts or data loss.</div>
            <div className="preset-specs">
              <span>Lossless</span>
              <span>•</span>
              <span>Bit-Perfect</span>
              <span>•</span>
              <span>.FLAC</span>
            </div>
          </div>

          {/* Preset 5: TikTok Clean */}
          <div
            className={`preset-card ${selectedPreset === 'tiktok_clean' ? 'selected' : ''}`}
            onClick={() => setSelectedPreset('tiktok_clean')}
          >
            <div className="preset-card-top">
              <div className="preset-icon-box cyan">
                <Film size={20} />
              </div>
              <span className="preset-badge cyan">Social</span>
            </div>
            <div className="preset-title">TikTok Clean (No Watermark)</div>
            <div className="preset-desc">Original high-bitrate vertical stream without platform watermarks.</div>
            <div className="preset-specs">
              <span>Original Stream</span>
              <span>•</span>
              <span>No Watermark</span>
              <span>•</span>
              <span>.MP4</span>
            </div>
          </div>
        </div>

        {/* Immediate Download Action Footer */}
        <div className="instant-action-bar">
          <div className="instant-action-left">
            <span className="output-target-label">Saving to:</span>
            <span className="output-target-path" title={defaultOutputDir}>
              {defaultOutputDir || 'Downloads/itzDownloader'}
            </span>
          </div>

          <div className="instant-action-right">
            {currentActiveJob ? (
              <button className="btn-secondary" onClick={onNavigateToQueue}>
                <Layers size={16} />
                <span>View in Queue ({currentActiveJob.progress?.percent || 0}%)</span>
              </button>
            ) : (
              <button
                className="btn-download-primary"
                onClick={() => handleStartDownload(selectedPreset)}
                disabled={isInspecting || !url.trim()}
              >
                <Sparkles size={17} />
                <span>Download Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
