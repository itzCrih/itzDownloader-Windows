## itzDownloader Desktop v1.2.6 — Release Notes

### 🔄 Sequential Playlist Download Chain Fix
- **Resolved Next-Item Async Stalling:** Re-engineered the playlist execution loop. In previous versions, React 18 concurrent update batching caused the queue to freeze at item 2 after item 1 finished because the next item invocation was executed outside the asynchronous updater before state resolved.
- **Synchronous Reference Dispatching:** Playlist state updates and next-item dispatching are now fully synchronous and decoupled from React's internal updater queue.
- **Clean Process Transition:** Added a dedicated 100ms process-cleanup interval between sequential items to ensure previous child process file handles and system locks are completely freed before launching the next download.

### ⚡ Zero-Stall Process Fallback Safeguards
- Added automatic process fallback safeguards in `startNextPlaylistItem`. If any individual playlist item encounters an unhandled OS spawn error or immediate rejection, the queue automatically advances to the next item instead of stalling.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.6.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.6-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
