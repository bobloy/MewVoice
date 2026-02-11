import { useRef, useEffect } from 'react';

interface LiveWaveformProps {
  stream: MediaStream;
  barColor?: string;
  height?: number;
}

/**
 * Lightweight live audio waveform using Web Audio AnalyserNode.
 * Draws frequency bars on a canvas while a MediaStream is active.
 */
export function LiveWaveform({ stream, barColor = '#e94560', height = 48 }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    contextRef.current = audioCtx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = 3;
      const gap = 2;
      const totalBarWidth = barWidth + gap;
      const barCount = Math.floor(w / totalBarWidth);
      // Sample evenly across the frequency data
      const step = bufferLength / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * step);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * h;

        ctx.fillStyle = barColor;
        ctx.fillRect(
          i * totalBarWidth,
          h - barHeight,
          barWidth,
          barHeight
        );
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream, barColor]);

  // Resize canvas to match container width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          canvas.width = w * window.devicePixelRatio;
          canvas.height = height * window.devicePixelRatio;
        }
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px` }}
      className="rounded"
    />
  );
}
