"""
MewVoice - API Server
"""
import os, uuid, shutil, json, zipfile, urllib.parse, math, random, io
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from audio_converter import convert_to_game_wav
from gon_generator import generate_voice_gon, generate_catgen_patch
from auth import (
    build_steam_openid_params, verify_steam_openid, fetch_steam_profile,
    create_jwt_token, get_current_user, require_user,
    STEAM_OPENID_URL, SITE_ORIGIN, DEV_STEAM_ID, COOKIE_NAME, COOKIE_MAX_AGE,
)

app = FastAPI(title="MewVoice", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
UPLOADS_DIR = DATA_DIR / "uploads"
BUILDS_DIR = DATA_DIR / "builds"
LIBRARY_DIR = DATA_DIR / "library"
LIBRARY_META = DATA_DIR / "library_meta.json"
VOTES_FILE = DATA_DIR / "votes.json"
for d in [UPLOADS_DIR, BUILDS_DIR, LIBRARY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def _load_library_meta():
    return json.loads(LIBRARY_META.read_text()) if LIBRARY_META.exists() else []

def _save_library_meta(meta):
    LIBRARY_META.write_text(json.dumps(meta, indent=2))

def _load_votes():
    return json.loads(VOTES_FILE.read_text()) if VOTES_FILE.exists() else {}

def _save_votes(votes):
    VOTES_FILE.write_text(json.dumps(votes, indent=2))

def _compute_score(pack_votes: dict) -> int:
    return sum(pack_votes.values())

# Recommended clip counts per action (must match client ACTION_RECOMMENDED_CLIPS)
_RECOMMENDED = {
    "Normal": 4, "Hit": 5, "Angry": 4, "Happy": 4,
    "Death": 4, "Sad": 4, "Hiss": 4, "Purr": 4, "Sing": 1,
}

def _meets_recommended(entry: dict) -> bool:
    """Check if all 9 actions meet their recommended clip counts."""
    counts = entry.get("clipCounts", {})
    return all(counts.get(action, 0) >= rec for action, rec in _RECOMMENDED.items())


# ── Auth endpoints ───────────────────────────────────────────────────────────

@app.get("/api/auth/steam/login")
async def steam_login(request: Request):
    """Redirect to Steam's OpenID login page (or dev bypass)."""
    if DEV_STEAM_ID:
        profile = await fetch_steam_profile(DEV_STEAM_ID)
        token = create_jwt_token(profile)
        response = RedirectResponse(url=SITE_ORIGIN, status_code=302)
        response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax", max_age=COOKIE_MAX_AGE)
        return response

    return_to = f"{SITE_ORIGIN}/api/auth/steam/callback"
    realm = f"{SITE_ORIGIN}/"
    params = build_steam_openid_params(return_to, realm)
    redirect_url = f"{STEAM_OPENID_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=redirect_url, status_code=302)


@app.get("/api/auth/steam/callback")
async def steam_callback(request: Request):
    """Handle Steam's OpenID callback, verify identity, create session."""
    steam_id = await verify_steam_openid(dict(request.query_params))
    if not steam_id:
        return RedirectResponse(url=f"{SITE_ORIGIN}/?auth_error=1", status_code=302)

    profile = await fetch_steam_profile(steam_id)
    token = create_jwt_token(profile)
    response = RedirectResponse(url=SITE_ORIGIN, status_code=302)
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax", max_age=COOKIE_MAX_AGE)
    return response


@app.get("/api/auth/me")
async def auth_me(request: Request):
    """Return the current logged-in user, or null."""
    user = get_current_user(request)
    if not user:
        return {"user": None}
    return {"user": {
        "steamId": user["steam_id"],
        "personaName": user["persona_name"],
        "avatarUrl": user["avatar_url"],
    }}


@app.post("/api/auth/logout")
async def auth_logout():
    """Clear the session cookie."""
    response = Response(content='{"ok": true}', media_type="application/json")
    response.delete_cookie(COOKIE_NAME)
    return response


# ── Voicepack endpoints ──────────────────────────────────────────────────────

@app.post("/api/voicepacks/build")
async def build_voicepack(
    name: str = Form(...), author: str = Form(""),
    gender: str = Form("male"), description: str = Form(""),
    clips: list[UploadFile] = File(...), clip_actions: list[str] = Form(...),
):
    # Input length limits
    if len(name) > 50:
        raise HTTPException(400, "Pack name must be 50 characters or less")
    if len(description) > 200:
        raise HTTPException(400, "Description must be 200 characters or less")
    if len(author) > 50:
        raise HTTPException(400, "Author must be 50 characters or less")

    if len(clips) != len(clip_actions):
        raise HTTPException(400, "clips and clip_actions count mismatch")
    if len(clips) == 0:
        raise HTTPException(400, "No clips provided")
    valid_actions = {"Angry","Death","Happy","Hiss","Hit","Normal","Purr","Sad","Sing"}
    for a in clip_actions:
        if a not in valid_actions:
            raise HTTPException(400, f"Invalid action: {a}")

    build_id = str(uuid.uuid4())[:8]
    safe_name = "".join(c for c in name.lower().replace(" ","_") if c.isalnum() or c=="_")
    safe_name = safe_name.strip("_")[:40]  # cap length, trim trailing underscores
    if not safe_name: safe_name = "custom"
    pack_name = f"custom_{safe_name}_{build_id}"
    build_dir = BUILDS_DIR / build_id
    voice_dir = build_dir / "audio" / "voices" / pack_name
    voice_dir.mkdir(parents=True, exist_ok=True)

    action_clips = {}
    for clip_file, action in zip(clips, clip_actions):
        content = await clip_file.read()
        action_clips.setdefault(action, []).append((clip_file.filename or "clip.webm", content))

    converted_files = {}
    for action, clip_list in action_clips.items():
        converted_files[action] = []
        for idx, (filename, content) in enumerate(clip_list, 1):
            wav_name = f"{action.lower()}{idx}.wav"
            src_path = build_dir / f"_src_{action}_{idx}{Path(filename).suffix}"
            src_path.write_bytes(content)
            dst_path = voice_dir / wav_name
            try:
                convert_to_game_wav(str(src_path), str(dst_path))
            except Exception as e:
                raise HTTPException(422, f"Failed to convert {filename} ({action} #{idx}): {e}")
            converted_files[action].append(wav_name)
            src_path.unlink(missing_ok=True)

    # Mewtator metadata
    mewtator_meta = {
        "name": "MewVoice Master Mod",
        "description": "Master mod for custom MewVoice packs",
        "author": "MewVoice Community",
        "version": "1.0.0"
    }
    (build_dir / "metadata.json").write_text(json.dumps(mewtator_meta, indent=2))

    metadata = {
        "name": name, "author": author, "gender": gender, "description": description,
        "pack_name": pack_name, "build_id": build_id,
        "clip_counts": {a: len(f) for a,f in converted_files.items()},
        "created_at": datetime.utcnow().isoformat(),
    }
    (build_dir / f"metadata_{pack_name}.json").write_text(json.dumps(metadata, indent=2))

    gon_content = generate_voice_gon(pack_name, f"voices/{pack_name}",
        converted_files, is_female=(gender=="female"))
    (build_dir / "audio" / "voices" / f"{pack_name}.gon").write_text(gon_content)

    data_dir = build_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / f"catgen.gon.{pack_name}.patch").write_text(generate_catgen_patch(pack_name))

    return {"id": build_id, "packName": pack_name, "downloadUrl": f"/api/voicepacks/{build_id}/download"}

@app.get("/api/voicepacks/{build_id}/download")
async def download_voicepack(build_id: str):
    build_dir = BUILDS_DIR / build_id
    if not build_dir.exists(): raise HTTPException(404, "Voice pack not found")

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(build_dir)
                zf.write(file_path, arcname)
    memory_file.seek(0)
    return Response(
        memory_file.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=mewgenics_voicepack_{build_id}.zip"}
    )

@app.post("/api/voicepacks/{build_id}/publish")
async def publish_voicepack(build_id: str, request: Request):
    user = require_user(request)
    build_dir = BUILDS_DIR / build_id
    if not build_dir.exists(): raise HTTPException(404, "Build first.")
    lib_path = LIBRARY_DIR / build_id
    if lib_path.exists(): shutil.rmtree(lib_path)
    shutil.copytree(build_dir, lib_path)

    meta_file = lib_path / f"metadata_{build_id}.json"
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    entry = {
        "id": build_id,
        "name": meta.get("name", "Untitled"),
        "author": meta.get("author", "Anonymous"),
        "gender": meta.get("gender", "male"),
        "description": meta.get("description", ""),
        "clipCounts": meta.get("clip_counts", {}),
        "createdAt": meta.get("created_at", datetime.utcnow().isoformat()),
        "downloads": 0,
        "score": 1,
        "steamId": user["steam_id"],
        "steamName": user["persona_name"],
        "steamAvatar": user["avatar_url"],
    }
    library = [e for e in _load_library_meta() if e["id"] != build_id]
    library.insert(0, entry)
    _save_library_meta(library)

    # Auto-upvote by the author
    votes = _load_votes()
    votes.setdefault(build_id, {})[user["steam_id"]] = 1
    _save_votes(votes)

    return entry


@app.get("/api/voicepacks")
async def list_voicepacks(
    request: Request,
    offset: int = 0,
    limit: int = 20,
    sort: str = "newest",
    q: str = "",
    gender: str = "all",
    minScore: int = 0,
    hasRecommended: bool = False,
    author: str = "",
):
    user = get_current_user(request)
    library = _load_library_meta()
    votes = _load_votes()

    # Sanitize query length
    q = q[:100]

    # Backfill score for entries that don't have it
    for entry in library:
        if "score" not in entry:
            entry["score"] = _compute_score(votes.get(entry["id"], {}))

    # Filter
    filtered = library
    if q:
        q_lower = q.lower()
        filtered = [e for e in filtered if
            q_lower in e.get("name", "").lower() or
            q_lower in e.get("description", "").lower() or
            q_lower in e.get("steamName", "").lower() or
            q_lower in e.get("author", "").lower()
        ]
    if gender != "all":
        filtered = [e for e in filtered if e.get("gender") == gender]
    if minScore is not None:
        filtered = [e for e in filtered if e.get("score", 0) >= minScore]
    if hasRecommended:
        filtered = [e for e in filtered if _meets_recommended(e)]
    if author:
        filtered = [e for e in filtered if e.get("steamId") == author]

    # Sort
    if sort == "top":
        filtered.sort(key=lambda e: (-e.get("score", 0), e.get("createdAt", "")))
    else:  # newest
        filtered.sort(key=lambda e: e.get("createdAt", ""), reverse=True)

    # Paginate
    total = len(filtered)
    page_items = filtered[offset:offset + limit]
    has_more = (offset + limit) < total

    # Inject userVote
    if user:
        steam_id = user["steam_id"]
        for item in page_items:
            pack_votes = votes.get(item["id"], {})
            item["userVote"] = pack_votes.get(steam_id, 0)
    else:
        for item in page_items:
            item["userVote"] = None

    return {"packs": page_items, "total": total, "hasMore": has_more}


@app.post("/api/voicepacks/{pack_id}/vote")
async def vote_voicepack(pack_id: str, request: Request):
    """Vote on a voice pack. Requires auth. Body: { vote: 1 | -1 | 0 }."""
    user = require_user(request)
    body = await request.json()
    vote = body.get("vote", 0)

    if vote not in (1, -1, 0):
        raise HTTPException(400, "Vote must be 1, -1, or 0")

    library = _load_library_meta()
    entry = next((e for e in library if e["id"] == pack_id), None)
    if not entry:
        raise HTTPException(404, "Voice pack not found")

    votes = _load_votes()
    pack_votes = votes.setdefault(pack_id, {})

    if vote == 0:
        pack_votes.pop(user["steam_id"], None)
    else:
        pack_votes[user["steam_id"]] = vote

    # Clean up empty entries
    if not pack_votes:
        votes.pop(pack_id, None)

    _save_votes(votes)

    # Update cached score
    new_score = _compute_score(votes.get(pack_id, {}))
    for e in library:
        if e["id"] == pack_id:
            e["score"] = new_score
            break
    _save_library_meta(library)

    return {"score": new_score, "userVote": vote}


@app.get("/api/voicepacks/{pack_id}/preview")
async def preview_voicepack(pack_id: str, action: str = ""):
    """Stream a random WAV clip from a published voice pack for browser preview."""
    pack_dir = LIBRARY_DIR / pack_id
    if not pack_dir.exists():
        raise HTTPException(404, "Not found")

    # Find all wav files, optionally filtered by action
    wav_files = list(pack_dir.rglob("*.wav"))
    if action:
        action_lower = action.lower()
        wav_files = [f for f in wav_files if f.name.lower().startswith(action_lower)]

    if not wav_files:
        raise HTTPException(404, "No clips found")

    chosen = random.choice(wav_files)
    return FileResponse(str(chosen), media_type="audio/wav", headers={"Cache-Control": "no-cache"})


@app.get("/api/voicepacks/{pack_id}/download-published")
async def download_published(pack_id: str):
    pack_dir = LIBRARY_DIR / pack_id
    if not pack_dir.exists(): raise HTTPException(404, "Not found")

    library = _load_library_meta()
    for e in library:
        if e["id"] == pack_id: e["downloads"] = e.get("downloads",0)+1; break
    _save_library_meta(library)

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(pack_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(pack_dir)
                zf.write(file_path, arcname)
    memory_file.seek(0)
    return Response(
        memory_file.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=mewgenics_voicepack_{pack_id}.zip"}
    )

@app.delete("/api/voicepacks/{pack_id}")
async def delete_voicepack(pack_id: str, request: Request):
    """Delete a published voice pack. Owner only."""
    user = require_user(request)
    library = _load_library_meta()
    entry = next((e for e in library if e["id"] == pack_id), None)
    if not entry:
        raise HTTPException(404, "Voice pack not found")
    if entry.get("steamId") != user["steam_id"]:
        raise HTTPException(403, "You can only delete your own voice packs")

    library = [e for e in library if e["id"] != pack_id]
    _save_library_meta(library)

    # Clean up votes
    votes = _load_votes()
    votes.pop(pack_id, None)
    _save_votes(votes)

    lib_dir = LIBRARY_DIR / pack_id
    if lib_dir.exists():
        shutil.rmtree(lib_dir)

    return {"ok": True, "id": pack_id}

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
