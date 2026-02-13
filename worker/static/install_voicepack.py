"""
MewVoice — Voice Pack Installer

Manages custom voice packs in the game's resources.gpak. MewVoice takes
authority over voice modifications only — all other game files and mods
are left untouched.

On first run, saves the current resources.gpak as resources_vanilla.gpak
(a permanent baseline). On every run, it reads from the vanilla baseline,
strips any previously installed MewVoice voices, injects the current set
of ZIPs, and writes the result to resources.gpak. This makes it safe to
re-run at any time: add or remove ZIPs from the folder and re-run.

Usage:
    python install_voicepack.py <directory_of_zips> [path/to/resources.gpak]
    python install_voicepack.py <single_pack.zip>  [path/to/resources.gpak]

Flags:
    --boost   Weight custom voices so they appear ~50% of the time.
              Without this, each custom pack has weight 1 (same as built-in).
    --uninstall  Remove all MewVoice voices and restore vanilla state.

If no gpak path is given, the script searches common Steam install locations.
Accepts either a directory containing ZIPs or a single ZIP file.
"""

import sys
import os
import re
import struct
import json
import math
import shutil
import zipfile
from pathlib import Path


# ── GPAK format ──────────────────────────────────────────────────────────────
# Header: int32 entry_count
#   Per entry: int16 path_len, utf-8 path, int32 file_size
# Body: raw file bytes in entry order, no compression.

def gpak_read(gpak_path):
    """Read a .gpak archive. Returns list of (path, bytes) tuples."""
    entries = []
    with open(gpak_path, "rb") as f:
        count = struct.unpack("<i", f.read(4))[0]
        meta = []
        for _ in range(count):
            path_len = struct.unpack("<h", f.read(2))[0]
            path = f.read(path_len).decode("utf-8")
            size = struct.unpack("<i", f.read(4))[0]
            meta.append((path, size))
        for path, size in meta:
            data = f.read(size)
            entries.append((path, data))
    return entries


def gpak_write(gpak_path, entries):
    """Write a .gpak archive from list of (path, bytes) tuples."""
    with open(gpak_path, "wb") as f:
        f.write(struct.pack("<i", len(entries)))
        for path, data in entries:
            encoded = path.encode("utf-8")
            f.write(struct.pack("<h", len(encoded)))
            f.write(encoded)
            f.write(struct.pack("<i", len(data)))
        for _, data in entries:
            f.write(data)


# ── Steam path detection ─────────────────────────────────────────────────────

STEAM_DIRS = [
    Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Steam",
    Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Steam",
    Path.home() / ".steam" / "steam",               # Linux
    Path.home() / ".local" / "share" / "Steam",     # Linux alt
    Path.home() / "Library" / "Application Support" / "Steam",  # macOS
]

GAME_FOLDER_NAME = "Mewgenics"
GPAK_FILENAME = "resources.gpak"
VANILLA_FILENAME = "resources_vanilla.gpak"

# MewVoice custom packs use this prefix in their file paths
CUSTOM_PREFIX = "audio/voices/custom_"
MEWVOICE_COMMENT = "// MewVoice"


def find_steam_libraries():
    """Find all Steam library folders from libraryfolders.vdf."""
    libs = []
    for steam_dir in STEAM_DIRS:
        vdf = steam_dir / "steamapps" / "libraryfolders.vdf"
        if vdf.exists():
            try:
                text = vdf.read_text(encoding="utf-8")
                for line in text.splitlines():
                    line = line.strip()
                    if '"path"' in line:
                        parts = line.split('"')
                        if len(parts) >= 4:
                            libs.append(Path(parts[3]))
            except Exception:
                pass
            if steam_dir not in libs:
                libs.append(steam_dir)
    return libs


def find_resources_gpak():
    """Search common Steam locations for the game's resources.gpak."""
    for lib in find_steam_libraries():
        candidate = lib / "steamapps" / "common" / GAME_FOLDER_NAME / GPAK_FILENAME
        if candidate.exists():
            return candidate
    return None


# ── Vanilla baseline ────────────────────────────────────────────────────────

def ensure_vanilla_baseline(gpak_path):
    """Ensure a vanilla baseline exists. Returns the path to read from.

    First run:  copies resources.gpak → resources_vanilla.gpak
    Later runs: resources_vanilla.gpak already exists, use it as-is

    The vanilla file is the permanent clean baseline. We always read from
    it and write to resources.gpak.
    """
    vanilla_path = gpak_path.parent / VANILLA_FILENAME
    if not vanilla_path.exists():
        print(f"First run — saving vanilla baseline: {VANILLA_FILENAME}")
        shutil.copy2(gpak_path, vanilla_path)
    else:
        print(f"Vanilla baseline found: {VANILLA_FILENAME}")
    return vanilla_path


# ── Pack helpers ─────────────────────────────────────────────────────────────

def extract_pack_info(zip_path):
    """Read metadata.json from a voice pack ZIP."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        if "metadata.json" in zf.namelist():
            return json.loads(zf.read("metadata.json"))
    return {}


def get_pack_files(zip_path):
    """Get (archive_path, bytes) for voice files inside a ZIP."""
    files = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.startswith("audio/") and not name.endswith("/"):
                files.append((name, zf.read(name)))
    return files


def find_zips(source):
    """Given a path, return a list of ZIP files to install."""
    source = Path(source)
    if source.is_file() and source.suffix.lower() == ".zip":
        return [source]
    if source.is_dir():
        zips = sorted(source.glob("*.zip"))
        return zips
    return []


# ── Voice authority: clean + inject ─────────────────────────────────────────

def is_mewvoice_file(path):
    """Check if a GPAK entry path belongs to a MewVoice custom pack."""
    return path.startswith(CUSTOM_PREFIX)


def strip_mewvoice_entries(entries):
    """Remove all MewVoice custom voice files from GPAK entries."""
    cleaned = []
    removed = 0
    for path, data in entries:
        if is_mewvoice_file(path):
            removed += 1
        else:
            cleaned.append((path, data))
    return cleaned, removed


def strip_mewvoice_registrations(entries):
    """Remove all MewVoice lines from catgen.gon voice_sets block."""
    catgen_path = "data/catgen.gon"
    removed = 0
    for i, (path, data) in enumerate(entries):
        if path == catgen_path:
            text = data.decode("utf-8")
            lines = text.splitlines(keepends=True)
            cleaned_lines = []
            for line in lines:
                if MEWVOICE_COMMENT in line:
                    removed += 1
                else:
                    cleaned_lines.append(line)
            if removed > 0:
                entries[i] = (path, "".join(cleaned_lines).encode("utf-8"))
            break
    return entries, removed


def count_builtin_voice_weight(entries):
    """Count total weight of non-MewVoice entries in voice_sets."""
    catgen_path = "data/catgen.gon"
    for path, data in entries:
        if path == catgen_path:
            text = data.decode("utf-8")
            marker = "voice_sets {"
            idx = text.find(marker)
            if idx == -1:
                return 0
            brace_depth = 0
            block_start = text.index("{", idx)
            block = ""
            for ci in range(block_start, len(text)):
                if text[ci] == "{":
                    brace_depth += 1
                elif text[ci] == "}":
                    brace_depth -= 1
                    if brace_depth == 0:
                        block = text[block_start + 1:ci]
                        break
            total = 0
            for line in block.splitlines():
                stripped = line.split("//")[0].strip()
                if not stripped:
                    continue
                if MEWVOICE_COMMENT in line:
                    continue
                parts = stripped.split()
                if len(parts) >= 2:
                    try:
                        total += int(parts[1])
                    except ValueError:
                        pass
            return total
    return 0


def register_in_catgen(entries, pack_name, weight=1):
    """Add a voice pack to data/catgen.gon voice_sets block."""
    catgen_path = "data/catgen.gon"
    registration_line = f"    {pack_name} {weight} {MEWVOICE_COMMENT}"

    for i, (path, data) in enumerate(entries):
        if path == catgen_path:
            text = data.decode("utf-8")

            marker = "voice_sets {"
            idx = text.find(marker)
            if idx == -1:
                print(f"    WARNING: 'voice_sets {{' not found — register manually")
                return entries

            insert_pos = text.index("\n", idx) + 1
            text = text[:insert_pos] + registration_line + "\n" + text[insert_pos:]
            entries[i] = (path, text.encode("utf-8"))
            print(f"    Registered (weight {weight})")
            return entries

    print("    WARNING: catgen.gon not found in archive")
    return entries


# ── Installer logic ──────────────────────────────────────────────────────────

def install(source, gpak_path, boost=False):
    """Install voice packs: read vanilla, strip old, inject new, write."""
    gpak_path = Path(gpak_path)
    if not gpak_path.exists():
        print(f"ERROR: Game archive not found: {gpak_path}")
        return False

    zips = find_zips(source)
    if not zips:
        print(f"ERROR: No ZIP files found in: {source}")
        return False

    print(f"\nFound {len(zips)} voice pack(s) to install")
    print(f"Target: {gpak_path}")
    if boost:
        print("Boost mode: custom voices will appear ~50% of the time")

    # Ensure vanilla baseline exists and read from it
    vanilla_path = ensure_vanilla_baseline(gpak_path)
    print("Reading vanilla baseline...")
    entries = gpak_read(vanilla_path)
    print(f"Baseline contains {len(entries)} files")

    # Strip any leftover MewVoice data (shouldn't be any in vanilla,
    # but handles edge case of vanilla saved after a previous install)
    entries, removed_files = strip_mewvoice_entries(entries)
    entries, removed_regs = strip_mewvoice_registrations(entries)
    if removed_files or removed_regs:
        print(f"Cleaned {removed_files} old voice files, {removed_regs} registrations")

    # Calculate boost weight
    weight = 1
    if boost and len(zips) > 0:
        builtin_total = count_builtin_voice_weight(entries)
        weight = max(1, math.ceil(builtin_total / len(zips)))
        print(f"\nBuilt-in voice weight total: {builtin_total}")
        print(f"Boost weight per custom pack: {weight}")

    # Inject each ZIP
    existing_paths = {path for path, _ in entries}
    installed = 0

    print()
    for zip_path in zips:
        meta = extract_pack_info(zip_path)
        pack_name = meta.get("pack_name", zip_path.stem)
        display_name = meta.get("name", pack_name)

        print(f"  [{installed + 1}/{len(zips)}] {display_name} ({pack_name})")

        pack_files = get_pack_files(zip_path)
        if not pack_files:
            print(f"    Skipped — no audio files in ZIP")
            continue

        added = 0
        for path, data in pack_files:
            if path not in existing_paths:
                entries.append((path, data))
                existing_paths.add(path)
                added += 1
            # Should not happen since we stripped, but handle gracefully
            else:
                entries = [(p, d) if p != path else (p, data) for p, d in entries]

        print(f"    {added} files added")
        entries = register_in_catgen(entries, pack_name, weight=weight)
        installed += 1

    if installed == 0:
        print("\nNothing to install.")
        return False

    # Write to resources.gpak
    print(f"\nWriting modified archive ({installed} pack(s), {len(entries)} total files)...")
    gpak_write(gpak_path, entries)
    print("Done!")
    print(f"\nTo uninstall all MewVoice packs, run:")
    print(f"  python {sys.argv[0]} --uninstall")
    return True


def uninstall(gpak_path):
    """Remove all MewVoice voices and restore from vanilla baseline."""
    gpak_path = Path(gpak_path)
    vanilla_path = gpak_path.parent / VANILLA_FILENAME

    if vanilla_path.exists():
        print(f"Restoring vanilla baseline: {VANILLA_FILENAME} → {GPAK_FILENAME}")
        shutil.copy2(vanilla_path, gpak_path)
        print("Done! All MewVoice voice packs removed.")
    else:
        print("No vanilla baseline found. Reading current archive to clean it...")
        entries = gpak_read(gpak_path)
        entries, removed_files = strip_mewvoice_entries(entries)
        entries, removed_regs = strip_mewvoice_registrations(entries)
        if removed_files == 0 and removed_regs == 0:
            print("No MewVoice data found — nothing to uninstall.")
            return True
        print(f"Removed {removed_files} voice files, {removed_regs} registrations")
        gpak_write(gpak_path, entries)
        print("Done!")
    return True


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a.lstrip("-").lower() for a in sys.argv[1:] if a.startswith("--")}
    boost = "boost" in flags
    do_uninstall = "uninstall" in flags

    # Resolve gpak path
    gpak_path = None
    if do_uninstall:
        # --uninstall can take an optional gpak path
        if len(args) >= 1:
            gpak_path = args[0]
    else:
        if len(args) < 1:
            print(__doc__.strip())
            print()
            gpak = find_resources_gpak()
            if gpak:
                print(f"Detected game at: {gpak}")
            else:
                print("Could not auto-detect Mewgenics install location.")
            sys.exit(1)

        if len(args) >= 2:
            gpak_path = args[1]

    if gpak_path is None:
        print("Searching for Mewgenics install...")
        gpak_path = find_resources_gpak()
        if not gpak_path:
            print("ERROR: Could not find resources.gpak")
            print("Please provide the path manually.")
            sys.exit(1)
        print(f"Found: {gpak_path}")

    if do_uninstall:
        success = uninstall(str(gpak_path))
    else:
        success = install(args[0], str(gpak_path), boost=boost)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
