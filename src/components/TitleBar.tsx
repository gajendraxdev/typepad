import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import type { OpenTab } from "../types";
import {
  IconLibrary,
  IconPanelLeft,
  IconPin,
  IconPinOff,
  IconPlus,
  IconSettings,
} from "./icons";

interface Props {
  tabs: OpenTab[];
  activePath: string | null;
  /** Show open-note tabs in the title bar (always on for both layouts). */
  showTabs: boolean;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onNew: () => void;
  onOpenSettings: () => void;
  /** Library drawer (tabs-only layout, when there is no permanent sidebar). */
  onOpenLibrary?: () => void;
  /** Show / expand the permanent library sidebar. */
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
  /** Whether the active note is pinned (title-bar pin control). */
  activePinned?: boolean;
  onTogglePinActive?: () => void;
  /** Paths currently pinned (for tab badges). */
  pinnedPaths?: string[];
}

/**
 * Custom window chrome with open-note tabs.
 * Sidebar layout keeps these tabs and adds a permanent library sidebar.
 */
export function TitleBar({
  tabs,
  activePath,
  showTabs,
  onSelect,
  onClose,
  onNew,
  onOpenSettings,
  onOpenLibrary,
  onToggleSidebar,
  sidebarVisible = false,
  activePinned = false,
  onTogglePinActive,
  pinnedPaths = [],
}: Props) {
  const [maximized, setMaximized] = useState(false);
  const pinnedSet = new Set(pinnedPaths);

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        setMaximized(await win.isMaximized());
        unlisten = await win.onResized(async () => {
          setMaximized(await win.isMaximized());
        });
      } catch {
        // Browser preview without Tauri.
      }
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  const minimize = useCallback(() => {
    void getCurrentWindow().minimize();
  }, []);

  const toggleMax = useCallback(() => {
    void getCurrentWindow().toggleMaximize();
  }, []);

  const closeWin = useCallback(() => {
    void getCurrentWindow().close();
  }, []);

  return (
    <header className="titlebar">
      <div className="titlebar-main" data-tauri-drag-region>
        <div className="titlebar-brand" data-tauri-drag-region title="Typepad">
          <img
            src="/icon.png"
            alt=""
            className="titlebar-icon"
            draggable={false}
          />
        </div>

        {showTabs ? (
          <div className="titlebar-tabs" role="tablist">
            {tabs.map((tab) => {
              const active = tab.path === activePath;
              const dirty =
                tab.saveStatus === "dirty" || tab.saveStatus === "saving";
              const pinned = pinnedSet.has(tab.path);
              return (
                <div
                  key={tab.path}
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  className={`titlebar-tab ${active ? "is-active" : ""} ${dirty ? "is-dirty" : ""} ${pinned ? "is-pinned" : ""}`}
                  title={
                    pinned
                      ? `${tab.filename} · pinned`
                      : tab.filename
                  }
                  onClick={() => onSelect(tab.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(tab.path);
                    }
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      onClose(tab.path);
                    }
                  }}
                >
                  {pinned ? (
                    <IconPin
                      size={11}
                      className="titlebar-tab-pin"
                      aria-hidden
                    />
                  ) : null}
                  <span className="titlebar-tab-label">{tab.title}</span>
                  <button
                    type="button"
                    className="titlebar-tab-close"
                    title="Close"
                    aria-label={`Close ${tab.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(tab.path);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="titlebar-new"
              title="New note (Ctrl+N)"
              aria-label="New note"
              onClick={onNew}
            >
              <IconPlus size={14} />
            </button>
          </div>
        ) : (
          <div className="titlebar-title" data-tauri-drag-region>
            Typepad
          </div>
        )}

        <div className="titlebar-spacer" data-tauri-drag-region />
      </div>

      <div className="titlebar-actions">
        {onToggleSidebar ? (
          <button
            type="button"
            className="titlebar-action"
            onClick={onToggleSidebar}
            aria-label={sidebarVisible ? "Hide library" : "Show library"}
            title={
              sidebarVisible
                ? "Hide library (Ctrl+B)"
                : "Show library (Ctrl+B)"
            }
          >
            <IconPanelLeft size={15} />
          </button>
        ) : null}
        {onTogglePinActive ? (
          <button
            type="button"
            className={`titlebar-action ${activePinned ? "is-pinned" : ""}`}
            onClick={onTogglePinActive}
            aria-label={activePinned ? "Unpin note" : "Pin note"}
            aria-pressed={activePinned}
            title={
              activePinned
                ? "Unpin note (Ctrl+Shift+.)"
                : "Pin note (Ctrl+Shift+.)"
            }
          >
            {activePinned ? <IconPin size={15} /> : <IconPinOff size={15} />}
          </button>
        ) : null}
        {showTabs && onOpenLibrary ? (
          <button
            type="button"
            className="titlebar-action"
            onClick={onOpenLibrary}
            aria-label="Library"
            title="Open library (Ctrl+F)"
          >
            <IconLibrary size={15} />
          </button>
        ) : null}
        <button
          type="button"
          className="titlebar-action"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings (Ctrl+,)"
        >
          <IconSettings size={15} />
        </button>
      </div>

      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-winbtn"
          onClick={minimize}
          aria-label="Minimize"
          title="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-winbtn"
          onClick={toggleMax}
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path
                d="M2.5 3.5h5v5h-5zM3.5 2.5h5v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="titlebar-winbtn titlebar-winbtn-close"
          onClick={closeWin}
          aria-label="Close"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M2 2l6 6M8 2L2 8"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
