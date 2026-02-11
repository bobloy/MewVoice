import { useRef, useState, useCallback, useEffect } from 'react';
import { AUDIO_REQUIREMENTS } from '@/types/voicepack';

const MAX_DURATION = AUDIO_REQUIREMENTS.maxDurationSec;

interface UseAudioRecorderReturn {
  isRecording: boolean;
  stream: MediaStream | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  elapsed: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Live timer tick while recording, and auto-stop at max duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        const now = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(now);
        if (now >= MAX_DURATION) {
          setIsRecording(false);
        }
      }, 50);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Actually stop the MediaRecorder when isRecording becomes false
  useEffect(() => {
    if (!isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setElapsed(0);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setDuration(Math.min((Date.now() - startTimeRef.current) / 1000, MAX_DURATION));
        mediaStream.getTracks().forEach((t) => t.stop());
        setStream(null);
        mediaRecorderRef.current = null;
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setStream(mediaStream);
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access microphone. Please allow microphone access.'
      );
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setElapsed(0);
  }, [audioUrl]);

  return {
    isRecording,
    stream,
    audioBlob,
    audioUrl,
    duration,
    elapsed,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  };
}
