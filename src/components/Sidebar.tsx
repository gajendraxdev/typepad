import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIDEBAR_MAX, SIDEBAR_MIN } from "../lib/config";
import {
  displayNoteTitle,
  normalizeFsPath,
  noteOptionId,
  splitLibraryNotes,
} from "../lib/notes";
import type { NoteMeta } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  IconChevronDown,
  IconChevronRight,
  IconNote,
  IconPanelLeft,
  IconPlus,
} from "./icons";
import { NoteContextMenu } from "./NoteContextMenu";
import { NoteListItem } from "./NoteListItem";
import { SearchBar } from "./SearchBar";

const PINNED_COLLAPSED_KEY = "typepad.pinnedSectionCollapsed";

interface Props {
  notes: NoteMeta[];
  activePath: string | null;
  openPaths: string[];
  pinnedPaths: string[];
  lockedNotePaths: string[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (path: string) => void;
  onNew: () => void;
  onDelete: (path: string) => void;
  onTogglePin: (path: string) => void;
  onRename: (path: string) => void;
  /** Reorder within the pinned list (indices into pinnedPaths). */
  onReorderPins: (fromIndex: number, toIndex: number) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

type ContextState = {
  note: NoteMeta;
  pinned: boolean;
  x: number;
  y: number;
} | null;

function pathKey(p: string): string {
  return normalizeFsPath(p);
}

export function Sidebar({
  notes,
  activePath,
  openPaths,
  pinnedPaths,
  lockedNotePaths,
  query,
  onQueryChange,
  onSelect,
  onNew,
  onDelete,
  onTogglePin,
  onRename,
  onReorderPins,
  searchRef,
  collapsed,
  onToggle,
  width,
  onWidthChange,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<NoteMeta | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextState>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PINNED_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  /** Keyboard highlight in the library (separate from open/active note). */
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const resizing = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const openSet = useMemo(() => new Set(openPaths.map(pathKey)), [openPaths]);

  const togglePinnedCollapsed = useCallback(() => {
    setPinnedCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PINNED_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.preview.toLowerCase().includes(q) ||
        n.filename.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const sections = useMemo(
    () => splitLibraryNotes(filtered, pinnedPaths),
    [filtered, pinnedPaths],
  );

  const searching = query.trim().length > 0;
  const canReorder = !searching && sections.pinned.length > 1 && !pinnedCollapsed;

  /** Flat list of navigable rows (respects collapsed pinned). */
  const navNotes = useMemo(() => {
    const pinned =
      pinnedCollapsed && sections.pinned.length > 0 ? [] : sections.pinned;
    return [...pinned, ...sections.others];
  }, [sections.pinned, sections.others, pinnedCollapsed]);

  const totalVisible = sections.pinned.length + sections.others.length;

  const openContext = useCallback(
    (note: NoteMeta, pinned: boolean, x: number, y: number) => {
      const menuW = 200;
      const menuH = 130;
      const left = Math.min(x, window.innerWidth - menuW - 8);
      const top = Math.min(y, window.innerHeight - menuH - 8);
      setContextMenu({
        note,
        pinned,
        x: Math.max(8, left),
        y: Math.max(8, top),
      });
    },
    [],
  );

  const reorderVisiblePins = useCallback(
    (fromVisible: number, toVisible: number) => {
      const fromPath = sections.pinned[fromVisible]?.path;
      const toPath = sections.pinned[toVisible]?.path;
      if (!fromPath || !toPath || fromPath === toPath) return;
      const fromNorm = pathKey(fromPath);
      const toNorm = pathKey(toPath);
      const fromIndex = pinnedPaths.findIndex((p) => pathKey(p) === fromNorm);
      const toIndex = pinnedPaths.findIndex((p) => pathKey(p) === toNorm);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      onReorderPins(fromIndex, toIndex);
    },
    [sections.pinned, pinnedPaths, onReorderPins],
  );

  const clearDrag = useCallback(() => {
    dragFromRef.current = null;
    setDragFrom(null);
    setDragOver(null);
  }, []);

  // Keep keyboard focus in sync with the open note when it changes.
  useEffect(() => {
    if (activePath) setFocusPath(activePath);
  }, [activePath]);

  // Drop focus if the note disappeared from the visible list.
  useEffect(() => {
    if (!focusPath) return;
    const stillThere = navNotes.some((n) => pathKey(n.path) === pathKey(focusPath));
    if (!stillThere) {
      setFocusPath(navNotes[0]?.path ?? activePath ?? null);
    }
  }, [navNotes, focusPath, activePath]);

  const moveFocus = useCallback(
    (delta: number) => {
      if (navNotes.length === 0) return;
      const cur = focusPath
        ? navNotes.findIndex((n) => pathKey(n.path) === pathKey(focusPath))
        : -1;
      let next = cur + delta;
      if (cur < 0) next = delta > 0 ? 0 : navNotes.length - 1;
      if (next < 0) next = 0;
      if (next >= navNotes.length) next = navNotes.length - 1;
      setFocusPath(navNotes[next].path);
    },
    [navNotes, focusPath],
  );

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't hijack typing in the search box.
      if (target.closest("input, textarea")) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        if (navNotes[0]) setFocusPath(navNotes[0].path);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        if (navNotes.length) setFocusPath(navNotes[navNotes.length - 1].path);
        return;
      }
      if (e.key === "Enter" && focusPath) {
        e.preventDefault();
        onSelect(focusPath);
        return;
      }
      // Ctrl+Shift+L handled globally; also allow plain "p" when list is focused.
      if (
        (e.key === "p" || e.key === "P") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        focusPath
      ) {
        e.preventDefault();
        onTogglePin(focusPath);
        return;
      }
      if (e.key === "F2" && focusPath) {
        e.preventDefault();
        onRename(focusPath);
        return;
      }
    },
    [moveFocus, focusPath, onSelect, onTogglePin, onRename, navNotes],
  );

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      resizing.current = true;
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: PointerEvent) => {
        if (!resizing.current) return;
        const next = Math.min(
          SIDEBAR_MAX,
          Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX)),
        );
        onWidthChange(next);
      };
      const onUp = () => {
        resizing.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onWidthChange, width],
  );

  const onResizeDoubleClick = useCallback(() => {
    onWidthChange(240);
  }, [onWidthChange]);

  useEffect(() => {
    return () => {
      resizing.current = false;
    };
  }, []);

  useEffect(() => {
    if (searching) clearDrag();
  }, [searching, clearDrag]);

  if (collapsed) {
    return (
      <div className="flex w-9 shrink-0 flex-col items-center gap-0.5 border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-1.5">
        <button
          type="button"
          onClick={onToggle}
          title="Show library (Ctrl+B)"
          className="ui-icon-btn"
          aria-label="Expand sidebar"
        >
          <IconPanelLeft size={14} />
        </button>
        <button
          type="button"
          onClick={onNew}
          title="New note (Ctrl+N)"
          className="ui-icon-btn text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="New note"
        >
          <IconPlus size={15} />
        </button>
      </div>
    );
  }

  const renderRow = (
    note: NoteMeta,
    pinned: boolean,
    dragIndex?: number,
  ) => {
    const focused =
      !!focusPath && pathKey(note.path) === pathKey(focusPath);
    const displayNote: NoteMeta = {
      ...note,
      title: displayNoteTitle(note, lockedNotePaths),
    };
    return (
      <NoteListItem
        key={note.path}
        note={displayNote}
        active={!!activePath && pathKey(note.path) === pathKey(activePath)}
        focused={focused}
        isOpen={openSet.has(pathKey(note.path))}
        pinned={pinned}
        canDrag={canReorder && pinned && dragIndex !== undefined}
        dragIndex={dragIndex}
        isDragging={dragFrom !== null && dragFrom === dragIndex}
        isDropTarget={
          dragFrom !== null &&
          dragOver === dragIndex &&
          dragFrom !== dragIndex
        }
        onSelect={() => {
          setFocusPath(note.path);
          onSelect(note.path);
        }}
        onTogglePin={() => onTogglePin(note.path)}
        onDelete={() => setPendingDelete(note)}
        onContextMenu={(x, y) => openContext(note, pinned, x, y)}
        onDragStart={(index) => {
          dragFromRef.current = index;
          setDragFrom(index);
          setDragOver(index);
        }}
        onDragOver={(index) => setDragOver(index)}
        onDrop={(toIndex) => {
          const from = dragFromRef.current;
          if (from !== null && from !== toIndex) {
            reorderVisiblePins(from, toIndex);
          }
          clearDrag();
        }}
        onDragEnd={clearDrag}
      />
    );
  };

  const emptyMessage =
    notes.length === 0
      ? "No notes yet — press Ctrl+N"
      : searching
        ? "No notes match that search"
        : "No notes";

  return (
    <>
      <div className="sidebar-shell" style={{ width }}>
        <aside
          className="flex h-full min-w-0 flex-1 flex-col bg-[var(--bg-sidebar)]"
          onKeyDown={onListKeyDown}
        >
          <div className="flex items-center justify-between gap-1 px-2 pt-1.5 pb-1">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-[0.05em] text-[var(--text-faint)] uppercase">
                Library
              </div>
              <div className="text-[10px] text-[var(--text-muted)] tabular-nums">
                {notes.length} note{notes.length === 1 ? "" : "s"}
                {sections.pinned.length > 0
                  ? ` · ${sections.pinned.length} pinned`
                  : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Hide library (Ctrl+B)"
              className="ui-icon-btn"
              aria-label="Collapse sidebar"
            >
              <IconPanelLeft size={13} />
            </button>
          </div>

          <div className="px-2 pb-1">
            <button
              type="button"
              onClick={onNew}
              className="ui-btn ui-btn-soft w-full justify-start !rounded-md !py-1.5"
            >
              <IconPlus size={13} />
              New note
            </button>
          </div>

          <SearchBar ref={searchRef} value={query} onChange={onQueryChange} />

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5"
            role="listbox"
            aria-label="Notes"
            tabIndex={0}
            aria-activedescendant={
              focusPath ? noteOptionId(focusPath) : undefined
            }
          >
            {totalVisible === 0 ? (
              <div className="anim-fade-in flex flex-col items-center gap-1.5 px-2 py-6 text-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-hover)] text-[var(--text-faint)]">
                  <IconNote size={14} />
                </div>
                <p className="text-[11px] text-[var(--text-faint)]">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sections.pinned.length > 0 ? (
                  <section className="library-section" aria-label="Pinned notes">
                    <button
                      type="button"
                      className="library-section-toggle"
                      onClick={togglePinnedCollapsed}
                      aria-expanded={!pinnedCollapsed}
                      title={
                        pinnedCollapsed
                          ? "Expand pinned notes"
                          : "Collapse pinned notes"
                      }
                    >
                      {pinnedCollapsed ? (
                        <IconChevronRight
                          size={12}
                          className="library-section-chevron-icon"
                        />
                      ) : (
                        <IconChevronDown
                          size={12}
                          className="library-section-chevron-icon"
                        />
                      )}
                      <span className="library-section-toggle-label">
                        {searching ? "Pinned matches" : "Pinned"}
                      </span>
                      {pinnedCollapsed ? (
                        <span className="library-section-count">
                          {sections.pinned.length}
                        </span>
                      ) : null}
                    </button>
                    {!pinnedCollapsed ? (
                      <ul className="space-y-px">
                        {sections.pinned.map((note, index) =>
                          renderRow(note, true, index),
                        )}
                      </ul>
                    ) : null}
                  </section>
                ) : searching && pinnedPaths.length > 0 ? (
                  <p className="px-1.5 py-1 text-[10px] text-[var(--text-faint)]">
                    No pinned notes match
                  </p>
                ) : null}

                {sections.others.length > 0 ? (
                  <section className="library-section" aria-label="All notes">
                    {(sections.pinned.length > 0 || searching) && (
                      <div className="library-section-label">
                        <span>
                          {searching
                            ? sections.pinned.length > 0
                              ? "Other matches"
                              : "Matches"
                            : "Notes"}
                        </span>
                        <span className="library-section-count">
                          {sections.others.length}
                        </span>
                      </div>
                    )}
                    <ul className="space-y-px">
                      {sections.others.map((note) => renderRow(note, false))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <div
          className="sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize library"
          title="Drag to resize · double-click to reset"
          onPointerDown={onResizePointerDown}
          onDoubleClick={onResizeDoubleClick}
        />
      </div>

      <NoteContextMenu
        open={!!contextMenu}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        pinned={contextMenu?.pinned ?? false}
        title={contextMenu?.note.title ?? ""}
        onPin={() => {
          if (contextMenu) onTogglePin(contextMenu.note.path);
        }}
        onRename={() => {
          if (contextMenu) onRename(contextMenu.note.path);
        }}
        onDelete={() => {
          if (contextMenu) setPendingDelete(contextMenu.note);
        }}
        onClose={() => setContextMenu(null)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Move to Recycle Bin?"
        message={
          pendingDelete
            ? `“${pendingDelete.title}” will be moved to the Recycle Bin. You can restore it from there if needed.`
            : ""
        }
        confirmLabel="Move to trash"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.path);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
