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

def generate_catgen_patch(pack_name):
    """
    Generates a Mewtator-compatible .patch file for catgen.gon.
    This adds the new voice pack to the voice_sets block.
    """
    return f"voice_sets {{\n    {pack_name} 1\n}}\n"
