import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import InstantTab from './tabs/InstantTab';
import StudioTab from './tabs/StudioTab';
import QueueTab from './tabs/QueueTab';
import SettingsTab from './tabs/SettingsTab';
import { playCompletionChime } from './utils/sound';

export default function App() {
  const [activeTab, setActiveTab] = useState('instant');
  const [studioInitialData, setStudioInitialData] = useState({ url: '', info: null });
  const [defaultOutputDir, setDefaultOutputDir] = useState('');
  const [engineStatus, setEngineStatus] = useState(null);
  const [isDownloadingEngine, setIsDownloadingEngine] = useState(false);
  const [engineDownloadProgress, setEngineDownloadProgress] = useState(null);
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
    currentVersion: '1.1.0',
    latestVersion: '1.1.0',
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

  // Initial startup probe
  useEffect(() => {
    if (!window.itzDownloaderAPI) return;

    window.itzDownloaderAPI.getDefaultOutputDir().then(setDefaultOutputDir);

    window.itzDownloaderAPI.getEngineStatus().then((status) => {
      setEngineStatus(status);
      if (!status.ytDlpAvailable) {
        showToast('yt-dlp is not installed. Click Settings to download it automatically.', 'warning');
      }
    });

    // Subscriptions
    const unsubProgress = window.itzDownloaderAPI.onJobProgress((data) => {
      setJobs((prev) =>
        prev.map((j) => (j.jobId === data.jobId ? { ...j, status: data.status, progress: data } : j))
      );
    });

    const unsubComplete = window.itzDownloaderAPI.onJobComplete((data) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === data.jobId
            ? { ...j, status: 'completed', outputSize: data.outputSize, outputPath: data.outputPath }
            : j
        )
      );
      if (soundEnabled) playCompletionChime();
      showToast('Download finished successfully!', 'success');
    });

    const unsubCanceled = window.itzDownloaderAPI.onJobCanceled((data) => {
      setJobs((prev) => prev.filter((j) => j.jobId !== data.jobId));
      showToast('Download canceled and partial files cleaned.', 'info');
    });

    const unsubError = window.itzDownloaderAPI.onJobError((data) => {
      setJobs((prev) =>
        prev.map((j) => (j.jobId === data.jobId ? { ...j, status: 'error', error: data.error } : j))
      );
      showToast(`Download error: ${data.error}`, 'error');
    });

    const unsubLog = window.itzDownloaderAPI.onJobLog((data) => {
      setJobs((prev) =>
        prev.map((j) => {
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

    const unsubUpdateStatus = window.itzDownloaderAPI.onUpdateStatus((data) => {
      setUpdateState((prev) => ({
        ...prev,
        status: data.status,
        latestVersion: data.updateInfo ? data.updateInfo.version : prev.latestVersion,
      }));
    });

    const unsubUpdateDownloaded = window.itzDownloaderAPI.onUpdateDownloaded(() => {
      setUpdateState((prev) => ({ ...prev, status: 'downloaded' }));
      showToast('Update ready to install! Check Settings.', 'info');
    });

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubComplete) unsubComplete();
      if (unsubCanceled) unsubCanceled();
      if (unsubError) unsubError();
      if (unsubLog) unsubLog();
      if (unsubEngineDownload) unsubEngineDownload();
      if (unsubUpdateStatus) unsubUpdateStatus();
      if (unsubUpdateDownloaded) unsubUpdateDownloaded();
    };
  }, [soundEnabled]);

  const handleResetApp = () => {
    setActiveTab('instant');
  };

  const handleAddJob = async (jobConfig) => {
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
    if (window.itzDownloaderAPI) {
      window.itzDownloaderAPI.cancelJob(jobId);
    }
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
      const s = await window.itzDownloaderAPI.getEngineStatus();
      setEngineStatus(s);
      showToast('Engine status refreshed.', 'info');
    }
  };

  const handleDownloadYtDlp = async () => {
    if (!window.itzDownloaderAPI) return;
    setIsDownloadingEngine(true);
    try {
      const updated = await window.itzDownloaderAPI.downloadYtDlp();
      setEngineStatus(updated);
      showToast('yt-dlp downloaded and ready!', 'success');
    } catch (err) {
      showToast(`Failed to download yt-dlp: ${err.message}`, 'error');
    } finally {
      setIsDownloadingEngine(false);
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
    try {
      const updated = await window.itzDownloaderAPI.downloadFfmpeg();
      setEngineStatus(updated);
      showToast('FFmpeg downloaded and ready!', 'success');
    } catch (err) {
      showToast(`Failed to download FFmpeg: ${err.message}`, 'error');
    } finally {
      setIsDownloadingEngine(false);
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
            <span style={{ fontFamily: 'var(--font-mono)' }}>itzDownloader Desktop v1.1.0</span>
          </div>
        </footer>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
