/**
 * Client-side audio conversion using the Web Audio API.
 * Converts any browser-supported audio format (WebM, MP4/AAC, MP3, WAV, etc.)
 * to mono 16-bit PCM 44100 Hz WAV — the format required by Mewgenics.
 *
 * This replaces the server-side pydub/ffmpeg pipeline, enabling deployment
 * to Cloudflare Workers where native binaries can't run.
 */

const TARGET_SAMPLE_RATE = 44100;
const TARGET_CHANNELS = 1;
const TARGET_DBFS = -1.0; // Boosted to -1.0dBFS peak for game-ready loudness
const MIN_DURATION = 0.05;
const MAX_DURATION = 8;

export interface ConversionResult {
  wavBlob: Blob;
  originalDuration: number;
  outputDuration: number;
}

/**
 * Convert an audio Blob to game-ready mono 16-bit 44100 Hz WAV.
 * Performs resampling, mono mixdown, normalization, and silence trimming.
 * 
 * @param blob The input audio blob
 * @param volumeAdjustmentDb Optional manual volume adjustment in dB. 
 *                           Applied by shifting the normalization target.
 *                           (e.g. +5dB means normalize to -15dBFS instead of -20dBFS)
 */
export async function convertToGameWav(blob: Blob, volumeAdjustmentDb: number = 0): Promise<ConversionResult> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode transformation
  const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const originalDuration = decoded.duration;

  if (originalDuration < MIN_DURATION) {
    throw new Error(`Audio too short (${originalDuration.toFixed(2)}s). Minimum is ${MIN_DURATION}s.`);
  }
  if (originalDuration > MAX_DURATION) {
    throw new Error(`Audio too long (${originalDuration.toFixed(2)}s). Maximum is ${MAX_DURATION}s.`);
  }

  // Resample & Mix Down
  const offlineCtx = new OfflineAudioContext(
    TARGET_CHANNELS,
    Math.ceil(decoded.duration * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE,
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();

  // Get samples
  let samples = rendered.getChannelData(0);

  // 1. Normalize based on PEAK + Adjustment
  // Base target is -20dB. Adjustment shifts this up or down.
  const targetPeakDbfs = TARGET_DBFS + volumeAdjustmentDb;

  // Hard cap to prevent clipping (never go above -0.5dB even if user asks for +100dB)
  const MAX_SAFE_PEAK = -0.5;
  const effectiveTarget = Math.min(targetPeakDbfs, MAX_SAFE_PEAK);

  samples = normalizeToPeak(samples, effectiveTarget);

  const outputDuration = samples.length / TARGET_SAMPLE_RATE;

  // Encode
  const wavBlob = encodeWav(samples, TARGET_SAMPLE_RATE);

  return { wavBlob, originalDuration, outputDuration };
}

/**
 * Normalize audio samples to a target Peak dBFS level.
 */
function normalizeToPeak(samples: Float32Array, targetDbfs: number): Float32Array {
  // Find current peak
  let maxVal = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxVal) maxVal = abs;
  }

  if (maxVal === 0) return samples; // Silence

  const currentDbfs = 20 * Math.log10(maxVal);
  const gainDb = targetDbfs - currentDbfs;
  const gainLinear = Math.pow(10, gainDb / 20);

  // Apply gain
  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] essentially acts as a hard limiter if calculation was off, 
    // but normalizeToPeak shouldn't overshoot.
    samples[i] = Math.max(-1, Math.min(1, samples[i] * gainLinear));
  }
  return samples;
}


/**
 * Encode Float32 samples as a 16-bit PCM WAV file.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const headerLength = 44;
  const buffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);              // chunk size
  view.setUint16(20, 1, true);               // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true);             // block align
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples (convert float32 to int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Dithering could be added here for extra quality, but rounding is ok for now
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
