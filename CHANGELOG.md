# Changelog

All notable changes to Typepad are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/). Versions follow [SemVer](https://semver.org/).

## [0.1.1] — 2026-08-08

Library polish, pin reliability, manual rename, and quality fixes since the first public release.

### Added
- **Manual rename** (F2 or right‑click → Rename…)
  - First line still drives the filename by default
  - After a manual rename, the name is **locked** (editing the first line no longer renames the file)
  - Locked notes show the file name in the library
- **Library keyboard navigation**: ↑/↓, Home/End, Enter to open, `P` to pin focused row
- **Collapsible Pinned section** (chevron header; count when collapsed; remembered)
- **Undo toast** after pin / unpin
- Scroll library row into view when switching tabs

### Changed
- Simpler pin UX (Notion-style): hover pin, context menu, **Ctrl+Shift+L** — no title-bar pin button
- Plain section headers (no tinted pinned block)
- Removed floating “open in tab” accent dot from list rows
- Markdown HTML sanitization via **sanitize-html** (replaces isomorphic-dompurify for reliable CI)

### Fixed
- **Pins surviving restart**: no longer wiped when prune ran before the note list finished loading
- **Windows path matching** (`\\?\` vs normal paths) so pin / unlock / list stay consistent
- Pin drag-and-drop on Windows (`dragDropEnabled: false` so HTML5 reorder works)
- Context menu positioning and click reliability
- Shortcut key-repeat no longer flip-flops toggles (except find next/prev)
- Config pin-path trim/dedupe; listbox a11y (`aria-activedescendant`, stable option ids)

### Security / reliability
- Path sandbox for note I/O unchanged; rename goes through the same folder checks
- Folder change clears pins and locked names (old absolute paths are invalid)

### Known limitations
- Not OS code-signed (SmartScreen / Gatekeeper may warn)
- No UI yet to “unlock” a name back to first-line auto-rename
- No system-tray quick note or PDF export yet
- No external file watcher

---

## [0.1.0] — 2026-08-07

First public release of Typepad.

### Added
- Native desktop shell via **Tauri v2** (Windows / macOS / Linux)
- Zero-friction **auto-save** to a user-chosen notes folder (plain `.txt`)
- Filename from first line; rename on title change (no duplicate files)
- Debounced writes (~700ms) and flush-all on window close
- **Library sidebar** with search, relative timestamps, collapsible panel
- **Open-note tabs** in a custom title bar
- **In-note find** (Ctrl+F) with next/prev (F3 / Ctrl+G)
- **Pin notes** to the top of the library
- **Markdown preview** (status bar + **Ctrl+Shift+P**)
- Settings: theme (system/light/dark), font family/size, notes folder
- Soft delete to OS Recycle Bin / Trash
- Save indicator, word/character counts
- First-run notes folder picker
- Unit tests (Rust + Vitest) and GitHub Actions CI
- **Auto-updater** with minisign-verified GitHub Releases (`latest.json`)

### Install (from GitHub Release assets)
- **Windows:** `.msi` / `.exe`
- **macOS:** `.dmg` (Apple Silicon + Intel)
- **Linux:** `.deb` / `.AppImage`

---

## Unreleased

### Planned
- System tray + global quick-note hotkey
- Export note as PDF
- Folder watcher for external edits
- Optional OS code signing (Authenticode / notarization)
- Unlock manual name (return to first-line auto-rename)

[0.1.1]: https://github.com/gajendraxdev/typepad/releases/tag/v0.1.1
[0.1.0]: https://github.com/gajendraxdev/typepad/releases/tag/v0.1.0
