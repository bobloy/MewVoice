/**
 * Voice Pack types matching the Mewgenics GON voice system.
 *
 * Each voice pack has 9 action categories with multiple WAV variants each.
 * Audio must be: mono, 16-bit, 44100 Hz WAV
 *
 * Ordered by gameplay frequency / importance, based on analysis of all 186
 * built-in voice packs in the game files.
 */

export const VOICE_ACTIONS = [
  'Normal',
  'Hit',
  'Angry',
  'Happy',
  'Death',
  'Sad',
  'Hiss',
  'Purr',
  'Sing',
] as const;

export type VoiceAction = typeof VOICE_ACTIONS[number];

/** Core actions that every voice pack should have (present in 184+/186 packs) */
export const CORE_ACTIONS: VoiceAction[] = ['Normal', 'Hit', 'Angry', 'Happy', 'Death', 'Sad'];

/** Optional actions (can be skipped without issues) */
export const OPTIONAL_ACTIONS: VoiceAction[] = ['Hiss', 'Purr', 'Sing'];

export const ACTION_DESCRIPTIONS: Record<VoiceAction, string> = {
  Normal: 'Idle meows — casual everyday vocalizations, the bread and butter of your voice (~0.8s each)',
  Hit: 'Taking damage — the shortest clips, quick sharp yelps or squeaks (~0.7s each)',
  Angry: 'Aggressive meows — hissing, growling, or yowling when mad or attacking (~1s each)',
  Happy: 'Cheerful meows — short, bright sounds when content or playful (~1s each)',
  Death: 'Dying sounds — dramatic, drawn-out pain vocalizations. These run longer (~1.8s each)',
  Sad: 'Sad meows — whimpering, whining, lonely sounds (~1.2s each)',
  Hiss: 'Hissing and spitting — defensive warning sounds. Optional, but most packs include them (~1s each)',
  Purr: 'Purring — longer, sustained relaxed sounds. Optional (~1.5s each)',
  Sing: 'Singing — melodic meow. Most packs skip this entirely, totally optional (~0.7s each)',
};

/**
 * Recommended clip counts per action, based on analysis of all 186 built-in
 * voice packs. These are soft recommendations — no hard limits enforced.
 *
 *   action   packs  min  avg   max
 *   Normal   186    1    4.3   7
 *   Hit      186    1    4.5   16
 *   Angry    186    2    4.3   24
 *   Happy    184    2    4.4   8
 *   Death    185    1    4.3   11
 *   Sad      185    2    4.2   8
 *   Hiss     183    2    4.0   9
 *   Purr     183    1    4.1   9
 *   Sing      82    1    1.3   4
 */
export const ACTION_RECOMMENDED_CLIPS: Record<VoiceAction, { recommended: number; gameMin: number; gameMax: number }> = {
  Normal: { recommended: 4, gameMin: 1, gameMax: 7 },
  Hit:    { recommended: 4, gameMin: 1, gameMax: 16 },
  Angry:  { recommended: 4, gameMin: 2, gameMax: 24 },
  Happy:  { recommended: 4, gameMin: 2, gameMax: 8 },
  Death:  { recommended: 4, gameMin: 1, gameMax: 11 },
  Sad:    { recommended: 4, gameMin: 2, gameMax: 8 },
  Hiss:   { recommended: 4, gameMin: 2, gameMax: 9 },
  Purr:   { recommended: 4, gameMin: 1, gameMax: 9 },
  Sing:   { recommended: 1, gameMin: 1, gameMax: 4 },
};

/** Audio format requirements */
export const AUDIO_REQUIREMENTS = {
  sampleRate: 44100,
  channels: 1,       // mono
  bitDepth: 16,
  format: 'wav',
  maxDurationSec: 6,
  maxFileSizeMB: 1,
} as const;

/** A single recorded/uploaded audio clip */
export interface AudioClip {
  id: string;
  action: VoiceAction;
  blob: Blob;
  url: string;          // object URL for playback
  duration: number;     // seconds
  fileName: string;
  isValid: boolean;
  validationErrors: string[];
}

/** Gender flag for the voice pack (affects catgen.gon registration) */
export type VoiceGender = 'male' | 'female' | 'neutral';

/** Complete voice pack state */
export interface VoicePack {
  name: string;
  author: string;
  gender: VoiceGender;
  description: string;
  clips: Record<VoiceAction, AudioClip[]>;
}

/** Pack metadata for the community library */
export interface VoicePackMeta {
  id: string;
  name: string;
  author: string;
  gender: VoiceGender;
  description: string;
  clipCounts: Record<VoiceAction, number>;
  createdAt: string;
  downloads: number;
}
