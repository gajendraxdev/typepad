import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  AppConfig,
  BootstrapInfo,
  Note,
  NoteMeta,
  SaveResult,
  SetNotesFolderArgs,
} from "../types";

export async function getBootstrap(): Promise<BootstrapInfo> {
  return invoke<BootstrapInfo>("get_bootstrap");
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
  return invoke<AppConfig>("update_config", { config });
}

export async function setNotesFolder(
  args: SetNotesFolderArgs,
): Promise<AppConfig> {
  return invoke<AppConfig>("set_notes_folder", { args });
}

export async function listNotes(): Promise<NoteMeta[]> {
  return invoke<NoteMeta[]>("list_notes_cmd");
}

export async function readNote(path: string): Promise<Note> {
  return invoke<Note>("read_note_cmd", { path });
}

export async function createNote(): Promise<Note> {
  return invoke<Note>("create_note_cmd");
}

export async function saveNote(
  path: string,
  content: string,
): Promise<SaveResult> {
  return invoke<SaveResult>("save_note_cmd", { args: { path, content } });
}

export async function trashNote(path: string): Promise<void> {
  return invoke<void>("trash_note_cmd", { path });
}

/** Native folder picker. Returns null if the user cancels. */
export async function pickFolder(
  defaultPath?: string,
): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath,
    title: "Choose Notes folder",
  });
  if (selected === null) return null;
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected;
}
