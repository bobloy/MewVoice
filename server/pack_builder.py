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
                    arc = str(fp.relative_to(build_path)).replace("\\", "/")
                    zf.write(str(fp), arc)
    return str(zip_path)
