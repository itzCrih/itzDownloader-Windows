## itzDownloader Desktop v1.2.9 — Release Notes

### 🎵 Spotify Clean Audio Extraction & Cookie Isolation
- **Eliminated Unnecessary Browser Cookies on Spotify:** Spotify track and playlist downloads resolve to high-bitrate audio streams via YouTube audio search (`ytsearch1:`). Browser cookies are now strictly excluded from Spotify operations, preventing Chromium database lock errors.
- **Instant High-Speed Audio Downloads:** Spotify songs download and convert to MP3 320kbps or FLAC cleanly with zero delay or failed tasks.

### 🔒 Chromium Cookie Database Lock Auto-Fallback
- **Automatic Recovery from Running Browsers:** Resolves `ERROR: Could not copy Chrome cookie database (Issue #7271)` caused by Chromium browsers (Brave, Google Chrome, Microsoft Edge) placing exclusive file locks on `Network\Cookies` while open.
- **Zero-Failure Auto-Fallback:** If yt-dlp encounters a locked cookie database, itzDownloader automatically intercepts the error, clears the locked session, logs a notification, and seamlessly re-attempts the download without cookies.
- **Firefox Shared-Access Priority:** In Auto-Detect mode, Mozilla Firefox is probed first as its SQLite database safely supports concurrent reads while the browser is running.

### 🛡️ Enhanced Bot Challenge Protection & Format Integrity
- **Node.js JS Challenge Solver:** Integrates `--js-runtimes node` across all YouTube and search tasks, preserving 1080p, 4K, and high-bitrate audio formats.
- **Smarter Auto-Detect Default:** In Settings, `Auto-Detect (Recommended)` only invokes browser sessions dynamically when YouTube actively challenges the request, keeping normal downloads fast and unencumbered.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.9.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.9-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
