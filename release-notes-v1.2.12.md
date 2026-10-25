## itzDownloader Desktop v1.2.12 - Release Notes

### Startup Boot Hotfix
- Resolved Main Process Boot Exception: Fixed a syntax error (await in non-async process close callback) in electron/downloader.js that prevented application startup in v1.2.11.

### Fast Re-Encoding & 100% Adobe After Effects / Premiere Pro Compatibility
- Fixed Invisible Media in Video Editors: Previously, YouTube delivered AV1 (av01) video and Opus audio inside .mp4 containers. Because yt-dlp internal converter skipped re-encoding if the container was already .mp4, the file remained AV1, which Adobe After Effects and Premiere Pro cannot decode natively, rendering the media invisible or black upon import.
- Direct Native H.264 & AAC Stream Sorting: Added -S "vcodec:h264,res,acodec:m4a" to all MP4 downloads. When available (such as standard 1080p and 720p on YouTube), it directly downloads native H.264 AVC and AAC streams with zero generation loss and zero conversion wait time.
- Hardware-Accelerated Post-Download Transcoder: Embedded an intelligent post-download pipeline using FFmpeg (h264_nvenc, h264_qsv, h264_amf, or libx264):
  - Automatically inspects downloaded streams via ffprobe.
  - If AV1 (av01), VP9, or non-AAC audio is detected, it automatically converts the video track to standard H.264 with yuv420p pixel format and audio to standard AAC.
  - Injects -movflags +faststart so video files scrub smoothly on any NLE timeline (After Effects, Premiere, DaVinci Resolve, Sony Vegas) and Discord.

### Accurate Spotify Song Matching & Deep Artist Resolution
- Fixed Spotify Metadata Extraction: Fixed a bug where single Spotify tracks defaulted to "Spotify Artist", ruining YouTube search relevance and downloading wrong songs. Directly scrapes real artist names via Spotify oEmbed and title parsing.
- Isolated Browser Cookies: Spotify metadata fetching is isolated from browser cookies to prevent SQLite database lock crashes when web browsers are open.

### Official Downloads & Binaries
- Windows Installer (NSIS Setup): itzDownloader-Desktop-Setup-1.2.12.exe (Windows 10 / 11 x64)
- Standalone Portable: itzDownloader-Desktop-1.2.12-Portable.exe (Windows 10 / 11 x64)
- Code Signing: Authenticode signed with DigiCert RFC 3161 timestamps.
