use std::fs;
use std::path::PathBuf;

/// Atomic write of the merged catgen.gon.patch to the MewVoice mod data directory.
///
/// Write target: <mod_root>/MewVoice/data/catgen.gon.patch
///
/// Safety:
/// - Creates MewVoice/data/ if it doesn't exist
/// - Writes to a temp file first, then renames (atomic on most filesystems)
/// - Never touches base game directories
#[tauri::command]
pub fn write_voice_patch(mod_root: String, content: String) -> Result<(), String> {
    let data_dir = PathBuf::from(&mod_root)
        .join("MewVoice")
        .join("data");

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {e}"))?;

    let patch_path = data_dir.join("catgen.gon.patch");
    let temp_path = data_dir.join("catgen.gon.patch.tmp");

    // Also ensure MewVoice/metadata.json exists (Mewtator needs this)
    ensure_mod_metadata(&PathBuf::from(&mod_root).join("MewVoice"))?;

    // Write to temp file first
    fs::write(&temp_path, &content)
        .map_err(|e| format!("Failed to write temp patch file: {e}"))?;

    // Atomic rename
    fs::rename(&temp_path, &patch_path)
        .map_err(|e| format!("Failed to finalize patch file: {e}"))?;

    log::info!("Voice patch written to {}", patch_path.display());
    Ok(())
}

/// Ensure the MewVoice mod has a valid metadata.json for Mewtator.
fn ensure_mod_metadata(mewvoice_dir: &PathBuf) -> Result<(), String> {
    let meta_path = mewvoice_dir.join("metadata.json");
    if !meta_path.exists() {
        let metadata = serde_json::json!({
            "name": "MewVoice Master Mod",
            "description": "Merged voice pack registrations from MewVoice Desktop",
            "author": "MewVoice",
            "version": "1.0.0"
        });
        fs::write(&meta_path, serde_json::to_string_pretty(&metadata).unwrap())
            .map_err(|e| format!("Failed to write metadata.json: {e}"))?;
    }
    Ok(())
}
