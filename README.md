# Typepad

Native desktop notepad built with **Tauri v2**, **React**, **TypeScript**, and **Tailwind CSS**. Notes auto-save as plain `.txt` files — no save dialogs after first-run setup.

> Living agent context: see [`AGENT.md`](./AGENT.md).

## Requirements

- Node.js 18+
- Rust (stable) + platform build tools for Tauri
- Windows: WebView2 (usually preinstalled)

## Develop

```bash
cd typepad
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

## First run

On first launch you’ll pick a notes folder (default suggestion: `Documents/Typepad`). After that, every note is written there automatically.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+F` | Focus search |
| `Ctrl+,` | Settings |
| `Ctrl+W` | Close current note |
| `Ctrl+B` | Toggle sidebar |
