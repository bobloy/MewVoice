use std::fs;
use std::path::PathBuf;

/// Scan the Mewtator mod folder for installed voice packs.
///
/// Looks for .gon files in <mod_root>/MewVoice/audio/voices/ and treats
/// each as an installed voice pack. Tries to read metadata from nearby
/// metadata_<name>.json files.
///
/// Returns a JSON array of InstalledVoicePack objects.
#[tauri::command]
pub fn scan_installed_packs(mod_root: String) -> Result<String, String> {
    let voices_dir = PathBuf::from(&mod_root)
        .join("MewVoice")
        .join("audio")
        .join("voices");

    if !voices_dir.exists() {
        return Ok("[]".to_string());
    }

    let mut packs = Vec::new();

    let entries = fs::read_dir(&voices_dir)
        .map_err(|e| format!("Failed to read voices directory: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();

        // Look for .gon files (not directories)
        if path.is_file() && path.extension().map_or(false, |e| e == "gon") {
            let folder_name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();

            if folder_name.is_empty() {
                continue;
            }

            // Check if corresponding audio folder exists
            let audio_dir = voices_dir.join(&folder_name);
            if !audio_dir.exists() || !audio_dir.is_dir() {
                continue;
            }

            // Count WAV files per action
            let clip_counts = count_clips(&audio_dir);

            // Try to read metadata
            let mewvoice_dir = PathBuf::from(&mod_root).join("MewVoice");
            let (name, author, gender, description) =
                read_pack_metadata(&mewvoice_dir, &folder_name);

            let pack = serde_json::json!({
                "id": folder_name,
                "name": if name.is_empty() { folder_name.clone() } else { name },
                "folderName": folder_name,
                "gonFileName": format!("{}.gon", folder_name),
                "author": author,
                "gender": gender,
                "description": description,
                "isEnabled": true,
                "frequency": 1,
                "isBasePack": false,
                "installedAt": "",
                "clipCounts": clip_counts,
            });

            packs.push(pack);
        }
    }

    serde_json::to_string(&packs).map_err(|e| format!("Failed to serialize packs: {e}"))
}

/// Count WAV files in a voice pack directory, grouped by action prefix.
// TODO: Support more audio formats beyond WAV (e.g., OGG, MP3) - currently only .wav files are counted
fn count_clips(audio_dir: &PathBuf) -> serde_json::Map<String, serde_json::Value> {
    let mut counts: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let actions = [
        "normal", "hit", "angry", "happy", "death", "sad", "hiss", "purr", "sing",
    ];

    if let Ok(entries) = fs::read_dir(audio_dir) {
        for entry in entries.flatten() {
            let name = entry
                .file_name()
                .to_string_lossy()
                .to_lowercase();

            if !name.ends_with(".wav") {
                continue;
            }

            for action in &actions {
                if name.starts_with(action) {
                    let key = capitalize(action);
                    let current = counts
                        .get(&key)
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    counts.insert(key, serde_json::json!(current + 1));
                    break;
                }
            }
        }
    }

    counts
}

/// Try to read pack metadata from metadata_<name>.json
fn read_pack_metadata(
    mewvoice_dir: &PathBuf,
    folder_name: &str,
) -> (String, String, String, String) {
    let meta_path = mewvoice_dir.join(format!("metadata_{}.json", folder_name));

    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
            let name = meta
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let author = meta
                .get("author")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let gender = meta
                .get("gender")
                .and_then(|v| v.as_str())
                .unwrap_or("male")
                .to_string();
            let description = meta
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            return (name, author, gender, description);
        }
    }

    (String::new(), String::new(), "male".to_string(), String::new())
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}
