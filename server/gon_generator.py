"""
GON Voice File Generator for Mewgenics.
Generates .gon voice definition files matching the game engine format.
"""

def generate_voice_gon(set_name, folder, action_files, is_female=False, comment=""):
    lines = []
    lines.append("#include voice_template.gon")
    lines.append(f'SetName {set_name} // {comment}' if comment else f"SetName {set_name}")
    lines.append(f'Folder "{folder}"')
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
    return "\n".join(lines)

def generate_catgen_patch(pack_name, gender="male"):
    return f"""========================================
  Mewgenics Voice Pack - Install Guide
========================================

Voice Pack: {pack_name}

AUTOMATIC INSTALL:
------------------
Run the included script (requires Python 3):

    python install_voicepack.py THIS_ZIP_FILE.zip

It will auto-detect your game, back up resources.gpak, inject the
voice files, and register the pack. Or pass the path explicitly:

    python install_voicepack.py THIS_ZIP_FILE.zip "path/to/resources.gpak"


MANUAL INSTALL:
---------------

1. BACKUP your original resources.gpak

2. EXTRACT game resources using the GPAK-Extractor:
   https://github.com/ShootMe/GPAK-Extractor
   Drag resources.gpak onto the exe to unpack.

3. COPY the voice files from this ZIP into the extracted output:
   audio/voices/{pack_name}.gon
   audio/voices/{pack_name}/*.wav

4. REGISTER in catgen.gon:
   Open: data/catgen.gon
   Find "voice_sets {{"
   Add:  {pack_name} 1

5. REPACK: drag the output folder onto GPAK-Extractor

6. REPLACE original resources.gpak

7. Launch Mewgenics!
"""
