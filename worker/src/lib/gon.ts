/**
 * GON Voice File Generator for Mewgenics.
 * Port of server/gon_generator.py to TypeScript.
 */

const GON_ACTIONS = ['Angry', 'Death', 'Happy', 'Hiss', 'Hit', 'Normal', 'Purr', 'Sad', 'Sing'];

/**
 * Generate a .gon voice definition file matching the Mewgenics game format.
 */
export function generateVoiceGon(
  setName: string,
  folder: string,
  actionFiles: Record<string, string[]>,
  isFemale: boolean = false,
): string {
  const lines: string[] = [];
  lines.push('#include voice_template.gon');
  lines.push(`SetName ${setName}`);
  lines.push(`Folder "${folder}"`);
  lines.push('');

  if (isFemale) {
    lines.push('Meta {');
    lines.push('    distinctly_female true');
    lines.push('}');
    lines.push('');
  }

  lines.push('SoundEffectGroups {');

  for (const action of GON_ACTIONS) {
    let flist = actionFiles[action] || [];

    // Fallback to Normal if action has no clips
    if (flist.length === 0) {
      const fallback = actionFiles['Normal'] || [];
      flist = fallback.length > 0 ? [fallback[0]] : [];
    }

    if (flist.length === 0) continue;

    const fileList = flist.join(' ');
    lines.push(`    ${action} {`);
    lines.push(`        files [${fileList}]`);
    lines.push(`        #${action.toUpperCase()}_PARAMS`);
    lines.push('    }');
  }

  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate install instructions text for a voice pack.
 */
export function generateInstallInstructions(packName: string): string {
  return `========================================
  MewVoice — Install Guide
========================================

Voice Pack: ${packName}

AUTOMATIC INSTALL (recommended):
---------------------------------
Download install_voicepack.py from MewVoice, then put your
downloaded voice pack ZIPs into a folder and run:

    python install_voicepack.py my_voice_packs/

On first run it saves a vanilla baseline. Every run after that
rebuilds from the baseline — add/remove ZIPs and re-run.

Single ZIP:  python install_voicepack.py ${packName}.zip
Uninstall:   python install_voicepack.py --uninstall


MANUAL INSTALL:
---------------

1. BACKUP your original resources.gpak

2. EXTRACT game resources using the GPAK-Extractor:
   https://github.com/ShootMe/GPAK-Extractor
   Drag resources.gpak onto the exe to unpack.

3. COPY the voice files from this ZIP into the extracted output:
   audio/voices/${packName}.gon
   audio/voices/${packName}/*.wav

4. REGISTER in catgen.gon:
   Open: data/catgen.gon
   Find "voice_sets {{"
   Add:  ${packName} 1

5. REPACK: drag the output folder onto GPAK-Extractor

6. REPLACE original resources.gpak

7. Launch Mewgenics!
`;
}
