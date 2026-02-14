import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  VoiceAction,
  AudioClip,
  ACTION_DESCRIPTIONS,
  ACTION_RECOMMENDED_CLIPS,
  CORE_ACTIONS,
  AUDIO_REQUIREMENTS,
} from '@/types/voicepack';
import { validateAudioClip, generateClipId, getAudioDuration } from '@/lib/audio';
import { playWithRandomPitch } from '@/lib/pitchPreview';
import { LiveWaveform } from '@/components/recorder/LiveWaveform';
import { TrimModal } from '@/components/recorder/TrimModal';

interface ActionRecorderProps {
  action: VoiceAction;
  clips: AudioClip[];
  onAddClip: (clip: AudioClip) => void;
  onRemoveClip: (clipId: string) => void;
  onUpdateClip: (clip: AudioClip) => void;
}

export function ActionRecorder({ action, clips, onAddClip, onRemoveClip, onUpdateClip }: ActionRecorderProps) {
  const {
    isRecording,
    stream,
    audioBlob,
    duration,
    elapsed,
    prepare,
    startRecording,
    stopRecording,
    clearRecording,
    isPreparing,
    error,
  } = useAudioRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<AudioClip | null>(null);
  const info = ACTION_RECOMMENDED_CLIPS[action];
  const isCore = CORE_ACTIONS.includes(action);
  const meetsRecommended = clips.length >= info.recommended;
  const meetsMinimum = clips.length >= info.gameMin;

  // Green: recommended reached, Amber: below recommended, Red: below minimum on required
  const badgeClass = meetsRecommended
    ? 'bg-green-900/40 text-green-400'
    : !meetsMinimum && isCore
      ? 'bg-red-900/40 text-red-400'
      : 'bg-amber-900/40 text-amber-400';

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      startRecording();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, startRecording]);

  const handleRecordClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setCountdown(3);
      await prepare();
    }
  };

  // Auto-keep: when a recording finishes, save it immediately
  useEffect(() => {
    if (!audioBlob || isRecording) return;

    const clipUrl = URL.createObjectURL(audioBlob);
    const validation = validateAudioClip(audioBlob, duration);

    const clip: AudioClip = {
      id: generateClipId(),
      action,
      blob: audioBlob,
      url: clipUrl,
      duration,
      fileName: `${action.toLowerCase()}${clips.length + 1}.webm`,
      isValid: validation.valid,
      validationErrors: validation.errors,
    };

    onAddClip(clip);
    clearRecording();
  }, [audioBlob, isRecording]);

  const handleSaveTrim = (updatedClip: AudioClip) => {
    onUpdateClip(updatedClip);
    setTrimmingClip(null);
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setIsUploading(true);

      for (const file of Array.from(files)) {
        const blob = file as Blob;
        const url = URL.createObjectURL(blob);
        const dur = await getAudioDuration(blob).catch(() => 0);
        const validation = validateAudioClip(blob, dur);

        const clip: AudioClip = {
          id: generateClipId(),
          action,
          blob,
          url,
          duration: dur,
          fileName: file.name,
          isValid: validation.valid,
          validationErrors: validation.errors,
        };
        onAddClip(clip);
      }

      setIsUploading(false);
      e.target.value = '';
    },
    [action, onAddClip]
  );

  const maxDur = AUDIO_REQUIREMENTS.maxDurationSec;

  return (
    <div className="bg-mew-surface rounded-xl p-5 border border-mew-highlight/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-mew-accent">{action}</h3>
        <span className={`text-sm px-2 py-0.5 rounded-full ${badgeClass}`}>
          {clips.length} / {info.recommended} rec
        </span>
      </div>
      <p className="text-mew-muted text-sm mb-4">
        {ACTION_DESCRIPTIONS[action]}
      </p>

      {/* Existing clips */}
      {clips.length > 0 && (
        <div className="space-y-2 mb-4">
          {clips.map((clip, idx) => (
            <div
              key={clip.id}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                clip.isValid ? 'bg-mew-bg/50' : 'bg-red-900/20 border border-red-800/30'
              }`}
            >
              <span className="text-mew-muted text-xs w-6">#{idx + 1}</span>
              <audio src={clip.url} controls className="h-8 flex-1" />
              <span className="text-xs text-mew-muted">{clip.duration.toFixed(1)}s</span>
              <button
                onClick={() => setTrimmingClip(clip)}
                className="text-mew-muted hover:text-mew-accent text-sm px-1.5 py-0.5 rounded hover:bg-mew-highlight/30 transition-colors"
                title="Trim clip"
              >
                ✂️
              </button>
              <button
                onClick={() => playWithRandomPitch(clip.blob)}
                className="text-mew-muted hover:text-mew-accent text-sm px-1.5 py-0.5 rounded hover:bg-mew-highlight/30 transition-colors"
                title="Preview with random pitch (simulates in-game sound)"
              >
                🎲
              </button>
              {!clip.isValid && (
                <span className="text-xs text-red-400">{clip.validationErrors[0]}</span>
              )}
              <button
                onClick={() => onRemoveClip(clip.id)}
                className="text-red-400 hover:text-red-300 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Record / Upload controls */}
      <div className="flex flex-col gap-3">
        {/* Record + Stop share the same position; Upload hides while recording */}
        <div className="flex gap-3">
          <button
            onClick={handleRecordClick}
            disabled={isPreparing || countdown !== null}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              isRecording
                ? 'bg-mew-highlight hover:brightness-125 text-mew-text'
                : 'bg-mew-accent hover:brightness-125 text-white disabled:opacity-50'
            }`}
          >
            {isRecording ? 'Stop' : countdown !== null ? `Starting in ${countdown}...` : isPreparing ? 'Preparing Mic...' : 'Record'}
          </button>
          {!isRecording && (
            <label className="flex-1 bg-mew-highlight hover:brightness-125 text-mew-text py-2 px-4 rounded-lg font-medium text-center cursor-pointer transition-all">
              Upload
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          )}
        </div>

        {/* Waveform + timer (visible while recording) */}
        {isRecording && (
          <div className="bg-mew-bg/60 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mew-accent animate-pulse" />
                <span className="text-sm font-medium text-mew-accent">Recording</span>
              </div>
              <span className="text-sm font-mono text-mew-text">
                {elapsed.toFixed(1)}s
                <span className="text-mew-muted"> / {maxDur}s</span>
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-mew-highlight/40 rounded-full h-1.5 mb-3">
              <div
                className="h-1.5 rounded-full bg-mew-accent transition-all duration-100"
                style={{ width: `${Math.min(100, (elapsed / maxDur) * 100)}%` }}
              />
            </div>

            {/* Live waveform visualizer */}
            {stream && <LiveWaveform stream={stream} />}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {trimmingClip && (
        <TrimModal
          clip={trimmingClip}
          onSave={handleSaveTrim}
          onClose={() => setTrimmingClip(null)}
        />
      )}
    </div>
  );
}
