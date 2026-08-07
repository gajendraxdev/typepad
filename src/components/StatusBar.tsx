import { countChars, countWords } from "../lib/format";
import type { SaveStatus } from "../types";
import { IconEye, IconPencil } from "./icons";
import { SaveIndicator } from "./SaveIndicator";

interface Props {
  content: string;
  saveStatus: SaveStatus;
  filename?: string | null;
  title?: string | null;
  markdownPreview?: boolean;
  onToggleMarkdownPreview?: () => void;
}

export function StatusBar({
  content,
  saveStatus,
  filename,
  title,
  markdownPreview = false,
  onToggleMarkdownPreview,
}: Props) {
  const words = countWords(content);
  const chars = countChars(content);
  const hasNote = Boolean(filename || title);

  return (
    <div className="flex h-[var(--statusbar-h)] shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/90 px-2 text-[10px] text-[var(--text-faint)]">
      <div className="flex min-w-0 items-center gap-1.5">
        <SaveIndicator status={saveStatus} />
        {hasNote ? (
          <>
            <span className="hidden h-2.5 w-px bg-[var(--border)] sm:block" />
            <span
              className="truncate text-[var(--text-muted)]"
              title={filename ?? undefined}
            >
              {filename || title}
            </span>
          </>
        ) : null}
      </div>
      {hasNote ? (
        <div className="flex shrink-0 items-center gap-2 tabular-nums">
          {onToggleMarkdownPreview ? (
            <button
              type="button"
              onClick={onToggleMarkdownPreview}
              className={`statusbar-preview-btn ${markdownPreview ? "is-active" : ""}`}
              title={
                markdownPreview
                  ? "Switch to edit mode"
                  : "Preview markdown (Ctrl+Shift+P)"
              }
              aria-label={
                markdownPreview ? "Edit mode" : "Markdown preview"
              }
              aria-pressed={markdownPreview}
            >
              {markdownPreview ? (
                <>
                  <IconPencil size={11} />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <IconEye size={11} />
                  <span>Preview</span>
                </>
              )}
            </button>
          ) : null}
          <span>
            {words.toLocaleString()} word{words === 1 ? "" : "s"}
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>
            {chars.toLocaleString()} char{chars === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
