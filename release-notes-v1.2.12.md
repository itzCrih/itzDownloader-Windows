## itzDownloader Desktop v1.2.12 — Release Notes

### ⚡ Critical Startup Hotfix
- **Resolved Main Process Boot Exception:** Fixed a `SyntaxError: await is only valid in async functions` in `electron/downloader.js` within the download process completion listener that occurred in v1.2.11 upon launching the app.
- Ensured all process termination lifecycle events and async transcoder calls are properly handled across all platforms.

### 🎬 Fast Re-Encoding & 100% Adobe After Effects / Premiere Pro Compatibility
- **100% Import Compatibility:** YouTube MP4 downloads now guarantee true H.264 AVC (`avc1`) video codec and AAC audio (`mp4a.40.2`) formatted with standard `yuv420p` pixel format and `-movflags +faststart`.
- Native stream prioritization (`-S "vcodec:h264,res,acodec:m4a"`) captures genuine H.264 streams directly where available without generation loss, with automatic GPU/CPU fallback transcoding (`h264_nvenc`, `h264_qsv`, `libx264`) for high-resolution streams served only in AV1/VP9.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.12.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.12-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
