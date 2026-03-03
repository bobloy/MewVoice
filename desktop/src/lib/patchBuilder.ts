import type { InstalledVoicePack } from '@/types/manager';

/**
 * Build a merged catgen.gon.patch from enabled voice packs and muted base packs.
 *
 * Uses voice_sets.append semantics — the game engine merges this
 * into the base catgen.gon at load time via Mewtator's modpath system.
 *
 * Rules:
 * - Only includes custom packs with isEnabled === true
 * - Uses pack.id (= description.json title) as the voice set ID
 * - Sorted alphabetically by ID for deterministic output
 * - Muted base packs are included with weight 0 to override defaults
 * - Emits voice_sets.append { ... }, never voice_sets {}
 * - Never reads or merges per-pack patch files
 */
export function buildVoicePatch(
  packs: InstalledVoicePack[],
  mutedBasePacks: string[] = [],
): string {
  const enabled = packs
    .filter((p) => p.isEnabled && !p.isBasePack)
    .sort((a, b) => a.id.localeCompare(b.id));

  const muteEntries = [...mutedBasePacks].sort();

  if (enabled.length === 0 && muteEntries.length === 0) {
    return 'voice_sets.append {\n}\n';
  }

  // GON format requires identifiers to be plain alphanumeric tokens (no whitespace, braces, or quotes).
  const GON_INVALID = /[\s"'{}[\]]/;
  for (const p of enabled) {
    if (GON_INVALID.test(p.id)) {
      throw new Error(`Pack ID "${p.id}" contains characters that are invalid in GON format (no spaces, quotes, or brackets allowed).`);
    }
  }

  const lines: string[] = [];

  for (const id of muteEntries) {
    lines.push(`    ${id} 0`);
  }

  for (const p of enabled) {
    lines.push(`    ${p.id} ${p.frequency}`);
  }

  // TODO: Consider reading any existing catgen.gon.patch and merging lines instead of overwriting, to preserve other mod changes if they exist.
  return `voice_sets.append {\n${lines.join('\n')}\n}\n`;
}

/**
 * Compute spawn probability percentages for each enabled pack.
 * Returns a Map of pack ID → percentage (0-100).
 */
export function computeSpawnDistribution(
  packs: InstalledVoicePack[],
): Map<string, number> {
  const enabled = packs.filter((p) => p.isEnabled);
  const totalFreq = enabled.reduce((sum, p) => sum + p.frequency, 0);
  const dist = new Map<string, number>();

  if (totalFreq === 0) return dist;

  for (const p of enabled) {
    dist.set(p.id, (p.frequency / totalFreq) * 100);
  }

  return dist;
}

/**
 * Simple hash of patch content for dirty detection.
 */
export async function hashPatchContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
