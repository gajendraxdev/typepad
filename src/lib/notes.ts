import type { NoteMeta } from "../types";

export interface LibrarySections {
  pinned: NoteMeta[];
  others: NoteMeta[];
}

/**
 * Normalize filesystem paths for stable pin comparisons.
 * Windows canonicalize uses `\\?\C:\...`; list_dir usually returns `C:\...`.
 */
export function normalizeFsPath(path: string): string {
  let p = path.trim();
  // `\\?\C:\...`
  if (p.startsWith("\\\\?\\")) {
    p = p.slice(4);
    // `\\?\UNC\server\share\...` → `\\server\share\...`
    if (p.toUpperCase().startsWith("UNC\\")) {
      p = `\\\\${p.slice(4)}`;
    }
  }
  // Windows drive paths only: normalize slashes + drive letter case.
  // Leave POSIX paths (`/home/...`) untouched.
  if (/^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("\\\\")) {
    p = p.replace(/\//g, "\\");
    if (/^[a-zA-Z]:\\/.test(p)) {
      p = p[0].toUpperCase() + p.slice(1);
    }
  }
  return p;
}

function samePath(a: string, b: string): boolean {
  return normalizeFsPath(a) === normalizeFsPath(b);
}

/** Stable DOM id for a note path (listbox option / aria-activedescendant). */
export function noteOptionId(path: string): string {
  // Keep IDs CSS/HTML-safe while remaining unique per path.
  return `note-opt-${encodeURIComponent(normalizeFsPath(path)).replace(/%/g, "_")}`;
}

/** Split notes into pinned (config order) and unpinned (newest first). */
export function splitLibraryNotes(
  notes: NoteMeta[],
  pinnedPaths: string[],
): LibrarySections {
  const byPath = new Map(notes.map((n) => [normalizeFsPath(n.path), n]));
  const pinned = pinnedPaths
    .map((p) => byPath.get(normalizeFsPath(p)))
    .filter((n): n is NoteMeta => n !== undefined);
  const pinnedSet = new Set(pinnedPaths.map(normalizeFsPath));
  const others = notes
    .filter((n) => !pinnedSet.has(normalizeFsPath(n.path)))
    .sort((a, b) => b.modifiedMs - a.modifiedMs);
  return { pinned, others };
}

/** @deprecated Use splitLibraryNotes — kept for tests migrating off flat sort. */
export function sortNotesForLibrary(
  notes: NoteMeta[],
  pinnedPaths: string[],
): NoteMeta[] {
  const { pinned, others } = splitLibraryNotes(notes, pinnedPaths);
  return [...pinned, ...others];
}

export function togglePinnedPath(
  pinnedPaths: string[],
  path: string,
): string[] {
  const norm = normalizeFsPath(path);
  const idx = pinnedPaths.findIndex((p) => samePath(p, norm));
  if (idx >= 0) {
    return pinnedPaths.filter((_, i) => i !== idx);
  }
  // Store normalized form so future comparisons stay stable.
  return [norm, ...pinnedPaths.map(normalizeFsPath)];
}

export function movePinnedPath(
  pinnedPaths: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pinnedPaths.length ||
    toIndex >= pinnedPaths.length ||
    fromIndex === toIndex
  ) {
    return pinnedPaths;
  }
  const next = [...pinnedPaths];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function remapPinnedPath(
  pinnedPaths: string[],
  oldPath: string,
  newPath: string,
): string[] {
  const idx = pinnedPaths.findIndex((p) => samePath(p, oldPath));
  if (idx < 0) return pinnedPaths;
  const next = [...pinnedPaths];
  next[idx] = normalizeFsPath(newPath);
  return next;
}

export function removePinnedPath(
  pinnedPaths: string[],
  path: string,
): string[] {
  return pinnedPaths.filter((p) => !samePath(p, path));
}

/** Drop pins for notes that no longer exist on disk. */
export function prunePinnedPaths(
  pinnedPaths: string[],
  notes: NoteMeta[],
): string[] {
  const existing = new Set(notes.map((n) => normalizeFsPath(n.path)));
  return pinnedPaths.filter((p) => existing.has(normalizeFsPath(p)));
}

export function isPinned(pinnedPaths: string[], path: string): boolean {
  const norm = normalizeFsPath(path);
  return pinnedPaths.some((p) => samePath(p, norm));
}

export function isLockedName(lockedPaths: string[], path: string): boolean {
  return isPinned(lockedPaths, path);
}

/** Add path to locked set (normalized, de-duped). */
export function lockNotePath(lockedPaths: string[], path: string): string[] {
  const norm = normalizeFsPath(path);
  if (lockedPaths.some((p) => samePath(p, norm))) {
    return lockedPaths.map(normalizeFsPath);
  }
  return [...lockedPaths.map(normalizeFsPath), norm];
}

/** Remap a locked path after rename (same as pin remap). */
export function remapLockedPath(
  lockedPaths: string[],
  oldPath: string,
  newPath: string,
): string[] {
  return remapPinnedPath(lockedPaths, oldPath, newPath);
}

export function removeLockedPath(
  lockedPaths: string[],
  path: string,
): string[] {
  return removePinnedPath(lockedPaths, path);
}

/** Library label: locked notes show file stem; others show first-line title. */
export function displayNoteTitle(
  note: { path: string; filename: string; title: string },
  lockedPaths: string[],
): string {
  if (!isLockedName(lockedPaths, note.path)) {
    return note.title;
  }
  const stem = note.filename.replace(/\.txt$/i, "").trim();
  return stem || note.title;
}
