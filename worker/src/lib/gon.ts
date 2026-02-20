/**
 * GON Voice File Generator for Mewgenics.
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

