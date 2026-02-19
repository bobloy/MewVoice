use std::fs;
use std::io::Read;
use std::path::PathBuf;

/// Install a MewVoice ZIP to the Mewtator mod folder.
///
/// Extracts audio/voices/<folder>/ and audio/voices/<folder>.gon
/// into <mod_root>/MewVoice/. Reads description.json for pack identity.
/// Ignores any data/catgen.gon.*.patch files in the ZIP (legacy patches).
///
/// Returns the installed pack metadata as JSON.
#[tauri::command]
pub fn install_pack(zip_path: String, mod_root: String) -> Result<String, String> {
    let file = fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP: {e}"))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let mewvoice_dir = PathBuf::from(&mod_root).join("MewVoice");

    // First pass: find metadata to determine pack identity
    let mut pack_name = String::new();
    let mut author = String::new();
    let mut gender = "male".to_string();
    let mut description = String::new();
    let mut folder_name = String::new();
    let mut clip_counts: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    // Try to find description.json or metadata_*.json
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        // Read metadata files
        if name == "metadata.json" || name.starts_with("metadata_") && name.ends_with(".json") {
            let mut content = String::new();
            entry.read_to_string(&mut content).map_err(|e| e.to_string())?;

            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
                // metadata_<packname>.json has the pack-specific info
                if name.starts_with("metadata_") {
                    pack_name = meta.get("name")
                        .or_else(|| meta.get("pack_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    author = meta.get("author")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    gender = meta.get("gender")
                        .and_then(|v| v.as_str())
                        .unwrap_or("male")
                        .to_string();
                    description = meta.get("description")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();

                    if let Some(counts) = meta.get("clip_counts").and_then(|v| v.as_object()) {
                        clip_counts = counts.clone();
                    }

                    // Extract pack_name for folder identification
                    if let Some(pn) = meta.get("pack_name").and_then(|v| v.as_str()) {
                        folder_name = pn.to_string();
                    }
                }
            }
        }
    }

    // If no folder_name from metadata, try to infer from .gon files in the archive
    if folder_name.is_empty() {
        let mut archive2 = zip::ZipArchive::new(
            fs::File::open(&zip_path).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        for i in 0..archive2.len() {
            let entry = archive2.by_index(i).map_err(|e| e.to_string())?;
            let name = entry.name().to_string();

            if name.starts_with("audio/voices/") && name.ends_with(".gon") {
                // e.g., audio/voices/cool_cat.gon → folder_name = "cool_cat"
                let gon_name = name.strip_prefix("audio/voices/").unwrap();
                let gon_name = gon_name.strip_suffix(".gon").unwrap();
                if !gon_name.contains('/') {
                    folder_name = gon_name.to_string();
                    break;
                }
            }
        }
    }

    if folder_name.is_empty() {
        return Err("Could not determine pack folder name from ZIP".to_string());
    }

    if pack_name.is_empty() {
        pack_name = folder_name.clone();
    }

    // The voice_set ID is the folder_name (this is what goes in catgen.gon)
    let voice_set_id = folder_name.clone();

    // Second pass: extract audio files and .gon
    let mut archive3 = zip::ZipArchive::new(
        fs::File::open(&zip_path).map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    for i in 0..archive3.len() {
        let mut entry = archive3.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        // Skip directories
        if entry.is_dir() {
            continue;
        }

        // Skip legacy patch files
        if name.starts_with("data/catgen.gon.") && name.ends_with(".patch") {
            log::info!("Legacy patch detected (ignored): {}", name);
            continue;
        }

        // Extract audio/voices/** files
        if name.starts_with("audio/voices/") {
            let relative = name.strip_prefix("audio/voices/").unwrap();
            let dest = mewvoice_dir.join("audio").join("voices").join(relative);

            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            let mut data = Vec::new();
            entry.read_to_end(&mut data).map_err(|e| e.to_string())?;
            fs::write(&dest, &data).map_err(|e| e.to_string())?;
        }
    }

    // Build result JSON matching InstalledVoicePack interface
    let result = serde_json::json!({
        "id": voice_set_id,
        "name": pack_name,
        "folderName": folder_name,
        "gonFileName": format!("{}.gon", folder_name),
        "author": author,
        "gender": gender,
        "description": description,
        "isEnabled": true,
        "frequency": 1,
        "isBasePack": false,
        "installedAt": chrono_now(),
        "clipCounts": clip_counts,
    });

    log::info!("Installed voice pack: {} ({})", pack_name, voice_set_id);
    Ok(result.to_string())
}

/// Uninstall a voice pack by removing its audio folder and .gon file.
#[tauri::command]
pub fn uninstall_pack(mod_root: String, folder_name: String) -> Result<(), String> {
    let mewvoice_dir = PathBuf::from(&mod_root).join("MewVoice");
    let voices_dir = mewvoice_dir.join("audio").join("voices");

    // Remove audio folder
    let audio_dir = voices_dir.join(&folder_name);
    if audio_dir.exists() {
        fs::remove_dir_all(&audio_dir)
            .map_err(|e| format!("Failed to remove audio folder: {e}"))?;
    }

    // Remove .gon file
    let gon_file = voices_dir.join(format!("{}.gon", folder_name));
    if gon_file.exists() {
        fs::remove_file(&gon_file)
            .map_err(|e| format!("Failed to remove .gon file: {e}"))?;
    }

    log::info!("Uninstalled voice pack: {}", folder_name);
    Ok(())
}

/// Simple ISO timestamp without chrono dependency
fn chrono_now() -> String {
    // Use std::time for a basic ISO-ish timestamp
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}Z", now.as_secs())
}
