import { IconLibrary, IconPlus } from "./icons";

interface Props {
  onNew: () => void;
  onOpenLibrary?: () => void;
}

export function EmptyState({ onNew, onOpenLibrary }: Props) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="anim-fade-up flex max-w-sm flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <IconPlus size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            No note open
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            {onOpenLibrary
              ? "Open something from the library, or start a new note. Everything auto-saves."
              : "Pick a note from the sidebar, or start fresh. Everything auto-saves."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onOpenLibrary ? (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="ui-btn ui-btn-outline"
            >
              <IconLibrary size={15} />
              Library
            </button>
          ) : null}
          <button type="button" onClick={onNew} className="ui-btn ui-btn-primary">
            <IconPlus size={15} />
            New note
          </button>
        </div>
        <p className="text-xs text-[var(--text-faint)]">
          <kbd className="ui-kbd">{mod}+N</kbd> new ·{" "}
          <kbd className="ui-kbd">{mod}+F</kbd> find in note ·{" "}
          <kbd className="ui-kbd">{mod}+Shift+F</kbd> library ·{" "}
          <kbd className="ui-kbd">{mod}+W</kbd> close tab
        </p>
      </div>
    </div>
  );
}
