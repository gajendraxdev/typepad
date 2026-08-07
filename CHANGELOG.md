# Changelog

All notable changes to Typepad are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/). Versions follow [SemVer](https://semver.org/).

## [0.1.0] — 2026-08-07 (draft)

First public draft release of Typepad.

### Added
- Native desktop shell via **Tauri v2** (Windows / macOS / Linux)
- Zero-friction **auto-save** to a user-chosen notes folder (plain `.txt`)
- Filename from first line; rename on title change (no duplicate files)
- Debounced writes (~700ms) and flush-all on window close
- **Library sidebar** with search, relative timestamps, collapsible panel
- **Open-note tabs** in a custom title bar
- **In-note find** (Ctrl+F) with next/prev (F3 / Ctrl+G)
- **Pin notes** to the top of the library
  - Pinned / Notes sections
  - Hover pin, right-click menu, title-bar pin, **Ctrl+Shift+.**
  - Drag-to-reorder pins (when not searching)
- **Markdown preview** (status bar + **Ctrl+Shift+P**); HTML sanitized before render
- Settings: theme (system/light/dark), font family/size, notes folder (move or re-point)
- Soft delete to OS Recycle Bin / Trash
- Save indicator, word/character counts
- First-run notes folder picker
- Unit tests (Rust + Vitest) and GitHub Actions CI

### Security / reliability
- Config writes serialized to avoid pin/width races
- Markdown preview sanitized with DOMPurify
- Path resolution constrained under the configured notes folder

### Known limitations
- Not code-signed (SmartScreen / Gatekeeper may warn)
- No system-tray quick note or PDF export yet (planned)
- No external file watcher (edits from other apps need re-open/refresh)
- No auto-updater yet

### Install (from GitHub Release assets)
- **Windows:** run the `.msi` (or `.exe`) installer
- **macOS:** open the `.dmg`, drag Typepad to Applications (Apple Silicon vs Intel assets)
- **Linux:** install the `.deb` or run the `.AppImage`

---

## Unreleased

### Planned
- System tray + global quick-note hotkey
- Export note as PDF
- Folder watcher for external edits
- Optional code signing and auto-update

[0.1.0]: https://github.com/gajendraxdev/typepad/releases/tag/v0.1.0
