import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onNew?: () => void;
  /** Ctrl+F — find in current note */
  onFindInNote?: () => void;
  /** Ctrl+Shift+F — focus library search */
  onLibrarySearch?: () => void;
  onSettings?: () => void;
  onCloseNote?: () => void;
  onToggleSidebar?: () => void;
  onFindNext?: () => void;
  onFindPrev?: () => void;
  onToggleMarkdownPreview?: () => void;
  /** Ctrl+Shift+L — pin / unpin the active note */
  onTogglePinActive?: () => void;
}

function isMod(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}

/**
 * App shortcuts work even when the note textarea has focus.
 * Capture phase so we beat WebView2 Find (Ctrl+F) and similar host bindings.
 *
 * Prefer `e.code` (physical key) over `e.key` — Shift/layout change `e.key`
 * and break letter shortcuts in WebView2.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const h = handlersRef.current;
      const code = e.code;
      const mod = isMod(e);
      const repeat = e.repeat;

      // F3 / Shift+F3 — find next/prev (repeats allowed for holding to walk matches)
      if (code === "F3") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) h.onFindPrev?.();
        else h.onFindNext?.();
        return;
      }

      if (!mod || e.altKey) return;

      // Ctrl+G / Ctrl+Shift+G — find next/prev (repeats OK)
      if (code === "KeyG" && !e.shiftKey && h.onFindNext) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindNext();
        return;
      }
      if (code === "KeyG" && e.shiftKey && h.onFindPrev) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindPrev();
        return;
      }

      // Remaining shortcuts are toggles / one-shots — ignore key-repeat.
      if (repeat) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+N — new note
      if (code === "KeyN" && !e.shiftKey && h.onNew) {
        e.preventDefault();
        e.stopPropagation();
        h.onNew();
        return;
      }

      // Ctrl+Shift+P — markdown preview
      if (code === "KeyP" && e.shiftKey && h.onToggleMarkdownPreview) {
        e.preventDefault();
        e.stopPropagation();
        h.onToggleMarkdownPreview();
        return;
      }

      // Ctrl+Shift+L — pin / unpin active note
      if (code === "KeyL" && e.shiftKey && h.onTogglePinActive) {
        e.preventDefault();
        e.stopPropagation();
        h.onTogglePinActive();
        return;
      }

      // Ctrl+Shift+F — library search
      if (code === "KeyF" && e.shiftKey && h.onLibrarySearch) {
        e.preventDefault();
        e.stopPropagation();
        h.onLibrarySearch();
        return;
      }

      // Ctrl+F — find in note
      if (code === "KeyF" && !e.shiftKey && h.onFindInNote) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindInNote();
        return;
      }

      // Ctrl+, — settings
      if (code === "Comma" && h.onSettings) {
        e.preventDefault();
        e.stopPropagation();
        h.onSettings();
        return;
      }

      // Ctrl+W — close note
      if (code === "KeyW" && h.onCloseNote) {
        e.preventDefault();
        e.stopPropagation();
        h.onCloseNote();
        return;
      }

      // Ctrl+B — toggle sidebar
      if (code === "KeyB" && h.onToggleSidebar) {
        e.preventDefault();
        e.stopPropagation();
        h.onToggleSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
}
