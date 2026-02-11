"""
Run this script to create all server files for MewgenicsVoicePack.
Usage: python setup_server.py
"""
import os
from pathlib import Path

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
SERVER = BASE / "server"
SERVER.mkdir(exist_ok=True)

files = {}

files["requirements.txt"] = """\
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pydub==0.25.1
aiofiles==24.1.0
"""

files["audio_converter.py"] = '''\
"""
Audio converter for Mewgenics voice packs.
Converts any audio format to mono, 16-bit PCM, 44100 Hz WAV.
Requires ffmpeg. pydub wraps ffmpeg for us.
"""
from pydub import AudioSegment
from pathlib import Path

TARGET_SAMPLE_RATE = 44100
TARGET_CHANNELS = 1
TARGET_SAMPLE_WIDTH = 2

def convert_to_game_wav(input_path: str, output_path: str) -> dict:
    input_ext = Path(input_path).suffix.lower().lstrip(".")
    format_map = {
        "webm": "webm", "ogg": "ogg", "mp3": "mp3", "m4a": "m4a",
        "wav": "wav", "flac": "flac", "aac": "aac", "wma": "wma",
        "opus": "ogg",
    }
    fmt = format_map.get(input_ext, input_ext)
    try:
        audio = AudioSegment.from_file(input_path, format=fmt)
    except Exception as e:
        raise RuntimeError(f"Failed to read audio file: {e}")

    original_duration = len(audio) / 1000.0
    if original_duration < 0.05:
        raise ValueError(f"Audio too short ({original_duration:.2f}s). Minimum is 0.05s.")
    if original_duration > 10.0:
        raise ValueError(f"Audio too long ({original_duration:.2f}s). Maximum is 10s.")

    audio = audio.set_frame_rate(TARGET_SAMPLE_RATE)
    audio = audio.set_channels(TARGET_CHANNELS)
    audio = audio.set_sample_width(TARGET_SAMPLE_WIDTH)

    target_dbfs = -20.0
    change_in_dbfs = target_dbfs - audio.dBFS
    audio = audio.apply_gain(change_in_dbfs)
    audio = _trim_silence(audio)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    audio.export(output_path, format="wav")
    return {
        "original_format": input_ext,
        "original_duration": original_duration,
        "output_duration": len(audio) / 1000.0,
        "output_size": Path(output_path).stat().st_size,
    }

def _trim_silence(audio, silence_thresh=-45, chunk_size=10):
    start_trim = 0
    for i in range(0, len(audio), chunk_size):
        if audio[i:i + chunk_size].dBFS > silence_thresh:
            start_trim = max(0, i - chunk_size)
            break
    end_trim = len(audio)
    for i in range(len(audio), 0, -chunk_size):
        if audio[i - chunk_size:i].dBFS > silence_thresh:
            end_trim = min(len(audio), i + chunk_size)
            break
    trimmed = audio[start_trim:end_trim]
    return audio if len(trimmed) < 50 else trimmed
'''

files["gon_generator.py"] = '''\
"""
GON Voice File Generator for Mewgenics.
Generates .gon voice definition files matching the game engine format.
"""

def generate_voice_gon(set_name, folder, action_files, is_female=False, comment=""):
    lines = []
    lines.append("#include voice_template.gon")
    lines.append(f\'SetName {set_name} // {comment}\' if comment else f"SetName {set_name}")
    lines.append(f\'Folder "{folder}"\')
    lines.append("")
    if is_female:
        lines += ["Meta {", "    distinctly_female true", "}", ""]
    lines.append("SoundEffectGroups {")
    for action in ["Angry", "Death", "Happy", "Hiss", "Hit", "Normal", "Purr", "Sad", "Sing"]:
        flist = action_files.get(action, [])
        if not flist:
            fallback = action_files.get("Normal", [])
            flist = [fallback[0]] if fallback else []
        if not flist:
            continue
        file_list = " ".join(flist)
        lines.append(f"    {action} {{")
        lines.append(f"        files [{file_list}]")
        lines.append(f"        #{action.upper()}_PARAMS")
        lines.append(f"    }}")
    lines.append("}")
    lines.append("")
    return "\\n".join(lines)

def generate_catgen_patch(pack_name, gender="male"):
    return f"""========================================
  Mewgenics Voice Pack - Install Guide
========================================

Voice Pack: {pack_name}

INSTALLATION STEPS:
-------------------

1. BACKUP your original resources.gpak

2. EXTRACT game resources (if not already done):
   > python gpak_tool.py extract "path/to/resources.gpak" unpacked/

3. COPY the voice files from this ZIP into unpacked/
   This adds: audio/voices/{pack_name}.gon
              audio/voices/{pack_name}/*.wav

4. REGISTER in catgen.gon:
   Open: unpacked/data/catgen.gon
   Find "voice_sets {{"
   Add:  {pack_name} 1 // Custom voice pack

5. REPACK: python gpak_tool.py pack unpacked/ resources.gpak

6. REPLACE original resources.gpak

7. Launch Mewgenics!

GON ENTRY TO ADD:
    {pack_name} 1 // Custom voice pack
"""
'''

files["pack_builder.py"] = '''\
"""Voice Pack ZIP Builder."""
import json, zipfile
from pathlib import Path

def build_voice_pack_zip(build_dir, pack_name, output_dir, metadata):
    build_path = Path(build_dir)
    build_id = metadata.get("build_id", pack_name)
    zip_path = Path(output_dir) / f"{build_id}.zip"
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("metadata.json", json.dumps(metadata, indent=2))
        inst = build_path / "INSTALL_INSTRUCTIONS.txt"
        if inst.exists():
            zf.write(str(inst), "INSTALL_INSTRUCTIONS.txt")
        audio_dir = build_path / "audio"
        if audio_dir.exists():
            for fp in audio_dir.rglob("*"):
                if fp.is_file():
                    arc = str(fp.relative_to(build_path)).replace("\\\\", "/")
                    zf.write(str(fp), arc)
    return str(zip_path)
'''

files["main.py"] = '''\
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
'''

print(f"Writing {len(files)} server files to {SERVER}...")
for name, content in files.items():
    path = SERVER / name
    path.write_text(content, encoding="utf-8")
    print(f"  ✓ {name} ({len(content)} bytes)")

# Also write root .gitignore
gitignore = BASE / ".gitignore"
gitignore.write_text("""\
client/node_modules/
server/__pycache__/
server/*.pyc
client/dist/
server/data/
.env
.env.local
server/venv/
.idea/
*.iml
.vscode/
.DS_Store
Thumbs.db
_*.txt
""", encoding="utf-8")
print(f"  ✓ .gitignore")

# Write README.md
readme = BASE / "README.md"
readme.write_text("""\
# Mewgenics Voice Pack Creator

Community web tool for creating, sharing, and installing custom cat voice packs for Mewgenics.

## Architecture
- `client/` → React + TypeScript + Vite (port 3000)
- `server/` → Python FastAPI (port 8000)

## Setup

### Prerequisites
- Node.js 18+, Python 3.11+, ffmpeg

### Client
```bash
cd client
npm install
npm run dev
```

### Server
```bash
cd server
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Open
http://localhost:3000
""", encoding="utf-8")
print(f"  ✓ README.md")
print("\\nDone! Next steps:")
print("  1. cd client && npm install")
print("  2. cd server && python -m venv venv && venv\\Scripts\\activate && pip install -r requirements.txt")
print("  3. Install ffmpeg: winget install FFmpeg")
