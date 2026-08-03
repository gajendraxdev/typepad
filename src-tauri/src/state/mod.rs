use crate::config::AppConfig;
use std::path::PathBuf;
use std::sync::Mutex;

/// Shared application state held by Tauri.
pub struct AppState {
    pub config_dir: PathBuf,
    pub config: Mutex<AppConfig>,
}

impl AppState {
    pub fn new(config_dir: PathBuf, config: AppConfig) -> Self {
        Self {
            config_dir,
            config: Mutex::new(config),
        }
    }
}
