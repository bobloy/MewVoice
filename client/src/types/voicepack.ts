/**
 * Voice Pack types matching the Mewgenics GON voice system.
 * 
 * Each voice pack has 9 action categories with multiple WAV variants each.
 * Audio must be: mono, 16-bit, 44100 Hz WAV
 */

export const VOICE_ACTIONS = [
  'Angry',
  'Death',
  'Happy',
  'Hiss',
  'Hit',
  'Normal',
  'Purr',
  'Sad',
  'Sing',
] as const;

export type VoiceAction = typeof VOICE_ACTIONS[number];

export const ACTION_DESCRIPTIONS: Record<VoiceAction, string> = {
  Angry: 'Aggressive meows — when the cat is mad or attacking',
  Death: 'Dying sounds — dramatic, pained vocalizations',
  Happy: 'Cheerful meows — content, excited, or playful',
  Hiss: 'Hissing — defensive, scared, or warning',
  Hit: 'Getting hurt — short, sharp pain reactions',
  Normal: 'Idle meows — casual, everyday vocalizations',
  Purr: 'Purring — relaxed, longer sustained sounds',
  Sad: 'Sad meows — whimpering, lonely, defeated',
  Sing: 'Singing — melodic or drawn-out meow (1 clip is fine)',
};

export const ACTION_RECOMMENDED_CLIPS: Record<VoiceAction, { min: number; max: number }> = {
  Angry: { min: 3, max: 5 },
  Death: { min: 3, max: 5 },
  Happy: { min: 3, max: 5 },
  Hiss: { min: 3, max: 5 },
  Hit: { min: 3, max: 5 },
  Normal: { min: 4, max: 6 },
  Purr: { min: 2, max: 4 },
  Sad: { min: 3, max: 5 },
  Sing: { min: 1, max: 2 },
};

/** Audio format requirements */
export const AUDIO_REQUIREMENTS = {
  sampleRate: 44100,
  channels: 1,       // mono
  bitDepth: 16,
  format: 'wav',
  maxDurationSec: 5,
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
