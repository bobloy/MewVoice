import { useRef, useEffect, useState } from 'react';
import { AudioClip } from '@/types/voicepack';
import { decodeAudio, trimAudio, validateAudioClip } from '@/lib/audio';
import { convertToGameWav } from '@/lib/audioConverter';

interface TrimModalProps {
  clip: AudioClip;
  onSave: (updatedClip: AudioClip) => void;
  onClose: () => void;
}

// Helper to find silence range
// TODO: Consider making the hardcoded -45dB threshold configurable or adapt it based on the noise floor dynamically.
function getSilenceRange(buffer: AudioBuffer, thresholdDb: number = -45): { start: number; end: number } {
  const data = buffer.getChannelData(0);
  const thresh = Math.pow(10, thresholdDb / 20);
  const step = Math.floor(buffer.sampleRate * 0.01); // 10ms check

  let firstSound = 0;
  let lastSound = data.length;

  // Find start
  for (let i = 0; i < data.length; i += step) {
    let max = 0;
    const end = Math.min(i + step, data.length);
    for (let j = i; j < end; j++) {
      if (Math.abs(data[j]) > max) max = Math.abs(data[j]);
    }
    if (max > thresh) {
      firstSound = i;
      break;
    }
  }

  // Find end
  for (let i = data.length; i > 0; i -= step) {
    const start = Math.max(0, i - step);
    let max = 0;
    for (let j = start; j < i; j++) {
      if (Math.abs(data[j]) > max) max = Math.abs(data[j]);
    }
    if (max > thresh) {
      lastSound = i;
      break;
    }
  }

  return {
    start: firstSound / buffer.sampleRate,
    end: lastSound / buffer.sampleRate
  };
}

export function TrimModal({ clip, onSave, onClose }: TrimModalProps) {
  const [volumeDb, setVolumeDb] = useState(0);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  // Default to full duration until loaded
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(clip.duration);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    decodeAudio(clip.blob).then(b => {
      setBuffer(b);
      // Run auto-trim on load
      const range = getSilenceRange(b);
      // Add a tiny buffer (0.1s)
      const s = Math.max(0, range.start - 0.05);
      const e = Math.min(b.duration, range.end + 0.05);

      setStartTime(s);
      setEndTime(e);
    });
  }, [clip.blob]);

  // ... rest of component ...

  const handleAutoTrim = () => {
    if (!buffer) return;
    const range = getSilenceRange(buffer);
    const s = Math.max(0, range.start - 0.05);
    const e = Math.min(buffer.duration, range.end + 0.05);
    setStartTime(s);
    setEndTime(e);
  };

  // ... rest of renders ...

  // Inside render, add button near Volume
  /*
     <div className="flex justify-between items-center mb-2">
       ... Volume Label ...
       <button onClick={handleAutoTrim} className="text-xs text-mew-accent hover:underline">
         Auto-Trim Silence
       </button>
     </div>
  */


  useEffect(() => {
    // Revoke previous preview URL
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const previewCache = useRef<{
    start: number;
    end: number;
    volume: number;
    url: string;
  } | null>(null);

  const handlePreview = async () => {
    if (!buffer) return;

    // Check cache
    if (
      previewCache.current &&
      previewCache.current.start === startTime &&
      previewCache.current.end === endTime &&
      previewCache.current.volume === volumeDb
    ) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      setIsPlaying(true);
      return;
    }

    setIsPreviewing(true);
    try {
      // 1. Trim to get raw range
      const { blob: trimmedBlob } = await trimAudio(buffer, startTime, endTime);

      // 2. Apply volume adjustment (and normalization) using our converter
      const { convertToGameWav } = await import('@/lib/audioConverter');
      const { wavBlob } = await convertToGameWav(trimmedBlob, volumeDb);

      const url = URL.createObjectURL(wavBlob);

      // Update cache (revoke old if needed, though react effect handles standard revoke)
      if (previewCache.current) {
        // modifying state-managed URL will trigger effect cleanup, 
        // but we want to persist if we just re-use.
        // Actually, if we setPreviewUrl(cachedUrl), effect runs? 
        // No, identical state doesn't trigger effect cleanup.
      }

      previewCache.current = { start: startTime, end: endTime, volume: volumeDb, url };
      setPreviewUrl(url);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      alert('Failed to process audio preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!buffer) return;

    // Optimization: If file is already a WAV (processed) and no changes were made to full range/volume,
    // skip re-processing.
    // Note: buffer.duration might slightly differ from endTime due to floats, so use epsilon.
    const isFullDuration = Math.abs(startTime) < 0.01 && Math.abs(endTime - buffer.duration) < 0.01;
    const isNoVolume = volumeDb === 0;
    const isWav = clip.blob.type === 'audio/wav' || clip.fileName.endsWith('.wav');

    if (isWav && isFullDuration && isNoVolume) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // 1. Trim first to get raw range
      const { blob: trimmedBlob, duration } = await trimAudio(buffer, startTime, endTime);

      // 2. Apply volume adjustment and normalization via our converter
      // We need to import convertToGameWav here or assume onSave handles it.
      // The prompt implies we should pass the volume to onSave or handle it here.
      // Since onSave expects an AudioClip (which holds a blob), we should probably burn the volume into the blob here.

      // We need to import 'convertToGameWav' to apply the gain permanently.
      // Let's dynamically import it or assume it's available or we need to update the import.
      // The current file doesn't import convertToGameWav. I will update imports in a separate step or just update validation tokens.

      // WAIT: The plan says "Update onSave logic to use the new volume parameter in conversion/processing".
      // But onSave takes an AudioClip. So we must produce the final Blob HERE.
      // This file manages the "editing".

      // Let's add the import and use it.
      const { wavBlob } = await convertToGameWav(trimmedBlob, volumeDb);

      // Re-validate the NEW blob
      const validation = validateAudioClip(wavBlob, duration, clip.action);

      onSave({
        ...clip,
        blob: wavBlob, // The new volume-adjusted blob
        duration,
        url: URL.createObjectURL(wavBlob),
        isValid: validation.valid,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save audio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-mew-surface w-full max-w-2xl rounded-2xl border border-mew-border/30 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-mew-text">Edit Clip</h2>
            <button onClick={onClose} className="text-mew-muted hover:text-white transition-colors">✕</button>
          </div>

          <div className="bg-mew-bg rounded-xl p-4 mb-6">
            {buffer ? (
              <WaveformEditor
                buffer={buffer}
                start={startTime}
                end={endTime}
                gainDb={volumeDb}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-mew-muted">
                <span className="animate-pulse">Loading waveform...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex gap-4 items-center">
              <div>
                <span className="text-mew-muted block mb-1">Start</span>
                <span className="text-mew-text font-mono bg-mew-highlight/20 px-2 py-1 rounded">{startTime.toFixed(2)}s</span>
              </div>
              <div>
                <span className="text-mew-muted block mb-1">End</span>
                <span className="text-mew-text font-mono bg-mew-highlight/20 px-2 py-1 rounded">{endTime.toFixed(2)}s</span>
              </div>
              <div>
                <span className="text-mew-muted block mb-1">Duration</span>
                <span className="text-mew-accent font-mono bg-mew-accent/10 px-2 py-1 rounded">{(endTime - startTime).toFixed(2)}s</span>
              </div>
              <button
                onClick={handleAutoTrim}
                className="ml-2 text-[10px] bg-mew-highlight/50 hover:bg-mew-accent hover:text-white text-mew-muted px-2 py-1 rounded transition-colors flex items-center gap-1 h-fit self-end mb-1"
                title="Reset trim sliders to detected sound"
              >
                ✨ Auto-Trim
              </button>
            </div>
          </div>

          <div className="bg-mew-bg/50 rounded-xl p-4 mb-6 hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-mew-text font-medium">Volume Adjustment</span>
              <span className={`font-mono text-sm px-2 py-0.5 rounded ${volumeDb > 0 ? 'text-green-400 bg-green-900/20' : volumeDb < 0 ? 'text-red-400 bg-red-900/20' : 'text-mew-muted'}`}>
                {volumeDb > 0 ? '+' : ''}{volumeDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={volumeDb}
              onChange={(e) => setVolumeDb(Number(e.target.value))}
              className="w-full accent-mew-accent h-2 bg-mew-highlight rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-mew-muted mt-1 font-mono">
              <span>-10dB</span>
              <span>0dB</span>
              <span>+10dB</span>
            </div>
          </div>

          {previewUrl && isPlaying && (
            <audio
              ref={audioRef}
              src={previewUrl}
              autoPlay
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={isPreviewing || !buffer}
              className="flex-1 bg-mew-highlight hover:brightness-125 text-mew-text py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isPlaying ? 'Playing Preview...' : isPreviewing ? 'Processing...' : 'Preview Trim'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !buffer || isPreviewing}
              className="flex-1 bg-mew-accent hover:brightness-125 text-white py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WaveformEditorProps {
  buffer: AudioBuffer;
  start: number;
  end: number;
  gainDb: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
}

function WaveformEditor({ buffer, start, end, gainDb, onStartChange, onEndChange }: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const duration = buffer.duration;
  const gainLinear = Math.pow(10, gainDb / 20);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw waveform
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = '#444'; // Old color

    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j] * gainLinear;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Visual feedback for clipping
      const isClipping = max > 1.0 || min < -1.0;
      ctx.fillStyle = isClipping ? '#ef4444' : '#666'; // Red if clipping, Grey otherwise

      // Flatten for safety if clipping, but visualize the height up to canvas limits
      const drawMin = Math.max(-1.5, min);
      const drawMax = Math.min(1.5, max);

      // Map [-1, 1] to [amp, -amp] (canvas Y is inverted)
      // Actually center is amp. 
      // y = amp + value * amp * -1? No.
      // 0 = center = amp.
      // 1 = top = 0.
      // -1 = bottom = height.
      // val ranges -1 to 1.
      // y = amp - (val * amp)

      // Simplified: height = (max - min) * amp
      // y start = amp - max * amp

      const h = Math.max(1, (drawMax - drawMin) * amp);
      const y = amp - (drawMax * amp);

      ctx.fillRect(i, y, 1, h);
    }

    // Draw active area
    const startX = (start / duration) * canvas.width;
    const endX = (end / duration) * canvas.width;

    ctx.fillStyle = 'rgba(196, 122, 74, 0.3)';
    ctx.fillRect(startX, 0, endX - startX, canvas.height);

    // Draw handles
    ctx.fillStyle = '#C47A4A';
    ctx.fillRect(startX - 2, 0, 4, canvas.height);
    ctx.fillRect(endX - 2, 0, 4, canvas.height);

  }, [buffer, start, end, duration, gainLinear]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;

    const distStart = Math.abs(time - start);
    const distEnd = Math.abs(time - end);

    const isMovingStart = distStart < distEnd;

    const move = (moveEvent: MouseEvent) => {
      const moveX = Math.max(0, Math.min(canvas.width, moveEvent.clientX - rect.left));
      const moveTime = (moveX / canvas.width) * duration;

      if (isMovingStart) {
        onStartChange(Math.min(moveTime, end - 0.05));
      } else {
        onEndChange(Math.max(moveTime, start + 0.05));
      }
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full h-32 cursor-pointer"
        onMouseDown={handleMouseDown}
      />
      <div className="flex justify-between mt-1 text-[10px] text-mew-muted font-mono">
        <span>0s</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
