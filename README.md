<div align="center">

# itzDownloader Desktop (Windows)

**ULTRA-FAST, LIGHTWEIGHT 100% LOCAL MULTIMEDIA DOWNLOADER**  
**POWERED BY NATIVE YT-DLP & FFMPEG ENGINE**

The high-performance, private Windows workstation for instant video & audio downloads from YouTube, TikTok, Spotify, Instagram, and over 1,000+ online media platforms.

[![Platform](https://img.shields.io/badge/Platform-Windows_10_%7C_11_(x64)-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/itzCrih/itzDownloader-Windows/releases/latest)
[![Version](https://img.shields.io/badge/Version-v1.2.0-e6b422?style=for-the-badge)](https://github.com/itzCrih/itzDownloader-Windows/releases/latest)
[![Engine](https://img.shields.io/badge/yt--dlp-Native_v2025+-black?style=for-the-badge)](https://github.com/yt-dlp/yt-dlp)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-v7.1_Native-black?style=for-the-badge)](https://ffmpeg.org)
[![Signed](https://img.shields.io/badge/Code_Signing-Authenticode_Signed-2ea043?style=for-the-badge&logo=shield&logoColor=white)](certs/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

<br />

### Download itzDownloader Desktop (v1.2.0)

[![Download Setup](https://img.shields.io/badge/Download_Installer-itzDownloader_Desktop_Setup_(v1.2.0)-e6b422?style=for-the-badge&logo=windows&logoColor=black)](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.2.0/itzDownloader-Desktop-Setup-1.2.0.exe)  
[![Download Portable](https://img.shields.io/badge/Download_Portable-itzDownloader_Desktop_Portable_(v1.2.0)-ffffff?style=for-the-badge&logo=windows&logoColor=black)](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.2.0/itzDownloader-Desktop-1.2.0-Portable.exe)

| Package | Format | Architecture | Direct Link |
| :--- | :--- | :--- | :--- |
| **Windows Installer** | NSIS Setup `.exe` | Windows 10 / 11 (x64) | [itzDownloader-Desktop-Setup-1.2.0.exe](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.2.0/itzDownloader-Desktop-Setup-1.2.0.exe) |
| **Standalone Portable** | Portable `.exe` | Windows 10 / 11 (x64) | [itzDownloader-Desktop-1.2.0-Portable.exe](https://github.com/itzCrih/itzDownloader-Windows/releases/download/v1.2.0/itzDownloader-Desktop-1.2.0-Portable.exe) |

*Authenticode code signed with DigiCert RFC 3161 timestamps. Built-in Auto-Updater checks for future releases seamlessly on startup.*

</div>

---

## What's New in v1.2.0

- 🛡️ **Authenticode Digitally Signed Executables:** All installer and portable `.exe` packages are signed with publisher certificate and RFC 3161 timestamps to prevent unknown publisher warnings.
- ⚡ **Instant Loading Splash Screen:** Ultra-fast startup with an immediate, branded frameless splash window so you never have to wait or wonder if the app is launching.
- 🔄 **Smart Binary Reuse (itzCut Ecosystem):** itzDownloader automatically detects sibling `itzCut Desktop` installations and reuses existing FFmpeg and encoder binaries directly without redundant re-downloads.
- 🔒 **Mandatory Engine Probe & Safe UI Lock:** yt-dlp and FFmpeg are verified automatically on every launch. During binary setups or updates, user interactions are safely locked to prevent race conditions and crashes.
- 📊 **Live Re-Encoding Progress (Fixed 99% Stuck):** FFmpeg conversions and stream muxing now feature dynamic real-time progress bars with active stage feedback, FPS, and speed indicators.

---

## Why itzDownloader Desktop?

- **100% Local & Private Processing:** All streams are fetched directly to your machine. No proxy servers intercepting your traffic, no third-party logging, no accounts required.
- **Instant Launch & Zero Overhead:** Clean memory footprint, instant startup, and zero background telemetry or bloatware.
- **Dual-Mode Workflow:**
  - **Instant Mode:** Paste link $\rightarrow$ auto-detect platform $\rightarrow$ 1-click download with optimized presets (Best MP4, 1080p, MP3 320k, Studio FLAC, TikTok Clean).
  - **Media Studio:** Full granular control over containers (MP4, MKV, WebM), resolution caps (4K UHD to 480p), audio codecs, subtitle embedding, and browser cookies.
- **Spotify Smart Audio Resolver:** Paste any Spotify track link to query song metadata via Spotify oEmbed and automatically fetch high-fidelity audio with embedded album cover art and ID3 tags.
- **Zero Configuration Required:** Automatically probes your system, identifies dedicated GPUs and CPUs, verifies hardware capabilities, and downloads static `yt-dlp` and `FFmpeg` essentials automatically if missing.

---

## Core Capabilities

### 1. Instant Download Engine
- **1-Click Preset Selection:**
  - **Best Video (MP4):** Max native resolution (up to 4K 60fps) with AAC stereo audio auto-merged.
  - **Full HD 1080p:** Fast, balanced download for everyday streaming.
  - **MP3 Audio (320 kbps):** High-bitrate audio with embedded track titles, artist metadata, and cover art.
  - **Studio FLAC:** Lossless bit-perfect audio for high-fidelity collections.
  - **TikTok Clean:** Original vertical stream without platform watermarks.
- **Clipboard Auto-Detection:** Instant paste button checks clipboard automatically on focus.

### 2. Advanced Media Suite
- **Container Selection:** Universal MP4, Matroska MKV, or WebM.
- **Resolution Ceilings:** 4K UHD (2160p), 2K QHD (1440p), Full HD (1080p), HD (720p), SD (480p), or Source Passthrough.
- **No Audio (Mute Video Stream):** Strip audio tracks and export purely silent video streams for B-roll, video editing (Premiere, DaVinci, Vegas), and background reels.
- **Hardware-Accelerated Fast Re-encoding:** Real-time H.264 MP4 conversion utilizing NVIDIA NVENC and Intel QSV GPUs.
- **Audio Extraction:** MP3 (128k to 320k), FLAC, WAV (PCM Uncompressed), AAC (M4A), Opus, OGG Vorbis.
- **Subtitle Engine:** Multi-language subtitle downloader (`all`, `en`, `it`, `es`, etc.) with direct container embedding or external `.srt` export.
- **Browser Cookies Integration:** Bypass age verification or access member content using local session cookies from Google Chrome, Firefox, Edge, or Brave.
- **Custom yt-dlp Flags:** Pass custom runtime arguments directly for power users.

### 3. Real-Time Streaming Queue
- Shimmer progress bars with live transfer speed (MB/s), estimated time remaining (ETA), and downloaded size.
- Interactive job actions: Cancel active downloads with automatic partial file cleanup, reveal in Explorer, or play file immediately.
- Built-in expandable console log drawer for engine diagnostics.

---

## Supported Platforms

Compatible with over 1,000+ media sites via `yt-dlp`:

| Platform | Video Support | Audio Extraction | Quality |
| :--- | :--- | :--- | :--- |
| **YouTube** | Up to 4K / 8K @ 60fps | MP3 320k / FLAC / M4A | Native Source |
| **TikTok** | Clean MP4 (No Watermark) | MP3 Audio | Original Stream |
| **Spotify** | Smart Metadata Resolver | MP3 320k / FLAC | High Fidelity |
| **Instagram** | Reels / Stories / Posts | MP3 Audio | HD Original |
| **SoundCloud** | — | High-rate MP3 / AAC | Original Stream |
| **X (Twitter)** | MP4 Video Streams | MP3 Audio | Best Available |
| **Twitch** | VODs / Clips | AAC / MP3 | Up to 1080p 60fps |
| **Reddit & Vimeo** | MP4 Video Streams | MP3 Audio | Native Source |

---

## Tech Stack & Architecture

- **UI Framework:** React 18, Vite 6, Lucide Icons, Custom CSS Design System
- **Runtime:** Electron 34 with Sandboxed Context Isolation (`preload.js`)
- **CLI Engines:** `yt-dlp` standalone binary & `FFmpeg` v7.1 with GPU Acceleration (`NVENC`, `QSV`, `AMF`)
- **Audio Synthesizer:** Melodic notification chime via native Web Audio API (zero external assets)
- **Packaging:** NSIS Installer + Standalone Portable via `electron-builder`

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

itzDownloader Desktop is engineered with a strict security-first model:
1. **Zero Shell Injection:** All process invocations use structured argument arrays via `child_process.spawn`. Raw unescaped shell execution (`exec`) is strictly prohibited.
2. **Offline Local Processing:** Downloads travel straight from the hosting media server to your local machine storage.
3. **Automatic Cleanup:** Canceled or interrupted tasks purge temporary `.part` and `.ytdl` files immediately.

---

## Author & Community

- **Author:** [itzcrih](https://itzcrih.it)
- **Discord Community:** [community.itzcrih.it](https://community.itzcrih.it)
- **Sister Project:** [itzCut Desktop](https://github.com/itzCrih/itzCut-Windows)

---

## License

Proprietary Software License. Copyright (c) 2026 itzcrih. All rights reserved.  
See [LICENSE](LICENSE) for terms of use. Redistribution and rebranding are strictly prohibited.
