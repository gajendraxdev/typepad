import type { SaveStatus } from "../types";

interface Props {
  status: SaveStatus;
}

export function SaveIndicator({ status }: Props) {
  if (status === "idle") return null;

  let label = "";
  let dotClass = "bg-[var(--text-faint)]";
  let wrapClass = "";

  switch (status) {
    case "dirty":
      label = "Unsaved";
      dotClass = "bg-[var(--warning)]";
      break;
    case "saving":
      label = "Saving";
      dotClass = "bg-[var(--accent)]";
      wrapClass = "";
      break;
    case "saved":
      label = "Saved";
      dotClass = "bg-[var(--success)]";
      wrapClass = "anim-saved";
      break;
    case "error":
      label = "Couldn't save";
      dotClass = "bg-[var(--danger)]";
      break;
  }

  return (
    <div
      className={`flex items-center gap-1 text-[10px] text-[var(--text-muted)] ${wrapClass}`}
      title={label}
      aria-live="polite"
    >
      <span
        className={`inline-block h-1 w-1 rounded-full ${dotClass} ${
          status === "saving" ? "animate-pulse" : ""
        }`}
      />
      <span className={status === "saved" ? "text-[var(--success)]" : ""}>
        {label}
      </span>
    </div>
  );
}
