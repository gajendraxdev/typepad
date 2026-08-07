import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  /** Current display name / stem (without .txt). */
  initialName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

/** Simple modal to rename a note file. */
export function RenameDialog({
  open,
  initialName,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="ui-overlay" onClick={onCancel} role="presentation">
      <div
        role="dialog"
        aria-modal
        aria-label="Rename note"
        className="ui-surface rename-dialog anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="rename-dialog-title">Rename note</h2>
        <p className="rename-dialog-hint">
          Sets the file name. After this, the name no longer follows the first
          line of the note.
        </p>
        <label className="rename-dialog-field">
          <span className="settings-field-label">Name</span>
          <div className="rename-dialog-input-row">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              className="rename-dialog-input"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="rename-dialog-ext">.txt</span>
          </div>
        </label>
        <div className="rename-dialog-actions">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-soft"
            disabled={!name.trim()}
            onClick={submit}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
