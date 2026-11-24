import React, { useEffect, useState } from 'react';
import {
  Settings,
  Folder,
  FolderOpen,
  Cpu,
  Zap,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Globe,
  Check,
  HardDrive,
  Network,
  Wand2,
  Palette,
  RotateCcw,
  Gauge,
} from 'lucide-react';
import Select from '../components/ui/Select';
import Toggle from '../components/ui/Toggle';
import { CollapsibleCard } from '../components/ui/Collapsible';
import { ACCENT_COLORS } from '../hooks/useSettings';

const PROXY_PATTERN = /^(https?|socks4a?|socks5h?):\/\/[^\s"'`]+$/i;

const CONCURRENCY_OPTIONS = [
  { value: 'auto', label: 'Auto', hint: 'Scaled to your CPU' },
  { value: '1', label: '1 at a time' },
  { value: '2', label: '2 at once' },
  { value: '3', label: '3 at once' },
  { value: '4', label: '4 at once' },
  { value: '5', label: '5 at once' },
];

const RATE_LIMIT_OPTIONS = [
  { value: 'unlimited', label: 'Unlimited' },
  { value: '50M', label: '50 MB/s' },
  { value: '25M', label: '25 MB/s' },
  { value: '10M', label: '10 MB/s' },
  { value: '5M', label: '5 MB/s' },
  { value: '2M', label: '2 MB/s' },
  { value: '1M', label: '1 MB/s' },
];

const COOKIE_OPTIONS = [
  { value: 'auto', label: 'Auto-Detect', hint: 'Used only when a site asks for it' },
  { value: 'brave', label: 'Brave' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'edge', label: 'Edge' },
  { value: 'opera', label: 'Opera' },
  { value: 'vivaldi', label: 'Vivaldi' },
  { value: 'none', label: 'Disabled' },
];

const FILENAME_OPTIONS = [
  { value: 'title_id', label: 'Title [ID]', hint: 'Never collides' },
  { value: 'title', label: 'Title' },
  { value: 'uploader_title', label: 'Channel - Title' },
  { value: 'date_title', label: 'Date - Title' },
];

const FRAGMENT_OPTIONS = [
  { value: '1', label: '1 connection' },
  { value: '2', label: '2 connections' },
  { value: '4', label: '4 connections', hint: 'Default' },
  { value: '8', label: '8 connections' },
  { value: '16', label: '16 connections' },
];

const RETRY_OPTIONS = [
  { value: '3', label: '3 attempts' },
  { value: '10', label: '10 attempts', hint: 'Default' },
  { value: '25', label: '25 attempts' },
  { value: 'infinite', label: 'Unlimited' },
];

/** A labelled row with a control on the right. */
function SettingRow({ title, description, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <div className="setting-row-title">{title}</div>
        {description && <div className="setting-row-desc">{description}</div>}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, action, children }) {
  return (
    <section className="settings-card">
      <div className="card-inner-header">
        <div className="card-title-group">
          {icon}
          <div className="section-titles">
            <span className="card-title">{title}</span>
            {subtitle && <span className="section-subtitle">{subtitle}</span>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function SettingsTab({
  settings,
  onUpdateSetting,
  onResetSettings,
  engineStatus,
  defaultOutputDir,
  isCustomOutputDir,
  onSelectOutputDir,
  onResetOutputDir,
  onRefreshEngines,
  onDownloadYtDlp,
  onUpdateYtDlp,
  onDownloadFfmpeg,
  isDownloadingEngine,
  engineDownloadProgress,
  appVersion,
  updateState,
  onCheckForUpdates,
  onInstallUpdate,
  onShowToast,
}) {
  const [isUpdatingYtDlp, setIsUpdatingYtDlp] = useState(false);
  const [proxyDraft, setProxyDraft] = useState(settings.proxyUrl);
  const [proxySaved, setProxySaved] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(settings.proxyEnabled);
  const [tuningOpen, setTuningOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setProxyDraft(settings.proxyUrl), [settings.proxyUrl]);

  useEffect(() => {
    if (!proxySaved) return undefined;
    const t = setTimeout(() => setProxySaved(false), 2200);
    return () => clearTimeout(t);
  }, [proxySaved]);

  useEffect(() => {
    if (!confirmReset) return undefined;
    const t = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const set = (key) => (value) => onUpdateSetting(key, value);
  const hw = engineStatus?.hardwareAccels || {};

  const proxyDraftTrimmed = proxyDraft.trim();
  const proxyInvalid = proxyDraftTrimmed.length > 0 && !PROXY_PATTERN.test(proxyDraftTrimmed);

  const handleSaveProxy = () => {
    if (proxyInvalid) return;
    onUpdateSetting('proxyUrl', proxyDraftTrimmed);
    if (!proxyDraftTrimmed) onUpdateSetting('proxyEnabled', false);
    setProxySaved(true);
    onShowToast(proxyDraftTrimmed ? 'Proxy server saved.' : 'Proxy cleared.', 'info');
  };

  const handleToggleProxy = (enabled) => {
    if (enabled && !settings.proxyUrl && (!proxyDraftTrimmed || proxyInvalid)) {
      setProxyOpen(true);
      onShowToast('Enter a valid proxy URL first, then enable it.', 'warning');
      return;
    }
    if (enabled && proxyDraftTrimmed && !proxyInvalid) onUpdateSetting('proxyUrl', proxyDraftTrimmed);
    onUpdateSetting('proxyEnabled', enabled);
  };

  const handleResetClick = () => {
    if (confirmReset) {
      onResetSettings();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const handleUpdateYtDlpClick = async () => {
    setIsUpdatingYtDlp(true);
    try {
      await onUpdateYtDlp();
      onShowToast('yt-dlp updated to the latest release!', 'success');
    } catch (e) {
      onShowToast(`yt-dlp update: ${e.message}`, 'info');
    } finally {
      setIsUpdatingYtDlp(false);
    }
  };

  const openExternal = (url) => window.itzDownloaderAPI?.openExternal(url);
  const openOutputFolder = () => defaultOutputDir && window.itzDownloaderAPI?.openFile(defaultOutputDir);

  const encoderOptions = [
    { value: 'auto', label: 'Automatic', hint: 'Best detected' },
    { value: 'nvenc', label: 'NVIDIA NVENC', disabled: !hw.nvenc, hint: hw.nvenc ? undefined : 'Not available' },
    { value: 'qsv', label: 'Intel Quick Sync', disabled: !hw.qsv, hint: hw.qsv ? undefined : 'Not available' },
    { value: 'amf', label: 'AMD AMF', disabled: !hw.amf, hint: hw.amf ? undefined : 'Not available' },
    { value: 'cpu', label: 'CPU', hint: 'libx264' },
  ];

  return (
    <div className="tab-pane-container settings-layout">
      {/* Header */}
      <div className="settings-header-bar">
        <div className="settings-header-left">
          <div className="settings-icon-badge">
            <Settings size={18} className="icon-accent" />
          </div>
          <div>
            <h2 className="settings-title">Settings</h2>
            <p className="settings-subtitle">Engines, storage, network and personalization.</p>
          </div>
        </div>
        <button
          type="button"
          className={`btn-secondary-sm ${confirmReset ? 'btn-danger-soft' : ''}`}
          onClick={handleResetClick}
        >
          <RotateCcw size={12} />
          <span>{confirmReset ? 'Click again to reset' : 'Reset to defaults'}</span>
        </button>
      </div>

      {/* Engines */}
      <SectionCard
        icon={<Zap size={16} className="icon-accent" />}
        title="Media Engines"
        subtitle="yt-dlp and FFmpeg power every download"
        action={(
          <button className="btn-refresh-subtle" onClick={onRefreshEngines} title="Re-probe system for yt-dlp & FFmpeg">
            <RefreshCw size={13} />
            <span>Re-Probe</span>
          </button>
        )}
      >
        {isDownloadingEngine && engineDownloadProgress && (
          <div className="engine-download-alert">
            <div className="engine-download-info">
              <span>{engineDownloadProgress.message || 'Downloading engine binary...'}</span>
              <span>{engineDownloadProgress.percent}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill shimmer" style={{ width: `${engineDownloadProgress.percent}%` }} />
            </div>
          </div>
        )}

        <div className="engine-items-grid">
          <div className="engine-box">
            <div className="engine-box-top">
              <div className="engine-name-group">
                <span className="engine-name">yt-dlp</span>
                <span className="engine-role">Media stream extractor</span>
              </div>
              {engineStatus?.ytDlpAvailable ? (
                <span className="badge-status-online"><CheckCircle2 size={13} /><span>v{engineStatus.ytDlpVersion || 'Ready'}</span></span>
              ) : (
                <span className="badge-status-offline"><AlertCircle size={13} /><span>Missing</span></span>
              )}
            </div>
            <div className="engine-meta-text">
              {engineStatus?.ytDlpAvailable
                ? <span>Source: {engineStatus.ytDlpSource === 'local' ? 'Local app data' : engineStatus.ytDlpSource || 'System PATH'}</span>
                : <span>Required for YouTube, TikTok, Spotify and every other platform.</span>}
            </div>
            <div className="engine-actions-row">
              {engineStatus?.ytDlpAvailable ? (
                <button className="btn-secondary-sm" onClick={handleUpdateYtDlpClick} disabled={isUpdatingYtDlp || isDownloadingEngine}>
                  <RefreshCw size={12} className={isUpdatingYtDlp ? 'spin-animation' : ''} />
                  <span>{isUpdatingYtDlp ? 'Updating...' : 'Check for updates'}</span>
                </button>
              ) : (
                <button className="btn-primary-sm" onClick={onDownloadYtDlp} disabled={isDownloadingEngine}>
                  <Download size={12} />
                  <span>Install yt-dlp</span>
                </button>
              )}
            </div>
          </div>

          <div className="engine-box">
            <div className="engine-box-top">
              <div className="engine-name-group">
                <span className="engine-name">FFmpeg & FFprobe</span>
                <span className="engine-role">Muxer and transcoder</span>
              </div>
              {engineStatus?.ffmpegAvailable ? (
                <span className="badge-status-online"><CheckCircle2 size={13} /><span>v{engineStatus.ffmpegVersion || 'Ready'}</span></span>
              ) : (
                <span className="badge-status-offline"><AlertCircle size={13} /><span>Missing</span></span>
              )}
            </div>
            <div className="engine-meta-text">
              {engineStatus?.ffmpegAvailable ? (
                <div className="accel-pills-row">
                  <span>Hardware encoders:</span>
                  <span className={`pill-accel ${hw.nvenc ? 'active' : ''}`}>NVENC</span>
                  <span className={`pill-accel ${hw.qsv ? 'active' : ''}`}>Quick Sync</span>
                  <span className={`pill-accel ${hw.amf ? 'active' : ''}`}>AMF</span>
                </div>
              ) : (
                <span>Required to merge video + audio and to extract MP3/FLAC.</span>
              )}
            </div>
            {!engineStatus?.ffmpegAvailable && (
              <div className="engine-actions-row">
                <button className="btn-primary-sm" onClick={onDownloadFfmpeg} disabled={isDownloadingEngine}>
                  <Download size={12} />
                  <span>Install FFmpeg</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {engineStatus?.systemInfo?.cpuModel && (
          <div className="system-specs-bar">
            <Cpu size={14} className="icon-accent" />
            <span>
              {engineStatus.systemInfo.cpuModel} · {engineStatus.systemInfo.cpuCores} cores · {engineStatus.systemInfo.ramGb} GB RAM
              {engineStatus.systemInfo.primaryGpu && ` · ${engineStatus.systemInfo.primaryGpu}`}
            </span>
          </div>
        )}
      </SectionCard>

      {/* Storage */}
      <SectionCard
        icon={<HardDrive size={16} className="icon-accent" />}
        title="Storage & Files"
        subtitle="Where and how downloads are saved"
      >
        <div className="dir-picker-row">
          <div className="dir-path-display" title={defaultOutputDir}>
            <Folder size={14} />
            <span className="form-mono">{defaultOutputDir || 'Downloads/itzDownloader'}</span>
          </div>
          <button className="btn-secondary" onClick={onSelectOutputDir}>
            <Folder size={14} />
            <span>Change</span>
          </button>
          <button className="btn-secondary" onClick={openOutputFolder} title="Open folder in Explorer">
            <FolderOpen size={14} />
            <span>Open</span>
          </button>
          {isCustomOutputDir && (
            <button className="btn-icon-subtle" onClick={onResetOutputDir} title="Reset to default folder" aria-label="Reset to default folder">
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <div className="settings-rows">
          <SettingRow title="File naming" description="Template used for new files.">
            <Select value={settings.filenameTemplate} onChange={set('filenameTemplate')} options={FILENAME_OPTIONS} size="sm" ariaLabel="File naming" minMenuWidth={220} />
          </SettingRow>
          <SettingRow title="Sort into platform folders" description="Save into YouTube, TikTok, Spotify … subfolders.">
            <Toggle checked={settings.organizeByPlatform} onChange={set('organizeByPlatform')} ariaLabel="Sort into platform folders" />
          </SettingRow>
          <SettingRow title="Overwrite existing files" description="When off, files that already exist are skipped.">
            <Toggle checked={settings.overwriteFiles} onChange={set('overwriteFiles')} ariaLabel="Overwrite existing files" />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Downloads & Network */}
      <SectionCard
        icon={<Gauge size={16} className="icon-accent" />}
        title="Downloads & Network"
        subtitle="Speed, parallelism and authentication"
      >
        <div className="settings-rows">
          <SettingRow title="Parallel downloads" description="How many playlist items download at the same time.">
            <Select value={settings.concurrency} onChange={set('concurrency')} options={CONCURRENCY_OPTIONS} size="sm" ariaLabel="Parallel downloads" minMenuWidth={200} />
          </SettingRow>
          <SettingRow title="Bandwidth limit" description="Keep the rest of your network responsive.">
            <Select value={settings.rateLimit} onChange={set('rateLimit')} options={RATE_LIMIT_OPTIONS} size="sm" ariaLabel="Bandwidth limit" />
          </SettingRow>
          <SettingRow title="Browser cookies" description="Signs in with your browser session for age-restricted or bot-checked videos.">
            <Select value={settings.cookiesBrowser} onChange={set('cookiesBrowser')} options={COOKIE_OPTIONS} size="sm" ariaLabel="Browser cookies" minMenuWidth={240} />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Engine tuning (collapsible) */}
      <CollapsibleCard
        open={tuningOpen}
        onToggle={setTuningOpen}
        icon={<Wand2 size={16} className="icon-accent" />}
        title="Engine Tuning"
        subtitle="Connections, retries, encoding and post-processing"
      >
        <div className="settings-rows">
          <SettingRow title="Connections per download" description="More connections can speed up fragmented streams.">
            <Select value={settings.concurrentFragments} onChange={set('concurrentFragments')} options={FRAGMENT_OPTIONS} size="sm" ariaLabel="Connections per download" minMenuWidth={200} />
          </SettingRow>
          <SettingRow title="Retry attempts" description="How often a failed request or fragment is retried.">
            <Select value={settings.retries} onChange={set('retries')} options={RETRY_OPTIONS} size="sm" ariaLabel="Retry attempts" minMenuWidth={180} />
          </SettingRow>
          <SettingRow title="Video encoder" description="Used for H.264 re-encoding and editor compatibility fixes.">
            <Select value={settings.preferredEncoder} onChange={set('preferredEncoder')} options={encoderOptions} size="sm" ariaLabel="Video encoder" minMenuWidth={230} />
          </SettingRow>
          <SettingRow title="Embed chapters" description="Keep YouTube chapter markers inside video files.">
            <Toggle checked={settings.embedChapters} onChange={set('embedChapters')} ariaLabel="Embed chapters" />
          </SettingRow>
          <SettingRow title="Skip sponsor segments" description="Cut sponsors, self-promos and reminders from YouTube videos via SponsorBlock.">
            <Toggle checked={settings.sponsorBlock} onChange={set('sponsorBlock')} ariaLabel="Skip sponsor segments" />
          </SettingRow>
        </div>
      </CollapsibleCard>

      {/* Proxy (collapsible) */}
      <CollapsibleCard
        open={proxyOpen}
        onToggle={setProxyOpen}
        icon={<Network size={16} className="icon-accent" />}
        title="Network Proxy"
        subtitle="Route traffic through HTTP or SOCKS"
        badge={(
          <span className={`proxy-status-pill ${settings.proxyEnabled ? 'active' : 'inactive'}`}>
            {settings.proxyEnabled ? 'Active' : 'Off'}
          </span>
        )}
      >
        <div className="settings-rows">
          <SettingRow title="Use proxy" description="Applies to link inspection and downloads.">
            <Toggle checked={settings.proxyEnabled} onChange={handleToggleProxy} ariaLabel="Use proxy" />
          </SettingRow>
        </div>
        <div className="proxy-input-group">
          <label className="proxy-input-label" htmlFor="proxy-url-input">Proxy server URL</label>
          <div className="proxy-input-row">
            <input
              id="proxy-url-input"
              type="text"
              className={`form-input form-mono ${proxyInvalid ? 'is-invalid' : ''}`}
              placeholder="socks5://127.0.0.1:1080"
              value={proxyDraft}
              spellCheck={false}
              onChange={(e) => setProxyDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProxy()}
            />
            <button
              className={`btn-primary ${proxySaved ? 'btn-saved' : ''}`}
              onClick={handleSaveProxy}
              disabled={proxyInvalid || proxyDraftTrimmed === settings.proxyUrl}
            >
              {proxySaved ? <CheckCircle2 size={14} /> : <Check size={14} />}
              <span>{proxySaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
          <div className={`proxy-help-hint ${proxyInvalid ? 'is-error' : ''}`}>
            {proxyInvalid
              ? 'Use a full URL such as http://host:8080 or socks5://user:pass@host:1080.'
              : <>Supports <code>http://</code>, <code>https://</code>, <code>socks4://</code> and <code>socks5://</code>.</>}
          </div>
        </div>
      </CollapsibleCard>

      {/* Appearance & experience */}
      <SectionCard
        icon={<Palette size={16} className="icon-accent" />}
        title="Appearance & Experience"
        subtitle="Make itzDownloader yours"
      >
        <div className="settings-rows">
          <SettingRow title="Accent color" description="Highlights, buttons and progress bars.">
            <div className="accent-swatches" role="radiogroup" aria-label="Accent color">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.accentColor === c.id}
                  aria-label={c.label}
                  title={c.label}
                  className={`accent-swatch ${settings.accentColor === c.id ? 'is-selected' : ''}`}
                  style={{ '--swatch': c.hex }}
                  onClick={() => onUpdateSetting('accentColor', c.id)}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow title="Animations" description="Transitions, shimmer progress bars and micro-interactions.">
            <Toggle checked={settings.animations} onChange={set('animations')} ariaLabel="Animations" />
          </SettingRow>
          <SettingRow title="Compact layout" description="Tighter spacing to fit more on screen.">
            <Toggle checked={settings.compactMode} onChange={set('compactMode')} ariaLabel="Compact layout" />
          </SettingRow>
          <SettingRow title="Completion sound" description="A short chime when a download finishes.">
            <Toggle checked={settings.sound} onChange={set('sound')} ariaLabel="Completion sound" />
          </SettingRow>
          <SettingRow title="Desktop notifications" description="Notify when downloads finish while the app is in the background.">
            <Toggle checked={settings.notifications} onChange={set('notifications')} ariaLabel="Desktop notifications" />
          </SettingRow>
          <SettingRow title="Auto open folder" description="Open the download folder in Explorer when a download finishes.">
            <Toggle checked={settings.autoOpenFolder} onChange={set('autoOpenFolder')} ariaLabel="Auto open folder" />
          </SettingRow>
          <SettingRow title="Auto-clear finished downloads" description="Remove completed items from the queue after a few seconds.">
            <Toggle checked={settings.autoClearCompleted} onChange={set('autoClearCompleted')} ariaLabel="Auto-clear finished downloads" />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Updates & About */}
      <SectionCard
        icon={<ShieldCheck size={16} className="icon-accent" />}
        title="Updates & About"
      >
        <div className="update-status-row">
          <div>
            <div className="update-app-title">itzDownloader Desktop</div>
            <div className="update-app-version">Version {appVersion} · Windows 10 & 11 x64</div>
          </div>

          <div className="update-action-box">
            {updateState.status === 'downloaded' ? (
              <button className="btn-primary-sm" onClick={onInstallUpdate}>
                <span>Install update & restart</span>
              </button>
            ) : (
              <button className="btn-secondary-sm" onClick={onCheckForUpdates} disabled={updateState.status === 'checking'}>
                <RefreshCw size={12} className={updateState.status === 'checking' ? 'spin-animation' : ''} />
                <span>{updateState.status === 'checking' ? 'Checking...' : 'Check for updates'}</span>
              </button>
            )}
          </div>
        </div>

        {updateState.status === 'available' && (
          <div className="update-available-banner">
            <span>Version {updateState.latestVersion} is available and downloading in the background…</span>
          </div>
        )}

        <div className="about-footer-links">
          <span>Developed by itzcrih</span>
          <span>·</span>
          <button type="button" className="link-button" onClick={() => openExternal('https://itzcrih.it')}>
            itzcrih.it <ExternalLink size={11} />
          </button>
          <span>·</span>
          <button type="button" className="link-button" onClick={() => openExternal('https://community.itzcrih.it')}>
            community.itzcrih.it <Globe size={11} />
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
