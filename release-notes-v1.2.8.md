## itzDownloader Desktop v1.2.8 — Release Notes

### 🛡️ YouTube Anti-Bot Challenge Auto-Rescue
- **Automated Bot Challenge Recovery:** Resolves YouTube's `Sign in to confirm you're not a bot` enforcement triggered during high-frequency downloads or playlist queues.
- **Multi-Browser Session Discovery:** Dynamically scans local browser environments (`brave`, `firefox`, `chrome`, `edge`) to discover working cookies and bypass bot detection checkpoints.
- **Seamless Auto-Retry:** If a bot challenge is detected during URL metadata inspection or active downloading, itzDownloader automatically retries the request using the verified browser credentials with zero user intervention.
- **Default Auto-Detect Setting:** Set `Auto-Detect (Brave / Firefox / Chrome) - Recommended` as the default cookie handling strategy in App Preferences.

### ⚡ Node.js JavaScript Challenge Solver Integration
- **Full EJS Challenge Solving:** Added `--js-runtimes node` to all YouTube extraction and download passes.
- **High-Bitrate & 1080p Format Preservation:** YouTube's encrypted `n` challenges are resolved natively via Node.js, ensuring all video resolutions, audio streams, and adaptive formats remain fully available.
- **Engine Core Upgrade:** Upgraded underlying yt-dlp binary to `2026.10.21` featuring upstream extractor fixes for YouTube's late 2026 changes.

### 🚦 Balanced Queue Pacing & Stability
- **Anti-Burst Dispatching:** Increased queue stagger delay from 150ms to 750ms when launching parallel downloads, preventing IP throttling and bot detection triggers.
- **Robust Network Recovery:** Configured extended socket timeouts (`--socket-timeout 30`), higher fragment retry thresholds (`--retries 10`, `--fragment-retries 10`), and intelligent backoff (`--retry-sleep 429:5`).

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.8.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.8-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
