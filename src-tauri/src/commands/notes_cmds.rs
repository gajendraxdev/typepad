use crate::error::{AppError, AppResult};
use crate::fs::notes::{
    assert_note_path, create_note, list_notes, read_note, save_note, trash_note, Note, NoteMeta,
    SaveResult,
};
use crate::state::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

fn notes_folder(state: &AppState) -> AppResult<PathBuf> {
    let guard = state
        .config
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?;
    guard
        .notes_folder
        .as_ref()
        .filter(|p| !p.trim().is_empty())
        .map(PathBuf::from)
        .ok_or(AppError::NotesFolderNotSet)
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
    save_note(&folder, &safe, &args.content)
}

#[tauri::command]
pub fn trash_note_cmd(state: State<'_, AppState>, path: String) -> AppResult<()> {
    let folder = notes_folder(&state)?;
    let safe = assert_note_path(&folder, Path::new(&path))?;
    trash_note(&safe)
}
