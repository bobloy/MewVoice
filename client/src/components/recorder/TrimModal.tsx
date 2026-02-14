import { useRef, useEffect, useState } from 'react';
import { AudioClip } from '@/types/voicepack';
import { decodeAudio, trimAudio, validateAudioClip } from '@/lib/audio';

interface TrimModalProps {
  clip: AudioClip;
  onSave: (updatedClip: AudioClip) => void;
  onClose: () => void;
}

export function TrimModal({ clip, onSave, onClose }: TrimModalProps) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(clip.duration);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    decodeAudio(clip.blob).then(setBuffer);
  }, [clip.blob]);

  useEffect(() => {
    // Revoke previous preview URL
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePreview = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    try {
      const { blob } = await trimAudio(buffer, startTime, endTime);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsPlaying(true);
    } catch (e) {
      alert('Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    try {
      const { blob, duration } = await trimAudio(buffer, startTime, endTime);
      const validation = validateAudioClip(blob, duration);
      
      onSave({
        ...clip,
        blob,
        duration,
        url: URL.createObjectURL(blob),
        isValid: validation.valid,
        validationErrors: validation.errors,
      });
      onClose();
    } catch (e) {
      alert('Failed to save audio');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-mew-surface w-full max-w-2xl rounded-2xl border border-mew-highlight/30 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-mew-text">Trim Clip</h2>
            <button onClick={onClose} className="text-mew-muted hover:text-white transition-colors">✕</button>
          </div>

          <div className="bg-mew-bg rounded-xl p-4 mb-6">
            {buffer ? (
              <WaveformEditor 
                buffer={buffer} 
                start={startTime} 
                end={endTime} 
                onStartChange={setStartTime} 
                onEndChange={setEndTime}
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-mew-muted">
                <span className="animate-pulse">Loading waveform...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6 text-sm">
            <div className="flex gap-4">
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
              disabled={isProcessing || !buffer}
              className="flex-1 bg-mew-highlight hover:brightness-125 text-mew-text py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isPlaying ? 'Playing Preview...' : 'Preview Trim'}
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing || !buffer}
              className="flex-1 bg-mew-accent hover:brightness-125 text-white py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
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
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
}

function WaveformEditor({ buffer, start, end, onStartChange, onEndChange }: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const duration = buffer.duration;

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
    ctx.fillStyle = '#444';
    
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
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

  }, [buffer, start, end]);

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
