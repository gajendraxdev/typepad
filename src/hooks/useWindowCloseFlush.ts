import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";

/**
 * On window close: flush all dirty notes first, then destroy the window.
 * Prevents losing the last debounce window of typing.
 */
export function useWindowCloseFlush(flushAllDirty: () => Promise<void>) {
  const flushRef = useRef(flushAllDirty);
  flushRef.current = flushAllDirty;
  const closingRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          if (closingRef.current) return;
          event.preventDefault();
          closingRef.current = true;
          try {
            await flushRef.current();
          } catch {
            // Still close — user asked to quit; best-effort save already ran.
          }
          try {
            await win.destroy();
          } catch {
            // If destroy is denied, allow a second close attempt.
            closingRef.current = false;
          }
        });
      } catch {
        // Not running under Tauri (vite-only).
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
      void cancelled;
    };
  }, []);
}
