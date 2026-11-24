import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'itzdownloader_settings_v2';

export const DEFAULT_SETTINGS = Object.freeze({
  // Storage
  outputDir: '',
  filenameTemplate: 'title_id',
  organizeByPlatform: false,
  overwriteFiles: false,
  // Network & engine
  concurrency: 'auto',
  concurrentFragments: '4',
  retries: '10',
  rateLimit: 'unlimited',
  cookiesBrowser: 'auto',
  proxyEnabled: false,
  proxyUrl: '',
  // Processing
  embedChapters: true,
  sponsorBlock: false,
  preferredEncoder: 'auto',
  // Experience
  accentColor: 'gold',
  animations: true,
  sound: true,
  notifications: true,
  autoClearCompleted: false,
  autoOpenFolder: false,
  compactMode: false,
});

export const ACCENT_COLORS = [
  { id: 'gold', label: 'Gold', hex: '#e6b422' },
  { id: 'blue', label: 'Ocean', hex: '#4f8cff' },
  { id: 'emerald', label: 'Emerald', hex: '#2fbf71' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'cyan', label: 'Cyan', hex: '#22c3d6' },
];

/** Settings saved by v1.2.x were spread over individual localStorage keys. */
function readLegacySettings() {
  const legacy = {};
  try {
    const get = (k) => localStorage.getItem(k);
    if (get('itzdownloader_animations') !== null) legacy.animations = get('itzdownloader_animations') !== 'false';
    if (get('itzdownloader_sound') !== null) legacy.sound = get('itzdownloader_sound') !== 'false';
    if (get('itzdownloader_ratelimit')) legacy.rateLimit = get('itzdownloader_ratelimit');
    if (get('itzdownloader_cookies')) legacy.cookiesBrowser = get('itzdownloader_cookies');
    if (get('itzdownloader_concurrency')) legacy.concurrency = get('itzdownloader_concurrency');
    if (get('itzdownloader_proxy_enabled') !== null) legacy.proxyEnabled = get('itzdownloader_proxy_enabled') === 'true';
    if (get('itzdownloader_proxy_url')) legacy.proxyUrl = get('itzdownloader_proxy_url');
  } catch (e) {}
  return legacy;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Only keep known keys so stale/unknown values never leak into jobs
        const clean = {};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          if (key in parsed && typeof parsed[key] === typeof DEFAULT_SETTINGS[key]) clean[key] = parsed[key];
        }
        return { ...DEFAULT_SETTINGS, ...clean };
      }
    }
  } catch (e) {}
  return { ...DEFAULT_SETTINGS, ...readLegacySettings() };
}

/**
 * Single source of truth for user preferences, persisted as one JSON blob.
 */
export default function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Apply appearance settings to <html> so derived CSS variables recompute
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accentColor;
    root.dataset.motion = settings.animations ? 'on' : 'off';
    root.dataset.density = settings.compactMode ? 'compact' : 'comfortable';
  }, [settings.accentColor, settings.animations, settings.compactMode]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, outputDir: prev.outputDir }));
  }, []);

  return { settings, updateSetting, updateSettings, resetSettings };
}

/** Options forwarded to the main process with every job. */
export function buildJobPrefs(settings) {
  return {
    filenameTemplate: settings.filenameTemplate,
    organizeByPlatform: settings.organizeByPlatform,
    concurrentFragments: settings.concurrentFragments,
    retries: settings.retries,
    sponsorBlock: settings.sponsorBlock,
    embedChapters: settings.embedChapters,
    overwriteFiles: settings.overwriteFiles,
    preferredEncoder: settings.preferredEncoder,
  };
}
