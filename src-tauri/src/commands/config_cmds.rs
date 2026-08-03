use crate::config::{default_notes_folder_suggestion, load_config, save_config, AppConfig};
use crate::error::{AppError, AppResult};
use crate::fs::notes::move_notes;
use crate::state::AppState;
use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapInfo {
    pub config: AppConfig,
    pub default_notes_folder: String,
    pub needs_setup: bool,
}

#[tauri::command]
pub fn get_bootstrap(state: State<'_, AppState>) -> AppResult<BootstrapInfo> {
    let config = state
        .config
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?
        .clone();
    let needs_setup = config
        .notes_folder
        .as_ref()
        .map(|p| p.trim().is_empty())
        .unwrap_or(true);
    Ok(BootstrapInfo {
        needs_setup,
        default_notes_folder: default_notes_folder_suggestion()
            .to_string_lossy()
            .into_owned(),
        config,
    })
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppResult<AppConfig> {
    state
        .config
        .lock()
        .map(|c| c.clone())
        .map_err(|e| AppError::Config(e.to_string()))
}

#[tauri::command]
pub fn update_config(state: State<'_, AppState>, config: AppConfig) -> AppResult<AppConfig> {
    {
        let mut guard = state
            .config
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        *guard = config.clone();
    }
    save_config(&state.config_dir, &config)?;
    Ok(config)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetNotesFolderArgs {
    pub path: String,
    /// When changing folders: move existing .txt notes into the new folder.
    pub move_existing: bool,
}

#[tauri::command]
pub fn set_notes_folder(
    state: State<'_, AppState>,
    args: SetNotesFolderArgs,
) -> AppResult<AppConfig> {
    let new_path = PathBuf::from(args.path.trim());
    if args.path.trim().is_empty() {
        return Err(AppError::InvalidPath("notes folder path is empty".into()));
    }
    std::fs::create_dir_all(&new_path)?;

    let mut config = state
        .config
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?
        .clone();

    if args.move_existing {
        if let Some(old) = config.notes_folder.as_ref() {
            let old_path = PathBuf::from(old);
            if old_path != new_path {
                move_notes(&old_path, &new_path)?;
            }
        }
    }

    config.notes_folder = Some(new_path.to_string_lossy().into_owned());
    save_config(&state.config_dir, &config)?;
    {
        let mut guard = state
            .config
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        *guard = config.clone();
    }
    Ok(config)
}

/// Reload config from disk (rarely needed; useful after external edits).
#[tauri::command]
pub fn reload_config(state: State<'_, AppState>) -> AppResult<AppConfig> {
    let config = load_config(&state.config_dir)?;
    {
        let mut guard = state
            .config
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        *guard = config.clone();
    }
    Ok(config)
}
