// Strict domain whitelist of the most popular and trusted media platforms
export const WHITELIST_DOMAINS = [
  // YouTube
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'music.youtube.com',

  // TikTok (including mobile shortlinks)
  'tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'v.tiktok.com',
  'm.tiktok.com',
  'mv.tiktok.com',

  // Spotify
  'spotify.com',
  'open.spotify.com',

  // Instagram & Threads
  'instagram.com',
  'instagr.am',
  'threads.net',

  // Twitter (X)
  'twitter.com',
  'x.com',
  't.co',

  // SoundCloud
  'soundcloud.com',
  'm.soundcloud.com',
  'on.soundcloud.com',

  // Twitch
  'twitch.tv',
  'clips.twitch.tv',

  // Facebook
  'facebook.com',
  'fb.watch',
  'fb.com',
  'm.facebook.com',

  // Reddit
  'reddit.com',
  'v.redd.it',
  'redd.it',

  // Vimeo
  'vimeo.com',
  'player.vimeo.com',

  // Pinterest
  'pinterest.com',
  'pin.it',

  // Dailymotion
  'dailymotion.com',
  'dai.ly',

  // Bilibili
  'bilibili.com',
  'b23.tv',

  // Bandcamp & Audio
  'bandcamp.com',
  'podcasts.apple.com',

  // Streamable & Kick
  'streamable.com',
  'kick.com',
];

export function extractHostname(url = '') {
  try {
    const raw = (url || '').trim();
    if (!raw) return '';
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

export function isDomainAllowed(url = '') {
  const host = extractHostname(url);
  if (!host) return false;
  return WHITELIST_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function detectPlatform(url = '') {
  const clean = (url || '').trim();
  if (!clean) {
    return {
      id: 'none',
      name: 'Enter Link',
      color: '#e6b422',
      badgeBg: 'rgba(230, 180, 34, 0.12)',
      badgeBorder: 'rgba(230, 180, 34, 0.35)',
      isAllowed: false,
      isAudioOnly: false,
      isVideoSupported: true,
      reason: null,
    };
  }

  const host = extractHostname(clean);
  const u = clean.toLowerCase();

  const isAllowed = isDomainAllowed(clean);

  if (!isAllowed) {
    return {
      id: 'blocked',
      name: 'Untrusted Domain',
      color: '#f85149',
      badgeBg: 'rgba(248, 81, 73, 0.12)',
      badgeBorder: 'rgba(248, 81, 73, 0.35)',
      isAllowed: false,
      isAudioOnly: false,
      isVideoSupported: false,
      reason: 'Domain is not in the verified whitelist. Only safe, trusted platforms (YouTube, TikTok, Spotify, Instagram, Twitter, SoundCloud, etc.) are permitted.',
    };
  }

  // YouTube / YouTube Music
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
    const isMusic = host === 'music.youtube.com';
    const isShorts = u.includes('/shorts/');
    return {
      id: 'youtube',
      name: isMusic ? 'YouTube Music' : 'YouTube',
      color: '#FF0000',
      badgeBg: 'rgba(255, 0, 0, 0.12)',
      badgeBorder: 'rgba(255, 0, 0, 0.35)',
      isAllowed: true,
      isAudioOnly: isMusic,
      isShorts,
      isVideoSupported: !isMusic,
    };
  }

  // TikTok
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return {
      id: 'tiktok',
      name: 'TikTok',
      color: '#00F2FE',
      badgeBg: 'rgba(0, 242, 254, 0.12)',
      badgeBorder: 'rgba(0, 242, 254, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
      isShorts: true,
    };
  }

  // Spotify
  if (host === 'spotify.com' || host.endsWith('.spotify.com')) {
    return {
      id: 'spotify',
      name: 'Spotify',
      color: '#1DB954',
      badgeBg: 'rgba(29, 185, 84, 0.14)',
      badgeBorder: 'rgba(29, 185, 84, 0.4)',
      isAllowed: true,
      isAudioOnly: true,
      isVideoSupported: false,
    };
  }

  // Instagram / Threads
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am' || host === 'threads.net') {
    return {
      id: 'instagram',
      name: host.includes('threads') ? 'Threads' : 'Instagram',
      color: '#E1306C',
      badgeBg: 'rgba(225, 48, 108, 0.14)',
      badgeBorder: 'rgba(225, 48, 108, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
      isShorts: u.includes('/reel/') || u.includes('/reels/'),
    };
  }

  // Twitter (X) - User explicitly asked: "e Twitter, chiamalo solo Twitter, non X"
  if (host === 'twitter.com' || host === 'x.com' || host === 't.co') {
    return {
      id: 'twitter',
      name: 'Twitter',
      color: '#1DA1F2',
      badgeBg: 'rgba(29, 161, 242, 0.14)',
      badgeBorder: 'rgba(29, 161, 242, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // SoundCloud
  if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) {
    return {
      id: 'soundcloud',
      name: 'SoundCloud',
      color: '#FF5500',
      badgeBg: 'rgba(255, 85, 0, 0.14)',
      badgeBorder: 'rgba(255, 85, 0, 0.35)',
      isAllowed: true,
      isAudioOnly: true,
      isVideoSupported: false,
    };
  }

  // Twitch
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) {
    return {
      id: 'twitch',
      name: 'Twitch',
      color: '#9146FF',
      badgeBg: 'rgba(145, 70, 255, 0.14)',
      badgeBorder: 'rgba(145, 70, 255, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // Facebook
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch' || host === 'fb.com') {
    return {
      id: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      badgeBg: 'rgba(24, 119, 242, 0.14)',
      badgeBorder: 'rgba(24, 119, 242, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // Reddit
  if (host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it' || host === 'v.redd.it') {
    return {
      id: 'reddit',
      name: 'Reddit',
      color: '#FF4500',
      badgeBg: 'rgba(255, 69, 0, 0.14)',
      badgeBorder: 'rgba(255, 69, 0, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // Vimeo
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return {
      id: 'vimeo',
      name: 'Vimeo',
      color: '#1AB7EA',
      badgeBg: 'rgba(26, 183, 234, 0.14)',
      badgeBorder: 'rgba(26, 183, 234, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // Bandcamp
  if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) {
    return {
      id: 'bandcamp',
      name: 'Bandcamp',
      color: '#629aa9',
      badgeBg: 'rgba(98, 154, 169, 0.14)',
      badgeBorder: 'rgba(98, 154, 169, 0.35)',
      isAllowed: true,
      isAudioOnly: true,
      isVideoSupported: false,
    };
  }

  // Bilibili
  if (host === 'bilibili.com' || host.endsWith('.bilibili.com') || host === 'b23.tv') {
    return {
      id: 'bilibili',
      name: 'Bilibili',
      color: '#00A1D6',
      badgeBg: 'rgba(0, 161, 214, 0.14)',
      badgeBorder: 'rgba(0, 161, 214, 0.35)',
      isAllowed: true,
      isAudioOnly: false,
      isVideoSupported: true,
    };
  }

  // Other whitelisted platforms (Kick, Streamable, Dailymotion, Pinterest, etc.)
  return {
    id: host.split('.')[0] || 'media',
    name: host.charAt(0).toUpperCase() + host.slice(1),
    color: '#e6b422',
    badgeBg: 'rgba(230, 180, 34, 0.12)',
    badgeBorder: 'rgba(230, 180, 34, 0.35)',
    isAllowed: true,
    isAudioOnly: false,
    isVideoSupported: true,
  };
}
