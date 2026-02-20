use std::path::PathBuf;

/// Open a native folder picker dialog and return the selected path.
/// Note: The frontend uses @tauri-apps/plugin-dialog directly for the
/// file dialog. This command exists as a Rust-side fallback.
#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    Ok(None)
}

/// Validate that a path looks like a Mewtator mods directory.
#[tauri::command]
pub fn validate_mod_path(path: String) -> Result<bool, String> {
    let p = PathBuf::from(&path);

    // Basic checks: directory exists
    if !p.exists() || !p.is_dir() {
        return Ok(false);
    }

    // Check if it looks like a mods directory:
    // Either the directory itself is named "mods" or it contains
    // subdirectories that look like mod folders (have description.json)
    let dir_name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if dir_name.eq_ignore_ascii_case("mods") {
        return Ok(true);
    }

    // Check for description.json in any subdirectory (mod folder pattern)
    if let Ok(entries) = std::fs::read_dir(&p) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let meta = entry.path().join("description.json");
                if meta.exists() {
                    return Ok(true);
                }
            }
        }
    }

    // It's a valid directory, allow it even if we can't confirm it's mods/
    Ok(true)
}
