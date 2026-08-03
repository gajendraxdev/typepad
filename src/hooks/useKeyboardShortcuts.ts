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
}

/**
 * App shortcuts work even when the note textarea has focus.
 * Capture phase so we beat WebView2 Find (Ctrl+F) and similar host bindings.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const mod = e.ctrlKey || e.metaKey;
      const h = handlersRef.current;
      const key = e.key.toLowerCase();

      // F3 / Shift+F3 — find next/prev (no Ctrl required)
      if (key === "f3") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) h.onFindPrev?.();
        else h.onFindNext?.();
        return;
      }

      if (!mod || e.altKey) return;

      if (key === "n" && !e.shiftKey && h.onNew) {
        e.preventDefault();
        e.stopPropagation();
        h.onNew();
        return;
      }

      // Ctrl+Shift+F → library note list search
      if (key === "f" && e.shiftKey && h.onLibrarySearch) {
        e.preventDefault();
        e.stopPropagation();
        h.onLibrarySearch();
        return;
      }

      // Ctrl+F → find inside current note
      if (key === "f" && !e.shiftKey && h.onFindInNote) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindInNote();
        return;
      }

      // Ctrl+G → next match (common find-next)
      if (key === "g" && !e.shiftKey && h.onFindNext) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindNext();
        return;
      }
      if (key === "g" && e.shiftKey && h.onFindPrev) {
        e.preventDefault();
        e.stopPropagation();
        h.onFindPrev();
        return;
      }

      if (key === "," && h.onSettings) {
        e.preventDefault();
        e.stopPropagation();
        h.onSettings();
        return;
      }
      if (key === "w" && h.onCloseNote) {
        e.preventDefault();
        e.stopPropagation();
        h.onCloseNote();
        return;
      }
      if (key === "b" && h.onToggleSidebar) {
        e.preventDefault();
        e.stopPropagation();
        h.onToggleSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
