use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

pub const CONFIG_FILE_NAME: &str = "config.json";

fn default_tab_layout() -> String {
    // "sidebar" = permanent library + title-bar tabs (default)
    // "top" = title-bar tabs only (library via popup)
    "sidebar".into()
}

fn default_true() -> bool {
    true
}

fn default_sidebar_width() -> u32 {
    240
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Absolute path to the folder where `.txt` notes are stored.
    pub notes_folder: Option<String>,
    /// "system" | "light" | "dark"
    pub theme: String,
    pub font_family: String,
    pub font_size: u32,
    /// Whether the sidebar note list is expanded.
    #[serde(default = "default_true")]
    pub sidebar_open: bool,
    /// Open-note layout: "top" (title-bar tabs only) or "sidebar" (library + tabs).
    /// Legacy value "vertical" is accepted by the frontend as sidebar.
    #[serde(default = "default_tab_layout")]
    pub tab_layout: String,
    /// Library sidebar width in CSS pixels (when expanded).
    #[serde(default = "default_sidebar_width")]
    pub sidebar_width: u32,
    /// Absolute paths of notes pinned to the top of the library list.
    #[serde(default)]
    pub pinned_note_paths: Vec<String>,
    /// When true, the editor shows rendered markdown instead of raw text.
    #[serde(default)]
    pub markdown_preview: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            notes_folder: None,
            theme: "system".into(),
            font_family: "ui-sans-serif, system-ui, sans-serif".into(),
            font_size: 16,
            sidebar_open: true,
            tab_layout: default_tab_layout(),
            sidebar_width: default_sidebar_width(),
            pinned_note_paths: Vec::new(),
            markdown_preview: false,
        }
    }
}

/// Resolve the default suggested notes folder: Documents/Typepad.
pub fn default_notes_folder_suggestion() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("Documents")
        })
        .join("Typepad")
}

pub fn config_file_path(config_dir: &Path) -> PathBuf {
    config_dir.join(CONFIG_FILE_NAME)
}

/// Load config from `config_dir/config.json`, or return defaults if missing.
pub fn load_config(config_dir: &Path) -> AppResult<AppConfig> {
    let path = config_file_path(config_dir);
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let raw = fs::read_to_string(&path)?;
    let config: AppConfig = serde_json::from_str(&raw)?;
    Ok(config)
}

/// Persist config to `config_dir/config.json`, creating the directory if needed.
pub fn save_config(config_dir: &Path, config: &AppConfig) -> AppResult<()> {
    fs::create_dir_all(config_dir).map_err(|e| {
        AppError::Config(format!(
            "failed to create config dir {}: {e}",
            config_dir.display()
        ))
    })?;
    let path = config_file_path(config_dir);
    let raw = serde_json::to_string_pretty(config)?;
    fs::write(&path, raw)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_missing_returns_default() {
        let dir = tempdir().unwrap();
        let cfg = load_config(dir.path()).unwrap();
        assert_eq!(cfg, AppConfig::default());
    }

    #[test]
    fn save_then_load_roundtrip() {
        let dir = tempdir().unwrap();
        let mut cfg = AppConfig::default();
        cfg.notes_folder = Some("/tmp/notes".into());
        cfg.theme = "dark".into();
        cfg.font_size = 18;
        cfg.sidebar_open = false;
        cfg.sidebar_width = 320;

        save_config(dir.path(), &cfg).unwrap();
        let loaded = load_config(dir.path()).unwrap();
        assert_eq!(loaded, cfg);
    }

    #[test]
    fn load_accepts_phase2_fields() {
        let dir = tempdir().unwrap();
        let raw = r#"{
            "notesFolder": null,
            "theme": "system",
            "fontFamily": "sans",
            "fontSize": 16,
            "sidebarOpen": true,
            "tabLayout": "sidebar",
            "sidebarWidth": 240,
            "pinnedNotePaths": ["/notes/ideas.txt"],
            "markdownPreview": true
        }"#;
        fs::write(config_file_path(dir.path()), raw).unwrap();
        let cfg = load_config(dir.path()).unwrap();
        assert_eq!(cfg.pinned_note_paths, vec!["/notes/ideas.txt"]);
        assert!(cfg.markdown_preview);
    }

    #[test]
    fn save_creates_parent_dirs() {
        let dir = tempdir().unwrap();
        let nested = dir.path().join("a").join("b");
        let cfg = AppConfig {
            notes_folder: Some("x".into()),
            ..AppConfig::default()
        };
        save_config(&nested, &cfg).unwrap();
        assert!(config_file_path(&nested).exists());
    }
}
