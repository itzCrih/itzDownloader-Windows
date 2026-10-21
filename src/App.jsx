import React, { useState, useEffect, useRef } from 'react';
import { DownloadCloud, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import TitleBar from './components/TitleBar';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import InstantTab from './tabs/InstantTab';
import StudioTab from './tabs/StudioTab';
import QueueTab from './tabs/QueueTab';
import SettingsTab from './tabs/SettingsTab';
import { playCompletionChime } from './utils/sound';
import { getItemUnit } from './utils/formatters';

export default function App() {
  const [activeTab, setActiveTab] = useState('instant');
  const [studioInitialData, setStudioInitialData] = useState({ url: '', info: null });
  const [defaultOutputDir, setDefaultOutputDir] = useState('');
  const [engineStatus, setEngineStatus] = useState(null);
  const [isDownloadingEngine, setIsDownloadingEngine] = useState(false);
  const [engineDownloadProgress, setEngineDownloadProgress] = useState(null);
  const [engineInstallingState, setEngineInstallingState] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Preferences
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    try {
      return localStorage.getItem('itzdownloader_animations') !== 'false';
    } catch {
      return true;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('itzdownloader_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const [globalRateLimit, setGlobalRateLimit] = useState(() => {
    try {
      return localStorage.getItem('itzdownloader_ratelimit') || 'unlimited';
    } catch {
      return 'unlimited';
    }
  });

  const [defaultCookiesBrowser, setDefaultCookiesBrowser] = useState(() => {
    try {
      return localStorage.getItem('itzdownloader_cookies') || 'none';
    } catch {
      return 'none';
    }
  });

  const [updateState, setUpdateState] = useState({
    status: 'idle',
    currentVersion: '1.2.5',
    latestVersion: '1.2.5',
    downloadPercent: 0,
    error: null,
  });

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const startNextPlaylistItem = async (playlistJobId, itemIndex, explicitPlaylistJob = null) => {
    const playlistJob = explicitPlaylistJob || jobsRef.current.find((j) => j.jobId === playlistJobId);
    if (!playlistJob || !playlistJob.items) return;
    const item = playlistJob.items[itemIndex];
    if (!item) return;

    const subJobConfig = {
      jobId: item.subJobId,
      playlistJobId: playlistJob.jobId,
      url: item.url,
      targetSearch: item.targetSearch,
      title: item.title,
      author: item.author,
      thumbnail: item.thumbnail,
      outputDir: playlistJob.outputDir || defaultOutputDir,
      preset: playlistJob.preset,
      customOptions: playlistJob.customOptions,
      globalRateLimit,
      cookiesBrowser: defaultCookiesBrowser,
      isPlaylist: false,
    };

    try {
      if (window.itzDownloaderAPI) {
        await window.itzDownloaderAPI.startJob(subJobConfig);
      }
    } catch (e) {
      console.error(`[startNextPlaylistItem] Failed to start sub-job ${item.subJobId}:`, e);
      // Handled via onJobError
    }
  };

  // Mandatory initial startup probe & auto-engine preparation
  useEffect(() => {
    if (!window.itzDownloaderAPI) return;

    window.itzDownloaderAPI.getDefaultOutputDir().then(setDefaultOutputDir);

    // Initial check and auto-download if missing
    window.itzDownloaderAPI.ensureAllEngines().then((status) => {
      setEngineStatus(status);
    }).catch(() => {
      window.itzDownloaderAPI.getEngineStatus().then(setEngineStatus);
    });

    // Subscriptions
    const unsubProgress = window.itzDownloaderAPI.onJobProgress((data) => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.isPlaylist && Array.isArray(j.items)) {
            const itemIdx = j.items.findIndex((it) => it.subJobId === data.jobId);
            if (itemIdx !== -1) {
              const updatedItems = [...j.items];
              updatedItems[itemIdx] = {
                ...updatedItems[itemIdx],
                status: data.status,
                progress: data,
              };
              const completedCount = updatedItems.filter((it) => it.status === 'completed').length;
              const currentItemPercent = data.percent || 0;
              const overallPercent = Math.min(99.9, ((completedCount * 100) + currentItemPercent) / Math.max(1, j.totalItems));
              return {
                ...j,
                status: 'downloading',
                activeItemIndex: itemIdx,
                activeSubJobId: data.jobId,
                completedCount,
                progress: {
                  ...data,
                  percent: parseFloat(overallPercent.toFixed(1)),
                  currentSongTitle: updatedItems[itemIdx].title,
                  currentItemTitle: updatedItems[itemIdx].title,
                },
                items: updatedItems,
              };
            }
          }
          if (j.jobId === data.jobId) {
            return { ...j, status: data.status, progress: data };
          }
          return j;
        })
      );
    });

    const unsubComplete = window.itzDownloaderAPI.onJobComplete((data) => {
      let nextPlaylistToStart = null;
      let nextPlaylistJobObj = null;
      let playlistFinishedTitle = null;

      setJobs((prev) => {
        const next = prev.map((j) => {
          if (j.isPlaylist && Array.isArray(j.items)) {
            const itemIdx = j.items.findIndex((it) => it.subJobId === data.jobId);
            if (itemIdx !== -1) {
              const updatedItems = [...j.items];
              updatedItems[itemIdx] = {
                ...updatedItems[itemIdx],
                status: 'completed',
                outputPath: data.outputPath,
                outputSize: data.outputSize,
                progress: { percent: 100 },
              };
              const completedCount = updatedItems.filter((it) => it.status === 'completed').length;
              const nextQueuedIdx = updatedItems.findIndex((it) => it.status === 'queued');

              if (nextQueuedIdx !== -1) {
                updatedItems[nextQueuedIdx] = {
                  ...updatedItems[nextQueuedIdx],
                  status: 'downloading',
                };
                nextPlaylistToStart = { playlistId: j.jobId, nextIdx: nextQueuedIdx };
              } else {
                playlistFinishedTitle = j.title;
              }

              const allDone = updatedItems.every((it) => it.status === 'completed' || it.status === 'error' || it.status === 'canceled');

              const updatedJob = {
                ...j,
                status: allDone ? 'completed' : 'downloading',
                completedCount,
                activeItemIndex: nextQueuedIdx !== -1 ? nextQueuedIdx : itemIdx,
                activeSubJobId: nextQueuedIdx !== -1 ? updatedItems[nextQueuedIdx].subJobId : null,
                items: updatedItems,
                progress: {
                  percent: Math.min(100, Math.round((completedCount / Math.max(1, j.totalItems)) * 100)),
                  speed: null,
                  eta: null,
                },
              };

              if (nextQueuedIdx !== -1) {
                nextPlaylistJobObj = updatedJob;
              }
              return updatedJob;
            }
          }

          if (j.jobId === data.jobId) {
            return { ...j, status: 'completed', outputSize: data.outputSize, outputPath: data.outputPath };
          }
          return j;
        });
        jobsRef.current = next;
        return next;
      });

      if (nextPlaylistToStart) {
        startNextPlaylistItem(nextPlaylistToStart.playlistId, nextPlaylistToStart.nextIdx, nextPlaylistJobObj);
      } else if (playlistFinishedTitle) {
        if (soundEnabled) playCompletionChime();
        showToast(`Playlist finished: "${playlistFinishedTitle}"!`, 'success');
      } else {
        if (soundEnabled) playCompletionChime();
        showToast('Download finished successfully!', 'success');
      }
    });

    const unsubCanceled = window.itzDownloaderAPI.onJobCanceled((data) => {
      setJobs((prev) => {
        const next = prev.filter((j) => j.jobId !== data.jobId);
        jobsRef.current = next;
        return next;
      });
      showToast('Download canceled and partial files cleaned.', 'info');
    });

    const unsubError = window.itzDownloaderAPI.onJobError((data) => {
      let nextPlaylistToStart = null;
      let nextPlaylistJobObj = null;

      setJobs((prev) => {
        const next = prev.map((j) => {
          if (j.isPlaylist && Array.isArray(j.items)) {
            const itemIdx = j.items.findIndex((it) => it.subJobId === data.jobId);
            if (itemIdx !== -1) {
              const updatedItems = [...j.items];
              updatedItems[itemIdx] = {
                ...updatedItems[itemIdx],
                status: 'error',
                error: data.error,
              };
              const nextQueuedIdx = updatedItems.findIndex((it) => it.status === 'queued');

              if (nextQueuedIdx !== -1) {
                updatedItems[nextQueuedIdx] = {
                  ...updatedItems[nextQueuedIdx],
                  status: 'downloading',
                };
                nextPlaylistToStart = { playlistId: j.jobId, nextIdx: nextQueuedIdx };
              }

              const allDone = updatedItems.every((it) => it.status === 'completed' || it.status === 'error' || it.status === 'canceled');

              const updatedJob = {
                ...j,
                status: allDone ? 'completed' : 'downloading',
                activeItemIndex: nextQueuedIdx !== -1 ? nextQueuedIdx : itemIdx,
                activeSubJobId: nextQueuedIdx !== -1 ? updatedItems[nextQueuedIdx].subJobId : null,
                items: updatedItems,
              };

              if (nextQueuedIdx !== -1) {
                nextPlaylistJobObj = updatedJob;
              }
              return updatedJob;
            }
          }

          if (j.jobId === data.jobId) {
            return { ...j, status: 'error', error: data.error };
          }
          return j;
        });
        jobsRef.current = next;
        return next;
      });

      if (nextPlaylistToStart) {
        startNextPlaylistItem(nextPlaylistToStart.playlistId, nextPlaylistToStart.nextIdx, nextPlaylistJobObj);
        showToast(`Skipped item with error: ${data.error}`, 'warning');
      } else {
        showToast(`Download error: ${data.error}`, 'error');
      }
    });

    const unsubLog = window.itzDownloaderAPI.onJobLog((data) => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.isPlaylist && Array.isArray(j.items)) {
            const itemIdx = j.items.findIndex((it) => it.subJobId === data.jobId);
            if (itemIdx !== -1) {
              const updatedItems = [...j.items];
              const itemLogs = updatedItems[itemIdx].logs ? [...updatedItems[itemIdx].logs, data.text] : [data.text];
              if (itemLogs.length > 200) itemLogs.shift();
              updatedItems[itemIdx] = {
                ...updatedItems[itemIdx],
                logs: itemLogs,
              };

              const unitLabel = getItemUnit(j.preset, j.customOptions, { plural: false, capitalize: true });
              const pLogs = j.logs
                ? [...j.logs, `[${unitLabel} ${updatedItems[itemIdx].index}] ${data.text}`]
                : [`[${unitLabel} ${updatedItems[itemIdx].index}] ${data.text}`];
              if (pLogs.length > 300) pLogs.shift();
              return {
                ...j,
                logs: pLogs,
                items: updatedItems,
              };
            }
          }

          if (j.jobId === data.jobId) {
            const logs = j.logs ? [...j.logs, data.text] : [data.text];
            if (logs.length > 200) logs.shift();
            return { ...j, logs };
          }
          return j;
        })
      );
    });

    const unsubEngineDownload = window.itzDownloaderAPI.onEngineDownloadProgress((data) => {
      setEngineDownloadProgress(data);
    });

    const unsubEngineInstall = window.itzDownloaderAPI.onEngineInstallProgress((data) => {
      if (data.isInstalling) {
        setEngineInstallingState(data);
      } else {
        setEngineInstallingState(null);
        if (data.status) {
          setEngineStatus(data.status);
          showToast('Engines ready: yt-dlp & FFmpeg verified!', 'success');
        }
      }
    });

    const unsubUpdateStatus = window.itzDownloaderAPI.onUpdateStatus((data) => {
      setUpdateState((prev) => ({
        ...prev,
        status: data.status,
        latestVersion: data.updateInfo ? data.updateInfo.version : prev.latestVersion,
      }));
    });

    const unsubUpdateProgress = window.itzDownloaderAPI.onUpdateDownloadProgress
      ? window.itzDownloaderAPI.onUpdateDownloadProgress((data) => {
          setUpdateState((prev) => ({
            ...prev,
            status: 'downloading',
            downloadPercent: Math.round(data.percent || 0),
          }));
        })
      : null;

    const unsubUpdateDownloaded = window.itzDownloaderAPI.onUpdateDownloaded(() => {
      setUpdateState((prev) => ({ ...prev, status: 'downloaded' }));
      showToast('Update downloaded and verified! Check Settings to restart.', 'info');
    });

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubComplete) unsubComplete();
      if (unsubCanceled) unsubCanceled();
      if (unsubError) unsubError();
      if (unsubLog) unsubLog();
      if (unsubEngineDownload) unsubEngineDownload();
      if (unsubEngineInstall) unsubEngineInstall();
      if (unsubUpdateStatus) unsubUpdateStatus();
      if (unsubUpdateProgress) unsubUpdateProgress();
      if (unsubUpdateDownloaded) unsubUpdateDownloaded();
    };
  }, [soundEnabled]);

  const handleResetApp = () => {
    setActiveTab('instant');
  };

  const handleAddJob = async (jobConfig) => {
    if (jobConfig.isPlaylist) {
      const playlistJobId = jobConfig.jobId || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entries = jobConfig.entries || [];
      const items = entries.map((entry, idx) => ({
        subJobId: `${playlistJobId}_item_${idx + 1}`,
        index: idx + 1,
        id: entry.id,
        title: entry.title,
        author: entry.author,
        duration: entry.duration,
        thumbnail: entry.thumbnail,
        url: entry.url,
        targetSearch: entry.targetSearch,
        status: idx === 0 ? 'downloading' : 'queued',
        progress: { percent: 0, speed: null, eta: null },
        logs: [],
        outputPath: null,
        outputSize: 0,
        error: null,
      }));

      const fullPlaylistConfig = {
        ...jobConfig,
        jobId: playlistJobId,
        isPlaylist: true,
        globalRateLimit,
        cookiesBrowser: defaultCookiesBrowser,
        status: 'downloading',
        totalItems: items.length,
        completedCount: 0,
        activeItemIndex: 0,
        activeSubJobId: items[0]?.subJobId,
        progress: { percent: 0, speed: null, eta: null },
        items,
        logs: [],
      };

      setJobs((prev) => [fullPlaylistConfig, ...prev]);
      jobsRef.current = [fullPlaylistConfig, ...jobsRef.current];

      const unit = getItemUnit(fullPlaylistConfig.preset, fullPlaylistConfig.customOptions);
      showToast(`Queued playlist: "${fullPlaylistConfig.title}" (${items.length} ${unit})`, 'success');

      if (items.length > 0) {
        startNextPlaylistItem(playlistJobId, 0, fullPlaylistConfig);
      }
      return;
    }

    const fullConfig = {
      ...jobConfig,
      globalRateLimit,
      cookiesBrowser: defaultCookiesBrowser,
      status: 'downloading',
      progress: { percent: 0, speed: null, eta: null },
      logs: [],
    };

    setJobs((prev) => [fullConfig, ...prev]);

    try {
      await window.itzDownloaderAPI.startJob(fullConfig);
    } catch (e) {
      // Handled via onJobError event
    }
  };

  const handleCancelJob = (jobId) => {
    const job = jobs.find((j) => j.jobId === jobId);
    if (job?.isPlaylist) {
      if (job.activeSubJobId && window.itzDownloaderAPI) {
        window.itzDownloaderAPI.cancelJob(job.activeSubJobId);
      }
      setJobs((prev) =>
        prev.map((j) => {
          if (j.jobId === jobId) {
            return {
              ...j,
              status: 'canceled',
              items: j.items.map((it) =>
                it.status === 'downloading' || it.status === 'queued' ? { ...it, status: 'canceled' } : it
              ),
            };
          }
          return j;
        })
      );
      showToast(`Playlist "${job.title}" canceled.`, 'info');
      return;
    }

    if (window.itzDownloaderAPI) {
      window.itzDownloaderAPI.cancelJob(jobId);
    }
  };

  const handleCancelPlaylistItem = (playlistJobId, subJobId) => {
    let nextToStart = null;
    let nextJobObj = null;

    setJobs((prev) => {
      const next = prev.map((j) => {
        if (j.jobId === playlistJobId && Array.isArray(j.items)) {
          const itemIdx = j.items.findIndex((it) => it.subJobId === subJobId);
          if (itemIdx === -1) return j;

          const isCurrentlyDownloading = j.items[itemIdx].status === 'downloading';
          if (isCurrentlyDownloading && window.itzDownloaderAPI) {
            window.itzDownloaderAPI.cancelJob(subJobId);
          }

          const updatedItems = [...j.items];
          updatedItems[itemIdx] = {
            ...updatedItems[itemIdx],
            status: 'canceled',
          };

          if (isCurrentlyDownloading) {
            const nextQueuedIdx = updatedItems.findIndex((it) => it.status === 'queued');
            if (nextQueuedIdx !== -1) {
              updatedItems[nextQueuedIdx] = {
                ...updatedItems[nextQueuedIdx],
                status: 'downloading',
              };
              nextToStart = { playlistId: j.jobId, nextIdx: nextQueuedIdx };
            }
          }

          const allDone = updatedItems.every((it) => it.status === 'completed' || it.status === 'error' || it.status === 'canceled');

          const updatedJob = {
            ...j,
            status: allDone ? 'completed' : 'downloading',
            items: updatedItems,
          };
          if (nextToStart) {
            nextJobObj = updatedJob;
          }
          return updatedJob;
        }
        return j;
      });
      jobsRef.current = next;
      return next;
    });

    if (nextToStart) {
      startNextPlaylistItem(nextToStart.playlistId, nextToStart.nextIdx, nextJobObj);
    }
    showToast('Item download canceled.', 'info');
  };

  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.status === 'downloading' || j.status === 'converting'));
    showToast('Cleared completed tasks from queue.', 'info');
  };

  const handleNavigateToStudio = (url, info) => {
    setStudioInitialData({ url, info });
    setActiveTab('studio');
  };

  const handleNavigateToQueue = () => {
    setActiveTab('queue');
  };

  const handleSelectOutputDir = async () => {
    if (window.itzDownloaderAPI) {
      const selected = await window.itzDownloaderAPI.selectFolderDialog();
      if (selected) {
        setDefaultOutputDir(selected);
        showToast(`Output folder set to: ${selected}`, 'success');
      }
    }
  };

  const handleRefreshEngines = async () => {
    if (window.itzDownloaderAPI) {
      try {
        const s = await window.itzDownloaderAPI.getEngineStatus(true);
        setEngineStatus(s);
        showToast('Engine and hardware status re-probed and refreshed.', 'info');
      } catch (e) {
        const fallback = await window.itzDownloaderAPI.getEngineStatus();
        setEngineStatus(fallback);
      }
    }
  };

  const handleDownloadYtDlp = async () => {
    if (!window.itzDownloaderAPI) return;
    setIsDownloadingEngine(true);
    setEngineInstallingState({
      isInstalling: true,
      engine: 'yt-dlp',
      title: 'Downloading yt-dlp Engine...',
      percent: 10,
      detail: 'Fetching latest yt-dlp release from GitHub...',
    });
    try {
      const updated = await window.itzDownloaderAPI.downloadYtDlp();
      setEngineStatus(updated);
      showToast('yt-dlp downloaded and ready!', 'success');
    } catch (err) {
      showToast(`Failed to download yt-dlp: ${err.message}`, 'error');
    } finally {
      setIsDownloadingEngine(false);
      setEngineInstallingState(null);
      setEngineDownloadProgress(null);
    }
  };

  const handleUpdateYtDlp = async () => {
    if (!window.itzDownloaderAPI) return;
    return await window.itzDownloaderAPI.updateYtDlp();
  };

  const handleDownloadFfmpeg = async () => {
    if (!window.itzDownloaderAPI) return;
    setIsDownloadingEngine(true);
    setEngineInstallingState({
      isInstalling: true,
      engine: 'ffmpeg',
      title: 'Configuring FFmpeg & Encoders...',
      percent: 15,
      detail: 'Checking itzCut installation or downloading static build...',
    });
    try {
      const updated = await window.itzDownloaderAPI.downloadFfmpeg();
      setEngineStatus(updated);
      showToast('FFmpeg downloaded and ready!', 'success');
    } catch (err) {
      showToast(`Failed to download FFmpeg: ${err.message}`, 'error');
    } finally {
      setIsDownloadingEngine(false);
      setEngineInstallingState(null);
      setEngineDownloadProgress(null);
    }
  };

  const handleCheckForUpdates = () => {
    if (window.itzDownloaderAPI) {
      window.itzDownloaderAPI.checkForUpdates();
    }
  };

  const handleInstallUpdate = () => {
    if (window.itzDownloaderAPI) {
      window.itzDownloaderAPI.quitAndInstallUpdate();
    }
  };

  const activeJobsCount = jobs.filter((j) => j.status === 'downloading' || j.status === 'converting').length;
  const currentRunningJob = jobs.find((j) => j.status === 'downloading' || j.status === 'converting');

  const isUpdateDownloading = updateState.status === 'downloading' || updateState.status === 'installing';
  const isEngineInstalling = !!engineInstallingState?.isInstalling;
  const isLocked = isEngineInstalling || isUpdateDownloading;

  // Anti-crash: completely lock all user keyboard, mouse, and scroll events during sensitive downloads
  useEffect(() => {
    if (!isLocked) return;

    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    window.addEventListener('keydown', blockEvent, true);
    window.addEventListener('keyup', blockEvent, true);
    window.addEventListener('keypress', blockEvent, true);
    window.addEventListener('mousedown', blockEvent, true);
    window.addEventListener('mouseup', blockEvent, true);
    window.addEventListener('click', blockEvent, true);
    window.addEventListener('contextmenu', blockEvent, true);
    window.addEventListener('wheel', blockEvent, { passive: false, capture: true });

    return () => {
      window.removeEventListener('keydown', blockEvent, true);
      window.removeEventListener('keyup', blockEvent, true);
      window.removeEventListener('keypress', blockEvent, true);
      window.removeEventListener('mousedown', blockEvent, true);
      window.removeEventListener('mouseup', blockEvent, true);
      window.removeEventListener('click', blockEvent, true);
      window.removeEventListener('contextmenu', blockEvent, true);
      window.removeEventListener('wheel', blockEvent, { capture: true });
    };
  }, [isLocked]);

  return (
    <div className="app-container">
      <TitleBar
        currentJobTitle={currentRunningJob?.title}
        onResetApp={handleResetApp}
      />

      <div className="app-main">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeJobsCount={activeJobsCount}
          onResetApp={handleResetApp}
        />

        <main className="content-viewport">
          <div key={activeTab} className={animationsEnabled ? 'page-view-animated' : ''}>
            {activeTab === 'instant' && (
              <InstantTab
                onAddJob={handleAddJob}
                onShowToast={showToast}
                defaultOutputDir={defaultOutputDir}
                onNavigateToStudio={handleNavigateToStudio}
                onNavigateToQueue={handleNavigateToQueue}
                activeJobs={jobs}
                engineStatus={engineStatus}
              />
            )}

            {activeTab === 'studio' && (
              <StudioTab
                initialUrl={studioInitialData.url}
                initialMediaInfo={studioInitialData.info}
                onAddJob={handleAddJob}
                onShowToast={showToast}
                defaultOutputDir={defaultOutputDir}
                onNavigateToQueue={handleNavigateToQueue}
                engineStatus={engineStatus}
              />
            )}

            {activeTab === 'queue' && (
              <QueueTab
                jobs={jobs}
                onCancelJob={handleCancelJob}
                onCancelPlaylistItem={handleCancelPlaylistItem}
                onClearCompleted={handleClearCompleted}
                onShowToast={showToast}
                onNavigateToInstant={() => setActiveTab('instant')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                engineStatus={engineStatus}
                defaultOutputDir={defaultOutputDir}
                onSelectOutputDir={handleSelectOutputDir}
                onRefreshEngines={handleRefreshEngines}
                onDownloadYtDlp={handleDownloadYtDlp}
                onUpdateYtDlp={handleUpdateYtDlp}
                onDownloadFfmpeg={handleDownloadFfmpeg}
                isDownloadingEngine={isDownloadingEngine}
                engineDownloadProgress={engineDownloadProgress}
                animationsEnabled={animationsEnabled}
                onToggleAnimations={(val) => {
                  setAnimationsEnabled(val);
                  localStorage.setItem('itzdownloader_animations', val ? 'true' : 'false');
                }}
                soundEnabled={soundEnabled}
                onToggleSound={(val) => {
                  setSoundEnabled(val);
                  localStorage.setItem('itzdownloader_sound', val ? 'true' : 'false');
                }}
                globalRateLimit={globalRateLimit}
                onChangeRateLimit={(val) => {
                  setGlobalRateLimit(val);
                  localStorage.setItem('itzdownloader_ratelimit', val);
                }}
                defaultCookiesBrowser={defaultCookiesBrowser}
                onChangeCookiesBrowser={(val) => {
                  setDefaultCookiesBrowser(val);
                  localStorage.setItem('itzdownloader_cookies', val);
                }}
                updateState={updateState}
                onCheckForUpdates={handleCheckForUpdates}
                onInstallUpdate={handleInstallUpdate}
                onShowToast={showToast}
              />
            )}
          </div>
        </main>

        <footer className="app-footer-bar">
          <div>
            <span>© 2026 </span>
            <span
              className="app-footer-link"
              onClick={() => window.itzDownloaderAPI?.openExternal('https://itzcrih.it')}
            >
              itzcrih.it
            </span>
            <span> — Ultra-fast media downloader</span>
          </div>

          <div>
            <span>Join our Discord: </span>
            <span
              className="app-footer-link"
              onClick={() => window.itzDownloaderAPI?.openExternal('https://community.itzcrih.it')}
            >
              community.itzcrih.it
            </span>
          </div>

          <div>
            <span style={{ fontFamily: 'var(--font-mono)' }}>itzDownloader Desktop v1.2.5</span>
          </div>
        </footer>
      </div>

      {/* Full-Screen Blocking Modal Overlay during Engine Setup or Update Downloads to Prevent Crashes */}
      {isLocked && (
        <div
          className="engine-blocking-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="engine-blocking-modal">
            <div className="engine-blocking-glow"></div>
            <div className="engine-blocking-logo">
              {isUpdateDownloading ? (
                <Sparkles size={38} className="engine-blocking-icon spin-pulse" />
              ) : (
                <DownloadCloud size={40} className="engine-blocking-icon spin-pulse" />
              )}
            </div>

            <div className="engine-blocking-badge">
              <ShieldCheck size={13} />
              <span>{isUpdateDownloading ? 'Application Update' : 'Core Engine Setup'}</span>
            </div>

            <h2 className="engine-blocking-title">
              {isUpdateDownloading
                ? (updateState.status === 'installing' ? 'Applying Update...' : `Downloading Update v${updateState.latestVersion || ''}...`)
                : (engineInstallingState?.title || 'Configuring Media Engines')}
            </h2>
            <p className="engine-blocking-desc">
              {isUpdateDownloading
                ? 'Please wait while update packages are being safely processed. All interactions are locked to prevent app corruption.'
                : (engineInstallingState?.detail || 'Preparing yt-dlp & FFmpeg binaries. Clicks are safely locked to prevent app crashes.')}
            </p>

            <div className="engine-blocking-progress-wrap">
              <div className="engine-blocking-track">
                <div
                  className="engine-blocking-fill"
                  style={{
                    width: `${Math.max(8, Math.min(100, isUpdateDownloading ? (updateState.downloadPercent || 15) : (engineInstallingState?.percent || 15)))}%`,
                  }}
                />
              </div>
              <div className="engine-blocking-stats">
                <span>{isUpdateDownloading ? `${updateState.downloadPercent || 0}%` : `${engineInstallingState?.percent || 15}%`}</span>
                <span>
                  {isUpdateDownloading
                    ? (updateState.status === 'installing' ? 'Finalizing Setup...' : 'Downloading Assets')
                    : (engineInstallingState?.engine ? `Engine: ${engineInstallingState.engine.toUpperCase()}` : 'Verifying local dependencies')}
                </span>
              </div>
            </div>

            <div className="engine-blocking-lock-banner">
              <Lock size={12} />
              <span>User interactions temporarily locked until process completes</span>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
