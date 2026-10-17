import React, { useState } from 'react';
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
  Volume2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Cookie,
  Gauge
} from 'lucide-react';

export default function SettingsTab({
  engineStatus,
  defaultOutputDir,
  onSelectOutputDir,
  onRefreshEngines,
  onDownloadYtDlp,
  onUpdateYtDlp,
  onDownloadFfmpeg,
  isDownloadingEngine,
  engineDownloadProgress,
  animationsEnabled,
  onToggleAnimations,
  soundEnabled,
  onToggleSound,
  updateState,
  onCheckForUpdates,
  onInstallUpdate,
  onShowToast,
  globalRateLimit,
  onChangeRateLimit,
  defaultCookiesBrowser,
  onChangeCookiesBrowser,
}) {
  const [isUpdatingYtDlp, setIsUpdatingYtDlp] = useState(false);

  const handleUpdateYtDlpClick = async () => {
    setIsUpdatingYtDlp(true);
    try {
      await onUpdateYtDlp();
      onShowToast('yt-dlp updated to latest release!', 'success');
    } catch (e) {
      onShowToast(`yt-dlp update note: ${e.message}`, 'info');
    } finally {
      setIsUpdatingYtDlp(false);
    }
  };

  const handleOpenFolder = () => {
    if (defaultOutputDir && window.itzDownloaderAPI?.openFile) {
      window.itzDownloaderAPI.openFile(defaultOutputDir);
    }
  };

  const handleOpenDiscord = () => {
    if (window.itzDownloaderAPI?.openExternal) {
      window.itzDownloaderAPI.openExternal('https://community.itzcrih.it');
    }
  };

  const handleOpenWebsite = () => {
    if (window.itzDownloaderAPI?.openExternal) {
      window.itzDownloaderAPI.openExternal('https://itzcrih.it');
    }
  };

  return (
    <div className="tab-pane-container">
      {/* Settings Header */}
      <div className="settings-header-bar">
        <div className="settings-header-left">
          <div className="settings-icon-badge">
            <Settings size={18} color="#e6b422" />
          </div>
          <div>
            <h2 className="settings-title">Application Settings & Engines</h2>
            <p className="settings-subtitle">Manage binary backends, default directories, and hardware engines.</p>
          </div>
        </div>
      </div>

      {/* Engine Status Card */}
      <div className="settings-card">
        <div className="card-inner-header">
          <div className="card-title-group">
            <Zap size={16} color="#e6b422" />
            <span className="card-title">Multimedia Engine Backends</span>
          </div>
          <button
            className="btn-refresh-subtle"
            onClick={onRefreshEngines}
            title="Re-probe system for yt-dlp & FFmpeg"
          >
            <RefreshCw size={13} />
            <span>Re-Probe</span>
          </button>
        </div>

        {/* Binary Download Progress Alert */}
        {isDownloadingEngine && engineDownloadProgress && (
          <div className="engine-download-alert">
            <div className="engine-download-info">
              <span>{engineDownloadProgress.message || 'Downloading engine binary...'}</span>
              <span>{engineDownloadProgress.percent}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill shimmer"
                style={{ width: `${engineDownloadProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="engine-items-grid">
          {/* yt-dlp Box */}
          <div className="engine-box">
            <div className="engine-box-top">
              <div className="engine-name-group">
                <span className="engine-name">yt-dlp Engine</span>
                <span className="engine-role">Media Stream Extractor</span>
              </div>
              {engineStatus?.ytDlpAvailable ? (
                <span className="badge-status-online">
                  <CheckCircle2 size={13} />
                  <span>v{engineStatus.ytDlpVersion || 'Ready'}</span>
                </span>
              ) : (
                <span className="badge-status-offline">
                  <AlertCircle size={13} />
                  <span>Missing</span>
                </span>
              )}
            </div>

            <div className="engine-meta-text">
              {engineStatus?.ytDlpAvailable ? (
                <span>Source: {engineStatus.ytDlpSource === 'local' ? 'Local AppData Bin' : 'System PATH'}</span>
              ) : (
                <span>Required for YouTube, TikTok, Spotify & all platforms.</span>
              )}
            </div>

            <div className="engine-actions-row">
              {engineStatus?.ytDlpAvailable ? (
                <button
                  className="btn-secondary-sm"
                  onClick={handleUpdateYtDlpClick}
                  disabled={isUpdatingYtDlp || isDownloadingEngine}
                >
                  <RefreshCw size={12} className={isUpdatingYtDlp ? 'spin-animation' : ''} />
                  <span>{isUpdatingYtDlp ? 'Updating...' : 'Check for yt-dlp Updates'}</span>
                </button>
              ) : (
                <button
                  className="btn-primary-sm"
                  onClick={onDownloadYtDlp}
                  disabled={isDownloadingEngine}
                >
                  <Download size={12} />
                  <span>Download yt-dlp Automatically</span>
                </button>
              )}
            </div>
          </div>

          {/* FFmpeg Box */}
          <div className="engine-box">
            <div className="engine-box-top">
              <div className="engine-name-group">
                <span className="engine-name">FFmpeg & FFprobe</span>
                <span className="engine-role">Audio/Video Demuxer & Transcoder</span>
              </div>
              {engineStatus?.ffmpegAvailable ? (
                <span className="badge-status-online">
                  <CheckCircle2 size={13} />
                  <span>v{engineStatus.ffmpegVersion || 'Ready'}</span>
                </span>
              ) : (
                <span className="badge-status-offline">
                  <AlertCircle size={13} />
                  <span>Missing</span>
                </span>
              )}
            </div>

            <div className="engine-meta-text">
              {engineStatus?.ffmpegAvailable ? (
                <div className="accel-pills-row">
                  <span>Hardware Encoders:</span>
                  <span className={`pill-accel ${engineStatus.hardwareAccels?.nvenc ? 'active' : ''}`}>
                    NVENC {engineStatus.hardwareAccels?.nvenc ? '✓' : '✗'}
                  </span>
                  <span className={`pill-accel ${engineStatus.hardwareAccels?.qsv ? 'active' : ''}`}>
                    Intel QSV {engineStatus.hardwareAccels?.qsv ? '✓' : '✗'}
                  </span>
                  <span className={`pill-accel ${engineStatus.hardwareAccels?.amf ? 'active' : ''}`}>
                    AMD AMF {engineStatus.hardwareAccels?.amf ? '✓' : '✗'}
                  </span>
                </div>
              ) : (
                <span>Required to merge video + audio and extract MP3/FLAC.</span>
              )}
            </div>

            <div className="engine-actions-row">
              {!engineStatus?.ffmpegAvailable && (
                <button
                  className="btn-primary-sm"
                  onClick={onDownloadFfmpeg}
                  disabled={isDownloadingEngine}
                >
                  <Download size={12} />
                  <span>Download FFmpeg Automatically</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hardware Specs Banner */}
        {engineStatus?.systemInfo?.cpuModel && (
          <div className="system-specs-bar">
            <Cpu size={14} color="#e6b422" />
            <span>
              {engineStatus.systemInfo.cpuModel} ({engineStatus.systemInfo.cpuCores} Cores) •{' '}
              {engineStatus.systemInfo.ramGb} GB RAM
              {engineStatus.systemInfo.primaryGpu && ` • GPU: ${engineStatus.systemInfo.primaryGpu}`}
            </span>
          </div>
        )}
      </div>

      {/* Directory Settings */}
      <div className="settings-card">
        <div className="card-inner-header">
          <div className="card-title-group">
            <Folder size={16} color="#e6b422" />
            <span className="card-title">Default Output Directory</span>
          </div>
        </div>

        <div className="dir-picker-row">
          <input
            type="text"
            className="form-input form-mono"
            value={defaultOutputDir}
            readOnly
          />
          <button className="btn-secondary" onClick={onSelectOutputDir}>
            <Folder size={14} />
            <span>Change</span>
          </button>
          <button className="btn-secondary" onClick={handleOpenFolder}>
            <FolderOpen size={14} />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Application Preferences */}
      <div className="settings-card">
        <div className="card-inner-header">
          <div className="card-title-group">
            <Sparkles size={16} color="#e6b422" />
            <span className="card-title">App Preferences & Experience</span>
          </div>
        </div>

        <div className="prefs-list">
          {/* Smooth Animations */}
          <div className="pref-item">
            <div>
              <div className="pref-name">Fluid UI Animations</div>
              <div className="pref-desc">Spring transitions, shimmer progress bars, and glowing micro-interactions.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => onToggleAnimations(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Sound Completion Chime */}
          <div className="pref-item">
            <div>
              <div className="pref-name">Task Completion Sound</div>
              <div className="pref-desc">Play a gentle melodic chime when a download finishes successfully.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => onToggleSound(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Global Rate Limit */}
          <div className="pref-item">
            <div>
              <div className="pref-name">Default Bandwidth Limit</div>
              <div className="pref-desc">Prevent downloads from throttling entire local network.</div>
            </div>
            <select
              className="form-select-sm"
              value={globalRateLimit}
              onChange={(e) => onChangeRateLimit(e.target.value)}
            >
              <option value="unlimited">Unlimited Speed</option>
              <option value="25M">25 MB/s</option>
              <option value="10M">10 MB/s</option>
              <option value="5M">5 MB/s</option>
            </select>
          </div>

          {/* Browser Cookies */}
          <div className="pref-item">
            <div>
              <div className="pref-name">Default Browser Cookies</div>
              <div className="pref-desc">Allow bypassing age-verification sign-in restrictions.</div>
            </div>
            <select
              className="form-select-sm"
              value={defaultCookiesBrowser}
              onChange={(e) => onChangeCookiesBrowser(e.target.value)}
            >
              <option value="none">None</option>
              <option value="chrome">Google Chrome</option>
              <option value="firefox">Mozilla Firefox</option>
              <option value="edge">Microsoft Edge</option>
              <option value="brave">Brave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Software Updates & About */}
      <div className="settings-card">
        <div className="card-inner-header">
          <div className="card-title-group">
            <ShieldCheck size={16} color="#e6b422" />
            <span className="card-title">Software Updates & About</span>
          </div>
        </div>

        <div className="update-status-row">
          <div>
            <div className="update-app-title">itzDownloader Desktop</div>
            <div className="update-app-version">Version {updateState.currentVersion} • Built for Windows 10 & 11 (x64)</div>
          </div>

          <div className="update-action-box">
            {updateState.status === 'downloaded' ? (
              <button className="btn-primary-sm" onClick={onInstallUpdate}>
                <span>Install Update & Restart</span>
              </button>
            ) : (
              <button
                className="btn-secondary-sm"
                onClick={onCheckForUpdates}
                disabled={updateState.status === 'checking'}
              >
                <RefreshCw size={12} className={updateState.status === 'checking' ? 'spin-animation' : ''} />
                <span>{updateState.status === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            )}
          </div>
        </div>

        {updateState.status === 'available' && (
          <div className="update-available-banner">
            <span>A new version (v{updateState.latestVersion}) is available and downloading in background...</span>
          </div>
        )}

        <div className="about-footer-links">
          <span>Developed by itzcrih</span>
          <span>•</span>
          <a href="#" onClick={(e) => { e.preventDefault(); handleOpenWebsite(); }}>
            itzcrih.it <ExternalLink size={11} style={{ display: 'inline', marginLeft: 2 }} />
          </a>
          <span>•</span>
          <a href="#" onClick={(e) => { e.preventDefault(); handleOpenDiscord(); }}>
            community.itzcrih.it <ExternalLink size={11} style={{ display: 'inline', marginLeft: 2 }} />
          </a>
        </div>
      </div>
    </div>
  );
}
