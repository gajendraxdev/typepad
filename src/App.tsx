import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor, type EditorHandle } from "./components/Editor";
import { EmptyState } from "./components/EmptyState";
import { FirstRunDialog } from "./components/FirstRunDialog";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { RenameDialog } from "./components/RenameDialog";
import { TitleBar } from "./components/TitleBar";
import { Toast } from "./components/Toast";
import { UpdateBanner } from "./components/UpdateBanner";
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
import {
  isPinned,
  lockNotePath,
  movePinnedPath,
  normalizeFsPath,
  prunePinnedPaths,
  remapLockedPath,
  remapPinnedPath,
  removeLockedPath,
  removePinnedPath,
  togglePinnedPath,
} from "./lib/notes";
import type { AppConfig } from "./types";

type PinToast = {
  message: string;
  undoPins: string[];
};

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
  /** Bumped to focus library search after sidebar mounts/expands. */
  const [searchFocusReq, setSearchFocusReq] = useState(0);
  const [pinToast, setPinToast] = useState<PinToast | null>(null);
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const widthSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest config for concurrent-safe patches (not reset from render). */
  const configRef = useRef<AppConfig | null>(null);
  /** Serializes config IPC writes so concurrent patches cannot clobber each other. */
  const configWriteChain = useRef(Promise.resolve());

  const ready = bootstrapped && !needsSetup && !!config?.notesFolder;

  /**
   * Apply config locally, then enqueue a disk write of the *latest* snapshot when
   * this turn of the queue runs (not a stale closed-over object).
   */
  const persistConfig = useCallback((next: AppConfig) => {
    const local = normalizeConfig(next);
    configRef.current = local;
    setConfig(local);
    setSidebarWidth(local.sidebarWidth);

    const run = configWriteChain.current
      .catch(() => undefined)
      .then(async () => {
        const snapshot = configRef.current;
        if (!snapshot) return;
        const saved = await api.updateConfig(normalizeConfig(snapshot));
        const fromServer = normalizeConfig(saved);
        // Skip applying a response if a newer local patch landed mid-flight.
        if (configRef.current !== snapshot) return;
        configRef.current = fromServer;
        setConfig(fromServer);
        setSidebarWidth(fromServer.sidebarWidth);
      });
    configWriteChain.current = run;
    return run;
  }, []);

  const handlePathRenamed = useCallback(
    (oldPath: string, newPath: string) => {
      const prev = configRef.current;
      if (!prev) return;
      void persistConfig({
        ...prev,
        pinnedNotePaths: remapPinnedPath(prev.pinnedNotePaths, oldPath, newPath),
        lockedNotePaths: remapLockedPath(prev.lockedNotePaths, oldPath, newPath),
      });
    },
    [persistConfig],
  );

  const isNameLocked = useCallback((path: string) => {
    const prev = configRef.current;
    if (!prev) return false;
    return isPinned(prev.lockedNotePaths, path);
  }, []);

  const notesApi = useNotes(ready, {
    onPathRenamed: handlePathRenamed,
    isNameLocked,
  });

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
        if (!cfg.sidebarOpen) {
          cfg = { ...cfg, sidebarOpen: true };
          try {
            cfg = normalizeConfig(await api.updateConfig(cfg));
          } catch {
            // Keep local fix even if write fails.
          }
        }
        if (cancelled) return;
        configRef.current = cfg;
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

  const handleFirstRun = useCallback(async (path: string) => {
    const saved = await api.setNotesFolder({ path, moveExisting: false });
    const normalized = normalizeConfig({
      ...saved,
      sidebarOpen: true,
    });
    configRef.current = normalized;
    setConfig(normalized);
    setSidebarWidth(normalized.sidebarWidth);
    setNeedsSetup(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    const prev = configRef.current;
    if (!prev) return;
    void persistConfig({ ...prev, sidebarOpen: !prev.sidebarOpen });
  }, [persistConfig]);

  const handleSidebarWidth = useCallback(
    (width: number) => {
      const w = normalizeSidebarWidth(width);
      setSidebarWidth(w);
      if (widthSaveTimer.current) clearTimeout(widthSaveTimer.current);
      widthSaveTimer.current = setTimeout(() => {
        const prev = configRef.current;
        if (!prev) return;
        void persistConfig({ ...prev, sidebarWidth: w });
      }, 250);
    },
    [persistConfig],
  );

  const { newNote, closeNote, selectTab, closeTab, flushAllDirty } = notesApi;

  // Drop pins/locks for deleted files — never before the library list loads.
  useEffect(() => {
    if (!config || !ready || !notesApi.listHydrated) return;
    const nextPins = prunePinnedPaths(config.pinnedNotePaths, notesApi.notes);
    const nextLocks = prunePinnedPaths(config.lockedNotePaths, notesApi.notes);
    if (
      nextPins.length !== config.pinnedNotePaths.length ||
      nextLocks.length !== config.lockedNotePaths.length
    ) {
      void persistConfig({
        ...config,
        pinnedNotePaths: nextPins,
        lockedNotePaths: nextLocks,
      });
    }
  }, [config, notesApi.notes, notesApi.listHydrated, ready, persistConfig]);

  /** Optimistic pin list update, then persist via the write queue. */
  const applyPinnedPaths = useCallback(
    (nextPins: string[]) => {
      const prev = configRef.current;
      if (!prev) return;
      void persistConfig({ ...prev, pinnedNotePaths: nextPins });
    },
    [persistConfig],
  );

  const togglePin = useCallback(
    (path: string) => {
      const prev = configRef.current;
      if (!prev) return;
      const wasPinned = isPinned(prev.pinnedNotePaths, path);
      const before = [...prev.pinnedNotePaths];
      applyPinnedPaths(togglePinnedPath(prev.pinnedNotePaths, path));
      setPinToast({
        message: wasPinned ? "Unpinned" : "Pinned to top",
        undoPins: before,
      });
    },
    [applyPinnedPaths],
  );

  const undoPinChange = useCallback(() => {
    if (!pinToast) return;
    applyPinnedPaths(pinToast.undoPins);
    setPinToast(null);
  }, [pinToast, applyPinnedPaths]);

  const dismissPinToast = useCallback(() => {
    setPinToast(null);
  }, []);

  const reorderPins = useCallback(
    (fromIndex: number, toIndex: number) => {
      const prev = configRef.current;
      if (!prev) return;
      const next = movePinnedPath(prev.pinnedNotePaths, fromIndex, toIndex);
      if (next === prev.pinnedNotePaths) return;
      applyPinnedPaths(next);
    },
    [applyPinnedPaths],
  );

  const activePathRef = useRef(notesApi.activePath);
  activePathRef.current = notesApi.activePath;

  const toggleActivePin = useCallback(() => {
    const path = activePathRef.current;
    if (!path) return;
    togglePin(path);
  }, [togglePin]);

  const handleDeleteNote = useCallback(
    async (path: string) => {
      await notesApi.deleteNote(path);
      const prev = configRef.current;
      if (!prev) return;
      const nextPins = removePinnedPath(prev.pinnedNotePaths, path);
      const nextLocks = removeLockedPath(prev.lockedNotePaths, path);
      if (
        nextPins.length !== prev.pinnedNotePaths.length ||
        nextLocks.length !== prev.lockedNotePaths.length
      ) {
        void persistConfig({
          ...prev,
          pinnedNotePaths: nextPins,
          lockedNotePaths: nextLocks,
        });
      }
    },
    [notesApi, persistConfig],
  );

  const openRename = useCallback((path: string) => {
    setRenamePath(path);
  }, []);

  const renameInitialName = useMemo(() => {
    if (!renamePath) return "";
    const key = renamePath;
    const meta = notesApi.notes.find(
      (n) => normalizeFsPath(n.path) === normalizeFsPath(key),
    );
    const tab = notesApi.tabs.find(
      (t) => normalizeFsPath(t.path) === normalizeFsPath(key),
    );
    const filename = meta?.filename ?? tab?.filename ?? "";
    return filename.replace(/\.txt$/i, "") || tab?.title || meta?.title || "";
  }, [renamePath, notesApi.notes, notesApi.tabs]);

  const confirmRename = useCallback(
    async (name: string) => {
      if (!renamePath) return;
      const path = renamePath;
      setRenamePath(null);
      try {
        // renameNote remaps pins/locks via onPathRenamed; we only lock the name.
        const result = await notesApi.renameNote(path, name);
        const prev = configRef.current;
        if (!prev) return;
        void persistConfig({
          ...prev,
          lockedNotePaths: lockNotePath(prev.lockedNotePaths, result.path),
        });
      } catch {
        // Error surface via notesApi.error banner.
      }
    },
    [renamePath, notesApi, persistConfig],
  );

  const toggleMarkdownPreview = useCallback(() => {
    const prev = configRef.current;
    if (!prev) return;
    void persistConfig({
      ...prev,
      markdownPreview: !prev.markdownPreview,
    });
  }, [persistConfig]);

  // After Ctrl+F expands the sidebar, wait until the search input exists, then focus it.
  useEffect(() => {
    if (searchFocusReq === 0) return;
    if (!sidebarOpen) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      const el = searchRef.current;
      if (el) {
        el.focus();
        el.select();
        window.clearInterval(id);
      } else if (tries > 20) {
        window.clearInterval(id);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [searchFocusReq, sidebarOpen]);

  const shortcutHandlers = useMemo(
    () => ({
      onNew: () => void newNote(),
      // Ctrl+F → find inside the open note
      onFindInNote: () => {
        if (notesApi.active) {
          editorRef.current?.openFind();
        } else {
          // No note open → fall back to library search
          const prev = configRef.current;
          if (prev && !prev.sidebarOpen) {
            void persistConfig({ ...prev, sidebarOpen: true });
          }
          setSearchFocusReq((n) => n + 1);
        }
      },
      // Ctrl+Shift+F → search notes in the library
      onLibrarySearch: () => {
        const prev = configRef.current;
        if (prev && !prev.sidebarOpen) {
          void persistConfig({ ...prev, sidebarOpen: true });
        }
        setSearchFocusReq((n) => n + 1);
      },
      onSettings: () => setSettingsOpen(true),
      onCloseNote: () => void closeNote(),
      onToggleSidebar: toggleSidebar,
      onFindNext: () => editorRef.current?.findNext(),
      onFindPrev: () => editorRef.current?.findPrev(),
      onToggleMarkdownPreview: toggleMarkdownPreview,
      // Always provide the handler — it no-ops when no note is open.
      onTogglePinActive: toggleActivePin,
    }),
    [
      newNote,
      closeNote,
      persistConfig,
      toggleSidebar,
      notesApi.active,
      toggleMarkdownPreview,
      toggleActivePin,
    ],
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
      pinnedPaths={config?.pinnedNotePaths ?? []}
      onTogglePinPath={togglePin}
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
              // Pins are absolute paths in the old folder — drop them.
              const normalized = normalizeConfig({
                ...next,
                pinnedNotePaths: [],
                lockedNotePaths: [],
              });
              configRef.current = normalized;
              setConfig(normalized);
              setPinToast(null);
              setRenamePath(null);
              await api.updateConfig(normalized).catch(() => undefined);
              await notesApi.resetAfterFolderChange();
            } else {
              await persistConfig(next);
            }
          }}
        />
      ) : null}

      {titleBar}
      {ready ? <UpdateBanner /> : null}
      <Toast
        open={!!pinToast}
        message={pinToast?.message ?? ""}
        action={
          pinToast
            ? { label: "Undo", onClick: undoPinChange }
            : null
        }
        onDismiss={dismissPinToast}
      />

      <RenameDialog
        open={!!renamePath}
        initialName={renameInitialName}
        onCancel={() => setRenamePath(null)}
        onConfirm={(name) => void confirmRename(name)}
      />

      <div className="app-body">
        <Sidebar
          notes={notesApi.notes}
          activePath={notesApi.activePath}
          openPaths={notesApi.tabs.map((t) => t.path)}
          pinnedPaths={config?.pinnedNotePaths ?? []}
          lockedNotePaths={config?.lockedNotePaths ?? []}
          query={query}
          onQueryChange={setQuery}
          onSelect={(path) => void notesApi.openNote(path)}
          onNew={() => void notesApi.newNote()}
          onDelete={(path) => void handleDeleteNote(path)}
          onTogglePin={togglePin}
          onRename={openRename}
          onReorderPins={reorderPins}
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
                  ref={editorRef}
                  value={notesApi.draft}
                  onChange={notesApi.updateDraft}
                  fontFamily={
                    config?.fontFamily ??
                    "ui-sans-serif, system-ui, sans-serif"
                  }
                  fontSize={config?.fontSize ?? 16}
                  disabled={notesApi.loading}
                  noteKey={notesApi.active.path}
                  previewMode={config?.markdownPreview ?? false}
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
              markdownPreview={config?.markdownPreview ?? false}
              onToggleMarkdownPreview={toggleMarkdownPreview}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
