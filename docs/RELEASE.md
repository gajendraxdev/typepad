# Releasing Typepad

## Prerequisites

- All work committed and pushed to `main`
- CI green on the commit you want to ship
- Version aligned in:
  - `package.json` → `"version"`
  - `src-tauri/tauri.conf.json` → `"version"`
  - `src-tauri/Cargo.toml` → `version`
  - `CHANGELOG.md` → section for that version
- **Updater signing secrets** configured on the GitHub repo (required for Release workflow)

## Auto-updater signing (required for releases)

Typepad verifies updates with a minisign keypair. The **public** key is already in
`src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.

The **private** key lives only at:

```text
.tauri/typepad.key          # never commit (gitignored)
.tauri/typepad.key.pub      # public half (content already in tauri.conf.json)
```

### One-time: add GitHub secrets

Repo → **Settings → Secrets and variables → Actions** → New repository secret:

| Secret | Value |
|--------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | **Full contents** of `.tauri/typepad.key` (the whole file as a string) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Empty if you generated with no password (or the password you chose) |

Local regenerate (only if you intentionally rotate keys — breaks updates for already-installed apps until they reinstall):

```bash
npm run tauri signer generate -- -w .tauri/typepad.key --ci -f
# then paste the new .pub into tauri.conf.json plugins.updater.pubkey
```

### How it works at release time

1. CI builds with `TAURI_SIGNING_PRIVATE_KEY` → produces installers **and** `.sig` files  
2. `tauri-action` uploads assets and writes **`latest.json`** on the release  
3. Installed apps poll:

   `https://github.com/gajendraxdev/typepad/releases/latest/download/latest.json`

4. In-app: banner after startup + **Settings → About → Check for updates**

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

GitHub Actions **Release** builds Windows, Linux, and macOS (Intel + Apple Silicon),
signs updater artifacts, and opens a **draft** release.

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
| `windows-latest` | `.msi`, NSIS `.exe` + `.sig` |
| `ubuntu-22.04` | `.deb`, `.AppImage` + `.sig` |
| `macos-latest` (aarch64) | Apple Silicon `.dmg` / `.app.tar.gz` + `.sig` |
| `macos-latest` (x86_64) | Intel `.dmg` / `.app.tar.gz` + `.sig` |
| all | `latest.json` (updater manifest) |

## Optional: OS code signing (separate from updater)

Updater signing ≠ Windows Authenticode / Apple notarization.

- **Windows SmartScreen** / **macOS Gatekeeper** may still warn until you add OS certs  
- Not required for the in-app updater to verify packages  

See [Tauri distribute docs](https://v2.tauri.app/distribute/).

## Smoke-test checklist (before publishing)

- [ ] Fresh install opens and first-run folder picker works  
- [ ] New note auto-saves; title rename updates filename  
- [ ] Pin / unpin / reorder pins  
- [ ] Markdown preview toggle  
- [ ] Delete goes to trash  
- [ ] Theme + font settings persist after restart  
- [ ] After a second higher version is published: Settings → About finds the update  
