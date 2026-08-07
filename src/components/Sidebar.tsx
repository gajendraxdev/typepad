import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIDEBAR_MAX, SIDEBAR_MIN } from "../lib/config";
import { splitLibraryNotes } from "../lib/notes";
import type { NoteMeta } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconNote, IconPanelLeft, IconPlus } from "./icons";
import { NoteContextMenu } from "./NoteContextMenu";
import { NoteListItem } from "./NoteListItem";
import { SearchBar } from "./SearchBar";

interface Props {
  notes: NoteMeta[];
  activePath: string | null;
  openPaths: string[];
  pinnedPaths: string[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (path: string) => void;
  onNew: () => void;
  onDelete: (path: string) => void;
  onTogglePin: (path: string) => void;
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

export function Sidebar({
  notes,
  activePath,
  openPaths,
  pinnedPaths,
  query,
  onQueryChange,
  onSelect,
  onNew,
  onDelete,
  onTogglePin,
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
  const resizing = useRef(false);
  const openSet = useMemo(() => new Set(openPaths), [openPaths]);

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
  const canReorder = !searching && sections.pinned.length > 1;
  const totalVisible = sections.pinned.length + sections.others.length;

  const openContext = useCallback(
    (note: NoteMeta, pinned: boolean, x: number, y: number) => {
      // Keep menu inside the viewport.
      const menuW = 180;
      const menuH = 120;
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
  ) => (
    <NoteListItem
      key={note.path}
      note={note}
      active={note.path === activePath}
      isOpen={openSet.has(note.path)}
      pinned={pinned}
      draggable={canReorder && pinned && dragIndex !== undefined}
      dragIndex={dragIndex}
      onSelect={() => onSelect(note.path)}
      onTogglePin={() => onTogglePin(note.path)}
      onDelete={() => setPendingDelete(note)}
      onContextMenu={(x, y) => openContext(note, pinned, x, y)}
      onDragStart={(index) => setDragFrom(index)}
      onDragOver={() => undefined}
      onDrop={(toIndex) => {
        if (dragFrom !== null && dragFrom !== toIndex) {
          onReorderPins(dragFrom, toIndex);
        }
        setDragFrom(null);
      }}
      onDragEnd={() => setDragFrom(null)}
    />
  );

  return (
    <>
      <div className="sidebar-shell" style={{ width }}>
        <aside className="flex h-full min-w-0 flex-1 flex-col bg-[var(--bg-sidebar)]">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
            {totalVisible === 0 ? (
              <div className="anim-fade-in flex flex-col items-center gap-1.5 px-2 py-6 text-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-hover)] text-[var(--text-faint)]">
                  <IconNote size={14} />
                </div>
                <p className="text-[11px] text-[var(--text-faint)]">
                  {notes.length === 0
                    ? "No notes yet"
                    : "No notes match that search"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sections.pinned.length > 0 ? (
                  <section aria-label="Pinned notes">
                    <div className="library-section-label">
                      <span>Pinned</span>
                      <span className="tabular-nums opacity-70">
                        {sections.pinned.length}
                      </span>
                    </div>
                    <ul className="space-y-px">
                      {sections.pinned.map((note, index) =>
                        renderRow(note, true, index),
                      )}
                    </ul>
                  </section>
                ) : null}

                {sections.others.length > 0 ? (
                  <section aria-label="All notes">
                    {sections.pinned.length > 0 ? (
                      <div className="library-section-label">
                        <span>{searching ? "Matches" : "Notes"}</span>
                        <span className="tabular-nums opacity-70">
                          {sections.others.length}
                        </span>
                      </div>
                    ) : null}
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
