import { describe, expect, it } from "vitest";
import {
  normalizeConfig,
  normalizeSidebarWidth,
  normalizeTheme,
  SIDEBAR_DEFAULT,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from "./config";
import type { AppConfig } from "../types";

const baseConfig: AppConfig = {
  notesFolder: "/notes",
  theme: "system",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 16,
  sidebarOpen: true,
  sidebarWidth: 240,
  pinnedNotePaths: [],
  markdownPreview: false,
};

describe("normalizeTheme", () => {
  it("accepts valid themes", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("system")).toBe("system");
  });

  it("falls back to system for unknown values", () => {
    expect(normalizeTheme("neon")).toBe("system");
    expect(normalizeTheme(null)).toBe("system");
  });
});

describe("normalizeSidebarWidth", () => {
  it("clamps to min/max", () => {
    expect(normalizeSidebarWidth(50)).toBe(SIDEBAR_MIN);
    expect(normalizeSidebarWidth(999)).toBe(SIDEBAR_MAX);
  });

  it("returns default for invalid input", () => {
    expect(normalizeSidebarWidth("nope")).toBe(SIDEBAR_DEFAULT);
  });
});

describe("normalizeConfig", () => {
  it("fills defaults for partial config", () => {
    const raw = {
      notesFolder: null,
      theme: "dark",
      fontFamily: "",
      fontSize: 99,
      sidebarOpen: undefined,
      sidebarWidth: undefined,
    } as unknown as AppConfig;

    const cfg = normalizeConfig(raw);
    expect(cfg.theme).toBe("dark");
    expect(cfg.fontFamily).toBe("ui-sans-serif, system-ui, sans-serif");
    expect(cfg.fontSize).toBe(16);
    expect(cfg.sidebarOpen).toBe(true);
    expect(cfg.sidebarWidth).toBe(SIDEBAR_DEFAULT);
    expect(cfg.pinnedNotePaths).toEqual([]);
    expect(cfg.markdownPreview).toBe(false);
  });

  it("filters malformed pinnedNotePaths and keeps valid paths", () => {
    const raw = {
      ...baseConfig,
      pinnedNotePaths: ["/ok.txt", "", 42, null, "/also.txt"] as unknown as string[],
    };
    expect(normalizeConfig(raw).pinnedNotePaths).toEqual([
      "/ok.txt",
      "/also.txt",
    ]);
  });

  it("preserves valid values", () => {
    expect(normalizeConfig(baseConfig)).toEqual(baseConfig);
  });
});
