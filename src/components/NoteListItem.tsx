import { useCallback, useRef } from "react";
import { relativeTime } from "../lib/format";
import type { NoteMeta } from "../types";
import { IconPin, IconPinOff, IconTrash } from "./icons";

interface Props {
  note: NoteMeta;
  active: boolean;
  isOpen: boolean;
  pinned: boolean;
  draggable?: boolean;
  dragIndex?: number;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onContextMenu: (x: number, y: number) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: (index: number) => void;
  onDragEnd?: () => void;
}

export function NoteListItem({
  note,
  active,
  isOpen,
  pinned,
  draggable = false,
  dragIndex,
  onSelect,
  onTogglePin,
  onDelete,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const ignoreClick = useRef(false);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e.clientX, e.clientY);
    },
    [onContextMenu],
  );

  return (
    <li
      className={draggable ? "note-list-draggable" : undefined}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable || dragIndex === undefined) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(dragIndex));
        onDragStart?.(dragIndex);
      }}
      onDragOver={(e) => {
        if (!draggable || dragIndex === undefined) return;
        e.preventDefault();
        onDragOver?.(dragIndex);
      }}
      onDrop={(e) => {
        if (!draggable || dragIndex === undefined) return;
        e.preventDefault();
        onDrop?.(dragIndex);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (ignoreClick.current) {
            ignoreClick.current = false;
            return;
          }
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          // Let nested pin/delete buttons keep native activation.
          const target = e.target as HTMLElement | null;
          if (target?.closest("button")) return;
          e.preventDefault();
          onSelect();
        }}
        onContextMenu={handleContextMenu}
        className={`note-item group ${active ? "is-active" : ""} ${pinned ? "is-pinned" : ""}`}
      >
        {draggable ? (
          <span className="note-drag-handle" title="Drag to reorder pins" aria-hidden>
            ⋮⋮
          </span>
        ) : null}

        <div className="note-item-body">
          <p className="note-item-title">{note.title}</p>
          <span className="note-item-time">{relativeTime(note.modifiedMs)}</span>
        </div>

        {isOpen && !active ? (
          <span className="note-open-dot" title="Open in a tab" />
        ) : null}

        <div className="note-item-actions">
          <button
            type="button"
            title={pinned ? "Unpin" : "Pin to top"}
            onClick={(e) => {
              e.stopPropagation();
              ignoreClick.current = true;
              onTogglePin();
            }}
            className={`note-item-action ${pinned ? "is-pinned" : ""}`}
            aria-label={pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
            aria-pressed={pinned}
          >
            {pinned ? <IconPin size={14} /> : <IconPinOff size={14} />}
          </button>
          <button
            type="button"
            title="Move to trash"
            onClick={(e) => {
              e.stopPropagation();
              ignoreClick.current = true;
              onDelete();
            }}
            className="note-item-action note-item-action-danger"
            aria-label={`Delete ${note.title}`}
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}
