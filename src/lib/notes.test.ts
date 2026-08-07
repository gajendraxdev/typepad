import { describe, expect, it } from "vitest";
import {
  isPinned,
  movePinnedPath,
  prunePinnedPaths,
  remapPinnedPath,
  removePinnedPath,
  sortNotesForLibrary,
  splitLibraryNotes,
  togglePinnedPath,
} from "./notes";
import type { NoteMeta } from "../types";

const note = (path: string, modifiedMs: number, title = path): NoteMeta => ({
  path,
  filename: `${title}.txt`,
  title,
  preview: "",
  modifiedMs,
});

describe("splitLibraryNotes", () => {
  it("returns pinned in pin order and others newest-first", () => {
    const notes = [
      note("/a.txt", 100),
      note("/b.txt", 300),
      note("/c.txt", 200),
    ];
    const { pinned, others } = splitLibraryNotes(notes, ["/c.txt", "/a.txt"]);
    expect(pinned.map((n) => n.path)).toEqual(["/c.txt", "/a.txt"]);
    expect(others.map((n) => n.path)).toEqual(["/b.txt"]);
  });

  it("skips stale pin paths", () => {
    const notes = [note("/a.txt", 1)];
    const { pinned } = splitLibraryNotes(notes, ["/gone.txt", "/a.txt"]);
    expect(pinned.map((n) => n.path)).toEqual(["/a.txt"]);
  });
});

describe("sortNotesForLibrary", () => {
  it("puts pinned notes first in pin order", () => {
    const notes = [
      note("/a.txt", 100),
      note("/b.txt", 300),
      note("/c.txt", 200),
    ];
    const sorted = sortNotesForLibrary(notes, ["/c.txt", "/a.txt"]);
    expect(sorted.map((n) => n.path)).toEqual([
      "/c.txt",
      "/a.txt",
      "/b.txt",
    ]);
  });
});

describe("togglePinnedPath", () => {
  it("adds and removes paths", () => {
    expect(togglePinnedPath([], "/a.txt")).toEqual(["/a.txt"]);
    expect(togglePinnedPath(["/a.txt"], "/a.txt")).toEqual([]);
  });

  it("prepends newly pinned notes", () => {
    expect(togglePinnedPath(["/b.txt"], "/a.txt")).toEqual([
      "/a.txt",
      "/b.txt",
    ]);
  });
});

describe("movePinnedPath", () => {
  it("reorders within the pinned list", () => {
    expect(movePinnedPath(["/a", "/b", "/c"], 0, 2)).toEqual([
      "/b",
      "/c",
      "/a",
    ]);
    expect(movePinnedPath(["/a", "/b", "/c"], 2, 0)).toEqual([
      "/c",
      "/a",
      "/b",
    ]);
  });

  it("returns the same array when indices are invalid or equal", () => {
    const pins = ["/a", "/b"];
    expect(movePinnedPath(pins, 0, 0)).toBe(pins);
    expect(movePinnedPath(pins, -1, 0)).toBe(pins);
    expect(movePinnedPath(pins, 0, 9)).toBe(pins);
  });
});

describe("remapPinnedPath", () => {
  it("updates path on rename", () => {
    expect(
      remapPinnedPath(["/old.txt", "/b.txt"], "/old.txt", "/new.txt"),
    ).toEqual(["/new.txt", "/b.txt"]);
  });
});

describe("removePinnedPath", () => {
  it("drops deleted note path", () => {
    expect(removePinnedPath(["/a.txt", "/b.txt"], "/a.txt")).toEqual([
      "/b.txt",
    ]);
  });
});

describe("prunePinnedPaths", () => {
  it("removes stale pins", () => {
    const notes = [note("/a.txt", 1)];
    expect(prunePinnedPaths(["/a.txt", "/gone.txt"], notes)).toEqual([
      "/a.txt",
    ]);
  });
});

describe("isPinned", () => {
  it("checks membership", () => {
    expect(isPinned(["/a.txt"], "/a.txt")).toBe(true);
    expect(isPinned(["/a.txt"], "/b.txt")).toBe(false);
  });
});
