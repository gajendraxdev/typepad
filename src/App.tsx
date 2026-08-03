import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { EmptyState } from "./components/EmptyState";
import { FirstRunDialog } from "./components/FirstRunDialog";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNotes } from "./hooks/useNotes";
import { useTheme } from "./hooks/useTheme";
import { useWindowCloseFlush } from "./hooks/useWindowCloseFlush";
import * as api from "./lib/api";
import {
  normalizeConfig,
  normalizeSidebarWidth,
  SIDEBAR_DEFAULT,
} from "./lib/config";
import type { AppConfig } from "./types";

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [defaultFolder, setDefaultFolder] = useState("");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bootError, setBootError] = useState<string | null>(null);
  /** Live width while dragging (persisted after pointer up via onWidthChange). */
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const searchRef = useRef<HTMLInputElement>(null);
  const widthSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready = bootstrapped && !needsSetup && !!config?.notesFolder;
  const notesApi = useNotes(ready);

  useTheme(config?.theme ?? "system");
  useWindowCloseFlush(notesApi.flushAllDirty);

  const sidebarOpen = config?.sidebarOpen ?? true;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await api.getBootstrap();
        if (cancelled) return;
        let cfg = normalizeConfig(info.config);
        if (cfg.tabLayout !== "sidebar" || !cfg.sidebarOpen) {
          cfg = { ...cfg, tabLayout: "sidebar", sidebarOpen: true };
          try {
            cfg = normalizeConfig(await api.updateConfig(cfg));
          } catch {
            // Keep local fix even if write fails.
          }
        }
        if (cancelled) return;
        setConfig(cfg);
        setSidebarWidth(cfg.sidebarWidth);
        setDefaultFolder(info.defaultNotesFolder);
        setNeedsSetup(info.needsSetup);
        setBootstrapped(true);
      } catch (e) {
        if (!cancelled) {
          setBootError(String(e));
          setBootstrapped(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistConfig = useCallback(async (next: AppConfig) => {
    const saved = await api.updateConfig(normalizeConfig(next));
    const normalized = normalizeConfig(saved);
    setConfig(normalized);
    setSidebarWidth(normalized.sidebarWidth);
  }, []);

  const handleFirstRun = useCallback(async (path: string) => {
    const saved = await api.setNotesFolder({ path, moveExisting: false });
    const normalized = normalizeConfig({
      ...saved,
      tabLayout: "sidebar",
      sidebarOpen: true,
    });
    setConfig(normalized);
    setSidebarWidth(normalized.sidebarWidth);
    setNeedsSetup(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!config) return;
    void persistConfig({ ...config, sidebarOpen: !config.sidebarOpen });
  }, [config, persistConfig]);

  const handleSidebarWidth = useCallback(
    (width: number) => {
      const w = normalizeSidebarWidth(width);
      setSidebarWidth(w);
      if (!config) return;
      if (widthSaveTimer.current) clearTimeout(widthSaveTimer.current);
      widthSaveTimer.current = setTimeout(() => {
        void persistConfig({ ...config, sidebarWidth: w });
      }, 250);
    },
    [config, persistConfig],
  );

  const { newNote, closeNote, selectTab, closeTab, flushAllDirty } = notesApi;

  const shortcutHandlers = useMemo(
    () => ({
      onNew: () => void newNote(),
      onSearch: () => {
        if (config && !config.sidebarOpen) {
          void persistConfig({ ...config, sidebarOpen: true });
        }
        requestAnimationFrame(() => searchRef.current?.focus());
      },
      onSettings: () => setSettingsOpen(true),
      onCloseNote: () => void closeNote(),
      onToggleSidebar: toggleSidebar,
    }),
    [newNote, closeNote, config, persistConfig, toggleSidebar],
  );

  useKeyboardShortcuts(shortcutHandlers);

  const titleBar = (
    <TitleBar
      tabs={notesApi.tabs}
      activePath={notesApi.activePath}
      showTabs
      onSelect={(path) => void selectTab(path)}
      onClose={(path) => void closeTab(path)}
      onNew={() => void newNote()}
      onOpenSettings={() => setSettingsOpen(true)}
      onToggleSidebar={toggleSidebar}
      sidebarVisible={sidebarOpen}
    />
  );

  if (!bootstrapped) {
    return (
      <div className="app-shell">
        <TitleBar
          tabs={[]}
          activePath={null}
          showTabs={false}
          onSelect={() => undefined}
          onClose={() => undefined}
          onNew={() => undefined}
          onOpenSettings={() => undefined}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-[var(--accent-soft)]" />
          <p className="text-sm text-[var(--text-muted)]">Opening Typepad…</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="app-shell">
        {titleBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="font-medium text-[var(--danger)]">
            Failed to start Typepad
          </p>
          <p className="max-w-md text-sm text-[var(--text-muted)]">{bootError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {needsSetup ? (
        <FirstRunDialog
          defaultPath={defaultFolder}
          onComplete={handleFirstRun}
        />
      ) : null}

      {settingsOpen && config ? (
        <SettingsModal
          config={config}
          onClose={() => setSettingsOpen(false)}
          onConfigChange={async (next) => {
            const folderChanged = next.notesFolder !== config.notesFolder;
            if (folderChanged) {
              await flushAllDirty().catch(() => undefined);
              setConfig(normalizeConfig(next));
              await api
                .updateConfig(normalizeConfig(next))
                .catch(() => undefined);
              await notesApi.resetAfterFolderChange();
            } else {
              await persistConfig(next);
            }
          }}
        />
      ) : null}

      {titleBar}

      <div className="app-body">
        <Sidebar
          notes={notesApi.notes}
          activePath={notesApi.activePath}
          openPaths={notesApi.tabs.map((t) => t.path)}
          query={query}
          onQueryChange={setQuery}
          onSelect={(path) => void notesApi.openNote(path)}
          onNew={() => void notesApi.newNote()}
          onDelete={(path) => void notesApi.deleteNote(path)}
          searchRef={searchRef}
          collapsed={!sidebarOpen}
          onToggle={toggleSidebar}
          width={sidebarWidth}
          onWidthChange={handleSidebarWidth}
        />

        <div className="app-main-row">
          <main className="app-main">
            {notesApi.error ? (
              <div className="anim-fade-in border-b border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-2 text-xs text-[var(--danger)]">
                {notesApi.error}
              </div>
            ) : null}

            <div className="app-editor-area">
              {notesApi.active ? (
                <Editor
                  value={notesApi.draft}
                  onChange={notesApi.updateDraft}
                  fontFamily={
                    config?.fontFamily ??
                    "ui-sans-serif, system-ui, sans-serif"
                  }
                  fontSize={config?.fontSize ?? 16}
                  disabled={notesApi.loading}
                  noteKey={notesApi.active.path}
                />
              ) : (
                <EmptyState onNew={() => void notesApi.newNote()} />
              )}
            </div>

            <StatusBar
              content={notesApi.active ? notesApi.draft : ""}
              saveStatus={notesApi.active ? notesApi.saveStatus : "idle"}
              filename={notesApi.active?.filename}
              title={notesApi.active?.title}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
