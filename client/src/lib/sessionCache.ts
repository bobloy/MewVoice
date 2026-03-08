/**
 * Persists the current pack-builder session to localStorage so recordings
 * survive an accidental page refresh.
 *
 * Blobs are serialised to base64 strings because localStorage only holds
 * plain text.  Large packs may approach the ~5 MB quota; the save is
 * wrapped in a try/catch so a QuotaExceededError is silently swallowed
 * rather than crashing the app.
 */

import { VoicePack, VoiceAction, VoiceGender, AudioClip, VOICE_ACTIONS } from '@/types/voicepack';

const SESSION_KEY = 'mewvoice_session';

interface SerializedClip {
  id: string;
  action: VoiceAction;
  base64: string;
  mimeType: string;
  duration: number;
  fileName: string;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

interface SerializedSession {
  name: string;
  author: string;
  gender: VoiceGender;
  description: string;
  clips: Record<VoiceAction, SerializedClip[]>;
  savedAt: number;
}

// --- helpers ---

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

// --- public API ---

/** Returns true if a saved session exists in localStorage. */
export function hasSession(): boolean {
  return localStorage.getItem(SESSION_KEY) !== null;
}

/** Returns the ISO date string of the saved session, or null. */
export function sessionSavedAt(): Date | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: SerializedSession = JSON.parse(raw);
    return new Date(parsed.savedAt);
  } catch {
    return null;
  }
}

/** Removes the saved session from localStorage. */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Serialises the pack (including audio blobs) to localStorage.
 * Silently fails if the storage quota is exceeded.
 */
export async function saveSession(pack: VoicePack): Promise<void> {
  const serializedClips: Partial<Record<VoiceAction, SerializedClip[]>> = {};

  for (const action of VOICE_ACTIONS) {
    const clips = pack.clips[action];
    const serialized: SerializedClip[] = [];
    for (const clip of clips) {
      const base64 = await blobToBase64(clip.blob);
      serialized.push({
        id: clip.id,
        action: clip.action,
        base64,
        mimeType: clip.blob.type || 'audio/webm',
        duration: clip.duration,
        fileName: clip.fileName,
        isValid: clip.isValid,
        validationErrors: clip.validationErrors,
        validationWarnings: clip.validationWarnings,
      });
    }
    serializedClips[action] = serialized;
  }

  const session: SerializedSession = {
    name: pack.name,
    author: pack.author,
    gender: pack.gender,
    description: pack.description,
    clips: serializedClips as Record<VoiceAction, SerializedClip[]>,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // QuotaExceededError — too much audio data; fail silently
  }
}

/**
 * Deserialises a previously saved session from localStorage.
 * Returns null if no session exists or parsing fails.
 */
export async function loadSession(): Promise<VoicePack | null> {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session: SerializedSession = JSON.parse(raw);

    const clips: Partial<Record<VoiceAction, AudioClip[]>> = {};
    for (const action of VOICE_ACTIONS) {
      const serializedClips = session.clips[action] ?? [];
      clips[action] = serializedClips.map((sc) => {
        const blob = base64ToBlob(sc.base64, sc.mimeType);
        return {
          id: sc.id,
          action: sc.action,
          blob,
          url: URL.createObjectURL(blob),
          duration: sc.duration,
          fileName: sc.fileName,
          isValid: sc.isValid,
          validationErrors: sc.validationErrors,
          validationWarnings: sc.validationWarnings,
        };
      });
    }

    return {
      name: session.name,
      author: session.author,
      gender: session.gender,
      description: session.description,
      clips: clips as Record<VoiceAction, AudioClip[]>,
    };
  } catch {
    clearSession();
    return null;
  }
}
