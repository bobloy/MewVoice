import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  VoiceAction,
  AudioClip,
  VOICE_ACTIONS,
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
  /** Normal clips passed to the Sing section for fallback display */
  normalClips?: AudioClip[];
  onAddClip: (clip: AudioClip) => void;
  onRemoveClip: (clipId: string) => void;
  onUpdateClip: (clip: AudioClip) => void;
  onMoveClip: (clipId: string, toAction: VoiceAction) => void;
  onCopyClip: (clipId: string, toAction: VoiceAction, fromAction?: VoiceAction) => void;
}

export function ActionRecorder({ action, clips, normalClips, onAddClip, onRemoveClip, onUpdateClip, onMoveClip, onCopyClip }: ActionRecorderProps) {
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
  const [trimmingClip, setTrimmingClip] = useState<AudioClip | null>(null);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState<string | null>(null);
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

  const handleRecordClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      const s = await prepare();
      if (s) {
        startRecording(s);
      }
    }
  };

  // Auto-keep: when a recording finishes, save it immediately
  useEffect(() => {
    if (!audioBlob || isRecording) return;

    const clipUrl = URL.createObjectURL(audioBlob);
    const validation = validateAudioClip(audioBlob, duration, action);

    const clip: AudioClip = {
      id: generateClipId(),
      action,
      blob: audioBlob,
      url: clipUrl,
      duration,
      fileName: `${action.toLowerCase()}${clips.length + 1}.webm`,
      isValid: validation.valid,
      validationErrors: validation.errors,
      validationWarnings: validation.warnings,
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
        const validation = validateAudioClip(blob, dur, action);

        const clip: AudioClip = {
          id: generateClipId(),
          action,
          blob,
          url,
          duration: dur,
          fileName: file.name,
          isValid: validation.valid,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
        };
        onAddClip(clip);
      }

      setIsUploading(false);
      e.target.value = '';
    },
    [action, onAddClip]
  );

  const recordingLimit = AUDIO_REQUIREMENTS.recordingLimitSec;

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
              className={`flex items-center gap-2 p-2 rounded-lg ${clip.isValid ? 'bg-mew-bg/50' : 'bg-red-900/20 border border-red-800/30'
                }`}
            >
              <span className="text-mew-muted text-xs w-6">#{idx + 1}</span>
              <audio src={clip.url} controls className="h-8 flex-1" />
              <span className="text-xs text-mew-muted">{clip.duration.toFixed(1)}s</span>
              <button
                onClick={() => setTrimmingClip(clip)}
                className="text-mew-muted hover:text-mew-accent text-sm px-1.5 py-0.5 rounded hover:bg-mew-highlight/30 transition-colors"
                title="Edit / Trim"
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

              <div className="relative">
                <button
                  onClick={() => setIsMoveMenuOpen(isMoveMenuOpen === clip.id ? null : clip.id)}
                  className={`text-sm px-1.5 py-0.5 rounded transition-colors ${isMoveMenuOpen === clip.id ? 'text-mew-accent bg-mew-highlight/30' : 'text-mew-muted hover:text-mew-accent hover:bg-mew-highlight/30'}`}
                  title="Move or copy to another category"
                >
                  ➔
                </button>

                {/* TODO: Replace this custom inline dropdown menu with a proper generic Popover component for better accessibility and focus management */}
                {isMoveMenuOpen === clip.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMoveMenuOpen(null)} />

                    <div className="absolute right-0 top-full mt-1 w-40 bg-mew-surface border border-mew-highlight/50 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-mew-muted/60 uppercase tracking-wider border-b border-mew-highlight/20">
                        Move to
                      </div>
                      {VOICE_ACTIONS.filter(a => a !== action).map((targetAction) => (
                        <button
                          key={`move-${targetAction}`}
                          onClick={() => {
                            onMoveClip(clip.id, targetAction);
                            setIsMoveMenuOpen(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs text-mew-text hover:bg-mew-accent/20"
                        >
                          {targetAction}
                        </button>
                      ))}
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-mew-muted/60 uppercase tracking-wider border-t border-b border-mew-highlight/20">
                        Copy to
                      </div>
                      {VOICE_ACTIONS.filter(a => a !== action).map((targetAction) => (
                        <button
                          key={`copy-${targetAction}`}
                          onClick={() => {
                            onCopyClip(clip.id, targetAction);
                            setIsMoveMenuOpen(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs text-mew-text hover:bg-mew-accent/20 last:rounded-b-lg"
                        >
                          {targetAction}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {!clip.isValid ? (
                <span className="text-xs text-red-400">{clip.validationErrors[0]}</span>
              ) : clip.validationWarnings.length > 0 ? (
                <span className="text-xs text-amber-400">{clip.validationWarnings[0]}</span>
              ) : null}
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

      {/* Sing fallback indicator: show which Normal clip the game will use */}
      {action === 'Sing' && clips.length === 0 && normalClips && normalClips.length > 0 && (
        <SingFallbackDisplay normalClips={normalClips} onCopyToSing={onCopyClip} />
      )}

      {/* Record / Upload controls */}
      <div className="flex flex-col gap-3">
        {/* Record + Stop share the same position; Upload hides while recording */}
        <div className="flex gap-3">
          <button
            onClick={handleRecordClick}
            disabled={isPreparing}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${isRecording
              ? 'bg-mew-highlight hover:brightness-125 text-mew-text'
              : 'bg-mew-accent hover:brightness-125 text-white disabled:opacity-50'
              }`}
          >
            {isRecording ? 'Stop' : isPreparing ? 'Preparing Mic...' : 'Record'}
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
                <span className="text-mew-muted"> / {recordingLimit}s</span>
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-mew-highlight/40 rounded-full h-1.5 mb-3">
              <div
                className="h-1.5 rounded-full bg-mew-accent transition-all duration-100"
                style={{ width: `${Math.min(100, (elapsed / recordingLimit) * 100)}%` }}
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

/**
 * Shows which Normal clips will be used as sing fallback, ranked by suitability.
 *
 * TODO: Move this component to its own file or an isolated fallback module to reduce ActionRecorder complexity.
 *
 * Selection logic: shorter Normal clips are better for singing because the game
 * repeats them rapidly at different pitches. We rank by duration (ascending) and
 * highlight the first Normal clip since that's what the GON fallback actually uses.
 */
function SingFallbackDisplay({
  normalClips,
  onCopyToSing,
}: {
  normalClips: AudioClip[];
  onCopyToSing: (clipId: string, toAction: VoiceAction, fromAction?: VoiceAction) => void;
}) {
  // Rank Normal clips by suitability for singing: shorter = better
  const ranked = [...normalClips]
    .map((clip, originalIndex) => ({ clip, originalIndex }))
    .sort((a, b) => a.clip.duration - b.clip.duration);

  // The GON fallback uses Normal[0] (the first Normal clip by order, not by duration)
  const fallbackClipId = normalClips[0]?.id;

  return (
    <div className="mb-4 rounded-lg border border-amber-700/30 bg-amber-900/10 p-3">
      <p className="text-xs text-amber-400 font-medium mb-2">
        No sing clips uploaded — the game will repeat your first Normal clip at
        varying pitches to emulate singing. Shorter clips work best.
      </p>
      <div className="space-y-1.5">
        {ranked.map(({ clip, originalIndex }) => {
          const isFallback = clip.id === fallbackClipId;
          const isShort = clip.duration <= 1.0;
          return (
            <div
              key={clip.id}
              className={`flex items-center gap-2 p-1.5 rounded text-xs ${isFallback
                  ? 'bg-amber-900/30 border border-amber-700/40'
                  : 'bg-mew-bg/30'
                }`}
            >
              <span className="text-mew-muted w-10 flex-shrink-0">
                N#{originalIndex + 1}
              </span>
              <audio src={clip.url} controls className="h-7 flex-1" />
              <span className={`flex-shrink-0 ${isShort ? 'text-green-400' : 'text-mew-muted'}`}>
                {clip.duration.toFixed(1)}s
              </span>
              {isFallback && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-800/50 text-amber-300 flex-shrink-0">
                  active fallback
                </span>
              )}
              {isShort && !isFallback && (
                <span className="text-[10px] text-green-400/70 flex-shrink-0">
                  good fit
                </span>
              )}
              <button
                onClick={() => onCopyToSing(clip.id, 'Sing', 'Normal')}
                className="text-mew-accent hover:text-mew-accent/80 text-[10px] px-1.5 py-0.5 rounded bg-mew-accent/10 hover:bg-mew-accent/20 transition-colors flex-shrink-0"
                title="Copy this clip to Sing"
              >
                Copy to Sing
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
