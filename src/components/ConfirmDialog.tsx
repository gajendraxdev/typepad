import { useEffect, useRef } from "react";
import { IconTrash } from "./icons";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="ui-overlay" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="ui-surface anim-scale-in w-full max-w-sm p-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2.5 flex items-start gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              danger
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : "bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            <IconTrash size={15} />
          </div>
          <div>
            <h2
              id="confirm-title"
              className="text-[13px] font-semibold tracking-tight"
            >
              {title}
            </h2>
            <p
              id="confirm-desc"
              className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-1.5">
          <button type="button" className="ui-btn ui-btn-outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`ui-btn ${
              danger
                ? "bg-[var(--danger)] text-white hover:brightness-110"
                : "ui-btn-primary"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
