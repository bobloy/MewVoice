/** A voice pack installed in the Mewtator mod folder */
export interface InstalledVoicePack {
  /** MUST equal description.json title — the game's voice_set ID */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Filesystem folder name under audio/voices/ */
  folderName: string;
  /** Voice .gon filename (e.g. "cool_cat.gon") */
  gonFileName: string;
  author: string;
  gender: 'male' | 'female';
  description: string;
  /** Include in generated catgen.gon.patch? */
  isEnabled: boolean;
  /** Catgen weight — higher = more likely to spawn (default: 1) */
  frequency: number;
  /** True = from base game/mod (read-only, future use) */
  isBasePack: boolean;
  /** ISO timestamp */
  installedAt: string;
  /** Optional clip counts from metadata */
  clipCounts?: Record<string, number>;
}

/** Full app state, persisted locally as JSON */
export interface AppState {
  packs: InstalledVoicePack[];
  /** Root of Mewtator mods directory, e.g. .../Mewgenics/mods/ */
  mewtatorModRoot: string | null;
  /** Auto-regenerate patch on any change (default: false) */
  autoSync: boolean;
  /** SHA-256 hash of last written patch file for dirty detection */
  lastPatchHash: string | null;
}

/** Create a fresh default state */
export function createDefaultState(): AppState {
  return {
    packs: [],
    mewtatorModRoot: null,
    autoSync: false,
    lastPatchHash: null,
  };
}
