use std::fs;
use tauri::Manager;

/// Load app state JSON from the Tauri app data directory.
/// Returns default empty state if no saved state exists.
#[tauri::command]
pub fn load_state(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;

    let state_path = app_data.join("state.json");

    if !state_path.exists() {
        // Return default empty state
        return Ok(r#"{"packs":[],"mewtatorModRoot":null,"autoSync":false,"lastPatchHash":null}"#.to_string());
    }

    fs::read_to_string(&state_path)
        .map_err(|e| format!("Failed to read state: {e}"))
}

/// Save app state JSON to the Tauri app data directory.
#[tauri::command]
pub fn save_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;

    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data dir: {e}"))?;

    let state_path = app_data.join("state.json");

    fs::write(&state_path, state)
        .map_err(|e| format!("Failed to write state: {e}"))
}
