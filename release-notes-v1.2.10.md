## itzDownloader Desktop v1.2.10 — Release Notes

### 🎯 Spotify Track Resolution & 100% Accurate Song Matching
- **Resolved "Spotify Artist" Bug:** Previously, single Spotify tracks used an oEmbed endpoint that omitted the creator's name, defaulting to `"Spotify Artist"`. This corrupted YouTube search queries (e.g. `ytsearch1:Spotify Artist - Sayo-Nara audio`), causing YouTube to return completely unrelated or obscure songs.
- **Deep Embed Metadata Scraping:** Added dual-layer JSON and HTML scraping directly targeting Spotify's embed and track endpoints. Accurately extracts:
  - Exact Track Title
  - Real Artist(s) (e.g., Dan Salvato, wifiskeleton, OneRepublic, Ed Sheeran)
  - Precise Duration in seconds
  - High-Resolution Album Artwork
- **Targeted YouTube Audio Matching:** Formulates exact, high-confidence queries formatted as `ytsearch1:${artist} - ${title} official audio`, ensuring YouTube prioritizes official artist/topic releases and downloads the exact intended song every time.
- **Playlist & Album Protection:** Enhanced playlist item parsing to sanitize generic author labels and guarantee precision YouTube audio matching across entire playlists and albums.

### 🛡️ Clean Audio & Lock-Free Performance
- Spotify downloads operate completely anonymously without browser cookie extraction, avoiding any Chromium SQLite file lock crashes while browsers are open.

### 📦 Official Downloads & Binaries
- **Installer (NSIS Setup):** `itzDownloader-Desktop-Setup-1.2.10.exe` (Windows 10 / 11 x64)
- **Standalone Portable:** `itzDownloader-Desktop-1.2.10-Portable.exe` (Windows 10 / 11 x64)
- **Code Signing:** Authenticode signed with DigiCert RFC 3161 timestamps.
