import { useState, useCallback } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  VoiceAction,
  AudioClip,
  ACTION_DESCRIPTIONS,
  ACTION_RECOMMENDED_CLIPS,
} from '@/types/voicepack';
import { validateAudioClip, generateClipId, getAudioDuration } from '@/lib/audio';

interface ActionRecorderProps {
  action: VoiceAction;
  clips: AudioClip[];
  onAddClip: (clip: AudioClip) => void;
  onRemoveClip: (clipId: string) => void;
}

export function ActionRecorder({ action, clips, onAddClip, onRemoveClip }: ActionRecorderProps) {
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, clearRecording, error } =
    useAudioRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const recommended = ACTION_RECOMMENDED_CLIPS[action];
  const isFull = clips.length >= recommended.max;

  const handleSaveRecording = useCallback(async () => {
    if (!audioBlob || !audioUrl) return;

    const actualDuration = await getAudioDuration(audioBlob).catch(() => duration);
    const validation = validateAudioClip(audioBlob, actualDuration);

    const clip: AudioClip = {
      id: generateClipId(),
      action,
      blob: audioBlob,
      url: audioUrl,
      duration: actualDuration,
      fileName: `${action.toLowerCase()}${clips.length + 1}.webm`,
      isValid: validation.valid,
      validationErrors: validation.errors,
    };

    onAddClip(clip);
    clearRecording();
  }, [audioBlob, audioUrl, duration, action, clips.length, onAddClip, clearRecording]);

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

  const meetsMinimum = clips.length >= recommended.min;

  return (
    <div className="bg-mew-surface rounded-xl p-5 border border-mew-highlight/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-mew-accent">{action}</h3>
        <span
          className={`text-sm px-2 py-0.5 rounded-full ${
            meetsMinimum ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
          }`}
        >
          {clips.length}/{recommended.min}–{recommended.max}
        </span>
      </div>
      <p className="text-mew-muted text-sm mb-4">{ACTION_DESCRIPTIONS[action]}</p>

      {/* Existing clips */}
      {clips.length > 0 && (
        <div className="space-y-2 mb-4">
          {clips.map((clip, idx) => (
            <div
              key={clip.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                clip.isValid ? 'bg-mew-bg/50' : 'bg-red-900/20 border border-red-800/30'
              }`}
            >
              <span className="text-mew-muted text-xs w-6">#{idx + 1}</span>
              <audio src={clip.url} controls className="h-8 flex-1" />
              <span className="text-xs text-mew-muted">{clip.duration.toFixed(1)}s</span>
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
      {!isFull && (
        <div className="flex gap-3">
          {!isRecording && !audioBlob && (
            <>
              <button
                onClick={startRecording}
                className="flex-1 bg-mew-accent hover:bg-mew-accent/80 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                🎤 Record
              </button>
              <label className="flex-1 bg-mew-highlight hover:bg-mew-highlight/80 text-white py-2 px-4 rounded-lg font-medium text-center cursor-pointer transition-colors">
                📁 Upload
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg font-medium animate-pulse transition-colors"
            >
              ⏹ Stop Recording
            </button>
          )}

          {audioBlob && !isRecording && (
            <div className="flex gap-2 flex-1">
              <audio src={audioUrl!} controls className="h-10 flex-1" />
              <button
                onClick={handleSaveRecording}
                className="bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded-lg text-sm transition-colors"
              >
                ✓ Keep
              </button>
              <button
                onClick={clearRecording}
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded-lg text-sm transition-colors"
              >
                ✕ Redo
              </button>
            </div>
          )}
        </div>
      )}

      {isFull && (
        <p className="text-mew-muted text-sm italic">Maximum clips reached for this action.</p>
      )}

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
