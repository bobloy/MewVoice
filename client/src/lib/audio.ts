/**
 * Audio utility functions for validation and conversion.
 * The backend handles WAV conversion (webm->wav, resampling, mono mixdown).
 * Client-side we just do basic validation.
 */

import { AUDIO_REQUIREMENTS, ACTION_RECOMMENDED_CLIPS, VoiceAction } from '@/types/voicepack';
import { encodeWav } from '@/lib/audioConverter';

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
  duration: number,
  action?: VoiceAction
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isFinite(duration) || duration <= 0) {
    // Duration unknown — skip duration checks, server will validate
    return { valid: true, errors: [], warnings: [] };
  }

  // Warning threshold is either based on game stats for the specific action,
  // or the global fallback.
  const warningThreshold = action 
    ? ACTION_RECOMMENDED_CLIPS[action].durationMax 
    : AUDIO_REQUIREMENTS.warningDurationSec;

  if (duration > AUDIO_REQUIREMENTS.maxDurationSec) {
    errors.push(
      `Clip is ${duration.toFixed(1)}s — max is ${AUDIO_REQUIREMENTS.maxDurationSec}s`
    );
  } else if (duration > warningThreshold) {
    warnings.push(
      `Clip is ${duration.toFixed(1)}s — game max for ${action || 'this type'} is ${warningThreshold.toFixed(1)}s`
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

  return { valid: errors.length === 0, errors, warnings };
}

export function generateClipId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Decode any audio Blob into an AudioBuffer.
 * Resamples to 44100Hz and mixes down to mono.
 */
export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  if (decoded.numberOfChannels === 1 && decoded.sampleRate === 44100) {
    return decoded;
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * 44100),
    44100
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Slice an AudioBuffer and return a new Blob (WAV).
 */
export async function trimAudio(
  audioBuffer: AudioBuffer,
  start: number,
  end: number
): Promise<{ blob: Blob; duration: number }> {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(end * sampleRate);
  const frameCount = Math.max(1, endSample - startSample);

  const trimmedSamples = audioBuffer.getChannelData(0).slice(startSample, endSample);
  const blob = encodeWav(trimmedSamples, sampleRate);

  return {
    blob,
    duration: frameCount / sampleRate,
  };
}
