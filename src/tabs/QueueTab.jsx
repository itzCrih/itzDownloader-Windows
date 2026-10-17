import React, { useState } from 'react';
import {
  Layers,
  FolderOpen,
  Play,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Film,
  Music,
  DownloadCloud
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export default function QueueTab({
  jobs = [],
  onCancelJob,
  onClearCompleted,
  onShowToast,
  onNavigateToInstant,
}) {
  const [expandedLogs, setExpandedLogs] = useState({});

  const toggleLogs = (jobId) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const handleOpenFile = async (outputPath) => {
    if (!outputPath) return;
    if (window.itzDownloaderAPI?.openFile) {
      const ok = await window.itzDownloaderAPI.openFile(outputPath);
      if (!ok) onShowToast('Could not open file directly.', 'warning');
    }
  };

  const handleShowInFolder = async (outputPath) => {
    if (!outputPath) return;
    if (window.itzDownloaderAPI?.showInFolder) {
      window.itzDownloaderAPI.showInFolder(outputPath);
    }
  };

  const activeJobs = jobs.filter((j) => j.status === 'downloading' || j.status === 'converting');
  const finishedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'error');

  return (
    <div className="tab-pane-container">
      {/* Header bar */}
      <div className="queue-header-bar">
        <div className="queue-header-left">
          <div className="queue-icon-badge">
            <Layers size={18} color="#e6b422" />
          </div>
          <div>
            <h2 className="queue-title">Download Queue & History</h2>
            <p className="queue-subtitle">
              {activeJobs.length > 0
                ? `${activeJobs.length} active download${activeJobs.length > 1 ? 's' : ''} in progress`
                : 'All tasks completed'}
            </p>
          </div>
        </div>

        {finishedJobs.length > 0 && (
          <button className="btn-secondary" onClick={onClearCompleted}>
            <Trash2 size={15} />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="empty-queue-card">
          <div className="empty-icon-box">
            <DownloadCloud size={48} color="rgba(230, 180, 34, 0.4)" />
          </div>
          <h3 className="empty-title">Queue is empty</h3>
          <p className="empty-desc">
            No active or past downloads. Paste a link in Instant Download to begin.
          </p>
          <button className="btn-primary" onClick={onNavigateToInstant}>
            <span>Go to Instant Download</span>
          </button>
        </div>
      )}

      {/* Jobs List */}
      <div className="queue-items-list">
        {jobs.map((job) => {
          const isDownloading = job.status === 'downloading';
          const isConverting = job.status === 'converting';
          const isCompleted = job.status === 'completed';
          const isError = job.status === 'error';
          const progressPercent = job.progress?.percent || 0;
          const isLogOpen = !!expandedLogs[job.jobId];

          return (
            <div key={job.jobId} className={`queue-card status-${job.status}`}>
              <div className="queue-card-main">
                {/* Thumbnail / Icon */}
                <div className="queue-thumb-box">
                  {job.thumbnail ? (
                    <img src={job.thumbnail} alt={job.title} className="queue-thumb-img" />
                  ) : (
                    <div className="queue-thumb-fallback">
                      {job.preset?.includes('mp3') || job.preset === 'flac' ? (
                        <Music size={24} color="#e6b422" />
                      ) : (
                        <Film size={24} color="#e6b422" />
                      )}
                    </div>
                  )}

                  {/* Status Overlay Icon */}
                  {isDownloading && (
                    <div className="queue-status-overlay downloading">
                      <Loader2 size={16} className="spin-animation" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="queue-status-overlay completed">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  {isError && (
                    <div className="queue-status-overlay error">
                      <AlertCircle size={16} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="queue-details">
                  <div className="queue-title-row">
                    <span className="queue-title-text" title={job.title}>
                      {job.title}
                    </span>
                    <span className={`queue-status-badge ${job.status}`}>
                      {isDownloading && 'Downloading'}
                      {isConverting && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Loader2 size={11} className="spin-animation" />
                          <span>Re-encoding</span>
                        </span>
                      )}
                      {isCompleted && 'Completed'}
                      {isError && 'Failed'}
                    </span>
                  </div>

                  <div className="queue-meta-row">
                    <span className="queue-meta-pill">{job.author || 'Web Media'}</span>
                    <span className="queue-meta-pill preset">{job.preset}</span>
                    {job.outputSize > 0 && (
                      <span className="queue-meta-pill size">{formatBytes(job.outputSize)}</span>
                    )}
                  </div>

                  {/* Live Progress Bar */}
                  {(isDownloading || isConverting) && (
                    <div className="queue-progress-section">
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill ${isConverting ? 'converting' : 'shimmer'}`}
                          style={{ width: `${Math.max(6, Math.min(100, progressPercent))}%` }}
                        />
                      </div>

                      {isConverting ? (
                        <div className="progress-stats-row converting-active">
                          <span className="progress-stat-percent">{progressPercent.toFixed(0)}%</span>
                          <span className="progress-stat-stage">
                            <span className="pulse-indicator-dot"></span>
                            {job.progress?.stage || 'FFmpeg re-encoding & finalizing container...'}
                          </span>
                          {job.progress?.speed && (
                            <span className="progress-stat-speed">{job.progress.speed}</span>
                          )}
                        </div>
                      ) : (
                        <div className="progress-stats-row">
                          <span className="progress-stat-percent">{progressPercent.toFixed(1)}%</span>
                          {job.progress?.speed && (
                            <span className="progress-stat-speed">{job.progress.speed}</span>
                          )}
                          {job.progress?.totalSize && (
                            <span className="progress-stat-size">{job.progress.totalSize}</span>
                          )}
                          {job.progress?.eta && (
                            <span className="progress-stat-eta">ETA: {job.progress.eta}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {isError && (
                    <div className="queue-error-banner">
                      <span>{job.error || 'Download failed. Verify the URL or platform availability.'}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="queue-actions">
                  {(isDownloading || isConverting) && (
                    <button
                      className="btn-action-cancel"
                      onClick={() => onCancelJob(job.jobId)}
                      title="Cancel download"
                    >
                      <XCircle size={15} />
                      <span>Cancel</span>
                    </button>
                  )}

                  {isCompleted && job.outputPath && (
                    <>
                      <button
                        className="btn-action-play"
                        onClick={() => handleOpenFile(job.outputPath)}
                        title="Open file with default player"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Play</span>
                      </button>

                      <button
                        className="btn-action-folder"
                        onClick={() => handleShowInFolder(job.outputPath)}
                        title="Reveal in Windows Explorer"
                      >
                        <FolderOpen size={14} />
                        <span>Folder</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Console Logs Dropdown */}
              {job.logs && job.logs.length > 0 && (
                <div className="queue-logs-accordion">
                  <button
                    className="queue-logs-toggle-btn"
                    onClick={() => toggleLogs(job.jobId)}
                  >
                    <Terminal size={13} />
                    <span>yt-dlp Engine Log ({job.logs.length} lines)</span>
                    {isLogOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isLogOpen && (
                    <div className="queue-log-terminal">
                      {job.logs.map((line, idx) => (
                        <div key={idx} className="terminal-log-line">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
