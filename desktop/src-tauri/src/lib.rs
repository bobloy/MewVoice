mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::state::load_state,
            commands::state::save_state,
            commands::paths::pick_folder,
            commands::paths::validate_mod_path,
            commands::catgen::write_voice_patch,
            commands::install::install_pack,
            commands::install::uninstall_pack,
            commands::remote::list_remote_packs,
            commands::remote::download_and_install_pack,
            commands::scan::scan_installed_packs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
