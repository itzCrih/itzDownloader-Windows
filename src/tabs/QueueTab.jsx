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
  DownloadCloud,
  Copy,
  Check,
  ListMusic,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatBytes, formatDuration, getItemUnit } from '../utils/formatters';

export default function QueueTab({
  jobs = [],
  onCancelJob,
  onCancelPlaylistItem,
  onClearCompleted,
  onShowToast,
  onNavigateToInstant,
}) {
  const [expandedLogs, setExpandedLogs] = useState({});
  const [expandedPlaylists, setExpandedPlaylists] = useState({});
  const [copiedLogs, setCopiedLogs] = useState({});

  const toggleLogs = (jobId) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const togglePlaylist = (jobId) => {
    setExpandedPlaylists((prev) => ({
      ...prev,
      [jobId]: prev[jobId] === undefined ? false : !prev[jobId],
    }));
  };

  const handleCopyLogs = (jobId, logs = []) => {
    if (!logs || logs.length === 0) {
      onShowToast('No logs to copy.', 'info');
      return;
    }
    const text = logs.join('\n');
    if (window.itzDownloaderAPI?.writeClipboard) {
      window.itzDownloaderAPI.writeClipboard(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }

    setCopiedLogs((prev) => ({ ...prev, [jobId]: true }));
    onShowToast(`Copied ${logs.length} lines of engine log to clipboard!`, 'success');

    setTimeout(() => {
      setCopiedLogs((prev) => ({ ...prev, [jobId]: false }));
    }, 2200);
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
  const finishedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'error' || j.status === 'canceled');

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
                ? `${activeJobs.length} active task${activeJobs.length > 1 ? 's' : ''} in progress`
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
            No active or past downloads. Paste a link or playlist in Instant Download to begin.
          </p>
          <button className="btn-primary" onClick={onNavigateToInstant}>
            <span>Go to Instant Download</span>
          </button>
        </div>
      )}

      {/* Jobs List */}
      <div className="queue-items-list">
        {jobs.map((job) => {
          const isPlaylist = !!job.isPlaylist;
          const isDownloading = job.status === 'downloading';
          const isConverting = job.status === 'converting';
          const isCompleted = job.status === 'completed';
          const isError = job.status === 'error';
          const isCanceled = job.status === 'canceled';
          const progressPercent = job.progress?.percent || 0;
          const isLogOpen = !!expandedLogs[job.jobId];
          const isCopied = !!copiedLogs[job.jobId];
          const isPlaylistExpanded = expandedPlaylists[job.jobId] !== false; // default open so user sees songs!

          if (isPlaylist) {
            return (
              <div key={job.jobId} className={`queue-card playlist-card status-${job.status}`}>
                <div className="queue-card-main">
                  {/* Playlist Thumbnail / Icon */}
                  <div className="queue-thumb-box playlist">
                    {job.thumbnail ? (
                      <img src={job.thumbnail} alt={job.title} className="queue-thumb-img" />
                    ) : (
                      <div className="queue-thumb-fallback">
                        <ListMusic size={26} color="#e6b422" />
                      </div>
                    )}

                    <div className="playlist-count-badge">
                      <ListMusic size={10} />
                      <span>{job.totalItems || job.items?.length || 0}</span>
                    </div>

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

                  {/* Playlist Details */}
                  <div className="queue-details">
                    <div className="queue-title-row">
                      <span className="queue-title-text" title={job.title}>
                        {job.title}
                      </span>
                      <span className={`queue-status-badge ${job.status}`}>
                        {isDownloading && `Downloading (${job.completedCount || 0}/${job.totalItems || 0})`}
                        {isCompleted && `Completed (${job.completedCount || job.totalItems}/${job.totalItems})`}
                        {isCanceled && 'Canceled'}
                        {isError && 'Failed'}
                      </span>
                    </div>

                    <div className="queue-meta-row">
                      <span className="queue-meta-pill">{job.author || 'Playlist'}</span>
                      <span className="queue-meta-pill playlist-badge">
                        <ListMusic size={11} style={{ marginRight: 4 }} />
                        <span>Playlist • {job.totalItems || 0} {getItemUnit(job.preset, job.customOptions)}</span>
                      </span>
                      <span className="queue-meta-pill preset">
                        {job.preset === 'custom' && job.customOptions?.mediaType === 'audio'
                          ? `Audio (${job.customOptions.audioFormat?.toUpperCase()})`
                          : job.preset}
                      </span>
                    </div>

                    {/* Overall Playlist Progress Bar */}
                    <div className="queue-progress-section">
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill ${isDownloading ? 'shimmer' : ''}`}
                          style={{ width: `${Math.max(isCompleted ? 100 : 5, Math.min(100, progressPercent))}%` }}
                        />
                      </div>

                      <div className="progress-stats-row">
                        <span className="progress-stat-percent">
                          {isCompleted ? '100%' : `${progressPercent.toFixed(0)}%`}
                        </span>
                        <span className="progress-stat-stage">
                          {isDownloading && (
                            <>
                              <span className="pulse-indicator-dot" />
                              <span>
                                Item {(job.activeItemIndex || 0) + 1} of {job.totalItems}:{' '}
                                <strong>{job.progress?.currentItemTitle || job.progress?.currentSongTitle || job.items?.[job.activeItemIndex]?.title || 'Processing...'}</strong>
                              </span>
                            </>
                          )}
                          {isCompleted && `All ${getItemUnit(job.preset, job.customOptions)} downloaded and processed successfully!`}
                          {isCanceled && 'Playlist download canceled.'}
                        </span>
                        {job.progress?.speed && isDownloading && (
                          <span className="progress-stat-speed">{job.progress.speed}</span>
                        )}
                        {job.progress?.eta && isDownloading && (
                          <span className="progress-stat-eta">ETA: {job.progress.eta}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="queue-actions">
                    {isDownloading && (
                      <button
                        className="btn-action-cancel"
                        onClick={() => onCancelJob(job.jobId)}
                        title="Cancel remaining playlist items"
                      >
                        <XCircle size={15} />
                        <span>Cancel All</span>
                      </button>
                    )}

                    {job.outputDir && (
                      <button
                        className="btn-action-folder"
                        onClick={() => handleShowInFolder(job.outputDir)}
                        title="Reveal playlist folder in Windows Explorer"
                      >
                        <FolderOpen size={14} />
                        <span>Folder</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Songs in Playlist Queue */}
                {job.items && job.items.length > 0 && (
                  <div className="playlist-tracklist-container">
                    <button
                      type="button"
                      className="playlist-tracklist-toggle-btn"
                      onClick={() => togglePlaylist(job.jobId)}
                    >
                      <div className="playlist-tracklist-toggle-left">
                        <ListMusic size={14} color="#e6b422" />
                        <span>{getItemUnit(job.preset, job.customOptions, { capitalize: true })} in Queue ({job.items.length})</span>
                      </div>
                      <div className="playlist-tracklist-toggle-right">
                        <span>{job.completedCount || 0} of {job.totalItems || job.items.length} done</span>
                        {isPlaylistExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {isPlaylistExpanded && (
                      <div className="playlist-tracks-table">
                        {job.items.map((item, idx) => {
                          const itemDone = item.status === 'completed';
                          const itemActive = item.status === 'downloading' || item.status === 'converting';
                          const itemError = item.status === 'error';
                          const itemQueued = item.status === 'queued';
                          const itemCanceled = item.status === 'canceled';

                          return (
                            <div
                              key={item.subJobId || idx}
                              className={`playlist-track-row ${itemActive ? 'active' : ''} ${itemDone ? 'completed' : ''}`}
                            >
                              <div className="track-row-num">#{item.index || idx + 1}</div>

                              <div className="track-row-main">
                                <div className="track-row-title" title={item.title}>
                                  {item.title}
                                </div>
                                <div className="track-row-author">
                                  {item.author || job.author}
                                  {item.duration > 0 && ` • ${formatDuration(item.duration)}`}
                                  {item.outputSize > 0 && ` • ${formatBytes(item.outputSize)}`}
                                </div>

                                {itemActive && (
                                  <div className="track-mini-progress">
                                    <div
                                      className="track-mini-progress-fill shimmer"
                                      style={{ width: `${Math.max(8, item.progress?.percent || 0)}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="track-row-status-col">
                                {itemActive && (
                                  <span className="track-badge downloading">
                                    <Loader2 size={11} className="spin-animation" />
                                    <span>{item.progress?.percent ? `${item.progress.percent.toFixed(0)}%` : 'Active'}</span>
                                    {item.progress?.speed && <span className="track-speed-tag">{item.progress.speed}</span>}
                                  </span>
                                )}
                                {itemDone && (
                                  <span className="track-badge completed">
                                    <CheckCircle2 size={12} />
                                    <span>Ready</span>
                                  </span>
                                )}
                                {itemQueued && (
                                  <span className="track-badge queued">
                                    <Clock size={11} />
                                    <span>Queued</span>
                                  </span>
                                )}
                                {itemError && (
                                  <span className="track-badge error" title={item.error || 'Failed'}>
                                    <AlertCircle size={11} />
                                    <span>Failed</span>
                                  </span>
                                )}
                                {itemCanceled && (
                                  <span className="track-badge canceled">
                                    <span>Canceled</span>
                                  </span>
                                )}
                              </div>

                              <div className="track-row-actions">
                                {itemDone && item.outputPath && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-track-action"
                                      onClick={() => handleOpenFile(item.outputPath)}
                                      title="Play audio/video file"
                                    >
                                      <Play size={12} fill="currentColor" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-track-action"
                                      onClick={() => handleShowInFolder(item.outputPath)}
                                      title="Show file in folder"
                                    >
                                      <FolderOpen size={12} />
                                    </button>
                                  </>
                                )}
                                {(itemActive || itemQueued) && onCancelPlaylistItem && (
                                  <button
                                    type="button"
                                    className="btn-track-action cancel"
                                    onClick={() => onCancelPlaylistItem(job.jobId, item.subJobId)}
                                    title={`Skip/Cancel this ${getItemUnit(job.preset, job.customOptions, { plural: false })}`}
                                  >
                                    <XCircle size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Console Logs Dropdown with One-Click Copy Logs Button */}
                {job.logs && job.logs.length > 0 && (
                  <div className="queue-logs-accordion">
                    <div className="queue-logs-header-bar">
                      <button
                        type="button"
                        className="queue-logs-toggle-btn"
                        onClick={() => toggleLogs(job.jobId)}
                      >
                        <Terminal size={13} />
                        <span>yt-dlp Engine Log ({job.logs.length} lines)</span>
                        {isLogOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        type="button"
                        className="btn-copy-logs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLogs(job.jobId, job.logs);
                        }}
                        title="Copy all engine log output to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} color="#2ea043" />
                            <span style={{ color: '#2ea043' }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Logs</span>
                          </>
                        )}
                      </button>
                    </div>

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
          }

          // Single Item Card
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
                      {isCanceled && 'Canceled'}
                    </span>
                  </div>

                  <div className="queue-meta-row">
                    <span className="queue-meta-pill">{job.author || 'Web Media'}</span>
                    <span className="queue-meta-pill preset">
                      {job.preset === 'custom' && job.customOptions?.resolution === 'custom' && job.customOptions?.customResolution
                        ? `Custom (${job.customOptions.customResolution})`
                        : job.preset === 'custom' && job.customOptions?.resolution && job.customOptions.resolution !== 'best'
                        ? `Custom (${job.customOptions.resolution}p)`
                        : job.preset}
                    </span>
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

              {/* Console Logs Dropdown with One-Click Copy Logs Button */}
              {job.logs && job.logs.length > 0 && (
                <div className="queue-logs-accordion">
                  <div className="queue-logs-header-bar">
                    <button
                      type="button"
                      className="queue-logs-toggle-btn"
                      onClick={() => toggleLogs(job.jobId)}
                    >
                      <Terminal size={13} />
                      <span>yt-dlp Engine Log ({job.logs.length} lines)</span>
                      {isLogOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    <button
                      type="button"
                      className="btn-copy-logs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLogs(job.jobId, job.logs);
                      }}
                      title="Copy all engine log output to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} color="#2ea043" />
                          <span style={{ color: '#2ea043' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Logs</span>
                        </>
                      )}
                    </button>
                  </div>

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
