import { describe, expect, it } from "vitest";
import { countChars, countWords, relativeTime } from "./format";

describe("countWords", () => {
  it("counts whitespace-separated tokens", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  one   two  ")).toBe(2);
  });

  it("returns zero for empty text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t  ")).toBe(0);
  });
});

describe("countChars", () => {
  it("includes all characters", () => {
    expect(countChars("ab\n")).toBe(3);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-08-05T12:00:00Z").getTime();

  it("shows just now for recent edits", () => {
    expect(relativeTime(now - 10_000, now)).toBe("Just now");
  });

  it("shows minutes for edits under an hour", () => {
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5m ago");
  });
});
