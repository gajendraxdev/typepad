export type ThemeMode = "system" | "light" | "dark";
/** "top" = title-bar tabs only. "sidebar" = library sidebar + title-bar tabs. */
export type TabLayout = "top" | "sidebar";

export interface AppConfig {
  notesFolder: string | null;
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number;
  sidebarOpen: boolean;
  /** "top" = tabs only. "sidebar" = permanent library + top tabs. */
  tabLayout: TabLayout;
  /** Expanded library width in px. */
  sidebarWidth: number;
}

export interface BootstrapInfo {
  config: AppConfig;
  defaultNotesFolder: string;
  needsSetup: boolean;
}

export interface NoteMeta {
  path: string;
  filename: string;
  title: string;
  preview: string;
  modifiedMs: number;
}

export interface Note {
  path: string;
  filename: string;
  content: string;
  title: string;
  modifiedMs: number;
}

export interface SaveResult {
  path: string;
  filename: string;
  title: string;
  renamed: boolean;
}

export interface SetNotesFolderArgs {
  path: string;
  moveExisting: boolean;
}

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** An open note in the tab bar (draft may differ from last saved content). */
export interface OpenTab {
  path: string;
  filename: string;
  title: string;
  content: string;
  draft: string;
  saveStatus: SaveStatus;
}
