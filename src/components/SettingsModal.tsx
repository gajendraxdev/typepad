import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { normalizeConfig, normalizeTabLayout } from "../lib/config";
import type { AppConfig, TabLayout, ThemeMode } from "../types";
import {
  IconCheck,
  IconClose,
  IconFolder,
  IconMonitor,
  IconMoon,
  IconPanelLeft,
  IconSun,
} from "./icons";

interface Props {
  config: AppConfig;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => Promise<void>;
}

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

export function SettingsModal({ config, onClose, onConfigChange }: Props) {
  const [theme, setTheme] = useState<ThemeMode>(config.theme);
  const [fontFamily, setFontFamily] = useState(config.fontFamily);
  const [fontSize, setFontSize] = useState(config.fontSize);
  const [tabLayout, setTabLayout] = useState<TabLayout>(
    normalizeTabLayout(config.tabLayout),
  );
  const [folder, setFolder] = useState(config.notesFolder ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  // Live-apply appearance + layout prefs (debounced).
  useEffect(() => {
    const current = configRef.current;
    if (
      theme === current.theme &&
      fontFamily === current.fontFamily &&
      fontSize === current.fontSize &&
      tabLayout === normalizeTabLayout(current.tabLayout)
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
              tabLayout,
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
  }, [theme, fontFamily, fontSize, tabLayout, onConfigChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changeFolder = async (moveExisting: boolean) => {
    const picked = await api.pickFolder(folder || undefined);
    if (!picked) return;
    setBusy(true);
    setMessage(null);
    try {
      // setNotesFolder persists path; merge appearance so parent can reset tabs.
      const next = await api.setNotesFolder({
        path: picked,
        moveExisting,
      });
      const merged = normalizeConfig({
        ...next,
        theme,
        fontFamily,
        fontSize,
        tabLayout,
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

  return (
    <div className="ui-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal
        aria-label="Settings"
        className="ui-surface anim-scale-in flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Settings</h2>
            <p className="text-[11px] text-[var(--text-faint)]">
              Changes apply instantly
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
              <IconClose size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-faint)] uppercase">
              Appearance
            </h3>

            <div>
              <span className="mb-1.5 block text-sm text-[var(--text-muted)]">
                Theme
              </span>
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

            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--text-muted)]">
                Editor font
              </span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="ui-input"
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
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Font size</span>
                <span className="tabular-nums text-[var(--text-faint)]">
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
                className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)]"
                style={{
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.55,
                }}
              >
                The quick brown fox writes a note.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-faint)] uppercase">
              Layout
            </h3>
            <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
              Title-bar tabs are always available. Sidebar adds a permanent
              library beside the editor.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTabLayout("top")}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  tabLayout === "top"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="mb-2 h-10 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <div className="flex h-3.5 items-center gap-1 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-1.5">
                    <div className="h-1.5 w-10 rounded-full bg-[var(--text)]/25" />
                    <div className="h-1.5 w-8 rounded-full bg-[var(--border-strong)]" />
                  </div>
                </div>
                <div className="text-[13px] font-semibold">Tabs only</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                  Title bar tabs + library popup
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTabLayout("sidebar")}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  tabLayout === "sidebar"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="mb-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <div className="flex h-3 items-center gap-1 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-1.5">
                    <div className="h-1.5 w-8 rounded-full bg-[var(--text)]/25" />
                    <div className="h-1.5 w-6 rounded-full bg-[var(--border-strong)]" />
                  </div>
                  <div className="flex h-7">
                    <div className="w-8 border-r border-[var(--border)] bg-[var(--bg-sidebar)]" />
                    <div className="flex-1" />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[13px] font-semibold">
                  <IconPanelLeft size={13} />
                  Sidebar + tabs
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                  Library sidebar and top tabs together
                </div>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-faint)] uppercase">
              Notes folder
            </h3>
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
              <IconFolder
                size={16}
                className="mt-0.5 shrink-0 text-[var(--accent)]"
              />
              <p className="min-w-0 break-all text-xs leading-relaxed text-[var(--text-muted)]">
                {folder || "Not set"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void changeFolder(true)}
                className="ui-btn ui-btn-outline text-[13px] disabled:opacity-60"
              >
                Move notes here…
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void changeFolder(false)}
                className="ui-btn ui-btn-ghost text-[13px] disabled:opacity-60"
              >
                Point only…
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-faint)]">
              <strong className="font-medium text-[var(--text-muted)]">
                Move
              </strong>{" "}
              relocates existing .txt notes.{" "}
              <strong className="font-medium text-[var(--text-muted)]">
                Point only
              </strong>{" "}
              keeps old files where they are.
            </p>
          </section>

          {message ? (
            <p className="anim-fade-in rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
