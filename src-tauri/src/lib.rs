mod commands;
mod config;
mod error;
mod fs;
mod state;

use config::{load_config, save_config};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
            }

            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("app_config_dir: {e}"))?;

            std::fs::create_dir_all(&config_dir).map_err(|e| format!("create config dir: {e}"))?;

            let config = load_config(&config_dir).unwrap_or_default();
            // Ensure a config file exists so users can find it.
            if !config::config_file_path(&config_dir).exists() {
                let _ = save_config(&config_dir, &config);
            }

            app.manage(AppState::new(config_dir, config));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_bootstrap,
            commands::get_config,
            commands::update_config,
            commands::set_notes_folder,
            commands::reload_config,
            commands::list_notes_cmd,
            commands::read_note_cmd,
            commands::create_note_cmd,
            commands::save_note_cmd,
            commands::rename_note_cmd,
            commands::trash_note_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running typepad");
}
