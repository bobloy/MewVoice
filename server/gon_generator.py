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
