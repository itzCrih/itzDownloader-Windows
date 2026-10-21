## itzDownloader Desktop v1.2.5 — Release Notes

### 🔄 Playlist Download Freeze Fix
- **Resolved Async State Reference Stalling:** Fixed a critical React state synchronization bug where adding a playlist caused Item 1 to stall indefinitely at 0% (`DOWNLOADING (0/N)`) with an empty console log.
- **Direct Synchronous Execution:** Playlist jobs now start immediately on queueing with explicit object references passed directly into `startNextPlaylistItem`, ensuring yt-dlp launches without waiting for subsequent re-render cycles.
- **Fail-Safe Chaining:** Even in edge cases where individual videos fail, are geo-blocked, or are canceled, the queue smoothly skips to the next item in line without stalling the playlist.

### 🎬 Dynamic "Videos" vs. "Songs" Contextual Terminology
- **Smart MediaType Detection:** Terminology dynamically adapts across the whole interface based on your chosen format preset:
  - When downloading **Video** presets (`MP4 Best Quality`, `1080p`, `4K`, `720p`, `Custom Video`): the UI dynamically labels items as **"Videos in Queue"**, **"Download Playlist (N Videos)"**, and **"Playlist • N videos"**.
  - When downloading **Audio** presets (`MP3 320k`, `FLAC`, `WAV`, `AAC`, `Opus`): the UI dynamically displays **"Songs"** or **"Tracks"**.

### 🛡️ Clean Video URL Isolation & Directory Fallback
- **Recursive Playlist Prevention:** Playlist items now isolate clean video URLs (`https://www.youtube.com/watch?v=VIDEO_ID`) when downloading single tracks, preventing yt-dlp from parsing the full playlist over again.
- **Resilient Output Folder Resolution:** Enhanced backend output directory validation to automatically fall back to standard Downloads if an uninitialized path is passed.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.5.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.5-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
