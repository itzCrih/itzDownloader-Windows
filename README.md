<div align="center">

# itzDownloader Desktop (Windows)

**ULTRA-FAST, LIGHTWEIGHT 100% LOCAL MULTIMEDIA DOWNLOADER**  
**POWERED BY NATIVE YT-DLP & FFMPEG ENGINE**

The high-performance, private Windows workstation for instant video & audio downloads from YouTube, TikTok, Spotify, Instagram, and over 1,000+ online media platforms.

[![Platform](https://img.shields.io/badge/Platform-Windows_10_%7C_11_(x64)-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/itzCrih/itzDownloader-Windows/releases/latest)
[![Version](https://img.shields.io/badge/Version-v1.3.0-e6b422?style=for-the-badge)](https://github.com/itzCrih/itzDownloader-Windows/releases/latest)
[![Engine](https://img.shields.io/badge/yt--dlp-Native_v2025+-black?style=for-the-badge)](https://github.com/yt-dlp/yt-dlp)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-v7.1_Native-black?style=for-the-badge)](https://ffmpeg.org)
[![Signed](https://img.shields.io/badge/Code_Signing-Authenticode_Signed-2ea043?style=for-the-badge&logo=shield&logoColor=white)](certs/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

<br />

### Download itzDownloader Desktop (v1.3.0)

[![Download Setup](https://img.shields.io/badge/Download_Installer-itzDownloader_Desktop_Setup_(v1.3.0)-e6b422?style=for-the-badge&logo=windows&logoColor=black)](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.3.0/itzDownloader-Desktop-Setup-1.3.0.exe)  
[![Download Portable](https://img.shields.io/badge/Download_Portable-itzDownloader_Desktop_Portable_(v1.3.0)-ffffff?style=for-the-badge&logo=windows&logoColor=black)](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.3.0/itzDownloader-Desktop-1.3.0-Portable.exe)

| Package | Format | Architecture | Direct Link |
| :--- | :--- | :--- | :--- |
| **Windows Installer** | NSIS Setup `.exe` | Windows 10 / 11 (x64) | [itzDownloader-Desktop-Setup-1.3.0.exe](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.3.0/itzDownloader-Desktop-Setup-1.3.0.exe) |
| **Standalone Portable** | Portable `.exe` | Windows 10 / 11 (x64) | [itzDownloader-Desktop-1.3.0-Portable.exe](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.3.0/itzDownloader-Desktop-1.3.0-Portable.exe) |

*Authenticode code signed with DigiCert RFC 3161 timestamps. Built-in Auto-Updater checks for future releases seamlessly on startup.*

</div>

---

## Why itzDownloader Desktop?

- **100% Local and Private Processing:** All streams are fetched directly to your machine. No proxy servers intercepting your traffic, no third-party logging, and no accounts required.
- **Instant Launch and Minimal Overhead:** Clean memory footprint, instant startup, and zero background telemetry or bloatware.
- **Dual-Mode Workflow:**
  - **Instant Mode:** Paste a link, auto-detect the platform, and start a 1-click download with optimized presets (Best MP4, 1080p, MP3 320k, Studio FLAC, TikTok Clean).
  - **Media Studio:** Granular control over containers (MP4, MKV, WebM), resolution ceilings (4K UHD to 480p, custom resolutions), audio codecs, subtitle embedding, chapter extraction, SponsorBlock, and browser cookies.
- **Spotify Smart Audio Resolver:** Paste any Spotify track, playlist, or album link to query metadata and automatically fetch high-fidelity audio with embedded album art and ID3 tags.
- **Zero Configuration Required:** Automatically probes your system, identifies dedicated GPUs and CPUs, verifies hardware capabilities, and downloads static yt-dlp and FFmpeg binaries automatically if missing.

---

## Core Capabilities

### 1. Instant Download Engine
- **1-Click Preset Selection:**
  - **Best Video (MP4):** Max native resolution (up to 4K / 8K 60fps) with AAC stereo audio auto-merged.
  - **Full HD 1080p:** Fast, balanced download for everyday viewing.
  - **MP3 Audio (320 kbps):** High-bitrate audio with embedded track titles, artist metadata, and cover art.
  - **Studio FLAC:** Lossless bit-perfect audio for high-fidelity collections.
  - **TikTok Clean:** Original vertical stream without platform watermarks.
- **Clipboard Auto-Detection:** Instant paste button checks clipboard automatically on focus.
- **Batch and Playlist Support:** Direct extraction and queuing of YouTube and Spotify playlists with track-by-track controls and resilient fallback.

### 2. Advanced Media Studio
- **Container Selection:** Universal MP4, Matroska MKV, or WebM.
- **Resolution Control:** 4K UHD (2160p), 2K QHD (1440p), Full HD (1080p), HD (720p), SD (480p), or Source Passthrough, plus custom resolution inputs (e.g. 1920x1080, 1080x1920 for vertical video).
- **Video Encoders:** Configurable preferred encoder selection (Auto, H.264 / AVC, H.265 / HEVC, AV1, VP9) with hardware acceleration support (NVIDIA NVENC, Intel QSV, AMD AMF).
- **Audio Extraction:** MP3 (128k to 320k), FLAC, WAV (PCM Uncompressed), AAC (M4A), Opus, and OGG Vorbis.
- **Post-Processing and Enhancements:**
  - **Embedded Chapters:** Retain original chapter markers in downloaded media.
  - **SponsorBlock Integration:** Automatically mark or remove sponsored segments, intros, and outros.
  - **Silent Video Stream:** Strip audio tracks to export clean B-roll footage.
- **Subtitles Engine:** Multi-language subtitle downloader with container embedding or external SRT export.
- **Browser Cookies Integration:** Local session cookie extraction from Google Chrome, Firefox, Edge, or Brave to access age-restricted or member-only content.
- **Network and Engine Customization:** Expandable settings for proxy configuration (HTTP, HTTPS, SOCKS4, SOCKS5), concurrent connections per download, retry attempts, download speed limits, and custom yt-dlp arguments.

### 3. Queue and Download Management
- **Smooth Real-Time Progress:** Batched progress updates and log stream ensuring high UI responsiveness during heavy downloads.
- **Parallel Multi-Downloading:** Dynamic concurrency scaling (Auto, 1, 2, or 3 simultaneous streams) based on system hardware.
- **Interactive Controls:** Cancel active downloads with automatic partial file cleanup, reveal files in Windows Explorer, or launch playback.
- **Diagnostic Terminal:** Expandable real-time engine console with 1-click log copying and full text selection.

### 4. Customization and Settings
- **Accent Colors:** 6 selectable theme colors (Yellow, Emerald, Cyan, Purple, Rose, Orange).
- **Layout Modes:** Standard and Compact layout modes with fluid transitions.
- **File Organization:** Custom filename templates and optional automatic sorting into platform-specific subfolders.
- **File Conflict Handling:** Configurable overwrite rules for existing files.
- **Notifications and Automation:** Windows desktop notifications on task completion and optional auto-clearing of finished jobs.
- **Settings Persistence:** Unified configuration storage with automatic legacy migration and one-click reset to defaults.

---

## Supported Platforms

Compatible with over 1,000+ media sites via yt-dlp:

| Platform | Video Support | Audio Extraction | Quality |
| :--- | :--- | :--- | :--- |
| **YouTube** | Up to 4K / 8K @ 60fps | MP3 320k / FLAC / M4A | Native Source |
| **TikTok** | Clean MP4 (No Watermark) | MP3 Audio | Original Stream |
| **Spotify** | Smart Metadata Resolver | MP3 320k / FLAC | High Fidelity |
| **Instagram** | Reels / Stories / Posts | MP3 Audio | HD Original |
| **SoundCloud** | — | High-rate MP3 / AAC | Original Stream |
| **X (Twitter)** | MP4 Video Streams | MP3 Audio | Best Available |
| **Twitch** | VODs / Clips | AAC / MP3 | Up to 1080p 60fps |
| **Reddit and Vimeo** | MP4 Video Streams | MP3 Audio | Native Source |

---

## Tech Stack & Architecture

- **UI Framework:** React 18, Vite 6, Lucide Icons, Custom Animated Component System (animated dropdowns with keyboard navigation, custom checkboxes, toggles, and expandable drawers)
- **Runtime:** Electron 34 with Sandboxed Context Isolation (`preload.js`) and strict Content Security Policy (CSP)
- **CLI Engines:** yt-dlp standalone binary and FFmpeg v7.1 with GPU Acceleration (NVENC, QSV, AMF)
- **Audio Synthesizer:** Melodic notification chime via native Web Audio API (persistent audio context lifecycle)
- **Packaging:** NSIS Installer + Standalone Portable via electron-builder

---

## Development & Building from Source

### Prerequisites
- Node.js 18+ (tested on Node.js 22/25)
- npm or yarn
- Git

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/itzCrih/itzDownloader-Windows.git
cd itzDownloader-Windows

# Install dependencies
npm install

# Start development workstation
npm start
```

### Production Packaging

```bash
# Build standard NSIS installer
npm run dist

# Build standalone portable executable
npm run dist:portable
```

---

## Security & Privacy Policy

itzDownloader Desktop is engineered with a strict security-first architecture:
1. **Sandboxed Architecture:** Sandboxed renderer process enforcing strict Content Security Policy and context isolation.
2. **Safe Link and Process Handling:** External navigation is restricted strictly to HTTPS and HTTP protocols; executable files are revealed in Explorer rather than directly executed.
3. **Strict Parameter Validation:** Proxies, cookies, rate limits, and custom flags are strictly sanitized and validated against whitelist constraints.
4. **Zero Shell Injection:** All process invocations use structured argument arrays via child_process.spawn. Raw unescaped shell execution is strictly prohibited.
5. **Secure Updates:** Update packages are verified and downloaded strictly over HTTPS from official GitHub releases with package size verification.
6. **Automatic Cleanup:** Canceled or interrupted tasks purge temporary .part and .ytdl files immediately.

---

## Author

itzCrih

---

## License

Proprietary Software License. Copyright (c) 2026 itzCrih. All rights reserved.  
See [LICENSE](LICENSE) for terms of use. Redistribution and rebranding are strictly prohibited.
