import { useCallback, useEffect, useRef } from "react";
import { relativeTime } from "../lib/format";
import { noteOptionId } from "../lib/notes";
import type { NoteMeta } from "../types";
import { IconPin, IconPinOff, IconTrash } from "./icons";

interface Props {
  note: NoteMeta;
  active: boolean;
  focused?: boolean;
  isOpen: boolean;
  pinned: boolean;
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
  /** Register DOM node for scroll-into-view / focus management. */
  itemRef?: (el: HTMLLIElement | null) => void;
}

export function NoteListItem({
  note,
  active,
  focused = false,
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
  itemRef,
}: Props) {
  const ignoreClick = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const liRef = useRef<HTMLLIElement | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e.clientX, e.clientY);
    },
    [onContextMenu],
  );

  const allowDrop = canDrag && dragIndex !== undefined;

  const clearGhost = () => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  };

  useEffect(() => {
    if (focused || active) {
      liRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused, active]);

  return (
    <li
      ref={(el) => {
        liRef.current = el;
        itemRef?.(el);
      }}
      id={noteOptionId(note.path)}
      role="option"
      aria-selected={active}
      data-note-path={note.path}
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
        clearGhost();
        onDrop?.(dragIndex);
      }}
      onContextMenu={handleContextMenu}
    >
      {isDropTarget ? <div className="note-drop-line" aria-hidden /> : null}

      <div
        ref={rowRef}
        tabIndex={-1}
        onClick={() => {
          if (ignoreClick.current) {
            ignoreClick.current = false;
            return;
          }
          onSelect();
        }}
        className={`note-item group ${active ? "is-active" : ""} ${focused && !active ? "is-focused" : ""} ${pinned ? "is-pinned" : ""}`}
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

              const source = rowRef.current;
              if (source) {
                const ghost = document.createElement("div");
                ghost.className = "note-drag-ghost";
                ghost.textContent = note.title;
                document.body.appendChild(ghost);
                ghostRef.current = ghost;
                e.dataTransfer.setDragImage(ghost, 12, 14);
              }

              onDragStart?.(dragIndex);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              clearGhost();
              onDragEnd?.();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            ⋮⋮
          </span>
        ) : (
          <span className="note-pin-spacer" aria-hidden />
        )}

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
                ? "Unpin (Ctrl+Shift+L)"
                : "Pin to top (Ctrl+Shift+L)"
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
