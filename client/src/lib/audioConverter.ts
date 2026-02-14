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
const TARGET_DBFS = -20;
const SILENCE_THRESH_DBFS = -45;
const MIN_DURATION = 0.05;
const MAX_DURATION = 10;

export interface ConversionResult {
  wavBlob: Blob;
  originalDuration: number;
  outputDuration: number;
}

/**
 * Convert an audio Blob to game-ready mono 16-bit 44100 Hz WAV.
 * Performs resampling, mono mixdown, normalization, and silence trimming.
 */
export async function convertToGameWav(blob: Blob): Promise<ConversionResult> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode the source audio into an AudioBuffer using any codec the browser supports
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

  // Resample to target sample rate and mix down to mono using OfflineAudioContext
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

  // Get the mono channel data (float32 samples, -1 to 1)
  let samples = rendered.getChannelData(0);

  // Normalize to target dBFS
  samples = normalize(samples, TARGET_DBFS);

  // Trim silence
  samples = trimSilence(samples, SILENCE_THRESH_DBFS);

  const outputDuration = samples.length / TARGET_SAMPLE_RATE;

  // Encode as 16-bit PCM WAV
  const wavBlob = encodeWav(samples, TARGET_SAMPLE_RATE);

  return { wavBlob, originalDuration, outputDuration };
}

/**
 * Normalize audio samples to a target dBFS level.
 */
function normalize(samples: Float32Array, targetDbfs: number): Float32Array {
  // Compute RMS
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);

  if (rms === 0) return samples; // silence, nothing to normalize

  const currentDbfs = 20 * Math.log10(rms);
  const gainDb = targetDbfs - currentDbfs;
  const gainLinear = Math.pow(10, gainDb / 20);

  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] after gain
    normalized[i] = Math.max(-1, Math.min(1, samples[i] * gainLinear));
  }
  return normalized;
}

/**
 * Trim leading and trailing silence from audio samples.
 */
function trimSilence(samples: Float32Array, threshDbfs: number): Float32Array {
  const threshLinear = Math.pow(10, threshDbfs / 20);
  const chunkSize = Math.floor(TARGET_SAMPLE_RATE * 0.01); // 10ms chunks

  let startSample = 0;
  for (let i = 0; i < samples.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, samples.length);
    let chunkRms = 0;
    for (let j = i; j < end; j++) {
      chunkRms += samples[j] * samples[j];
    }
    chunkRms = Math.sqrt(chunkRms / (end - i));
    if (chunkRms > threshLinear) {
      startSample = Math.max(0, i - chunkSize);
      break;
    }
  }

  let endSample = samples.length;
  for (let i = samples.length; i > 0; i -= chunkSize) {
    const start = Math.max(i - chunkSize, 0);
    let chunkRms = 0;
    for (let j = start; j < i; j++) {
      chunkRms += samples[j] * samples[j];
    }
    chunkRms = Math.sqrt(chunkRms / (i - start));
    if (chunkRms > threshLinear) {
      endSample = Math.min(samples.length, i + chunkSize);
      break;
    }
  }

  const trimmed = samples.slice(startSample, endSample);

  // If trimming removed too much, return original
  if (trimmed.length < TARGET_SAMPLE_RATE * 0.05) {
    return samples;
  }

  return trimmed;
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
