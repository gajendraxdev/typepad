import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconPin, IconPinOff, IconTrash } from "./icons";

interface Props {
  open: boolean;
  x: number;
  y: number;
  pinned: boolean;
  title: string;
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

/** Right-click menu — portaled, clamped to viewport. */
export function NoteContextMenu({
  open,
  x,
  y,
  pinned,
  title,
  onPin,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const pinShortcut = isMac() ? "⌘⇧L" : "Ctrl+Shift+L";

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setPos({ left: x, top: y });
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const pad = 8;
    // Clamp max to ≥ pad so a huge menu never gets a negative origin.
    const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
    const left = Math.min(Math.max(pad, x), maxLeft);
    const top = Math.min(Math.max(pad, y), maxTop);
    setPos({ left, top });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;

    let removeListeners: (() => void) | undefined;
    const t = window.setTimeout(() => {
      const onPointer = (e: PointerEvent) => {
        if (ref.current?.contains(e.target as Node)) return;
        onClose();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("pointerdown", onPointer, true);
      window.addEventListener("keydown", onKey, true);
      removeListeners = () => {
        window.removeEventListener("pointerdown", onPointer, true);
        window.removeEventListener("keydown", onKey, true);
      };
    }, 16);

    return () => {
      window.clearTimeout(t);
      removeListeners?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="note-context-menu anim-scale-in"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="note-context-hint truncate" title={title}>
        {title}
      </p>
      <button
        type="button"
        role="menuitem"
        className="note-context-item"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPin();
          onClose();
        }}
      >
        {pinned ? <IconPin size={13} /> : <IconPinOff size={13} />}
        <span className="note-context-item-label">
          {pinned ? "Unpin note" : "Pin to top"}
        </span>
        <kbd className="note-context-kbd">{pinShortcut}</kbd>
      </button>
      <button
        type="button"
        role="menuitem"
        className="note-context-item"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRename();
          onClose();
        }}
      >
        <span className="note-context-item-label">Rename…</span>
        <kbd className="note-context-kbd">F2</kbd>
      </button>
      <div className="note-context-sep" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="note-context-item note-context-item-danger"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
          onClose();
        }}
      >
        <IconTrash size={13} />
        <span className="note-context-item-label">Move to trash</span>
      </button>
    </div>,
    document.body,
  );
}
