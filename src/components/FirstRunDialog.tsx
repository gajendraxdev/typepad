import { useState } from "react";
import * as api from "../lib/api";
import { IconFolder, IconSparkle } from "./icons";

interface Props {
  defaultPath: string;
  onComplete: (path: string) => Promise<void>;
}

export function FirstRunDialog({ defaultPath, onComplete }: Props) {
  const [path, setPath] = useState(defaultPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browse = async () => {
    const picked = await api.pickFolder(path || defaultPath);
    if (picked) setPath(picked);
  };

  const confirm = async () => {
    if (!path.trim()) {
      setError("Please choose a notes folder.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onComplete(path.trim());
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="ui-overlay">
      <div className="ui-surface anim-scale-in w-full max-w-md overflow-hidden">
        {/* Hero strip */}
        <div
          className="relative px-6 pt-7 pb-5"
          style={{
            background:
              "linear-gradient(160deg, var(--accent-soft) 0%, transparent 70%)",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <img
              src="/icon.png"
              alt=""
              className="h-12 w-12 drop-shadow-md"
              draggable={false}
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Welcome to Typepad
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                A quiet place to write — everything auto-saves.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-[13px] text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <IconSparkle size={11} />
              </span>
              No save dialogs after setup
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <IconFolder size={11} />
              </span>
              Plain .txt files you fully own
            </li>
          </ul>
        </div>

        <div className="border-t border-[var(--border)] px-6 py-5">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Notes folder
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="ui-input min-w-0 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirm();
              }}
            />
            <button
              type="button"
              onClick={() => void browse()}
              className="ui-btn ui-btn-outline shrink-0"
            >
              <IconFolder size={14} />
              Browse
            </button>
          </div>

          {error ? (
            <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-faint)]">
              Suggested: Documents/Typepad. You can change this anytime in
              Settings.
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="ui-btn ui-btn-primary min-w-[8.5rem]"
            >
              {busy ? "Setting up…" : "Get started"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
