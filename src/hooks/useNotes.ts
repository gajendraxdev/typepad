import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../lib/api";
import type { Note, NoteMeta, OpenTab, SaveStatus } from "../types";

/** Debounce after typing stops before writing to disk. */
export const DEBOUNCE_MS = 700;

function noteToTab(note: Note, draft = note.content): OpenTab {
  return {
    path: note.path,
    filename: note.filename,
    title: note.title,
    content: note.content,
    draft,
    saveStatus: "idle",
  };
}

function titleFromDraft(draft: string): string {
  const first = draft.split("\n")[0]?.trim() ?? "";
  return first || "Untitled";
}

function neighborPath(
  tabs: OpenTab[],
  closingPath: string,
): string | null {
  const idx = tabs.findIndex((t) => t.path === closingPath);
  if (idx < 0) return null;
  const next = tabs.filter((t) => t.path !== closingPath);
  return (next[idx] ?? next[idx - 1] ?? null)?.path ?? null;
}

export function useNotes(ready: boolean) {
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabsRef = useRef(tabs);
  const activePathRef = useRef(activePath);
  /** Debounce timers per note path. */
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  /** In-flight save promises per path (serialized). */
  const inFlight = useRef<Map<string, Promise<void>>>(new Map());
  /** Paths that need another pass after the current in-flight save. */
  const pendingResave = useRef<Set<string>>(new Set());

  tabsRef.current = tabs;
  activePathRef.current = activePath;

  const active = useMemo(
    () => tabs.find((t) => t.path === activePath) ?? null,
    [tabs, activePath],
  );

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listNotes();
      setNotes(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshList();
  }, [ready, refreshList]);

  const clearTimer = useCallback((path: string) => {
    const t = saveTimers.current.get(path);
    if (t) {
      clearTimeout(t);
      saveTimers.current.delete(path);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const t of saveTimers.current.values()) clearTimeout(t);
    saveTimers.current.clear();
  }, []);

  /**
   * Persist one note. Snapshots draft at start so concurrent typing does not
   * mark the wrong content as saved. Chains if already in-flight for path.
   */
  const flushSave = useCallback(
    async (path?: string): Promise<void> => {
      const targetPath = path ?? activePathRef.current;
      if (!targetPath) return;

      clearTimer(targetPath);

      const existing = inFlight.current.get(targetPath);
      if (existing) {
        pendingResave.current.add(targetPath);
        await existing;
        if (!pendingResave.current.has(targetPath)) return;
        pendingResave.current.delete(targetPath);
        // Fall through for another pass with latest draft.
      }

      const tab = tabsRef.current.find((t) => t.path === targetPath);
      if (!tab) return;
      if (tab.draft === tab.content) {
        if (tab.saveStatus !== "idle" && tab.saveStatus !== "saved") {
          setTabs((prev) =>
            prev.map((t) =>
              t.path === targetPath
                ? { ...t, saveStatus: "saved" as SaveStatus }
                : t,
            ),
          );
        }
        return;
      }

      const savedContent = tab.draft;
      const pathAtStart = tab.path;
      let followUpPath: string | null = null;

      const applyTabs = (next: OpenTab[]) => {
        tabsRef.current = next;
        setTabs(next);
      };

      const work = (async () => {
        applyTabs(
          tabsRef.current.map((t) =>
            t.path === targetPath
              ? { ...t, saveStatus: "saving" as SaveStatus }
              : t,
          ),
        );
        try {
          const result = await api.saveNote(pathAtStart, savedContent);
          const next = tabsRef.current.map((t) => {
            if (t.path !== targetPath && t.path !== pathAtStart) return t;
            const stillDirty = t.draft !== savedContent;
            if (stillDirty) followUpPath = result.path;
            return {
              ...t,
              path: result.path,
              filename: result.filename,
              title: stillDirty ? titleFromDraft(t.draft) : result.title,
              // Snapshot that was actually written — not live draft.
              content: savedContent,
              saveStatus: (stillDirty ? "dirty" : "saved") as SaveStatus,
            };
          });
          applyTabs(next);
          if (
            activePathRef.current === targetPath ||
            activePathRef.current === pathAtStart
          ) {
            if (result.path !== activePathRef.current) {
              activePathRef.current = result.path;
              setActivePath(result.path);
            }
          }
          await refreshList();
        } catch (e) {
          applyTabs(
            tabsRef.current.map((t) =>
              t.path === targetPath || t.path === pathAtStart
                ? { ...t, saveStatus: "error" as SaveStatus }
                : t,
            ),
          );
          setError(String(e));
        }
      })();

      inFlight.current.set(targetPath, work);
      try {
        await work;
      } finally {
        inFlight.current.delete(targetPath);
      }

      const queued =
        followUpPath ??
        (pendingResave.current.has(targetPath) ? targetPath : null);
      pendingResave.current.delete(targetPath);
      if (followUpPath) pendingResave.current.delete(followUpPath);
      if (queued) {
        const t = tabsRef.current.find((x) => x.path === queued);
        if (t && t.draft !== t.content) {
          await flushSave(queued);
        }
      }
    },
    [clearTimer, refreshList],
  );

  const flushAllDirty = useCallback(async () => {
    clearAllTimers();
    const dirty = tabsRef.current.filter((t) => t.draft !== t.content);
    // Serialize to avoid thrashing list_notes; also simpler rename handling.
    for (const t of dirty) {
      await flushSave(t.path);
    }
  }, [clearAllTimers, flushSave]);

  const ensureSaved = useCallback(
    async (path: string | null) => {
      if (!path) return;
      clearTimer(path);
      const tab = tabsRef.current.find((t) => t.path === path);
      if (tab && tab.draft !== tab.content) {
        await flushSave(path);
      } else if (inFlight.current.has(path)) {
        await inFlight.current.get(path);
      }
    },
    [clearTimer, flushSave],
  );

  const scheduleSave = useCallback(
    (path: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.path === path
            ? { ...t, saveStatus: "dirty" as SaveStatus }
            : t,
        ),
      );
      clearTimer(path);
      const timer = setTimeout(() => {
        saveTimers.current.delete(path);
        void flushSave(path);
      }, DEBOUNCE_MS);
      saveTimers.current.set(path, timer);
    },
    [clearTimer, flushSave],
  );

  const openNote = useCallback(
    async (path: string) => {
      await ensureSaved(activePathRef.current);

      const existing = tabsRef.current.find((t) => t.path === path);
      if (existing) {
        setActivePath(path);
        return;
      }

      setLoading(true);
      try {
        const note = await api.readNote(path);
        setTabs((prev) => {
          if (prev.some((t) => t.path === note.path)) return prev;
          return [...prev, noteToTab(note)];
        });
        setActivePath(note.path);
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [ensureSaved],
  );

  const newNote = useCallback(async () => {
    await ensureSaved(activePathRef.current);
    setLoading(true);
    try {
      const note = await api.createNote();
      setTabs((prev) => [...prev, noteToTab(note)]);
      setActivePath(note.path);
      await refreshList();
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [ensureSaved, refreshList]);

  const closeTab = useCallback(
    async (path: string) => {
      await ensureSaved(path);

      const current = tabsRef.current;
      const nextActive =
        activePathRef.current === path
          ? neighborPath(current, path)
          : activePathRef.current;
      const nextTabs = current.filter((t) => t.path !== path);
      setTabs(nextTabs);
      if (activePathRef.current === path) {
        setActivePath(nextActive);
      }
      clearTimer(path);
    },
    [clearTimer, ensureSaved],
  );

  const closeNote = useCallback(async () => {
    const path = activePathRef.current;
    if (!path) return;
    await closeTab(path);
  }, [closeTab]);

  const deleteNote = useCallback(
    async (path: string) => {
      clearTimer(path);
      try {
        // Flush is skipped on purpose — we're deleting; still try soft-delete.
        await api.trashNote(path);
        const current = tabsRef.current;
        const nextActive =
          activePathRef.current === path
            ? neighborPath(current, path)
            : activePathRef.current;
        setTabs(current.filter((t) => t.path !== path));
        if (activePathRef.current === path) {
          setActivePath(nextActive);
        }
        await refreshList();
      } catch (e) {
        setError(String(e));
      }
    },
    [clearTimer, refreshList],
  );

  const updateDraft = useCallback(
    (value: string) => {
      const path = activePathRef.current;
      if (!path) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.path === path
            ? {
                ...t,
                draft: value,
                title: titleFromDraft(value),
                saveStatus: "dirty" as SaveStatus,
              }
            : t,
        ),
      );
      scheduleSave(path);
    },
    [scheduleSave],
  );

  const selectTab = useCallback(
    async (path: string) => {
      if (path === activePathRef.current) return;
      await ensureSaved(activePathRef.current);
      setActivePath(path);
    },
    [ensureSaved],
  );

  /** After notes folder change: drop open tabs (paths are stale) and reload list. */
  const resetAfterFolderChange = useCallback(async () => {
    clearAllTimers();
    inFlight.current.clear();
    pendingResave.current.clear();
    setTabs([]);
    setActivePath(null);
    await refreshList();
  }, [clearAllTimers, refreshList]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    notes,
    tabs,
    active,
    activePath,
    draft: active?.draft ?? "",
    saveStatus: active?.saveStatus ?? ("idle" as SaveStatus),
    loading,
    error,
    refreshList,
    openNote,
    newNote,
    closeNote,
    closeTab,
    selectTab,
    deleteNote,
    updateDraft,
    flushSave,
    flushAllDirty,
    resetAfterFolderChange,
    setError,
  };
}
