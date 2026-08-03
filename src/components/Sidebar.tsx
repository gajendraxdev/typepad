import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { relativeTime } from "../lib/format";
import { SIDEBAR_MAX, SIDEBAR_MIN } from "../lib/config";
import type { NoteMeta } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconNote, IconPanelLeft, IconPlus, IconTrash } from "./icons";
import { SearchBar } from "./SearchBar";

interface Props {
  notes: NoteMeta[];
  activePath: string | null;
  openPaths: string[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (path: string) => void;
  onNew: () => void;
  onDelete: (path: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function Sidebar({
  notes,
  activePath,
  openPaths,
  query,
  onQueryChange,
  onSelect,
  onNew,
  onDelete,
  searchRef,
  collapsed,
  onToggle,
  width,
  onWidthChange,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<NoteMeta | null>(null);
  const dragging = useRef(false);
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

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const next = Math.min(
          SIDEBAR_MAX,
          Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX)),
        );
        onWidthChange(next);
      };
      const onUp = () => {
        dragging.current = false;
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

  // Double-click resize handle → reset to default width
  const onResizeDoubleClick = useCallback(() => {
    onWidthChange(280);
  }, [onWidthChange]);

  useEffect(() => {
    return () => {
      dragging.current = false;
    };
  }, []);

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-3">
        <button
          type="button"
          onClick={onToggle}
          title="Show library (Ctrl+B)"
          className="ui-icon-btn"
          aria-label="Expand sidebar"
        >
          <IconPanelLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onNew}
          title="New note (Ctrl+N)"
          className="ui-icon-btn text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="New note"
        >
          <IconPlus size={18} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-shell" style={{ width }}>
        <aside className="flex h-full min-w-0 flex-1 flex-col bg-[var(--bg-sidebar)]">
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1.5">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--text-faint)] uppercase">
                Library
              </div>
              <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                {notes.length} note{notes.length === 1 ? "" : "s"}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Hide library (Ctrl+B)"
              className="ui-icon-btn"
              aria-label="Collapse sidebar"
            >
              <IconPanelLeft size={15} />
            </button>
          </div>

          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={onNew}
              className="ui-btn ui-btn-soft w-full justify-start !rounded-md !py-2"
            >
              <IconPlus size={15} />
              New note
            </button>
          </div>

          <SearchBar ref={searchRef} value={query} onChange={onQueryChange} />

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {filtered.length === 0 ? (
              <div className="anim-fade-in flex flex-col items-center gap-2 px-3 py-10 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--bg-hover)] text-[var(--text-faint)]">
                  <IconNote size={16} />
                </div>
                <p className="text-xs text-[var(--text-faint)]">
                  {notes.length === 0
                    ? "No notes yet"
                    : "No notes match that search"}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((note) => {
                  const active = note.path === activePath;
                  const isOpen = openSet.has(note.path);
                  return (
                    <li key={note.path}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(note.path)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect(note.path);
                          }
                        }}
                        className={`note-item group ${active ? "is-active" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 pl-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {isOpen && !active ? (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/50"
                                title="Open in a tab"
                              />
                            ) : null}
                            <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--text)]">
                              {note.title}
                            </p>
                          </div>
                          <span className="mt-0.5 shrink-0 text-[10px] text-[var(--text-faint)] tabular-nums">
                            {relativeTime(note.modifiedMs)}
                          </span>
                        </div>
                        {note.preview ? (
                          <p className="mt-0.5 line-clamp-2 pl-1 text-[11.5px] leading-snug text-[var(--text-muted)]">
                            {note.preview}
                          </p>
                        ) : (
                          <p className="mt-0.5 pl-1 text-[11.5px] text-[var(--text-faint)] italic">
                            Empty note
                          </p>
                        )}
                        <button
                          type="button"
                          title="Move to trash"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(note);
                          }}
                          className="ui-icon-btn absolute right-1.5 bottom-1.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <IconTrash
                            size={13}
                            className="text-[var(--danger)]"
                          />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
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
