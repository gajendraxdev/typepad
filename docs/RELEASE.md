# Releasing Typepad

## Prerequisites

- All work committed and pushed to `main`
- CI green on the commit you want to ship
- Version aligned in:
  - `package.json` → `"version"`
  - `src-tauri/tauri.conf.json` → `"version"`
  - `src-tauri/Cargo.toml` → `version`
  - `CHANGELOG.md` → section for that version

## Option A — Tag push (recommended)

```bash
# From the typepad repo root
git checkout main
git pull

# Bump versions if needed, update CHANGELOG, commit:
# git commit -am "chore: release v0.1.0"

git tag -a v0.1.0 -m "Typepad v0.1.0"
git push origin main
git push origin v0.1.0
```

GitHub Actions **Release** workflow builds Windows, Linux, and macOS (Intel + Apple Silicon) and opens a **draft** release with installers attached.

1. Open https://github.com/gajendraxdev/typepad/releases  
2. Review the draft, edit notes if needed  
3. **Publish release** when ready  

## Option B — Manual workflow

1. Actions → **Release** → **Run workflow**  
2. Leave **draft** checked for a draft release  
3. Wait for all matrix jobs to finish  
4. Publish the draft from the Releases page  

## What gets built

| Runner | Targets / artifacts (typical) |
|--------|--------------------------------|
| `windows-latest` | `.msi`, NSIS `.exe` |
| `ubuntu-22.04` | `.deb`, `.AppImage` |
| `macos-latest` (aarch64) | Apple Silicon `.dmg` / app bundle |
| `macos-latest` (x86_64) | Intel `.dmg` / app bundle |

Exact filenames come from Tauri’s bundler for version `0.1.0` (product name **Typepad**).

## Optional: code signing (later)

Unsigned builds work but OS security prompts will appear.

- **Windows:** Authenticode cert + related secrets  
- **macOS:** Apple Developer ID + notarization secrets  
- **Updater:** Tauri updater keys (`TAURI_SIGNING_PRIVATE_KEY`, etc.)

See [Tauri distribute docs](https://v2.tauri.app/distribute/).

## Smoke-test checklist (before publishing)

- [ ] Fresh install opens and first-run folder picker works  
- [ ] New note auto-saves; title rename updates filename  
- [ ] Pin / unpin / reorder pins  
- [ ] Markdown preview toggle  
- [ ] Delete goes to trash  
- [ ] Theme + font settings persist after restart  
