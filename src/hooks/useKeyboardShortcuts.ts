import { useEffect } from "react";

export interface ShortcutHandlers {
  onNew?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onCloseNote?: () => void;
  onToggleSidebar?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "n") {
        e.preventDefault();
        handlers.onNew?.();
        return;
      }
      if (key === "f") {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }
      if (key === ",") {
        e.preventDefault();
        handlers.onSettings?.();
        return;
      }
      if (key === "w") {
        // Close active note (not the window).
        e.preventDefault();
        handlers.onCloseNote?.();
        return;
      }
      if (key === "b" && !isTypingTarget(e.target)) {
        e.preventDefault();
        handlers.onToggleSidebar?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
