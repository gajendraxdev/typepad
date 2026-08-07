import { useCallback, useRef } from "react";
import { relativeTime } from "../lib/format";
import type { NoteMeta } from "../types";
import { IconPin, IconPinOff, IconTrash } from "./icons";

interface Props {
  note: NoteMeta;
  active: boolean;
  isOpen: boolean;
  pinned: boolean;
  /** Allow reorder drag from the handle. */
  canDrag?: boolean;
  dragIndex?: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
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
  canDrag = false,
  dragIndex,
  isDragging = false,
  isDropTarget = false,
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

  const allowDrop = canDrag && dragIndex !== undefined;

  return (
    <li
      className={[
        canDrag ? "note-list-draggable" : "",
        isDragging ? "is-dragging" : "",
        isDropTarget ? "is-drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        if (!allowDrop) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(dragIndex);
      }}
      onDrop={(e) => {
        if (!allowDrop) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop?.(dragIndex);
      }}
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
          const target = e.target as HTMLElement | null;
          if (target?.closest("button, [draggable='true']")) return;
          e.preventDefault();
          onSelect();
        }}
        onContextMenu={handleContextMenu}
        className={`note-item group ${active ? "is-active" : ""} ${pinned ? "is-pinned" : ""}`}
        title={
          pinned
            ? `${note.title} · pinned · right-click for more`
            : `${note.title} · right-click to pin`
        }
      >
        {canDrag && dragIndex !== undefined ? (
          <span
            className="note-drag-handle"
            title="Drag to reorder"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(dragIndex));
              // Keep a visible handle; empty drag image feels broken in WebView2.
              onDragStart?.(dragIndex);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              onDragEnd?.();
            }}
            onClick={(e) => {
              // Don't select the note when interacting with the handle.
              e.stopPropagation();
            }}
          >
            ⋮⋮
          </span>
        ) : pinned ? (
          <span className="note-pin-marker" aria-hidden title="Pinned">
            <IconPin size={10} />
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
            title={
              pinned
                ? "Unpin (Ctrl+Shift+. when open)"
                : "Pin to top (Ctrl+Shift+. when open)"
            }
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
