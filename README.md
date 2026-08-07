# Typepad

[![CI](https://github.com/gajendraxdev/typepad/actions/workflows/ci.yml/badge.svg)](https://github.com/gajendraxdev/typepad/actions/workflows/ci.yml)
[![Release](https://github.com/gajendraxdev/typepad/actions/workflows/release.yml/badge.svg)](https://github.com/gajendraxdev/typepad/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Native desktop notepad built with **Tauri v2**, **React**, **TypeScript**, and **Tailwind CSS**. Notes auto-save as plain `.txt` files — no save dialogs after first-run setup.

> Living agent context: see [`AGENT.md`](./AGENT.md).  
> Changelog: [`CHANGELOG.md`](./CHANGELOG.md) · Release guide: [`docs/RELEASE.md`](./docs/RELEASE.md)

## Download

Installers for **Windows**, **macOS** (Intel + Apple Silicon), and **Linux** are attached to [GitHub Releases](https://github.com/gajendraxdev/typepad/releases).

Draft / first release: **v0.1.0** (see changelog). Builds are produced by Actions when you push a `v*` tag or run the **Release** workflow.

## Requirements (development)

- Node.js 18+
- Rust (stable) + platform build tools for Tauri
- Windows: WebView2 (usually preinstalled)

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Tests (Rust)

```bash
cd src-tauri
cargo test
cargo fmt
cargo clippy -- -D warnings
```

## Tests (frontend)

```bash
npm test
```

## CI / Release

| Workflow | When | What |
|----------|------|------|
| **CI** | Push / PR to `main` | `npm` build + tests, `cargo fmt` / clippy / test |
| **Release** | Tag `v*` or manual dispatch | Cross-platform Tauri bundles → **draft** GitHub Release |

See [`docs/RELEASE.md`](./docs/RELEASE.md) for the full ship checklist.

## First run

On first launch you’ll pick a notes folder (default suggestion: `Documents/Typepad`). After that, every note is written there automatically.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+F` | Find in current note |
| `Ctrl+Shift+F` | Search library |
| `Ctrl+Shift+P` | Toggle markdown preview |
| `Ctrl+Shift+.` | Pin / unpin active note |
| `Ctrl+,` | Settings |
| `Ctrl+W` | Close current note |
| `Ctrl+B` | Toggle sidebar |
| `F3` / `Ctrl+G` | Find next |
