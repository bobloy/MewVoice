use std::fs;

const REMOTE_API_BASE: &str = "https://mewvoice.com/api";

#[tauri::command]
pub async fn list_remote_packs(
    sort: String,
    q: String,
    gender: String,
    offset: u32,
    limit: u32,
) -> Result<String, String> {
    let normalized_sort = if sort == "top" { "top" } else { "newest" };
    let normalized_gender = match gender.as_str() {
        "male" => "male",
        "female" => "female",
        _ => "all",
    };
    let clamped_limit = limit.clamp(1, 100);
    let clamped_q = q.trim().chars().take(100).collect::<String>();

    let mut url = reqwest::Url::parse(&format!("{REMOTE_API_BASE}/voicepacks"))
        .map_err(|e| format!("Invalid remote URL: {e}"))?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("offset", &offset.to_string());
        query.append_pair("limit", &clamped_limit.to_string());
        query.append_pair("sort", normalized_sort);
        if !clamped_q.is_empty() {
            query.append_pair("q", &clamped_q);
        }
        if normalized_gender != "all" {
            query.append_pair("gender", normalized_gender);
        }
    }

    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to load community library: {e}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read community library response: {e}"))?;
    if !status.is_success() {
        return Err(format!("Failed to load community library (HTTP {status})"));
    }

    Ok(body)
}

#[tauri::command]
pub async fn download_and_install_pack(pack_id: String, mod_root: String) -> Result<String, String> {
    let trimmed_pack_id = pack_id.trim();
    if trimmed_pack_id.is_empty() {
        return Err("Pack ID is required".to_string());
    }

    let url = format!("{REMOTE_API_BASE}/voicepacks/{trimmed_pack_id}/download-published");
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download voice pack: {e}"))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("Failed to download voice pack (HTTP {status})"));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read downloaded pack data: {e}"))?;

    let temp_zip_path = std::env::temp_dir().join(format!(
        "mewvoice_{trimmed_pack_id}_{}.zip",
        uuid::Uuid::new_v4()
    ));
    fs::write(&temp_zip_path, &bytes).map_err(|e| format!("Failed to write temporary ZIP: {e}"))?;

    // TODO: Verify a published checksum/signature once the API exposes one.
    let install_result = super::install::install_pack(
        temp_zip_path.to_string_lossy().to_string(),
        mod_root,
    );
    let _ = fs::remove_file(&temp_zip_path);
    install_result
}
