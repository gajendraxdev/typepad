import { useEffect } from "react";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

interface Props {
  open: boolean;
  message: string;
  action?: ToastAction | null;
  onDismiss: () => void;
  /** Auto-dismiss ms; 0 = stay until dismissed. */
  durationMs?: number;
}

/** Lightweight bottom toast for undoable actions. */
export function Toast({
  open,
  message,
  action,
  onDismiss,
  durationMs = 4000,
}: Props) {
  useEffect(() => {
    if (!open || durationMs <= 0) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onDismiss, message]);

  if (!open) return null;

  return (
    <div className="app-toast anim-fade-up" role="status">
      <span className="app-toast-msg">{message}</span>
      {action ? (
        <button
          type="button"
          className="app-toast-action"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="app-toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
