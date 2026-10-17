export function detectPlatform(url = '') {
  const u = (url || '').toLowerCase();

  if (u.includes('youtube.com') || u.includes('youtu.be')) {
    return {
      id: 'youtube',
      name: 'YouTube',
      color: '#FF0000',
      badgeBg: 'rgba(255, 0, 0, 0.12)',
      badgeBorder: 'rgba(255, 0, 0, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('tiktok.com')) {
    return {
      id: 'tiktok',
      name: 'TikTok',
      color: '#00F2FE',
      badgeBg: 'rgba(0, 242, 254, 0.12)',
      badgeBorder: 'rgba(0, 242, 254, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('spotify.com')) {
    return {
      id: 'spotify',
      name: 'Spotify',
      color: '#1DB954',
      badgeBg: 'rgba(29, 185, 84, 0.14)',
      badgeBorder: 'rgba(29, 185, 84, 0.4)',
      isAudioSupported: true,
      isVideoSupported: false,
    };
  }

  if (u.includes('instagram.com')) {
    return {
      id: 'instagram',
      name: 'Instagram',
      color: '#E1306C',
      badgeBg: 'rgba(225, 48, 108, 0.14)',
      badgeBorder: 'rgba(225, 48, 108, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('twitter.com') || u.includes('x.com')) {
    return {
      id: 'twitter',
      name: 'X (Twitter)',
      color: '#1DA1F2',
      badgeBg: 'rgba(29, 161, 242, 0.14)',
      badgeBorder: 'rgba(29, 161, 242, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('soundcloud.com')) {
    return {
      id: 'soundcloud',
      name: 'SoundCloud',
      color: '#FF5500',
      badgeBg: 'rgba(255, 85, 0, 0.14)',
      badgeBorder: 'rgba(255, 85, 0, 0.35)',
      isAudioSupported: true,
      isVideoSupported: false,
    };
  }

  if (u.includes('twitch.tv')) {
    return {
      id: 'twitch',
      name: 'Twitch',
      color: '#9146FF',
      badgeBg: 'rgba(145, 70, 255, 0.14)',
      badgeBorder: 'rgba(145, 70, 255, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('facebook.com') || u.includes('fb.watch')) {
    return {
      id: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      badgeBg: 'rgba(24, 119, 242, 0.14)',
      badgeBorder: 'rgba(24, 119, 242, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('reddit.com')) {
    return {
      id: 'reddit',
      name: 'Reddit',
      color: '#FF4500',
      badgeBg: 'rgba(255, 69, 0, 0.14)',
      badgeBorder: 'rgba(255, 69, 0, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  if (u.includes('vimeo.com')) {
    return {
      id: 'vimeo',
      name: 'Vimeo',
      color: '#1AB7EA',
      badgeBg: 'rgba(26, 183, 234, 0.14)',
      badgeBorder: 'rgba(26, 183, 234, 0.35)',
      isAudioSupported: true,
      isVideoSupported: true,
    };
  }

  return {
    id: 'generic',
    name: 'Web Media',
    color: '#e6b422',
    badgeBg: 'rgba(230, 180, 34, 0.12)',
    badgeBorder: 'rgba(230, 180, 34, 0.35)',
    isAudioSupported: true,
    isVideoSupported: true,
  };
}
