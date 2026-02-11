/**
 * Audio utility functions for validation and conversion.
 * The backend handles WAV conversion (webm->wav, resampling, mono mixdown).
 * Client-side we just do basic validation.
 */

import { AUDIO_REQUIREMENTS } from '@/types/voicepack';

export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    let resolved = false;

    const done = (dur: number) => {
      if (resolved) return;
      resolved = true;
      URL.revokeObjectURL(url);
      resolve(dur);
    };

    const fail = () => {
      if (resolved) return;
      resolved = true;
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read audio metadata'));
    };

    // If we get a finite duration at any point, use it
    const check = () => {
      if (audio.duration && isFinite(audio.duration)) {
        done(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration)) {
        done(audio.duration);
      } else {
        // WebM blobs often report Infinity here.
        // Seek to a huge time to force the browser to figure out the real duration.
        audio.currentTime = 1e10;
      }
    });

    audio.addEventListener('durationchange', check);
    audio.addEventListener('timeupdate', check);
    audio.addEventListener('seeked', check);
    audio.addEventListener('error', fail);

    // Safety timeout — if the browser can't resolve the duration in 2s,
    // give up and let the caller use its fallback (recorder elapsed time).
    setTimeout(() => {
      if (!resolved) {
        URL.revokeObjectURL(url);
        resolved = true;
        reject(new Error('Duration detection timed out'));
      }
    }, 2000);

    audio.preload = 'metadata';
    audio.src = url;
  });
}

export function validateAudioClip(
  blob: Blob,
  duration: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isFinite(duration) || duration <= 0) {
    // Duration unknown — skip duration checks, server will validate
    return { valid: true, errors: [] };
  }

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
