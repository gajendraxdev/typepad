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
    onWidthChange(240);
  }, [onWidthChange]);

  useEffect(() => {
    return () => {
      dragging.current = false;
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
            {filtered.length === 0 ? (
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
              <ul className="space-y-px">
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
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          {isOpen && !active ? (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/50"
                              title="Open in a tab"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold tracking-tight text-[var(--text)]">
                              {note.title}
                            </p>
                            <p className="mt-0.5 text-[10px] leading-none text-[var(--text-faint)] tabular-nums">
                              {relativeTime(note.modifiedMs)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Move to trash"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(note);
                          }}
                          className="note-item-delete"
                          aria-label={`Delete ${note.title}`}
                        >
                          <IconTrash size={16} />
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
