/**
 * Pitch-shifted audio preview using Web Audio API.
 * Mewgenics applies a ±0.5 pitch range to voice clips in-game.
 * playbackRate of 1.0 = normal, 0.5 = half speed/pitch, 1.5 = 1.5x speed/pitch.
 * The game's "pitch" maps to semitone offsets, but for a quick preview
 * we randomize playbackRate between ~0.7 and ~1.4 (approx ±5 semitones).
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

const decodedCache = new WeakMap<Blob, AudioBuffer>();

export async function playWithRandomPitch(blob: Blob): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  let audioBuffer = decodedCache.get(blob);

  if (!audioBuffer) {
    const arrayBuffer = await blob.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    decodedCache.set(blob, audioBuffer);
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  // Random pitch: ±5 semitones ≈ playbackRate between 0.75 and 1.33
  const semitones = (Math.random() - 0.5) * 10; // -5 to +5
  // TODO: Let this preview component accept limits or configuration (e.g., config for max random semitones).
  source.playbackRate.value = Math.pow(2, semitones / 12);

  source.connect(ctx.destination);
  source.start();
}
