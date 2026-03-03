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

    // Single pass: collect metadata, locate the .gon fallback name, and buffer all audio/voices/ files
    let mut pack_name = String::new();
    let mut author = String::new();
    let mut gender = "male".to_string();
    let mut description = String::new();
    let mut folder_name = String::new();
    let mut clip_counts: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let mut pack_tool_version = String::new();
    let mut gon_entry_name: Option<String> = None;
    // (relative_path_within_voices/, file_data)
    let mut audio_files: Vec<(String, Vec<u8>)> = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if entry.is_dir() {
            continue;
        }

        // Read metadata files
        if name == "description.json" || name.starts_with("metadata_") && name.ends_with(".json") {
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
                    if let Some(tv) = meta.get("tool_version").and_then(|v| v.as_str()) {
                        pack_tool_version = tv.to_string();
                    }
                }
            }
            continue;
        }

        // Skip legacy patch files
        if name.starts_with("data/catgen.gon.") && name.ends_with(".patch") {
            log::info!("Legacy patch detected (ignored): {}", name);
            continue;
        }

        // Collect audio/voices/** files
        if name.starts_with("audio/voices/") {
            let relative = name.strip_prefix("audio/voices/").unwrap().to_string();

            // Track the first top-level .gon for folder_name fallback
            if gon_entry_name.is_none() && name.ends_with(".gon") && !relative.contains('/') {
                gon_entry_name = Some(name.clone());
            }

            let mut data = Vec::new();
            entry.read_to_end(&mut data).map_err(|e| e.to_string())?;
            audio_files.push((relative, data));
        }
    }

    // If no folder_name from metadata, infer from the first top-level .gon found
    if folder_name.is_empty() {
        if let Some(gon) = gon_entry_name.as_deref() {
            let stem = gon
                .strip_prefix("audio/voices/").unwrap_or(gon)
                .strip_suffix(".gon").unwrap_or(gon);
            if !stem.contains('/') {
                folder_name = stem.to_string();
            }
        }
    }

    if folder_name.is_empty() {
        return Err("Could not determine pack folder name from ZIP".to_string());
    }

    if pack_name.is_empty() {
        pack_name = folder_name.clone();
    }

    // Version compatibility check — only runs when the pack carries a tool_version
    let compatibility_warning: Option<String> = if !pack_tool_version.is_empty() {
        let app_ver = env!("CARGO_PKG_VERSION");
        match (parse_semver(&pack_tool_version), parse_semver(app_ver)) {
            (Some((pack_maj, pack_min, _)), Some((app_maj, app_min, _))) => {
                if pack_maj > app_maj {
                    return Err(format!(
                        "This pack requires MewVoice v{pack_tool_version} or later. \
                         Please update the MewVoice desktop app before installing."
                    ));
                } else if pack_maj == app_maj && pack_min > app_min {
                    Some(format!(
                        "This pack was built with MewVoice v{pack_tool_version}, which is newer \
                         than your installed version (v{app_ver}). \
                         It should still work, but consider updating."
                    ))
                } else {
                    None
                }
            }
            _ => None,
        }
    } else {
        None
    };

    // The voice_set ID is the folder_name (this is what goes in catgen.gon)
    let voice_set_id = folder_name.clone();

    // Extract all buffered audio/voices/ files collected during the single pass above
    for (relative, data) in audio_files {
        let dest = mewvoice_dir.join("audio").join("voices").join(&relative);

        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        fs::write(&dest, &data).map_err(|e| e.to_string())?;
    }

    // Build result JSON matching InstalledVoicePack interface
    let mut result = serde_json::json!({
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
        "toolVersion": pack_tool_version,
    });
    if let Some(warning) = compatibility_warning {
        result["compatibilityWarning"] = serde_json::Value::String(warning);
    }

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

/// Parse "major.minor.patch" into a numeric triple, returning None on malformed input.
fn parse_semver(v: &str) -> Option<(u32, u32, u32)> {
    let mut parts = v.splitn(3, '.');
    let maj = parts.next()?.parse().ok()?;
    let min = parts.next()?.parse().ok()?;
    let pat = parts.next()?.parse().ok()?;
    Some((maj, min, pat))
}

/// Simple ISO timestamp without chrono dependency
fn chrono_now() -> String {
    // Use std::time for a basic ISO-ish timestamp
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}Z", now.as_secs())
}
