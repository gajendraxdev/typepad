export function relativeTime(modifiedMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - modifiedMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(modifiedMs);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  });
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countChars(text: string): number {
  return text.length;
}
