import type { AppConfig, ThemeMode } from "../types";

const THEMES: ThemeMode[] = ["system", "light", "dark"];

export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 420;
export const SIDEBAR_DEFAULT = 240;

export function normalizeTheme(value: string | undefined | null): ThemeMode {
  if (value && (THEMES as string[]).includes(value)) {
    return value as ThemeMode;
  }
  return "system";
}

export function normalizeSidebarWidth(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return SIDEBAR_DEFAULT;
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(n)));
}

function normalizeOnePinnedPath(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  // Strip Windows `\\?\` prefixes so pins match list/open paths.
  if (s.startsWith("\\\\?\\")) {
    s = s.slice(4);
    if (s.toUpperCase().startsWith("UNC\\")) {
      s = `\\\\${s.slice(4)}`;
    }
  }
  if (/^[a-zA-Z]:[\\/]/.test(s) || s.startsWith("\\\\")) {
    s = s.replace(/\//g, "\\");
    if (/^[a-zA-Z]:\\/.test(s)) {
      s = s[0].toUpperCase() + s.slice(1);
    }
  }
  return s;
}

function normalizePinnedPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const s = normalizeOnePinnedPath(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Single hydration path for AppConfig from the backend. */
export function normalizeConfig(raw: AppConfig): AppConfig {
  return {
    notesFolder: raw.notesFolder ?? null,
    theme: normalizeTheme(raw.theme),
    fontFamily: raw.fontFamily || "ui-sans-serif, system-ui, sans-serif",
    fontSize:
      typeof raw.fontSize === "number" && raw.fontSize >= 12 && raw.fontSize <= 28
        ? raw.fontSize
        : 16,
    sidebarOpen: raw.sidebarOpen ?? true,
    sidebarWidth: normalizeSidebarWidth(raw.sidebarWidth),
    pinnedNotePaths: normalizePinnedPaths(raw.pinnedNotePaths),
    markdownPreview: raw.markdownPreview ?? false,
  };
}
