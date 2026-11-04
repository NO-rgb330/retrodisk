RetroDisk 9.5
RetroDisk is a fully client-side, offline-capable virtual file system built entirely within a single web application. It recreates the nostalgic aesthetic of early 2000s operating systems (like Windows 98, Windows XP, and Classic Mac OS) but operates using modern, bleeding-edge web technologies.

Because it relies entirely on local storage APIs (OPFS/IndexedDB) and requires no backend server, it ensures absolute data privacy and functions completely offline.

Table of Contents
Core Architecture

Feature Breakdown

Storage and Performance

Security and Encryption

Media and Previews

UI, UX, and Design

Advanced Tools

Browser Compatibility

Deployment

Limitations and Known Issues

Core Architecture
RetroDisk is built as a "Zero-Knowledge" application. Your files never leave your device.

Frontend: Vanilla HTML5, CSS3, and JavaScript (ES6+). No heavy frameworks are required.

Storage Engine: Uses the Origin Private File System (OPFS) for high-performance direct disk access. If OPFS is blocked (e.g., in private browsing), it seamlessly falls back to IndexedDB.

Processing: Heavy tasks (Compression, Encryption) are offloaded to a background Web Worker (worker.js) so the main UI thread never freezes.

Streaming: Files are sliced into 5MB chunks during upload and download, preventing browser memory crashes even with multi-gigabyte files.

Feature Breakdown
Storage and Performance
Dual-Backend Storage: Automatically detects and uses OPFS for native file handling, or IndexedDB as a fallback.

Chunked Streaming: Files are processed in 5MB chunks to prevent RAM exhaustion.

Smart Compression: Automatically applies Gzip compression to text-based files (.txt, .json, .html, etc.) while skipping media files which are already compressed.

Folder Upload: Preserves nested folder structures when uploading directories.

ZIP Support: Extract existing .zip archives directly into the virtual drive, or download selected files and folders as a single .zip.

Live Disk Analytics: Real-time canvas-based charts tracking Disk Usage and Memory (RAM) consumption with peak and average statistics.

Security and Encryption
AES-256-GCM Encryption: Files can be password-protected with military-grade encryption before they touch the disk.

PBKDF2 Hashing: Passwords are stretched using 600,000 iterations of SHA-256, making brute-force attacks extremely difficult.

SHA-256 Integrity Checks: Every file receives a cryptographic hash. When downloading, the app verifies the file has not been corrupted or tampered with.

Self-Destruct Files (Read Once): Files can be flagged to permanently delete themselves immediately after being downloaded.

Secure Shred: Overwrites a file's binary data with random bytes multiple times before deleting it (best effort).

Hidden Volume: Create a secondary, password-protected file system. Without the master password, the hidden volume is completely invisible.

Auto-Lock: The session automatically locks after 5 minutes of inactivity, requiring a password to unlock protected files again.

Steganography: Hide secret text inside the pixels of a PNG image and extract it later.

Media and Previews
Retro Media Player (RDPlayer): A fully custom, retro-themed media player supporting Video, Audio, and Images.

Custom Controls: Features Play/Pause, Seek bar, Volume, Playback Speed (0.25x to 3x), Loop, and Picture-in-Picture.

Audio Visualization: Generates a real-time frequency spectrum analyzer for audio files.

Built-in Text Editor: Open text, JSON, JS, and other text files directly in the browser, edit them, and save them back to the virtual drive.

Markdown and Syntax Highlighting: Automatically renders Markdown files and highlights syntax for code files.

Smart Thumbnails: Auto-generates image and video thumbnails (securely hidden if the file is encrypted).

Image Editor: Rotate images and save them back to the drive.

UI, UX, and Design
Custom Retro Cursor: The native OS cursor is hidden, replaced by a software-rendered retro arrow and pointing hand.

Multi-Selection: Click and drag a marquee box to select multiple files, exactly like Windows Explorer.

Four Retro Themes: Instantly switch between Default, Windows 98, Classic Mac, and Dark Mode.

Grid and List Views: Toggle between a detailed file list or a thumbnail-based icon grid.

Drag-and-Drop: Drag files onto folders to move them, or drop files directly from your OS into the app to upload.

Context Menus: Right-clicking triggers the app's custom retro menu (disabling the default browser inspect menu).

Trash System: Deleting files moves them to a temporary Trash bin where they can be restored or permanently deleted.

Advanced Tools
Find Duplicates: Scans the SHA-256 hashes of all files and helps you identify and delete duplicate files to save space.

WebRTC Local Share: Send files directly to another browser on your local network without a server, using peer-to-peer data channels.

Performance Widget: A floating, draggable widget showing real-time Memory and Disk graphs.

Browser Compatibility
RetroDisk uses modern browser APIs. For the best experience, use a Chromium-based browser.

Feature	Chrome / Edge / Opera	Firefox	Safari
Storage Backend	OPFS (Fastest)	IndexedDB	IndexedDB
Encryption	Web Crypto	Web Crypto	Web Crypto
Compression	Gzip	Gzip	Gzip
Media Playback	H.264, VP8/VP9, AV1	H.264, VP8/VP9, AV1	HEVC, H.264
WebRTC Share	Supported	Supported	Supported
Note: OPFS (Origin Private File System) is only available in secure contexts (https:// or localhost), and cannot be run in file:// extension.

