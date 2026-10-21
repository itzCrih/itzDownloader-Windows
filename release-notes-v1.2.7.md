## itzDownloader Desktop v1.2.7 — Release Notes

### 🚀 Parallel Multi-Downloading Worker Pool
- **Concurrent Stream Acceleration:** Playlist and queue items can now download concurrently in parallel!
- **Intelligent Hardware Auto-Scaling:** Automatically senses device CPU logical cores (`navigator.hardwareConcurrency`):
  - **Low-End / Battery Saver devices (<= 2 cores):** Safely limits to 1 simultaneous download to prevent system lag.
  - **Mid-Range / Balanced devices (3-4 cores):** Automatically runs 2 simultaneous downloads.
  - **High-Performance Workstations (>= 6 cores):** Automatically unleashes 3 concurrent downloads for maximum throughput.
- **Manual User Control in Settings:** Added a Parallel Queue Downloads selector in App Preferences (Auto, 1, 2, or 3).
- **Smooth Staggered Dispatching:** Concurrently launched processes feature a 150ms stagger gap to avoid CPU spikes and disk I/O contention.

### ⚡ Speed Stabilization & Fragment Acceleration
- **Eliminated HLS/Fragment Bottlenecks:** Enabled `--concurrent-fragments 4` across all native yt-dlp tasks, downloading up to 4 video/audio fragments in parallel.
- **Progressive Stream Ratebypass Smoothing:** Configured `--http-chunk-size 10M` and `--buffer-size 64K` to neutralize Google Video CDN adaptive rate throttling and eliminate bandwidth drops down to KiB/s.

### 🛡️ YouTube-Specific Anti-Block Protection System
- **Innertube Client Profile Rotation:** Automatically rotates player client signatures (`android,web`, `ios,web`, `mweb,web`, `web_creator,web`) during high-frequency usage to bypass bot-detection heuristics.
- **Chromium Session & User-Agent Rotation:** Simulates diverse modern desktop and mobile browser sessions on rapid requests.
- **Intelligent Jitter & 429 Backoff:** Detects rapid requests (3+ within 30s) and introduces micro-jitter spacing (`--sleep-requests 0.75`) and automated cooldowns on HTTP 429 (`--retry-sleep 429:5`).
- **Domain-Isolated:** Anti-block protections apply strictly to YouTube sessions without altering generic or platform-specific downloads.

### 🌐 Network Proxy Configuration GUI
- **Full Protocol Coverage:** Native support for HTTP, HTTPS, SOCKS4, and SOCKS5 proxies in Settings.
- **Intuitive GUI Controls:** Includes an instant toggle switch, URL input field, and one-click Save button with confirmation status.
- **Privacy & Credential Redaction:** Passwords embedded in proxy URLs (`http://user:pass@host:port`) are automatically masked in all engine logs.
- **Default State:** Empty and disabled by default.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.7.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.7-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
