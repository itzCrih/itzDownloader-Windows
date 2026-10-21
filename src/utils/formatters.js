export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function isVideoJobOrPreset(preset, customOptions, platform, mediaInfo) {
  if (customOptions?.mediaType) {
    return customOptions.mediaType === 'video';
  }
  if (['mp3_320', 'flac', 'wav', 'aac', 'opus'].includes(preset)) {
    return false;
  }
  if (['best_video', '1080p', '4k', '720p', 'tiktok_clean'].includes(preset)) {
    return true;
  }
  if (mediaInfo?.isAudioOnly || platform?.isAudioOnly) {
    return false;
  }
  return true;
}

export function getItemUnit(preset, customOptions, { plural = true, capitalize = false, platform, mediaInfo } = {}) {
  const isVideo = isVideoJobOrPreset(preset, customOptions, platform, mediaInfo);
  if (isVideo) {
    if (plural) return capitalize ? 'Videos' : 'videos';
    return capitalize ? 'Video' : 'video';
  } else {
    if (mediaInfo?.isAlbum || platform?.id === 'spotify') {
      if (plural) return capitalize ? 'Tracks' : 'tracks';
      return capitalize ? 'Track' : 'track';
    }
    if (plural) return capitalize ? 'Songs' : 'songs';
    return capitalize ? 'Song' : 'song';
  }
}

