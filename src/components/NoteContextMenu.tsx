import { useEffect, useRef } from "react";
import { IconTrash } from "./icons";

interface Props {
  open: boolean;
  x: number;
  y: number;
  pinned: boolean;
  title: string;
  onPin: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Lightweight right-click menu for a library note row. */
export function NoteContextMenu({
  open,
  x,
  y,
  pinned,
  title,
  onPin,
  onDelete,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="note-context-menu anim-scale-in"
      style={{ top: y, left: x }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="note-context-item"
        onClick={() => {
          onPin();
          onClose();
        }}
      >
        {pinned ? "Unpin note" : "Pin note"}
      </button>
      <div className="note-context-sep" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="note-context-item note-context-item-danger"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        <IconTrash size={13} />
        Move to trash
      </button>
      <p className="note-context-hint truncate" title={title}>
        {title}
      </p>
    </div>
  );
}
