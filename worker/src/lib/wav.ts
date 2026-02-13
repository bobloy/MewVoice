/**
 * WAV header validation for Cloudflare Worker.
 * Validates that uploaded files are mono 16-bit 44100 Hz PCM WAV.
 */

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  duration: number;
  dataSize: number;
}

/**
 * Parse and validate a WAV file header.
 * Returns info on success, throws on invalid format.
 */
export function validateWav(data: ArrayBuffer): WavInfo {
  if (data.byteLength < 44) {
    throw new Error('File too small to be a valid WAV');
  }

  const view = new DataView(data);

  // RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    throw new Error('Not a WAV file (missing RIFF header)');
  }

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') {
    throw new Error('Not a WAV file (missing WAVE format)');
  }

  // fmt chunk
  const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
  if (fmt !== 'fmt ') {
    throw new Error('Invalid WAV (missing fmt chunk)');
  }

  const audioFormat = view.getUint16(20, true);
  if (audioFormat !== 1) {
    throw new Error(`Invalid WAV format (expected PCM=1, got ${audioFormat})`);
  }

  const channels = view.getUint16(22, true);
  if (channels !== 1) {
    throw new Error(`Expected mono (1 channel), got ${channels} channels`);
  }

  const sampleRate = view.getUint32(24, true);
  if (sampleRate !== 44100) {
    throw new Error(`Expected 44100 Hz sample rate, got ${sampleRate} Hz`);
  }

  const bitsPerSample = view.getUint16(34, true);
  if (bitsPerSample !== 16) {
    throw new Error(`Expected 16-bit audio, got ${bitsPerSample}-bit`);
  }

  // Find data chunk (may not be at offset 36 if there are extra chunks)
  let dataOffset = 36;
  let dataSize = 0;
  while (dataOffset < data.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(dataOffset), view.getUint8(dataOffset + 1),
      view.getUint8(dataOffset + 2), view.getUint8(dataOffset + 3),
    );
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  if (dataSize === 0) {
    throw new Error('Invalid WAV (missing data chunk)');
  }

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataSize / (channels * bytesPerSample);
  const duration = numSamples / sampleRate;

  if (duration < 0.05) {
    throw new Error(`Audio too short (${duration.toFixed(2)}s). Minimum is 0.05s.`);
  }
  if (duration > 10) {
    throw new Error(`Audio too long (${duration.toFixed(2)}s). Maximum is 10s.`);
  }

  return { sampleRate, channels, bitsPerSample, duration, dataSize };
}
