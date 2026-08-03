import { IconLibrary, IconPlus } from "./icons";

interface Props {
  onNew: () => void;
  onOpenLibrary?: () => void;
}

export function EmptyState({ onNew, onOpenLibrary }: Props) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="anim-fade-up flex max-w-xs flex-col items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
          <IconPlus size={16} />
        </div>
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--text)]">
            No note open
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
            {onOpenLibrary
              ? "Open something from the library, or start a new note."
              : "Pick a note from the sidebar, or start fresh."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {onOpenLibrary ? (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="ui-btn ui-btn-outline"
            >
              <IconLibrary size={13} />
              Library
            </button>
          ) : null}
          <button type="button" onClick={onNew} className="ui-btn ui-btn-primary">
            <IconPlus size={13} />
            New note
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-faint)]">
          <kbd className="ui-kbd">{mod}+N</kbd> new ·{" "}
          <kbd className="ui-kbd">{mod}+F</kbd> find ·{" "}
          <kbd className="ui-kbd">{mod}+Shift+F</kbd> library
        </p>
      </div>
    </div>
  );
}
