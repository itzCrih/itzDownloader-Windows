const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function getGitHubToken() {
  try {
    const out = cp.execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
    }).toString();
    const match = out.match(/password=(.*)/);
    if (match) return match[1].trim();
  } catch (e) {}

  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  try {
    const ghAuthToken = cp.execSync('gh auth token').toString().trim();
    if (ghAuthToken) return ghAuthToken;
  } catch (e) {}

  throw new Error('Could not find GitHub token. Please run `gh auth login` or set GH_TOKEN.');
}

async function publishRelease() {
  const rootDir = path.resolve(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = pkg.version;
  const tag = `v${version}`;
  const name = `itzDownloader Desktop v${version}`;

  const token = getGitHubToken();
  const owner = 'itzCrih';
  const repo = 'itzDownloader-Windows';

  const body = `## itzDownloader Desktop v${version}

### Core Features & Architecture
- **100% Local & Native:** Powered by embedded/local \`yt-dlp\` and native \`FFmpeg\`. Zero third-party web trackers or server reliance.
- **Dual Mode Workflow:**
  - **Instant Download:** Paste link, auto-detect platform, 1-click download with optimized presets (Best MP4, 1080p, MP3 320k, Studio FLAC, TikTok Clean).
  - **Media Studio:** Full granular control over containers (MP4/MKV/WebM), resolution ceilings (4K UHD to 480p), audio codecs (MP3, FLAC, WAV, AAC, Opus), subtitles, and browser cookies integration.
- **Spotify Smart Resolver:** Paste any Spotify track link to automatically query metadata via Spotify oEmbed and fetch high-fidelity audio with embedded album cover art and ID3 tags.
- **Automated Engine Management:** Probes and automatically downloads \`yt-dlp.exe\` and static \`FFmpeg\` binaries with hardware acceleration detection (\`NVENC\`, \`QSV\`, \`AMF\`).
- **Real-Time Streaming Queue:** Live speed, ETA, and progress bar with detailed console inspection.

### Official Downloads
- **itzDownloader-Desktop-Setup-${version}.exe** — Complete Windows NSIS Installer (x64)
- **itzDownloader-Desktop-${version}-Portable.exe** — Standalone Portable Edition (x64)`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'itzDownloader-Release-Publisher',
  };

  console.log(`Checking existing releases for ${owner}/${repo}...`);
  const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, { credentials: 'omit', headers });
  if (!listRes.ok) {
    throw new Error(`Failed to list releases: ${listRes.status} ${await listRes.text()}`);
  }
  const releases = await listRes.json();
  let release = releases.find((r) => r.tag_name === tag);

  if (release) {
    console.log(`Release ${tag} already exists (id: ${release.id}). Updating metadata...`);
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body, draft: false, prerelease: false }),
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update release: ${updateRes.status} ${await updateRes.text()}`);
    }
  } else {
    console.log(`Creating release ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_name: tag, target_commitish: 'main', name, body, draft: false, prerelease: false }),
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create release: ${createRes.status} ${await createRes.text()}`);
    }
    release = await createRes.json();
  }

  console.log(`Release ${tag} is ready at: ${release.html_url}`);
}

publishRelease().catch((err) => {
  console.error('Publish error:', err.message);
  process.exit(1);
});
