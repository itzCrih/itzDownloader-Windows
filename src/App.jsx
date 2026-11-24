import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DownloadCloud, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import TitleBar from './components/TitleBar';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import InstantTab from './tabs/InstantTab';
import StudioTab from './tabs/StudioTab';
import QueueTab from './tabs/QueueTab';
import SettingsTab from './tabs/SettingsTab';
import useSettings, { buildJobPrefs } from './hooks/useSettings';
import { playCompletionChime } from './utils/sound';
import { getItemUnit } from './utils/formatters';

const ACTIVE_STATUSES = new Set(['downloading', 'converting', 'processing']);
const FINAL_STATUSES = new Set(['completed', 'error', 'canceled']);
const MAX_JOB_LOGS = 200;
const MAX_PLAYLIST_LOGS = 300;
const AUTO_CLEAR_DELAY_MS = 6000;

const api = () => window.itzDownloaderAPI;
const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
const isActive = (status) => ACTIVE_STATUSES.has(status);
const allItemsDone = (items) => items.every((it) => FINAL_STATUSES.has(it.status));

function appendCapped(list, additions, max) {
  const next = list ? list.concat(additions) : additions.slice();
  return next.length > max ? next.slice(next.length - max) : next;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('instant');
  const [studioInitialData, setStudioInitialData] = useState({ url: '', info: null });
  const [systemOutputDir, setSystemOutputDir] = useState('');
  const [engineStatus, setEngineStatus] = useState(null);
  const [isDownloadingEngine, setIsDownloadingEngine] = useState(false);
  const [engineDownloadProgress, setEngineDownloadProgress] = useState(null);
  const [engineInstallingState, setEngineInstallingState] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [appVersion, setAppVersion] = useState('1.3.0');

  const { settings, updateSetting, updateSettings, resetSettings } = useSettings();
  const defaultOutputDir = settings.outputDir || systemOutputDir;

  const [updateState, setUpdateState] = useState({
    status: 'idle',
    latestVersion: null,
    downloadPercent: 0,
    error: null,
  });

  // Refs give long-lived IPC listeners access to the latest values without
  // tearing down and re-registering every subscription on each change.
  const jobsRef = useRef(jobs);
  const settingsRef = useRef(settings);
  const outputDirRef = useRef(defaultOutputDir);
  jobsRef.current = jobs;
  settingsRef.current = settings;
  outputDirRef.current = defaultOutputDir;

  const commitJobs = useCallback((nextJobs) => {
    jobsRef.current = nextJobs;
    setJobs(nextJobs);
  }, []);

  // ---------- Toasts ----------
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, type, exiting: false }]);
    setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  const notifyFinished = useCallback((title, body, filePath) => {
    const s = settingsRef.current;
    if (s.sound) playCompletionChime();
    if (s.autoOpenFolder && filePath) api()?.showInFolder?.(filePath);
    // Native notification only when the user is not looking at the app
    if (s.notifications && (document.hidden || !document.hasFocus())) {
      api()?.notify?.({ title, body, filePath });
    }
  }, []);

  const scheduleAutoClear = useCallback((jobId) => {
    if (!settingsRef.current.autoClearCompleted) return;
    setTimeout(() => {
      const current = jobsRef.current;
      const target = current.find((j) => j.jobId === jobId);
      if (target && target.status === 'completed') {
        commitJobs(current.filter((j) => j.jobId !== jobId));
      }
    }, AUTO_CLEAR_DELAY_MS);
  }, [commitJobs]);

  // ---------- Concurrency ----------
  const getEffectiveConcurrency = () => {
    const c = parseInt(settingsRef.current.concurrency, 10);
    if (c >= 1 && c <= 5) return c;
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 2) return 1;
    if (cores <= 4) return 2;
    return 3;
  };

  const getEffectiveProxy = () => {
    const s = settingsRef.current;
    return s.proxyEnabled && s.proxyUrl.trim() ? s.proxyUrl.trim() : null;
  };

  // ---------- Playlist queue ----------
  const pumpPlaylistQueueRef = useRef();
  const startPlaylistItemRef = useRef();

  const schedulePump = (playlistJobId) => {
    setTimeout(() => pumpPlaylistQueueRef.current?.(playlistJobId), 80);
  };

  /** Mark a playlist item as finished (completed/error/canceled) and keep the queue moving. */
  const finalizePlaylistItem = (playlistJob, itemIdx, patch) => {
    const updatedItems = [...playlistJob.items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], ...patch };
    const done = allItemsDone(updatedItems);
    const completedCount = updatedItems.filter((it) => it.status === 'completed').length;
    const wasCanceled = playlistJob.status === 'canceled';

    const updatedPlaylistJob = {
      ...playlistJob,
      status: wasCanceled ? 'canceled' : done ? 'completed' : 'downloading',
      completedCount,
      items: updatedItems,
      progress: done
        ? { percent: 100, speed: null, eta: null }
        : playlistJob.progress,
    };
    commitJobs(jobsRef.current.map((j) => (j.jobId === playlistJob.jobId ? updatedPlaylistJob : j)));

    if (wasCanceled) return true;
    if (done) {
      notifyFinished('Playlist finished', playlistJob.title, updatedItems.find((it) => it.outputPath)?.outputPath);
      showToast(`Playlist finished: "${playlistJob.title}"`, 'success');
      scheduleAutoClear(playlistJob.jobId);
    } else {
      schedulePump(playlistJob.jobId);
    }
    return done;
  };

  const pumpPlaylistQueue = (playlistJobId) => {
    const currentJobs = jobsRef.current;
    const playlistJob = currentJobs.find((j) => j.jobId === playlistJobId && Array.isArray(j.items));
    if (!playlistJob || playlistJob.status === 'canceled' || playlistJob.status === 'completed') return;

    const activeCount = playlistJob.items.filter((it) => isActive(it.status)).length;
    const availableSlots = getEffectiveConcurrency() - activeCount;
    if (availableSlots <= 0) return;

    const queuedIndices = [];
    for (let i = 0; i < playlistJob.items.length && queuedIndices.length < availableSlots; i++) {
      if (playlistJob.items[i].status === 'queued') queuedIndices.push(i);
    }

    if (queuedIndices.length === 0) {
      if (activeCount === 0 && allItemsDone(playlistJob.items)) {
        const completedCount = playlistJob.items.filter((it) => it.status === 'completed').length;
        commitJobs(currentJobs.map((j) => (j.jobId === playlistJobId
          ? { ...j, status: 'completed', completedCount, progress: { percent: 100, speed: null, eta: null } }
          : j)));
        notifyFinished('Playlist finished', playlistJob.title, playlistJob.items.find((it) => it.outputPath)?.outputPath);
        showToast(`Playlist finished: "${playlistJob.title}"`, 'success');
        scheduleAutoClear(playlistJobId);
      }
      return;
    }

    const updatedItems = [...playlistJob.items];
    queuedIndices.forEach((idx) => {
      updatedItems[idx] = { ...updatedItems[idx], status: 'downloading' };
    });
    const updatedPlaylistJob = {
      ...playlistJob,
      status: 'downloading',
      items: updatedItems,
      activeItemIndex: queuedIndices[0],
      activeSubJobId: updatedItems[queuedIndices[0]].subJobId,
    };
    commitJobs(currentJobs.map((j) => (j.jobId === playlistJobId ? updatedPlaylistJob : j)));

    // Stagger process launches to avoid burst rate-limiting
    queuedIndices.forEach((idx, offset) => {
      setTimeout(() => startPlaylistItemRef.current?.(playlistJobId, idx), offset * 750);
    });
  };
  pumpPlaylistQueueRef.current = pumpPlaylistQueue;

  const startPlaylistItem = async (playlistJobId, itemIndex) => {
    const playlistJob = jobsRef.current.find((j) => j.jobId === playlistJobId);
    const item = playlistJob?.items?.[itemIndex];
    if (!item || item.status !== 'downloading') return; // canceled meanwhile

    const result = await api()?.startJob({
      jobId: item.subJobId,
      playlistJobId: playlistJob.jobId,
      url: item.url,
      targetSearch: item.targetSearch,
      title: item.title,
      author: item.author,
      thumbnail: item.thumbnail,
      platform: playlistJob.platform,
      outputDir: playlistJob.outputDir || outputDirRef.current,
      preset: playlistJob.preset,
      customOptions: playlistJob.customOptions,
      globalRateLimit: playlistJob.globalRateLimit,
      cookiesBrowser: playlistJob.cookiesBrowser,
      proxy: playlistJob.proxy,
      prefs: playlistJob.prefs,
      isPlaylist: false,
    }).catch((e) => ({ error: e.message }));

    // Errors are normally reported through job:error. This is a safety net in
    // case the IPC call itself failed before the main process could report it.
    if (result?.error && !result.canceled) {
      setTimeout(() => {
        const curr = jobsRef.current.find((j) => j.jobId === playlistJobId);
        const idx = curr?.items?.findIndex((it) => it.subJobId === item.subJobId) ?? -1;
        if (idx >= 0 && isActive(curr.items[idx].status)) {
          finalizePlaylistItem(curr, idx, { status: 'error', error: result.error });
        }
      }, 300);
    }
  };
  startPlaylistItemRef.current = startPlaylistItem;

  const findPlaylistForSubJob = (subJobId) => jobsRef.current.find(
    (j) => j.isPlaylist && Array.isArray(j.items) && j.items.some((it) => it.subJobId === subJobId)
  );

  // ---------- IPC subscriptions (registered once) ----------
  const handlersRef = useRef({});
  handlersRef.current = {
    onProgress: (data) => {
      const next = jobsRef.current.map((j) => {
        if (j.isPlaylist && Array.isArray(j.items)) {
          const itemIdx = j.items.findIndex((it) => it.subJobId === data.jobId);
          if (itemIdx === -1 || FINAL_STATUSES.has(j.items[itemIdx].status) || j.status === 'canceled') return j;
          const updatedItems = [...j.items];
          updatedItems[itemIdx] = { ...updatedItems[itemIdx], status: data.status, progress: data };
          const totalPoints = updatedItems.reduce((acc, it) => {
            if (it.status === 'completed') return acc + 100;
            if (isActive(it.status)) return acc + (it.progress?.percent || 0);
            return acc;
          }, 0);
          const overallPercent = Math.min(99.9, totalPoints / Math.max(1, j.totalItems));
          return {
            ...j,
            status: 'downloading',
            activeItemIndex: itemIdx,
            activeSubJobId: data.jobId,
            completedCount: updatedItems.filter((it) => it.status === 'completed').length,
            progress: {
              ...data,
              percent: parseFloat(overallPercent.toFixed(1)),
              currentSongTitle: updatedItems[itemIdx].title,
              currentItemTitle: updatedItems[itemIdx].title,
            },
            items: updatedItems,
          };
        }
        return j.jobId === data.jobId && !FINAL_STATUSES.has(j.status) ? { ...j, status: data.status, progress: data } : j;
      });
      commitJobs(next);
    },

    onComplete: (data) => {
      const playlistJob = findPlaylistForSubJob(data.jobId);
      if (playlistJob) {
        const itemIdx = playlistJob.items.findIndex((it) => it.subJobId === data.jobId);
        finalizePlaylistItem(playlistJob, itemIdx, {
          status: 'completed',
          outputPath: data.outputPath,
          outputSize: data.outputSize,
          progress: { percent: 100 },
        });
        return;
      }
      const job = jobsRef.current.find((j) => j.jobId === data.jobId);
      commitJobs(jobsRef.current.map((j) => (j.jobId === data.jobId
        ? { ...j, status: 'completed', outputSize: data.outputSize, outputPath: data.outputPath, progress: { ...(j.progress || {}), percent: 100 } }
        : j)));
      notifyFinished('Download finished', job?.title || 'Your file is ready.', data.outputPath);
      showToast('Download finished successfully!', 'success');
      scheduleAutoClear(data.jobId);
    },

    onCanceled: (data) => {
      const playlistJob = findPlaylistForSubJob(data.jobId);
      if (playlistJob) return; // playlist items are updated by their cancel handlers
      commitJobs(jobsRef.current.filter((j) => j.jobId !== data.jobId));
      showToast('Download canceled and partial files cleaned.', 'info');
    },

    onError: (data) => {
      const playlistJob = findPlaylistForSubJob(data.jobId);
      if (playlistJob) {
        const itemIdx = playlistJob.items.findIndex((it) => it.subJobId === data.jobId);
        if (FINAL_STATUSES.has(playlistJob.items[itemIdx].status)) return;
        const done = finalizePlaylistItem(playlistJob, itemIdx, { status: 'error', error: data.error });
        showToast(done ? `Download error: ${data.error}` : `Skipped item with error: ${data.error}`, done ? 'error' : 'warning');
        return;
      }
      commitJobs(jobsRef.current.map((j) => (j.jobId === data.jobId ? { ...j, status: 'error', error: data.error } : j)));
      showToast(`Download error: ${data.error}`, 'error');
    },

    // Logs arrive batched from the main process: one state update per batch
    onLogBatch: (batch) => {
      if (!Array.isArray(batch) || batch.length === 0) return;
      const byJob = new Map(batch.map((b) => [b.jobId, b.lines || []]));
      const next = jobsRef.current.map((j) => {
        if (j.isPlaylist && Array.isArray(j.items)) {
          let changed = false;
          let pLogs = j.logs;
          const unitLabel = getItemUnit(j.preset, j.customOptions, { plural: false, capitalize: true });
          const items = j.items.map((it) => {
            const lines = byJob.get(it.subJobId);
            if (!lines) return it;
            changed = true;
            pLogs = appendCapped(pLogs, lines.map((l) => `[${unitLabel} ${it.index}] ${l}`), MAX_PLAYLIST_LOGS);
            return { ...it, logs: appendCapped(it.logs, lines, MAX_JOB_LOGS) };
          });
          return changed ? { ...j, items, logs: pLogs } : j;
        }
        const lines = byJob.get(j.jobId);
        return lines ? { ...j, logs: appendCapped(j.logs, lines, MAX_JOB_LOGS) } : j;
      });
      commitJobs(next);
    },
  };

  useEffect(() => {
    const bridge = api();
    if (!bridge) return undefined;

    bridge.getDefaultOutputDir().then(setSystemOutputDir).catch(() => {});
    bridge.getAppVersion?.().then((v) => v && setAppVersion(v)).catch(() => {});

    bridge.ensureAllEngines()
      .then(setEngineStatus)
      .catch(() => bridge.getEngineStatus().then(setEngineStatus).catch(() => {}));

    const h = handlersRef;
    const unsubs = [
      bridge.onJobProgress((d) => h.current.onProgress(d)),
      bridge.onJobComplete((d) => h.current.onComplete(d)),
      bridge.onJobCanceled((d) => h.current.onCanceled(d)),
      bridge.onJobError((d) => h.current.onError(d)),
      bridge.onJobLog((d) => h.current.onLogBatch(d)),
      bridge.onEngineDownloadProgress(setEngineDownloadProgress),
      bridge.onEngineInstallProgress((data) => {
        if (data.isInstalling) {
          setEngineInstallingState(data);
        } else {
          setEngineInstallingState(null);
          if (data.status) {
            setEngineStatus(data.status);
            showToast('Engines ready: yt-dlp & FFmpeg verified!', 'success');
          }
        }
      }),
      bridge.onUpdateStatus((data) => {
        setUpdateState((prev) => ({
          ...prev,
          status: data.status,
          error: data.error || null,
          latestVersion: data.updateInfo ? data.updateInfo.version : (data.latestVersion || prev.latestVersion),
        }));
        if (data.manual && data.status === 'up-to-date') showToast('You are running the latest version.', 'success');
        if (data.manual && data.status === 'error') showToast(`Update check failed: ${data.error}`, 'error');
      }),
      bridge.onUpdateDownloadProgress((data) => {
        setUpdateState((prev) => ({ ...prev, status: 'downloading', downloadPercent: Math.round(data.percent || 0) }));
      }),
      bridge.onUpdateDownloaded(() => {
        setUpdateState((prev) => ({ ...prev, status: 'downloaded' }));
        showToast('Update downloaded and verified! Check Settings to restart.', 'info');
      }),
    ];

    return () => unsubs.forEach((u) => typeof u === 'function' && u());
  }, [showToast]);

  // ---------- Job actions ----------
  const handleAddJob = async (jobConfig) => {
    const s = settingsRef.current;
    const shared = {
      globalRateLimit: s.rateLimit,
      cookiesBrowser: s.cookiesBrowser,
      proxy: getEffectiveProxy(),
      prefs: buildJobPrefs(s),
      outputDir: jobConfig.outputDir || outputDirRef.current,
    };

    if (jobConfig.isPlaylist) {
      const playlistJobId = jobConfig.jobId || makeId('pl');
      const items = (jobConfig.entries || []).map((entry, idx) => ({
        subJobId: `${playlistJobId}_item_${idx + 1}`,
        index: idx + 1,
        id: entry.id,
        title: entry.title,
        author: entry.author,
        duration: entry.duration,
        thumbnail: entry.thumbnail,
        url: entry.url,
        targetSearch: entry.targetSearch,
        status: 'queued',
        progress: { percent: 0, speed: null, eta: null },
        logs: [],
        outputPath: null,
        outputSize: 0,
        error: null,
      }));

      const playlistJob = {
        ...jobConfig,
        ...shared,
        jobId: playlistJobId,
        isPlaylist: true,
        status: 'downloading',
        totalItems: items.length,
        completedCount: 0,
        progress: { percent: 0, speed: null, eta: null },
        items,
        logs: [],
      };
      delete playlistJob.entries;

      commitJobs([playlistJob, ...jobsRef.current]);
      setActiveTab('queue');
      const unit = getItemUnit(playlistJob.preset, playlistJob.customOptions);
      showToast(`Queued playlist: "${playlistJob.title}" (${items.length} ${unit})`, 'success');
      if (items.length > 0) pumpPlaylistQueueRef.current(playlistJobId);
      return;
    }

    const fullConfig = {
      ...jobConfig,
      ...shared,
      status: 'downloading',
      progress: { percent: 0, speed: null, eta: null },
      logs: [],
    };
    commitJobs([fullConfig, ...jobsRef.current]);
    setActiveTab('queue');

    const result = await api()?.startJob(fullConfig).catch((e) => ({ error: e.message }));
    if (result?.error && !result.canceled) {
      const job = jobsRef.current.find((j) => j.jobId === fullConfig.jobId);
      if (job && isActive(job.status)) handlersRef.current.onError({ jobId: fullConfig.jobId, error: result.error });
    }
  };

  const handleCancelJob = (jobId) => {
    const job = jobsRef.current.find((j) => j.jobId === jobId);
    if (job?.isPlaylist) {
      job.items?.forEach((it) => {
        if (isActive(it.status)) api()?.cancelJob(it.subJobId);
      });
      commitJobs(jobsRef.current.map((j) => (j.jobId === jobId
        ? {
          ...j,
          status: 'canceled',
          items: j.items.map((it) => (isActive(it.status) || it.status === 'queued' ? { ...it, status: 'canceled' } : it)),
        }
        : j)));
      showToast(`Playlist "${job.title}" canceled.`, 'info');
      return;
    }
    api()?.cancelJob(jobId);
  };

  const handleCancelPlaylistItem = (playlistJobId, subJobId) => {
    const playlistJob = jobsRef.current.find((j) => j.jobId === playlistJobId && Array.isArray(j.items));
    const itemIdx = playlistJob?.items.findIndex((it) => it.subJobId === subJobId) ?? -1;
    if (itemIdx === -1) return;

    if (isActive(playlistJob.items[itemIdx].status)) api()?.cancelJob(subJobId);
    finalizePlaylistItem(playlistJob, itemIdx, { status: 'canceled' });
    showToast('Item download canceled.', 'info');
  };

  const handleClearCompleted = () => {
    commitJobs(jobsRef.current.filter((j) => isActive(j.status)));
    showToast('Cleared completed tasks from queue.', 'info');
  };

  const handleNavigateToStudio = (url, info) => {
    setStudioInitialData({ url, info });
    setActiveTab('studio');
  };

  // ---------- Settings actions ----------
  const handleSelectOutputDir = async () => {
    const selected = await api()?.selectFolderDialog();
    if (selected) {
      updateSetting('outputDir', selected);
      showToast(`Output folder set to: ${selected}`, 'success');
    }
  };

  const handleResetOutputDir = () => {
    updateSetting('outputDir', '');
    showToast('Output folder reset to Downloads/itzDownloader.', 'info');
  };

  const handleRefreshEngines = async () => {
    const bridge = api();
    if (!bridge) return;
    try {
      setEngineStatus(await bridge.getEngineStatus(true));
      showToast('Engine and hardware status refreshed.', 'info');
    } catch (e) {
      setEngineStatus(await bridge.getEngineStatus().catch(() => null));
    }
  };

  const runEngineInstall = async (engine, title, detail, installer, label) => {
    const bridge = api();
    if (!bridge) return;
    setIsDownloadingEngine(true);
    setEngineInstallingState({ isInstalling: true, engine, title, percent: 10, detail });
    try {
      setEngineStatus(await installer(bridge));
      showToast(`${label} downloaded and ready!`, 'success');
    } catch (err) {
      showToast(`Failed to download ${label}: ${err.message}`, 'error');
    } finally {
      setIsDownloadingEngine(false);
      setEngineInstallingState(null);
      setEngineDownloadProgress(null);
    }
  };

  const handleDownloadYtDlp = () => runEngineInstall(
    'yt-dlp', 'Downloading yt-dlp Engine...', 'Fetching latest yt-dlp release from GitHub...',
    (b) => b.downloadYtDlp(), 'yt-dlp'
  );

  const handleDownloadFfmpeg = () => runEngineInstall(
    'ffmpeg', 'Configuring FFmpeg & Encoders...', 'Checking itzCut installation or downloading static build...',
    (b) => b.downloadFfmpeg(), 'FFmpeg'
  );

  const handleUpdateYtDlp = async () => api()?.updateYtDlp();
  const handleCheckForUpdates = () => api()?.checkForUpdates();
  const handleInstallUpdate = () => api()?.quitAndInstallUpdate();

  const handleResetSettings = () => {
    resetSettings();
    showToast('All preferences restored to defaults.', 'info');
  };

  // ---------- Derived UI state ----------
  const activeJobsCount = jobs.filter((j) => isActive(j.status)).length;
  const currentRunningJob = jobs.find((j) => isActive(j.status));

  const isUpdateDownloading = updateState.status === 'downloading' || updateState.status === 'installing';
  const isEngineInstalling = !!engineInstallingState?.isInstalling;
  const isLocked = isEngineInstalling || isUpdateDownloading;

  // Lock all input while engines/updates are being written to disk
  useEffect(() => {
    if (!isLocked) return undefined;
    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const types = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'contextmenu'];
    types.forEach((t) => window.addEventListener(t, blockEvent, true));
    window.addEventListener('wheel', blockEvent, { passive: false, capture: true });
    return () => {
      types.forEach((t) => window.removeEventListener(t, blockEvent, true));
      window.removeEventListener('wheel', blockEvent, { capture: true });
    };
  }, [isLocked]);

  const lockPercent = isUpdateDownloading ? (updateState.downloadPercent || 0) : (engineInstallingState?.percent || 15);

  return (
    <div className="app-container">
      <TitleBar currentJobTitle={currentRunningJob?.title} onResetApp={() => setActiveTab('instant')} />

      <div className="app-main">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeJobsCount={activeJobsCount}
          onResetApp={() => setActiveTab('instant')}
        />

        <main className="content-viewport">
          <div key={activeTab} className={settings.animations ? 'page-view-animated' : ''}>
            {activeTab === 'instant' && (
              <InstantTab
                onAddJob={handleAddJob}
                onShowToast={showToast}
                defaultOutputDir={defaultOutputDir}
                onNavigateToStudio={handleNavigateToStudio}
                onNavigateToQueue={() => setActiveTab('queue')}
                activeJobs={jobs}
                engineStatus={engineStatus}
                proxySettings={{ enabled: settings.proxyEnabled, url: settings.proxyUrl }}
              />
            )}

            {activeTab === 'studio' && (
              <StudioTab
                initialUrl={studioInitialData.url}
                initialMediaInfo={studioInitialData.info}
                onAddJob={handleAddJob}
                onShowToast={showToast}
                defaultOutputDir={defaultOutputDir}
                engineStatus={engineStatus}
                proxySettings={{ enabled: settings.proxyEnabled, url: settings.proxyUrl }}
                globalRateLimit={settings.rateLimit}
                globalCookiesBrowser={settings.cookiesBrowser}
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
                settings={settings}
                onUpdateSetting={updateSetting}
                onUpdateSettings={updateSettings}
                onResetSettings={handleResetSettings}
                engineStatus={engineStatus}
                defaultOutputDir={defaultOutputDir}
                isCustomOutputDir={!!settings.outputDir}
                onSelectOutputDir={handleSelectOutputDir}
                onResetOutputDir={handleResetOutputDir}
                onRefreshEngines={handleRefreshEngines}
                onDownloadYtDlp={handleDownloadYtDlp}
                onUpdateYtDlp={handleUpdateYtDlp}
                onDownloadFfmpeg={handleDownloadFfmpeg}
                isDownloadingEngine={isDownloadingEngine}
                engineDownloadProgress={engineDownloadProgress}
                appVersion={appVersion}
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
            <button type="button" className="app-footer-link" onClick={() => api()?.openExternal('https://itzcrih.it')}>
              itzcrih.it
            </button>
            <span> — Ultra-fast media downloader</span>
          </div>

          <div>
            <span>Join our Discord: </span>
            <button type="button" className="app-footer-link" onClick={() => api()?.openExternal('https://community.itzcrih.it')}>
              community.itzcrih.it
            </button>
          </div>

          <div>
            <span style={{ fontFamily: 'var(--font-mono)' }}>itzDownloader Desktop v{appVersion}</span>
          </div>
        </footer>
      </div>

      {/* Full-screen blocking overlay during engine setup or update downloads */}
      {isLocked && (
        <div className="engine-blocking-overlay" role="dialog" aria-modal="true">
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
                ? 'Please wait while the update is downloaded and verified. Interactions are locked to prevent corruption.'
                : (engineInstallingState?.detail || 'Preparing yt-dlp & FFmpeg binaries. Interactions are locked to prevent corruption.')}
            </p>

            <div className="engine-blocking-progress-wrap">
              <div className="engine-blocking-track">
                <div className="engine-blocking-fill" style={{ width: `${Math.max(8, Math.min(100, lockPercent || 15))}%` }} />
              </div>
              <div className="engine-blocking-stats">
                <span>{lockPercent}%</span>
                <span>
                  {isUpdateDownloading
                    ? (updateState.status === 'installing' ? 'Finalizing Setup...' : 'Downloading Assets')
                    : (engineInstallingState?.engine ? `Engine: ${engineInstallingState.engine.toUpperCase()}` : 'Verifying local dependencies')}
                </span>
              </div>
            </div>

            <div className="engine-blocking-lock-banner">
              <Lock size={12} />
              <span>Interactions temporarily locked until the process completes</span>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
