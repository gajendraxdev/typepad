import { useEffect, useMemo, useRef, useState } from "react";
import { relativeTime } from "../lib/format";
import type { NoteMeta } from "../types";
import { IconClose, IconNote, IconSearch } from "./icons";

interface Props {
  open: boolean;
  notes: NoteMeta[];
  activePath: string | null;
  onClose: () => void;
  onSelect: (path: string) => void;
  onNew: () => void;
}

/** Lightweight library for title-bar-tabs layout (no permanent sidebar). */
export function LibraryDrawer({
  open,
  notes,
  activePath,
  onClose,
  onSelect,
  onNew,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div className="ui-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal
        aria-label="Open note"
        className="ui-surface anim-scale-in flex max-h-[min(80vh,520px)] w-full max-w-md flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Library</h2>
            <p className="text-[11px] text-[var(--text-faint)]">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            className="ui-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="border-b border-[var(--border)] px-3 py-2">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-faint)]">
              <IconSearch size={14} />
            </span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="ui-input !rounded-full !py-2 !pr-3 !pl-8 text-[13px]"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <IconNote size={18} className="text-[var(--text-faint)]" />
              <p className="text-xs text-[var(--text-faint)]">
                {notes.length === 0 ? "No notes yet" : "No matches"}
              </p>
              {notes.length === 0 ? (
                <button
                  type="button"
                  className="ui-btn ui-btn-soft mt-1 text-xs"
                  onClick={() => {
                    onNew();
                    onClose();
                  }}
                >
                  New note
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((note) => {
                const active = note.path === activePath;
                return (
                  <li key={note.path}>
                    <button
                      type="button"
                      className={`note-item w-full text-left ${active ? "is-active" : ""}`}
                      onClick={() => {
                        onSelect(note.path);
                        onClose();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 pl-1">
                        <p className="truncate text-[13px] font-semibold">
                          {note.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--text-faint)]">
                          {relativeTime(note.modifiedMs)}
                        </span>
                      </div>
                      {note.preview ? (
                        <p className="mt-0.5 line-clamp-2 pl-1 text-[11.5px] text-[var(--text-muted)]">
                          {note.preview}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
