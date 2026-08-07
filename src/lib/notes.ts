import type { NoteMeta } from "../types";

export interface LibrarySections {
  pinned: NoteMeta[];
  others: NoteMeta[];
}

/** Split notes into pinned (config order) and unpinned (newest first). */
export function splitLibraryNotes(
  notes: NoteMeta[],
  pinnedPaths: string[],
): LibrarySections {
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const pinned = pinnedPaths
    .map((p) => byPath.get(p))
    .filter((n): n is NoteMeta => n !== undefined);
  const pinnedSet = new Set(pinnedPaths);
  const others = notes
    .filter((n) => !pinnedSet.has(n.path))
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
  const idx = pinnedPaths.indexOf(path);
  if (idx >= 0) {
    return pinnedPaths.filter((p) => p !== path);
  }
  return [path, ...pinnedPaths];
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
  const idx = pinnedPaths.indexOf(oldPath);
  if (idx < 0) return pinnedPaths;
  const next = [...pinnedPaths];
  next[idx] = newPath;
  return next;
}

export function removePinnedPath(
  pinnedPaths: string[],
  path: string,
): string[] {
  return pinnedPaths.filter((p) => p !== path);
}

/** Drop pins for notes that no longer exist on disk. */
export function prunePinnedPaths(
  pinnedPaths: string[],
  notes: NoteMeta[],
): string[] {
  const existing = new Set(notes.map((n) => n.path));
  return pinnedPaths.filter((p) => existing.has(p));
}

export function isPinned(pinnedPaths: string[], path: string): boolean {
  return pinnedPaths.includes(path);
}
