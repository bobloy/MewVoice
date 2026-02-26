/**
 * ZIP creation and reading utilities using JSZip.
 */
import JSZip from 'jszip';
import { generateVoiceGon } from './gon';

/**
 * The version of MewVoice that built this pack.
 * Updated by scripts/bump-version.js alongside the desktop app version.
 * The desktop app uses this to verify compatibility when loading a pack.
 */
export const MEWVOICE_TOOL_VERSION = '0.2.3';

export interface BuildMetadata {
  name: string;
  author: string;
  gender: string;
  description: string;
  pack_name: string;
  build_id: string;
  clip_counts: Record<string, number>;
  created_at: string;
  tool_version: string;
}

/**
 * Build a voice pack ZIP in memory.
 * Returns the ZIP as an ArrayBuffer ready for R2 upload.
 */
export async function buildVoicePackZip(
  packName: string,
  metadata: BuildMetadata,
  wavFiles: { action: string; index: number; data: ArrayBuffer }[],
): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // Mewtator metadata and pack metadata
  const mewtatorMeta = {
    name: 'MewVoice Master Mod',
    description: 'Master mod for custom MewVoice packs',
    author: 'MewVoice Community',
    version: '1.0.0',
  };
  zip.file('description.json', JSON.stringify(mewtatorMeta, null, 2));
  zip.file(`metadata_${packName}.json`, JSON.stringify(metadata, null, 2));

  // Group files by action for GON generation
  const actionFiles: Record<string, string[]> = {};
  for (const wf of wavFiles) {
    const wavName = `${wf.action.toLowerCase()}${wf.index}.wav`;
    if (!actionFiles[wf.action]) actionFiles[wf.action] = [];
    actionFiles[wf.action].push(wavName);
    zip.file(`audio/voices/${packName}/${wavName}`, wf.data);
  }

  // .gon file
  const gonContent = generateVoiceGon(
    packName,
    `voices/${packName}`,
    actionFiles,
    metadata.gender === 'female',
  );
  zip.file(`audio/voices/${packName}.gon`, gonContent);

  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

/**
 * List WAV files in a ZIP, optionally filtered by action prefix.
 */
export async function listWavFiles(zipData: ArrayBuffer, actionFilter?: string): Promise<string[]> {
  const zip = await JSZip.loadAsync(zipData);
  const wavFiles: string[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.endsWith('.wav')) return;
    if (actionFilter) {
      const fileName = relativePath.split('/').pop() || '';
      if (!fileName.startsWith(actionFilter.toLowerCase())) return;
    }
    wavFiles.push(relativePath);
  });

  return wavFiles;
}

/**
 * Extract a single file from a ZIP.
 * TODO: Consider migrating to a streaming ZIP parser if pack sizes increase, to reduce memory pressure in the Cloudflare Worker.
 */
export async function extractFile(zipData: ArrayBuffer, filePath: string): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(zipData);
  const file = zip.file(filePath);
  if (!file) throw new Error(`File not found in ZIP: ${filePath}`);
  return file.async('arraybuffer');
}
