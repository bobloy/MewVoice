import { useState, useCallback } from 'react';
import {
  VoicePack,
  VoiceAction,
  VoiceGender,
  AudioClip,
  VOICE_ACTIONS,
  CORE_ACTIONS,
  ACTION_RECOMMENDED_CLIPS,
} from '@/types/voicepack';
import { ActionRecorder } from '@/components/recorder/ActionRecorder';
import { uploadVoicePack, publishVoicePack } from '@/lib/api';

function createEmptyClips(): Record<VoiceAction, AudioClip[]> {
  const clips: Partial<Record<VoiceAction, AudioClip[]>> = {};
  for (const action of VOICE_ACTIONS) clips[action] = [];
  return clips as Record<VoiceAction, AudioClip[]>;
}

export function PackBuilder() {
  const [pack, setPack] = useState<VoicePack>({
    name: '',
    author: '',
    gender: 'male',
    description: '',
    clips: createEmptyClips(),
  });

  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'done' | 'error'>('idle');
  const [buildId, setBuildId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const totalClips = Object.values(pack.clips).reduce((sum, arr) => sum + arr.length, 0);
  const missingCore = CORE_ACTIONS.filter((a) => pack.clips[a].length === 0);
  const canBuild = pack.name.trim() !== '' && missingCore.length === 0;
  const meetsRecommended = VOICE_ACTIONS.every(
    (action) => pack.clips[action].length >= ACTION_RECOMMENDED_CLIPS[action].recommended
  );

  const handleAddClip = useCallback((clip: AudioClip) => {
    setPack((prev) => ({
      ...prev,
      clips: {
        ...prev.clips,
        [clip.action]: [...prev.clips[clip.action], clip],
      },
    }));
  }, []);

  const handleRemoveClip = useCallback((action: VoiceAction, clipId: string) => {
    setPack((prev) => ({
      ...prev,
      clips: {
        ...prev.clips,
        [action]: prev.clips[action].filter((c) => c.id !== clipId),
      },
    }));
  }, []);

  const handleBuild = async () => {
    if (!canBuild) return;

    setBuildStatus('building');
    setErrorMsg('');

    try {
      const result = await uploadVoicePack(pack);
      setBuildId(result.id);
      setDownloadUrl(result.downloadUrl);
      setBuildStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Build failed');
      setBuildStatus('error');
    }
  };

  const handlePublish = async () => {
    if (!buildId) return;
    setPublishStatus('publishing');
    try {
      await publishVoicePack(buildId);
      setPublishStatus('published');
    } catch {
      setPublishStatus('error');
    }
  };

  const handleReset = () => {
    setPack({ name: '', author: '', gender: 'male', description: '', clips: createEmptyClips() });
    setBuildStatus('idle');
    setBuildId(null);
    setDownloadUrl(null);
    setPublishStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Pack metadata */}
      <div className="bg-mew-surface rounded-xl p-6 mb-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-4">Voice Pack Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-mew-muted mb-1">Pack Name *</label>
            <input
              type="text"
              value={pack.name}
              onChange={(e) => setPack((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Silly Derp Cat"
              className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent"
              disabled={buildStatus === 'done'}
            />
          </div>
          <div>
            <label className="block text-sm text-mew-muted mb-1">Author</label>
            <input
              type="text"
              value={pack.author}
              onChange={(e) => setPack((p) => ({ ...p, author: e.target.value }))}
              placeholder="Your name"
              className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent"
              disabled={buildStatus === 'done'}
            />
          </div>
          <div>
            <label className="block text-sm text-mew-muted mb-1">Voice Gender</label>
            <select
              value={pack.gender}
              onChange={(e) => setPack((p) => ({ ...p, gender: e.target.value as VoiceGender }))}
              className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text focus:outline-none focus:border-mew-accent"
              disabled={buildStatus === 'done'}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-mew-muted mb-1">Description</label>
            <input
              type="text"
              value={pack.description}
              onChange={(e) => setPack((p) => ({ ...p, description: e.target.value }))}
              placeholder="A goofy cat voice with lots of derp energy"
              className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent"
              disabled={buildStatus === 'done'}
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-mew-surface rounded-xl p-4 mb-6 border border-mew-highlight/30">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-mew-muted">Progress</span>
          <span className="text-mew-text font-medium">{totalClips} clips recorded</span>
        </div>
        <div className="w-full bg-mew-bg rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${meetsRecommended ? 'bg-green-500' : 'bg-mew-accent'}`}
            style={{
              width: `${Math.min(100, (totalClips / (VOICE_ACTIONS.length * 4)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Action recorders */}
      {buildStatus !== 'done' && (
        <div className="space-y-4 mb-8">
          {VOICE_ACTIONS.map((action) => (
            <ActionRecorder
              key={action}
              action={action}
              clips={pack.clips[action]}
              onAddClip={handleAddClip}
              onRemoveClip={(clipId) => handleRemoveClip(action, clipId)}
            />
          ))}
        </div>
      )}

      {/* Build / Download / Publish section */}
      <div className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        {buildStatus === 'done' && downloadUrl ? (
          <div className="text-center space-y-4">
            <p className="text-green-400 text-lg font-bold">Voice pack built successfully!</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={downloadUrl}
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 px-8 rounded-lg font-bold text-lg transition-colors"
              >
                Download ZIP
              </a>

              {publishStatus === 'published' ? (
                <div className="inline-flex items-center justify-center gap-2 bg-mew-highlight text-green-400 py-3 px-8 rounded-lg font-bold text-lg">
                  Published!
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={publishStatus === 'publishing'}
                  className="inline-flex items-center justify-center gap-2 bg-mew-accent hover:bg-mew-accent/80 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 px-8 rounded-lg font-bold text-lg transition-colors"
                >
                  {publishStatus === 'publishing' ? 'Publishing...' : 'Publish to Library'}
                </button>
              )}
            </div>

            {publishStatus === 'error' && (
              <p className="text-red-400 text-sm">Failed to publish. Try again?</p>
            )}

            <button
              onClick={handleReset}
              className="text-mew-muted hover:text-mew-text text-sm underline transition-colors"
            >
              Create another voice pack
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleBuild}
              disabled={buildStatus === 'building' || !canBuild}
              className="w-full bg-mew-accent hover:bg-mew-accent/80 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 px-8 rounded-lg font-bold text-lg transition-colors"
            >
              {buildStatus === 'building' ? 'Building voice pack...' : 'Build Voice Pack'}
            </button>
            {!canBuild && totalClips > 0 && pack.name.trim() && (
              <p className="text-mew-muted text-sm mt-2 text-center">
                Still need clips for: {missingCore.join(', ')}
              </p>
            )}
            {canBuild && !meetsRecommended && (
              <p className="text-yellow-400 text-sm mt-2 text-center">
                Ready to build! Some actions are below the recommended count.
              </p>
            )}
            {errorMsg && <p className="text-red-400 text-sm mt-2 text-center">{errorMsg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
