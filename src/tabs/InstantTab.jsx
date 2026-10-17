import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Radio,
  FileAudio
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
  const [inspectError, setInspectError] = useState(null);

  const resultsRef = useRef(null);

  const platform = detectPlatform(url);

  const handlePasteFromClipboard = () => {
    if (window.itzDownloaderAPI?.readClipboard) {
      const text = window.itzDownloaderAPI.readClipboard().trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text);
        inspectTargetUrl(text);
      } else {
        onShowToast('No valid link found in clipboard.', 'warning');
      }
    }
  };

  const handleClear = () => {
    setUrl('');
    setMediaInfo(null);
    setInspectError(null);
    setIsDownloading(false);
  };

  const inspectTargetUrl = async (targetUrl = url) => {
    const clean = (targetUrl || '').trim();
    setInspectError(null);

    if (!clean || (!clean.startsWith('http://') && !clean.startsWith('https://'))) {
      onShowToast('Please enter a valid HTTP or HTTPS link.', 'warning');
      return;
    }

    const detected = detectPlatform(clean);
    if (!detected.isAllowed) {
      setInspectError(detected.reason || 'This domain is not in the verified whitelist.');
      onShowToast('Domain blocked by security whitelist.', 'error');
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

      // Auto-select smart preset based on platform & content
      if (info.isAudioOnly || detected.isAudioOnly) {
        setSelectedPreset('mp3_320');
      } else if (detected.id === 'tiktok' || detected.isShorts) {
        setSelectedPreset('tiktok_clean');
      } else {
        setSelectedPreset('best_video');
      }

      // Smooth scroll down slightly so user immediately sees options (requested)
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    } catch (err) {
      const msg = err.message || 'Inspection failed.';
      setInspectError(msg);
      onShowToast(msg, 'error');
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

    if (!platform.isAllowed) {
      onShowToast('This domain is blocked by security policy.', 'error');
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

  // Quick preset definitions based on media characteristics
  const isAudioOnlyMedia = mediaInfo && (mediaInfo.isAudioOnly || platform.isAudioOnly);
  const isShortsMedia = mediaInfo && (platform.id === 'tiktok' || platform.isShorts);

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
          <span>Instant Media Engine</span>
        </div>
        <h1 className="instant-hero-title">
          Paste Link. Get <span className="text-gold-gradient">Instant Media</span>.
        </h1>
        <p className="instant-hero-subtitle">
          Lightning-fast downloads from YouTube, TikTok, Spotify, Instagram, SoundCloud, and verified platforms.
        </p>
      </div>

      {/* Main Paste Bar */}
      <div className={`paste-hero-card ${url && !platform.isAllowed ? 'border-blocked' : ''}`}>
        <div className="paste-input-wrapper">
          <div className="paste-icon-badge" style={{ color: platform.color }}>
            <Link2 size={19} />
          </div>

          <input
            type="text"
            className="paste-input"
            placeholder="Paste video or audio link (YouTube, TikTok, Spotify, Instagram, Twitter)..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setInspectError(null);
            }}
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
            disabled={isInspecting || !url.trim() || !platform.isAllowed}
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

        {/* Dynamic Platform Pills (Clean names, without extra suffixes) */}
        <div className="platform-pills-bar">
          <div
            className="platform-detected-pill"
            style={{
              background: platform.badgeBg,
              borderColor: platform.badgeBorder,
              color: platform.color,
            }}
          >
            <span className="platform-dot" style={{ background: platform.color }} />
            <span>{platform.name}</span>
          </div>

          {/* Clean platform tags (as requested by user) */}
          <div className="platforms-supported-tags">
            <span className="supported-tag">YouTube</span>
            <span className="supported-tag">TikTok</span>
            <span className="supported-tag">Spotify</span>
            <span className="supported-tag">Instagram</span>
            <span className="supported-tag">SoundCloud</span>
            <span className="supported-tag">Twitter</span>
            <span className="supported-tag">Twitch</span>
          </div>
        </div>

        {/* Whitelist Blocked Alert Banner */}
        {url.trim() && !platform.isAllowed && (
          <div className="whitelist-blocked-banner">
            <AlertTriangle size={16} color="#f85149" />
            <div className="blocked-text-col">
              <strong>Domain Blocked:</strong> Only verified platforms (YouTube, TikTok, Spotify, Instagram, Twitter, SoundCloud, Twitch, Reddit, Vimeo, Facebook) are allowed.
            </div>
          </div>
        )}

        {/* Inspection Error Banner with Friendly Guidance */}
        {inspectError && platform.isAllowed && (
          <div className="whitelist-blocked-banner warning">
            <AlertTriangle size={16} color="#d29922" />
            <div className="blocked-text-col">
              <strong>Could not inspect link:</strong> {inspectError}
              {inspectError.toLowerCase().includes('age') && (
                <div style={{ marginTop: 4, fontSize: '11.5px' }}>
                  Tip: Go to <strong>Advanced</strong> or <strong>Settings</strong> and select your browser under <em>Cookies</em>.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target anchor for smooth scrolling */}
      <div ref={resultsRef} />

      {/* Media Inspection Result Card (Displayed only after successful inspect) */}
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
                {isAudioOnlyMedia && <span className="media-type-badge audio">AUDIO TRACK</span>}
                {!isAudioOnlyMedia && <span className="media-type-badge video">VIDEO STREAM</span>}
              </div>
            </div>
          </div>

          <div className="media-preview-right">
            <button
              className="btn-studio-shortcut"
              onClick={() => onNavigateToStudio(url, mediaInfo)}
              title="Open in Advanced for custom codecs, bitrates, subtitles, or fast re-encoding"
            >
              <span>Custom in Advanced</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Quick Download Presets (Displayed ONLY AFTER INSPECTING THE MEDIA as requested!) */}
      {mediaInfo && (
        <div className="preset-grid-section page-view-animated">
          <div className="section-header-bar">
            <span className="section-label">
              {isAudioOnlyMedia ? 'Audio Download Presets' : 'Quick Download Presets'}
            </span>
            <span className="section-hint">Optimized 1-click presets for {platform.name}</span>
          </div>

          <div className="preset-cards-grid">
            {/* Context-aware presets: AUDIO ONLY (Spotify, SoundCloud, etc.) */}
            {isAudioOnlyMedia ? (
              <>
                {/* Audio 1: MP3 320k */}
                <div
                  className={`preset-card ${selectedPreset === 'mp3_320' ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset('mp3_320')}
                >
                  <div className="preset-card-top">
                    <div className="preset-icon-box gold">
                      <Headphones size={20} />
                    </div>
                    <span className="preset-badge gold">Recommended</span>
                  </div>
                  <div className="preset-title">MP3 Audio (320 kbps)</div>
                  <div className="preset-desc">Highest MP3 quality with embedded artist, track metadata and HD cover art.</div>
                  <div className="preset-specs">
                    <span>320 kbps</span>
                    <span>•</span>
                    <span>ID3 Metadata</span>
                    <span>•</span>
                    <span>.MP3</span>
                  </div>
                </div>

                {/* Audio 2: Studio FLAC */}
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
                  <div className="preset-desc">Bit-perfect audio reproduction without loss or compression artifacts.</div>
                  <div className="preset-specs">
                    <span>Lossless</span>
                    <span>•</span>
                    <span>Bit-Perfect</span>
                    <span>•</span>
                    <span>.FLAC</span>
                  </div>
                </div>

                {/* Audio 3: WAV Master */}
                <div
                  className={`preset-card ${selectedPreset === 'wav' ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset('wav')}
                >
                  <div className="preset-card-top">
                    <div className="preset-icon-box blue">
                      <FileAudio size={20} />
                    </div>
                    <span className="preset-badge">Uncompressed</span>
                  </div>
                  <div className="preset-title">WAV Audio (PCM)</div>
                  <div className="preset-desc">Uncompressed raw PCM waveform ready for DAW studio editing.</div>
                  <div className="preset-specs">
                    <span>Raw PCM</span>
                    <span>•</span>
                    <span>Studio DAW</span>
                    <span>•</span>
                    <span>.WAV</span>
                  </div>
                </div>

                {/* Audio 4: AAC M4A */}
                <div
                  className={`preset-card ${selectedPreset === 'aac' ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset('aac')}
                >
                  <div className="preset-card-top">
                    <div className="preset-icon-box purple">
                      <Radio size={20} />
                    </div>
                    <span className="preset-badge purple">Apple</span>
                  </div>
                  <div className="preset-title">AAC / M4A Audio</div>
                  <div className="preset-desc">Native format for iPhone, iPad, Apple Music, and modern devices.</div>
                  <div className="preset-specs">
                    <span>Advanced AAC</span>
                    <span>•</span>
                    <span>Apple Music</span>
                    <span>•</span>
                    <span>.M4A</span>
                  </div>
                </div>
              </>
            ) : isShortsMedia ? (
              /* Context-aware presets: TIKTOK / REELS */
              <>
                {/* TikTok Clean */}
                <div
                  className={`preset-card ${selectedPreset === 'tiktok_clean' ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset('tiktok_clean')}
                >
                  <div className="preset-card-top">
                    <div className="preset-icon-box cyan">
                      <Film size={20} />
                    </div>
                    <span className="preset-badge cyan">Recommended</span>
                  </div>
                  <div className="preset-title">Clean Stream (No Watermark)</div>
                  <div className="preset-desc">Original high-bitrate vertical video stream without platform logos.</div>
                  <div className="preset-specs">
                    <span>Original Stream</span>
                    <span>•</span>
                    <span>No Watermark</span>
                    <span>•</span>
                    <span>.MP4</span>
                  </div>
                </div>

                {/* Full HD 1080p */}
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
                  <div className="preset-desc">Crisp 1080p resolution optimized for instant playback.</div>
                  <div className="preset-specs">
                    <span>1080p Max</span>
                    <span>•</span>
                    <span>Fast Download</span>
                    <span>•</span>
                    <span>.MP4</span>
                  </div>
                </div>

                {/* Audio Extract */}
                <div
                  className={`preset-card ${selectedPreset === 'mp3_320' ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset('mp3_320')}
                >
                  <div className="preset-card-top">
                    <div className="preset-icon-box purple">
                      <Headphones size={20} />
                    </div>
                    <span className="preset-badge purple">Soundtrack</span>
                  </div>
                  <div className="preset-title">Audio Only (MP3 320k)</div>
                  <div className="preset-desc">Extract the background sound/music as a standalone MP3 file.</div>
                  <div className="preset-specs">
                    <span>320 kbps</span>
                    <span>•</span>
                    <span>Audio Track</span>
                    <span>•</span>
                    <span>.MP3</span>
                  </div>
                </div>
              </>
            ) : (
              /* Context-aware presets: GENERAL VIDEO (YouTube, Twitch, Vimeo, Twitter, etc.) */
              <>
                {/* Best Video MP4 */}
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

                {/* 1080p MP4 */}
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
                  <div className="preset-desc">Balanced file size and crystal-clear 1080p quality. Fast download speed.</div>
                  <div className="preset-specs">
                    <span>1080p Max</span>
                    <span>•</span>
                    <span>Fastest</span>
                    <span>•</span>
                    <span>.MP4</span>
                  </div>
                </div>

                {/* MP3 Audio */}
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
                  <div className="preset-desc">Extract audio track with embedded artist, title tags and HD album artwork.</div>
                  <div className="preset-specs">
                    <span>320 kbps</span>
                    <span>•</span>
                    <span>ID3 Metadata</span>
                    <span>•</span>
                    <span>.MP3</span>
                  </div>
                </div>

                {/* Lossless FLAC */}
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
              </>
            )}
          </div>

          {/* Action Bar */}
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
      )}
    </div>
  );
}
