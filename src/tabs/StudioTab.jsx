import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Film,
  Music,
  Settings2,
  Sparkles,
  Link2,
  Zap,
  AlertTriangle,
  VolumeX
} from 'lucide-react';
import { detectPlatform, validateMediaUrl } from '../utils/platformDetect';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Toggle from '../components/ui/Toggle';
import { Collapsible, CollapsibleCard } from '../components/ui/Collapsible';

const CONTAINER_OPTIONS = [
  { value: 'mp4', label: 'MP4', hint: 'Plays everywhere' },
  { value: 'mkv', label: 'MKV', hint: 'Multi-track & subtitles' },
  { value: 'webm', label: 'WebM', hint: 'VP9 / AV1' },
];

const RESOLUTION_OPTIONS = [
  { value: 'best', label: 'Best available' },
  { value: '2160', label: '4K · 2160p' },
  { value: '1440', label: '2K · 1440p' },
  { value: '1080', label: 'Full HD · 1080p' },
  { value: '720', label: 'HD · 720p' },
  { value: '480', label: 'SD · 480p' },
  { value: 'custom', label: 'Custom…' },
];

const SUB_LANG_OPTIONS = [
  { value: 'all', label: 'All available' },
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italian' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
];

const SUB_MODE_OPTIONS = [
  { value: 'embed', label: 'Embed in video' },
  { value: 'external', label: 'Separate .srt files' },
];

const AUDIO_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'flac', label: 'FLAC', hint: 'Lossless' },
  { value: 'wav', label: 'WAV', hint: 'Uncompressed' },
  { value: 'm4a', label: 'AAC / M4A' },
  { value: 'opus', label: 'Opus' },
  { value: 'vorbis', label: 'OGG Vorbis' },
];

const BITRATE_OPTIONS = [
  { value: '320k', label: '320 kbps', hint: 'Maximum' },
  { value: '256k', label: '256 kbps' },
  { value: '192k', label: '192 kbps' },
  { value: '128k', label: '128 kbps', hint: 'Smallest' },
];

const RATE_OPTIONS = [
  { value: 'default', label: 'Use global setting' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: '25M', label: '25 MB/s' },
  { value: '10M', label: '10 MB/s' },
  { value: '5M', label: '5 MB/s' },
  { value: '2M', label: '2 MB/s' },
];

const COOKIE_OPTIONS = [
  { value: 'default', label: 'Use global setting' },
  { value: 'none', label: 'None' },
  { value: 'brave', label: 'Brave' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'edge', label: 'Edge' },
];

const RESOLUTION_PRESETS = [
  { value: '1920x1080', label: '1920×1080', hint: '16:9' },
  { value: '1080x1920', label: '1080×1920', hint: '9:16' },
  { value: '2560x1440', label: '2560×1440', hint: '2K' },
  { value: '3840x2160', label: '3840×2160', hint: '4K' },
  { value: '1280x720', label: '1280×720', hint: '720p' },
  { value: '1080x1080', label: '1080×1080', hint: '1:1' },
];
import { formatDuration, getItemUnit } from '../utils/formatters';

export default function StudioTab({
  initialUrl = '',
  initialMediaInfo = null,
  onAddJob,
  onShowToast,
  defaultOutputDir,
  engineStatus,
  proxySettings,
}) {
  const [url, setUrl] = useState(initialUrl || '');
  const [isInspecting, setIsInspecting] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(initialMediaInfo);
  const [inspectError, setInspectError] = useState(null);

  // Advanced Configurations
  const [mediaType, setMediaType] = useState('video'); // 'video' | 'audio'
  const [videoContainer, setVideoContainer] = useState('mp4'); // 'mp4' | 'mkv' | 'webm'
  const [resolution, setResolution] = useState('best'); // 'best' | '2160' | '1440' | '1080' | '720' | '480' | 'custom'
  const [customResolution, setCustomResolution] = useState('1920x1080'); // User requested: Custom resolution text input
  const [fastReencode, setFastReencode] = useState(false); // User requested: Fast Re-encoding in MP4
  const [noAudio, setNoAudio] = useState(false); // User requested: No Audio (Mute Video Stream)
  const [audioFormat, setAudioFormat] = useState('mp3'); // 'mp3' | 'flac' | 'wav' | 'aac' | 'opus' | 'ogg'
  const [audioBitrate, setAudioBitrate] = useState('320k'); // '320k' | '256k' | '192k' | '128k'
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [downloadSubtitles, setDownloadSubtitles] = useState(false);
  const [subLangs, setSubLangs] = useState('all');
  const [embedSubtitles, setEmbedSubtitles] = useState(true);
  const [rateLimit, setRateLimit] = useState('default');
  const [cookiesBrowser, setCookiesBrowser] = useState('default');
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

  const handleUrlChange = (newVal) => {
    setUrl(newVal);
    if (inspectError) setInspectError(null);
    if (mediaInfo) setMediaInfo(null);
  };

  const handleInspect = async () => {
    const clean = url.trim();
    setInspectError(null);
    setMediaInfo(null);

    const validation = validateMediaUrl(clean);
    if (!validation.isValid) {
      setInspectError(validation.error);
      onShowToast(validation.error, 'error');
      return;
    }

    if (!platform.isAllowed) {
      setInspectError('This domain is not in the verified whitelist.');
      onShowToast('This domain is not in the verified whitelist.', 'error');
      return;
    }

    setIsInspecting(true);
    try {
      const info = await window.itzDownloaderAPI.inspectUrl(clean, {
        cookiesBrowser: cookiesBrowser === 'default' ? undefined : cookiesBrowser,
        proxy: proxySettings?.enabled && proxySettings?.url ? proxySettings.url.trim() : null,
      });
      setMediaInfo(info);
      setInspectError(null);
      if (info.isAudioOnly) {
        setMediaType('audio');
      }
      onShowToast(`Loaded metadata for "${info.title}"`, 'info');
    } catch (err) {
      setMediaInfo(null);
      const msg = err.message || 'Inspection failed.';
      setInspectError(msg);
      onShowToast(`Inspection failed: ${msg}`, 'error');
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

    const isPlaylist = !!mediaInfo?.isPlaylist;
    const jobId = isPlaylist
      ? `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      : `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const jobConfig = {
      jobId,
      isPlaylist,
      url: clean,
      outputDir: defaultOutputDir,
      preset: 'custom',
      title: mediaInfo?.title || clean,
      author: mediaInfo?.author || platform.name,
      thumbnail: mediaInfo?.thumbnail || null,
      platform: platform.id,
      duration: mediaInfo?.duration || 0,
      totalItems: mediaInfo?.entries ? mediaInfo.entries.length : 0,
      entries: mediaInfo?.entries || [],
      customOptions: {
        mediaType,
        format: videoContainer,
        resolution,
        customResolution: resolution === 'custom' ? (customResolution.trim() || '1920x1080') : null,
        fastReencode: mediaType === 'video' ? fastReencode : false,
        noAudio: mediaType === 'video' ? noAudio : false,
        audioFormat,
        audioBitrate,
        embedThumbnail,
        downloadSubtitles,
        subLangs,
        embedSubtitles,
        rateLimit: rateLimit === 'default' || rateLimit === 'unlimited' ? null : rateLimit,
        cookiesBrowser: cookiesBrowser === 'default' ? null : cookiesBrowser,
        extraArgs,
      },
      createdAt: Date.now(),
    };

    const unit = getItemUnit(null, { mediaType }, { platform, mediaInfo });
    onAddJob(jobConfig);
    onShowToast(`Custom job queued: ${mediaInfo?.title || 'Media'}${isPlaylist ? ` (${mediaInfo.itemCount} ${unit})` : ''}`, 'success');
  };

  return (
    <div className="tab-pane-container">
      {/* Advanced Header */}
      <div className="studio-header-bar">
        <div className="studio-header-left">
          <div className="studio-icon-badge">
            <Sliders size={18} className="icon-accent" />
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
            <Link2 size={16} className="icon-accent" />
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
            placeholder="Paste a YouTube, TikTok, Instagram, Spotify or Vimeo link…"
            value={url}
            spellCheck={false}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && url.trim() && !isInspecting && handleInspect()}
          />
          <button
            className="btn-secondary"
            onClick={handleInspect}
            disabled={isInspecting || !url.trim() || !platform.isAllowed}
          >
            <span>{isInspecting ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>

        {inspectError && (
          <div className="whitelist-blocked-banner warning">
            <AlertTriangle size={15} color="#d29922" />
            <div className="blocked-text-col">
              <strong>Could not inspect link:</strong> {inspectError}
            </div>
          </div>
        )}

        {url.trim() && !platform.isAllowed && !inspectError && (
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
                {mediaInfo.author} • {mediaInfo.isPlaylist ? `${mediaInfo.itemCount || 0} ${mediaType === 'video' ? 'Videos' : 'Tracks'} • ` : ''}{formatDuration(mediaInfo.duration)}
                {mediaInfo.resolutions?.length > 0 && ` • Up to ${mediaInfo.resolutions[0].label}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Category Switcher */}
      <div className="studio-type-switcher-bar">
        <button
          type="button"
          aria-pressed={mediaType === 'video'}
          className={`type-switch-btn ${mediaType === 'video' ? 'active' : ''}`}
          onClick={() => setMediaType('video')}
        >
          <Film size={18} />
          <div>
            <div className="type-switch-name">Video</div>
            <div className="type-switch-desc">MP4, MKV or WebM up to 4K</div>
          </div>
        </button>

        <button
          type="button"
          aria-pressed={mediaType === 'audio'}
          className={`type-switch-btn ${mediaType === 'audio' ? 'active' : ''}`}
          onClick={() => setMediaType('audio')}
        >
          <Music size={18} />
          <div>
            <div className="type-switch-name">Audio only</div>
            <div className="type-switch-desc">MP3, FLAC, WAV, AAC or Opus</div>
          </div>
        </button>
      </div>

      {/* Video Options Panel */}
      {mediaType === 'video' && (
        <div className="studio-card panel-swap" key="video-panel">
          <div className="card-inner-header">
            <div className="card-title-group">
              <Film size={16} className="icon-accent" />
              <span className="card-title">Video Stream</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <span className="form-label">Container format</span>
              <Select value={videoContainer} onChange={setVideoContainer} options={CONTAINER_OPTIONS} ariaLabel="Container format" />
              <span className="form-hint">MP4 opens on Windows, Apple and Android devices alike.</span>
            </div>

            <div className="form-group">
              <span className="form-label">Maximum resolution</span>
              <Select value={resolution} onChange={setResolution} options={RESOLUTION_OPTIONS} ariaLabel="Maximum resolution" />
              <span className="form-hint">Cap the resolution to save space, or set exact dimensions.</span>
            </div>
          </div>

          <Collapsible open={resolution === 'custom'}>
            <div className="custom-resolution-card">
              <div className="custom-res-header">
                <div className="custom-res-title-group">
                  <Sliders size={14} className="icon-accent" />
                  <span className="custom-res-label">Custom resolution</span>
                </div>
              </div>

              <input
                type="text"
                className="form-input custom-res-input"
                placeholder="1920x1080, 1080x1920, 1080p, 720"
                value={customResolution}
                spellCheck={false}
                onChange={(e) => setCustomResolution(e.target.value)}
              />

              <div className="custom-res-chips-row">
                {RESOLUTION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`custom-chip-btn ${customResolution === p.value ? 'active' : ''}`}
                    onClick={() => setCustomResolution(p.value)}
                  >
                    <span>{p.label}</span>
                    <span className="chip-hint">{p.hint}</span>
                  </button>
                ))}
              </div>

              <span className="form-hint">
                Use width×height like <code>1920x1080</code>, or just a height like <code>1080p</code>.
              </span>
            </div>
          </Collapsible>

          <div className="option-tiles">
            <div className={`option-tile ${fastReencode ? 'is-on' : ''}`}>
              <div className="option-tile-icon">
                <Zap size={17} />
              </div>
              <div className="option-tile-text">
                <div className="option-tile-title">Fast re-encode to H.264</div>
                <div className="option-tile-desc">
                  Guaranteed playback in Premiere, DaVinci, Vegas and Discord
                  {engineStatus?.hardwareAccels?.nvenc ? ' · NVENC' : engineStatus?.hardwareAccels?.qsv ? ' · Quick Sync' : engineStatus?.hardwareAccels?.amf ? ' · AMF' : ''}.
                </div>
              </div>
              <Toggle checked={fastReencode} onChange={setFastReencode} ariaLabel="Fast re-encode to H.264" />
            </div>

            <div className={`option-tile is-danger ${noAudio ? 'is-on' : ''}`}>
              <div className="option-tile-icon">
                <VolumeX size={17} />
              </div>
              <div className="option-tile-text">
                <div className="option-tile-title">No audio</div>
                <div className="option-tile-desc">Video stream only. Ideal for B-roll and background loops.</div>
              </div>
              <Toggle checked={noAudio} onChange={setNoAudio} ariaLabel="No audio" />
            </div>
          </div>

          <div className="form-toggles-row">
            <Checkbox checked={embedThumbnail} onChange={setEmbedThumbnail} label="Embed thumbnail as cover art" />
            <Checkbox checked={downloadSubtitles} onChange={setDownloadSubtitles} label="Download subtitles" />
          </div>

          <Collapsible open={downloadSubtitles}>
            <div className="form-grid-2 nested-sub-box">
              <div className="form-group">
                <span className="form-label">Subtitle language</span>
                <Select value={subLangs} onChange={setSubLangs} options={SUB_LANG_OPTIONS} ariaLabel="Subtitle language" />
              </div>
              <div className="form-group">
                <span className="form-label">Subtitle output</span>
                <Select
                  value={embedSubtitles ? 'embed' : 'external'}
                  onChange={(v) => setEmbedSubtitles(v === 'embed')}
                  options={SUB_MODE_OPTIONS}
                  ariaLabel="Subtitle output"
                />
              </div>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Audio Options Panel */}
      {mediaType === 'audio' && (
        <div className="studio-card panel-swap" key="audio-panel">
          <div className="card-inner-header">
            <div className="card-title-group">
              <Music size={16} className="icon-accent" />
              <span className="card-title">Audio Track</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <span className="form-label">Format</span>
              <Select value={audioFormat} onChange={setAudioFormat} options={AUDIO_FORMAT_OPTIONS} ariaLabel="Audio format" />
              <span className="form-hint">FLAC and WAV keep every bit of the original audio.</span>
            </div>

            <div className={`form-group ${audioFormat === 'mp3' ? '' : 'is-disabled'}`}>
              <span className="form-label">MP3 bitrate</span>
              <Select
                value={audioBitrate}
                onChange={setAudioBitrate}
                options={BITRATE_OPTIONS}
                ariaLabel="MP3 bitrate"
                disabled={audioFormat !== 'mp3'}
              />
              <span className="form-hint">{audioFormat === 'mp3' ? '320 kbps is the highest MP3 quality.' : 'Only applies to MP3.'}</span>
            </div>
          </div>

          <div className="form-toggles-row">
            <Checkbox
              checked={embedThumbnail}
              onChange={setEmbedThumbnail}
              label="Embed cover art and tags"
              hint="Artist, title and year"
            />
          </div>
        </div>
      )}

      {/* Network & Engine Customization (animated accordion) */}
      <CollapsibleCard
        open={showAdvanced}
        onToggle={setShowAdvanced}
        icon={<Settings2 size={16} className="icon-accent" />}
        title="Network & Engine Customization"
        subtitle="Per-download speed limit, cookies and custom yt-dlp flags"
        badge={(rateLimit !== 'default' || cookiesBrowser !== 'default' || extraArgs.trim())
          ? <span className="proxy-status-pill active">Custom</span>
          : null}
      >
        <div className="form-grid-2">
          <div className="form-group">
            <span className="form-label">Speed limit</span>
            <Select value={rateLimit} onChange={setRateLimit} options={RATE_OPTIONS} ariaLabel="Speed limit" />
            <span className="form-hint">Overrides the global bandwidth limit for this download.</span>
          </div>

          <div className="form-group">
            <span className="form-label">Browser cookies</span>
            <Select value={cookiesBrowser} onChange={setCookiesBrowser} options={COOKIE_OPTIONS} ariaLabel="Browser cookies" />
            <span className="form-hint">Unlocks age-restricted or members-only videos with your browser session.</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label" htmlFor="studio-extra-args">Custom yt-dlp flags</label>
          <input
            id="studio-extra-args"
            type="text"
            className="form-input form-mono"
            placeholder="--geo-bypass --concurrent-fragments 8"
            value={extraArgs}
            spellCheck={false}
            onChange={(e) => setExtraArgs(e.target.value)}
          />
          <span className="form-hint">Passed directly to yt-dlp. Flags that run programs, read files or change the output path are blocked.</span>
        </div>
      </CollapsibleCard>

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
            <span>
              {mediaInfo?.isPlaylist
                ? `Download ${mediaInfo.itemCount || 0} ${mediaType === 'video' ? 'videos' : 'tracks'}`
                : 'Start download'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
