use crate::error::{AppError, AppResult};
use crate::fs::notes::{
    assert_note_path, create_note, list_notes, path_to_api, read_note, rename_note, save_note,
    trash_note, Note, NoteMeta, SaveResult,
};
use crate::state::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

fn notes_folder(state: &AppState) -> AppResult<PathBuf> {
    let guard = state
        .config
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?
        .clone();
    guard
        .notes_folder
        .as_ref()
        .filter(|p| !p.trim().is_empty())
        .map(PathBuf::from)
        .ok_or(AppError::NotesFolderNotSet)
}

fn strip_win_ext_prefix(s: &str) -> String {
    let s = s.trim();
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        if let Some(unc) = rest.strip_prefix(r"UNC\") {
            return format!(r"\\{unc}");
        }
        return rest.to_string();
    }
    s.to_string()
}

fn path_is_locked(locked: &[String], path: &Path) -> bool {
    let api = strip_win_ext_prefix(&path_to_api(path));
    locked.iter().any(|p| {
        let a = strip_win_ext_prefix(p);
        // Windows paths: compare case-insensitively; POSIX stays case-sensitive.
        if api.len() >= 2 && api.as_bytes().get(1) == Some(&b':') {
            a.eq_ignore_ascii_case(&api)
        } else {
            a == api
        }
    })
}

#[tauri::command]
pub fn list_notes_cmd(state: State<'_, AppState>) -> AppResult<Vec<NoteMeta>> {
    let folder = notes_folder(&state)?;
    list_notes(&folder)
}

#[tauri::command]
pub fn read_note_cmd(state: State<'_, AppState>, path: String) -> AppResult<Note> {
    let folder = notes_folder(&state)?;
    let safe = assert_note_path(&folder, Path::new(&path))?;
    read_note(&safe)
}

#[tauri::command]
pub fn create_note_cmd(state: State<'_, AppState>) -> AppResult<Note> {
    let folder = notes_folder(&state)?;
    create_note(&folder)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveNoteArgs {
    pub path: String,
    pub content: String,
}

#[tauri::command]
pub fn save_note_cmd(state: State<'_, AppState>, args: SaveNoteArgs) -> AppResult<SaveResult> {
    let folder = notes_folder(&state)?;
    let safe = assert_note_path(&folder, Path::new(&args.path))?;
    let locked = {
        let guard = state
            .config
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        guard.locked_note_paths.clone()
    };
    let auto_rename = !path_is_locked(&locked, &safe);
    save_note(&folder, &safe, &args.content, auto_rename)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameNoteArgs {
    pub path: String,
    /// Desired display name / stem (without .txt).
    pub name: String,
}

#[tauri::command]
pub fn rename_note_cmd(state: State<'_, AppState>, args: RenameNoteArgs) -> AppResult<SaveResult> {
    let folder = notes_folder(&state)?;
    let safe = assert_note_path(&folder, Path::new(&args.path))?;
    rename_note(&folder, &safe, &args.name)
}

#[tauri::command]
pub fn trash_note_cmd(state: State<'_, AppState>, path: String) -> AppResult<()> {
    let folder = notes_folder(&state)?;
    let safe = assert_note_path(&folder, Path::new(&path))?;
    trash_note(&safe)
}
