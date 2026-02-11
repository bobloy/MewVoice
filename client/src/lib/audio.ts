/**
 * Audio utility functions for validation and conversion.
 * The backend handles WAV conversion (webm->wav, resampling, mono mixdown).
 * Client-side we just do basic validation.
 */

import { AUDIO_REQUIREMENTS } from '@/types/voicepack';

export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => reject(new Error('Failed to read audio metadata'));
    audio.src = URL.createObjectURL(blob);
  });
}

export function validateAudioClip(
  blob: Blob,
  duration: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (duration > AUDIO_REQUIREMENTS.maxDurationSec) {
    errors.push(
      `Clip is ${duration.toFixed(1)}s — max is ${AUDIO_REQUIREMENTS.maxDurationSec}s`
    );
  }

  if (duration < 0.1) {
    errors.push('Clip is too short (< 0.1s)');
  }

  const sizeMB = blob.size / (1024 * 1024);
  if (sizeMB > AUDIO_REQUIREMENTS.maxFileSizeMB * 5) {
    // Allow larger source files since server will convert
    errors.push(`File too large (${sizeMB.toFixed(1)}MB)`);
  }

  return { valid: errors.length === 0, errors };
}

export function generateClipId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
