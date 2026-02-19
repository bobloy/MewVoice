import type { InstalledVoicePack } from '@/types/manager';

/**
 * Build a merged catgen.gon.patch from enabled voice packs.
 *
 * Uses voice_sets.append semantics — the game engine merges this
 * into the base catgen.gon at load time via Mewtator's modpath system.
 *
 * Rules:
 * - Only includes packs with isEnabled === true
 * - Uses pack.id (= description.json title) as the voice set ID
 * - Sorted alphabetically by ID for deterministic output
 * - Emits voice_sets.append { ... }, never voice_sets {}
 * - Never reads or merges per-pack patch files
 */
export function buildVoicePatch(packs: InstalledVoicePack[]): string {
  const enabled = packs
    .filter((p) => p.isEnabled && !p.isBasePack)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (enabled.length === 0) {
    return 'voice_sets.append {\n}\n';
  }

  const entries = enabled
    .map((p) => `    ${p.id} ${p.frequency}`)
    .join('\n');

  return `voice_sets.append {\n${entries}\n}\n`;
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
