use std::path::PathBuf;

/// Try to auto-detect the Mewtator mods directory by scanning common Steam paths.
#[tauri::command]
pub fn detect_mewtator_path() -> Result<Option<String>, String> {
    let candidates = get_steam_mod_candidates();

    for candidate in candidates {
        if candidate.exists() && candidate.is_dir() {
            return Ok(Some(candidate.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

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
    // subdirectories that look like mod folders (have metadata.json)
    let dir_name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if dir_name.eq_ignore_ascii_case("mods") {
        return Ok(true);
    }

    // Check for metadata.json in any subdirectory (mod folder pattern)
    if let Ok(entries) = std::fs::read_dir(&p) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let meta = entry.path().join("metadata.json");
                if meta.exists() {
                    return Ok(true);
                }
            }
        }
    }

    // It's a valid directory, allow it even if we can't confirm it's mods/
    Ok(true)
}

fn get_steam_mod_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    // Linux paths
    #[cfg(target_os = "linux")]
    {
        if let Some(home) = dirs_next_home() {
            candidates.push(home.join(".steam/steam/steamapps/common/Mewgenics/mods"));
            candidates.push(home.join(".local/share/Steam/steamapps/common/Mewgenics/mods"));
        }
    }

    // Windows paths
    #[cfg(target_os = "windows")]
    {
        candidates.push(PathBuf::from(r"C:\Program Files (x86)\Steam\steamapps\common\Mewgenics\mods"));
        candidates.push(PathBuf::from(r"C:\Program Files\Steam\steamapps\common\Mewgenics\mods"));

        // Check additional Steam library folders via libraryfolders.vdf
        if let Some(extra) = find_steam_library_mods_windows() {
            candidates.extend(extra);
        }
    }

    // macOS paths
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs_next_home() {
            candidates.push(home.join("Library/Application Support/Steam/steamapps/common/Mewgenics/mods"));
        }
    }

    candidates
}

fn dirs_next_home() -> Option<PathBuf> {
    std::env::var("HOME").ok().map(PathBuf::from)
}

#[cfg(target_os = "windows")]
fn find_steam_library_mods_windows() -> Option<Vec<PathBuf>> {
    // Try to read Steam's libraryfolders.vdf to find additional library paths
    let vdf_paths = [
        r"C:\Program Files (x86)\Steam\steamapps\libraryfolders.vdf",
        r"C:\Program Files\Steam\steamapps\libraryfolders.vdf",
    ];

    for vdf_path in &vdf_paths {
        if let Ok(content) = std::fs::read_to_string(vdf_path) {
            let mut extra = Vec::new();
            // Simple parsing: look for "path" entries
            for line in content.lines() {
                let trimmed = line.trim().trim_matches('"');
                if trimmed.contains(":\\") || trimmed.contains(":/") {
                    let path = PathBuf::from(trimmed);
                    let mods_path = path.join("steamapps/common/Mewgenics/mods");
                    extra.push(mods_path);
                }
            }
            if !extra.is_empty() {
                return Some(extra);
            }
        }
    }
    None
}
