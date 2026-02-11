"""
Mewgenics Voice Pack Creator - API Server
"""
import os, uuid, shutil, json, zipfile
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from audio_converter import convert_to_game_wav
from gon_generator import generate_voice_gon, generate_catgen_patch
from pack_builder import build_voice_pack_zip

app = FastAPI(title="Mewgenics Voice Pack Creator", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
UPLOADS_DIR = DATA_DIR / "uploads"
BUILDS_DIR = DATA_DIR / "builds"
LIBRARY_DIR = DATA_DIR / "library"
LIBRARY_META = DATA_DIR / "library_meta.json"
for d in [UPLOADS_DIR, BUILDS_DIR, LIBRARY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def _load_library_meta():
    return json.loads(LIBRARY_META.read_text()) if LIBRARY_META.exists() else []

def _save_library_meta(meta):
    LIBRARY_META.write_text(json.dumps(meta, indent=2))

@app.post("/api/voicepacks/build")
async def build_voicepack(
    name: str = Form(...), author: str = Form(""),
    gender: str = Form("male"), description: str = Form(""),
    clips: list[UploadFile] = File(...), clip_actions: list[str] = Form(...),
):
    if len(clips) != len(clip_actions):
        raise HTTPException(400, "clips and clip_actions count mismatch")
    if len(clips) == 0:
        raise HTTPException(400, "No clips provided")
    valid_actions = {"Angry","Death","Happy","Hiss","Hit","Normal","Purr","Sad","Sing"}
    for a in clip_actions:
        if a not in valid_actions:
            raise HTTPException(400, f"Invalid action: {a}")

    build_id = str(uuid.uuid4())[:12]
    safe_name = "".join(c for c in name.lower().replace(" ","_") if c.isalnum() or c=="_")
    if not safe_name: safe_name = f"custom_{build_id}"
    pack_name = f"custom_{safe_name}"
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

    gon_content = generate_voice_gon(pack_name, f"voices/{pack_name}",
        converted_files, is_female=(gender=="female"))
    (build_dir / "audio" / "voices" / f"{pack_name}.gon").write_text(gon_content)
    (build_dir / "INSTALL_INSTRUCTIONS.txt").write_text(generate_catgen_patch(pack_name, gender))

    build_voice_pack_zip(str(build_dir), pack_name, str(BUILDS_DIR), metadata={
        "name": name, "author": author, "gender": gender, "description": description,
        "pack_name": pack_name, "build_id": build_id,
        "clip_counts": {a: len(f) for a,f in converted_files.items()},
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"id": build_id, "packName": pack_name, "downloadUrl": f"/api/voicepacks/{build_id}/download"}

@app.get("/api/voicepacks/{build_id}/download")
async def download_voicepack(build_id: str):
    zip_path = BUILDS_DIR / f"{build_id}.zip"
    if not zip_path.exists(): raise HTTPException(404, "Voice pack not found")
    return FileResponse(str(zip_path), media_type="application/zip",
        filename=f"mewgenics_voicepack_{build_id}.zip")

@app.post("/api/voicepacks/{build_id}/publish")
async def publish_voicepack(build_id: str):
    zip_path = BUILDS_DIR / f"{build_id}.zip"
    if not zip_path.exists(): raise HTTPException(404, "Build first.")
    lib_path = LIBRARY_DIR / f"{build_id}.zip"
    shutil.copy2(str(zip_path), str(lib_path))
    meta = {}
    with zipfile.ZipFile(str(zip_path), "r") as zf:
        if "metadata.json" in zf.namelist():
            meta = json.loads(zf.read("metadata.json"))
    entry = {"id": build_id, "name": meta.get("name","Untitled"),
        "author": meta.get("author","Anonymous"), "gender": meta.get("gender","male"),
        "description": meta.get("description",""), "clipCounts": meta.get("clip_counts",{}),
        "createdAt": meta.get("created_at", datetime.utcnow().isoformat()), "downloads": 0}
    library = [e for e in _load_library_meta() if e["id"] != build_id]
    library.insert(0, entry)
    _save_library_meta(library)
    return entry

@app.get("/api/voicepacks")
async def list_voicepacks(page: int = 1, limit: int = 20):
    library = _load_library_meta()
    start = (page-1)*limit
    return {"packs": library[start:start+limit], "total": len(library)}

@app.get("/api/voicepacks/{pack_id}/download-published")
async def download_published(pack_id: str):
    zip_path = LIBRARY_DIR / f"{pack_id}.zip"
    if not zip_path.exists(): raise HTTPException(404, "Not found")
    library = _load_library_meta()
    for e in library:
        if e["id"] == pack_id: e["downloads"] = e.get("downloads",0)+1; break
    _save_library_meta(library)
    return FileResponse(str(zip_path), media_type="application/zip",
        filename=f"mewgenics_voicepack_{pack_id}.zip")

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
