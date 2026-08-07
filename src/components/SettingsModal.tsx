import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { normalizeConfig } from "../lib/config";
import type { AppConfig, ThemeMode } from "../types";
import {
  IconCheck,
  IconClose,
  IconFolder,
  IconKeyboard,
  IconMonitor,
  IconMoon,
  IconSun,
  IconType,
} from "./icons";

interface Props {
  config: AppConfig;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => Promise<void>;
}

type SectionId = "appearance" | "storage" | "shortcuts";

const SECTIONS: {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof IconType;
}[] = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and editor font",
    icon: IconType,
  },
  {
    id: "storage",
    label: "Storage",
    description: "Notes folder",
    icon: IconFolder,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    description: "Keyboard reference",
    icon: IconKeyboard,
  },
];

const FONTS = [
  { label: "System Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "System Serif", value: "ui-serif, Georgia, serif" },
  { label: "System Mono", value: "ui-monospace, Consolas, monospace" },
  { label: "Segoe UI", value: '"Segoe UI", system-ui, sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Consolas", value: "Consolas, ui-monospace, monospace" },
];

const THEMES: { id: ThemeMode; label: string; icon: typeof IconSun }[] = [
  { id: "system", label: "System", icon: IconMonitor },
  { id: "light", label: "Light", icon: IconSun },
  { id: "dark", label: "Dark", icon: IconMoon },
];

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl+N", action: "New note" },
  { keys: "Ctrl+F", action: "Find in current note" },
  { keys: "Ctrl+Shift+F", action: "Search library" },
  { keys: "Ctrl+Shift+P", action: "Toggle markdown preview" },
  { keys: "Ctrl+Shift+.", action: "Pin / unpin active note" },
  { keys: "Ctrl+W", action: "Close current tab" },
  { keys: "Ctrl+B", action: "Toggle library sidebar" },
  { keys: "Ctrl+,", action: "Open settings" },
  { keys: "Ctrl+G", action: "Find next match" },
  { keys: "Ctrl+Shift+G", action: "Find previous match" },
  { keys: "F3", action: "Find next match" },
  { keys: "Shift+F3", action: "Find previous match" },
  { keys: "Enter", action: "Find next (in find bar)" },
  { keys: "Shift+Enter", action: "Find previous (in find bar)" },
  { keys: "Esc", action: "Close find / dialogs" },
];

function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

function displayKeys(keys: string): string {
  if (!isMac()) return keys;
  return keys
    .replace(/Ctrl\+/g, "⌘")
    .replace(/Shift\+/g, "⇧")
    .replace(/Alt\+/g, "⌥");
}

export function SettingsModal({ config, onClose, onConfigChange }: Props) {
  const [section, setSection] = useState<SectionId>("appearance");
  const [theme, setTheme] = useState<ThemeMode>(config.theme);
  const [fontFamily, setFontFamily] = useState(config.fontFamily);
  const [fontSize, setFontSize] = useState(config.fontSize);
  const [folder, setFolder] = useState(config.notesFolder ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const current = configRef.current;
    if (
      theme === current.theme &&
      fontFamily === current.fontFamily &&
      fontSize === current.fontSize
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await onConfigChange(
            normalizeConfig({
              ...configRef.current,
              theme,
              fontFamily,
              fontSize,
            }),
          );
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 1200);
        } catch (e) {
          setMessage(String(e));
        }
      })();
    }, 180);
    return () => window.clearTimeout(t);
  }, [theme, fontFamily, fontSize, onConfigChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Clear folder message when leaving storage section
  useEffect(() => {
    if (section !== "storage") setMessage(null);
  }, [section]);

  const changeFolder = async (moveExisting: boolean) => {
    const picked = await api.pickFolder(folder || undefined);
    if (!picked) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await api.setNotesFolder({
        path: picked,
        moveExisting,
      });
      const merged = normalizeConfig({
        ...next,
        theme,
        fontFamily,
        fontSize,
      });
      setFolder(merged.notesFolder ?? picked);
      await onConfigChange(merged);
      setMessage(
        moveExisting
          ? "Folder updated — existing notes moved."
          : "Folder updated — new notes go here.",
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const activeMeta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="ui-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal
        aria-label="Settings"
        className="settings-shell ui-surface anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>
              {activeMeta.label} · changes apply instantly
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedFlash ? (
              <span className="anim-fade-in flex items-center gap-1 text-[11px] text-[var(--success)]">
                <IconCheck size={12} />
                Saved
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
              aria-label="Close settings"
            >
              <IconClose size={15} />
            </button>
          </div>
        </div>

        <div className="settings-body">
          {/* Section nav */}
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item ${section === id ? "is-active" : ""}`}
                onClick={() => setSection(id)}
                aria-current={section === id ? "page" : undefined}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Section content */}
          <div className="settings-content">
            {section === "appearance" ? (
              <section className="settings-panel">
                <header className="settings-panel-title">
                  <h3>Appearance</h3>
                  <p>How Typepad looks while you write.</p>
                </header>

                <div>
                  <span className="settings-field-label">Theme</span>
                  <div className="seg">
                    {THEMES.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        className={`seg-btn ${theme === id ? "is-active" : ""}`}
                        onClick={() => setTheme(id)}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="settings-field-label">Editor font</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="ui-input !rounded-md"
                    style={{ fontFamily }}
                  >
                    {FONTS.map((f) => (
                      <option
                        key={f.value}
                        value={f.value}
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="settings-field-label !mb-0">
                      Font size
                    </span>
                    <span className="text-[12px] tabular-nums text-[var(--text-faint)]">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={28}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  <p
                    className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[var(--text)]"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.45,
                    }}
                  >
                    The quick brown fox writes a note.
                  </p>
                </div>
              </section>
            ) : null}

            {section === "storage" ? (
              <section className="settings-panel">
                <header className="settings-panel-title">
                  <h3>Storage</h3>
                  <p>Notes are plain .txt files in a folder you choose.</p>
                </header>

                <div>
                  <span className="settings-field-label">Notes folder</span>
                  <div className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2">
                    <IconFolder
                      size={14}
                      className="mt-0.5 shrink-0 text-[var(--accent)]"
                    />
                    <p className="min-w-0 break-all text-[12px] leading-snug text-[var(--text-muted)]">
                      {folder || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeFolder(true)}
                    className="ui-btn ui-btn-outline !rounded-md disabled:opacity-60"
                  >
                    Move notes here…
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeFolder(false)}
                    className="ui-btn ui-btn-ghost !rounded-md disabled:opacity-60"
                  >
                    Point only…
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-[var(--text-faint)]">
                  <strong className="font-medium text-[var(--text-muted)]">
                    Move
                  </strong>{" "}
                  relocates .txt notes.{" "}
                  <strong className="font-medium text-[var(--text-muted)]">
                    Point only
                  </strong>{" "}
                  keeps old files where they are.
                </p>

                {message ? (
                  <p className="anim-fade-in rounded-md bg-[var(--success-soft)] px-2.5 py-1.5 text-[12px] text-[var(--success)]">
                    {message}
                  </p>
                ) : null}
              </section>
            ) : null}

            {section === "shortcuts" ? (
              <section className="settings-panel">
                <header className="settings-panel-title">
                  <h3>Keyboard shortcuts</h3>
                  <p>Works even while the cursor is in the editor.</p>
                </header>

                <ul className="settings-shortcut-list">
                  {SHORTCUTS.map((row) => (
                    <li key={row.keys} className="settings-shortcut-row">
                      <span className="settings-shortcut-action">
                        {row.action}
                      </span>
                      <kbd className="settings-shortcut-keys">
                        {displayKeys(row.keys)}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
