import { useState, useCallback, useEffect } from 'react';
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
import { convertToGameWav } from '@/lib/audioConverter';
import { useAuth } from '@/hooks/useAuth';

function createEmptyClips(): Record<VoiceAction, AudioClip[]> {
  const clips: Partial<Record<VoiceAction, AudioClip[]>> = {};
  for (const action of VOICE_ACTIONS) clips[action] = [];
  return clips as Record<VoiceAction, AudioClip[]>;
}

export function PackBuilder() {
  const { user, login } = useAuth();

  const [pack, setPack] = useState<VoicePack>({
    name: '',
    author: '',
    gender: 'male',
    description: '',
    clips: createEmptyClips(),
  });

  // Auto-fill author from Steam name when user logs in and author is empty
  useEffect(() => {
    if (user && !pack.author) {
      setPack((p) => ({ ...p, author: user.personaName }));
    }
  }, [user]);

  const [buildStatus, setBuildStatus] = useState<'idle' | 'converting' | 'building' | 'done' | 'error'>('idle');
  const [conversionProgress, setConversionProgress] = useState({ done: 0, total: 0 });
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

  const handleUpdateClip = useCallback((updatedClip: AudioClip) => {
    setPack((prev) => ({
      ...prev,
      clips: {
        ...prev.clips,
        [updatedClip.action]: prev.clips[updatedClip.action].map((c) =>
          c.id === updatedClip.id ? updatedClip : c
        ),
      },
    }));
  }, []);

  const handleMoveClip = useCallback((clipId: string, fromAction: VoiceAction, toAction: VoiceAction) => {
    setPack((prev) => {
      const clipToMove = prev.clips[fromAction].find(c => c.id === clipId);
      if (!clipToMove) return prev;

      // Update action in clip object
      const movedClip = { ...clipToMove, action: toAction };

      return {
        ...prev,
        clips: {
          ...prev.clips,
          [fromAction]: prev.clips[fromAction].filter(c => c.id !== clipId),
          [toAction]: [...prev.clips[toAction], movedClip],
        }
      };
    });
  }, []);

  const handleCopyClip = useCallback((clipId: string, fromAction: VoiceAction, toAction: VoiceAction) => {
    setPack((prev) => {
      const clipToCopy = prev.clips[fromAction].find(c => c.id === clipId);
      if (!clipToCopy) return prev;

      const copiedClip: AudioClip = {
        ...clipToCopy,
        id: `${clipToCopy.id}_copy_${Date.now()}`,
        action: toAction,
      };

      return {
        ...prev,
        clips: {
          ...prev.clips,
          [toAction]: [...prev.clips[toAction], copiedClip],
        }
      };
    });
  }, []);



  const handleBuild = async () => {
    if (!canBuild) return;

    setErrorMsg('');

    // Phase 1: Convert all clips to WAV client-side
    setBuildStatus('converting');
    const allClips: { action: VoiceAction; clip: AudioClip }[] = [];
    for (const [action, clips] of Object.entries(pack.clips)) {
      for (const clip of clips) {
        allClips.push({ action: action as VoiceAction, clip });
      }
    }
    setConversionProgress({ done: 0, total: allClips.length });

    const convertedClips: Record<string, { blob: Blob; action: string }[]> = {};
    try {
      for (let i = 0; i < allClips.length; i++) {
        const { action, clip } = allClips[i];
        const { wavBlob } = await convertToGameWav(clip.blob);
        if (!convertedClips[action]) convertedClips[action] = [];
        convertedClips[action].push({ blob: wavBlob, action });
        setConversionProgress({ done: i + 1, total: allClips.length });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Audio conversion failed');
      setBuildStatus('error');
      return;
    }

    // Phase 2: Build a VoicePack with WAV blobs and upload
    setBuildStatus('building');
    try {
      const wavPack: VoicePack = {
        ...pack,
        clips: Object.fromEntries(
          VOICE_ACTIONS.map((action) => [
            action,
            (convertedClips[action] || []).map((c, idx) => ({
              ...pack.clips[action][idx],
              blob: c.blob,
              fileName: `${action}_${idx + 1}.wav`,
            })),
          ]),
        ) as Record<VoiceAction, AudioClip[]>,
      };
      const result = await uploadVoicePack(wavPack);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      if (msg.includes('Login required')) {
        setErrorMsg('You need to sign in with Steam to publish.');
      } else {
        setErrorMsg(msg);
      }
      setPublishStatus('error');
    }
  };

  const handleReset = () => {
    setPack({
      name: '',
      author: user?.personaName || '',
      gender: 'male',
      description: '',
      clips: createEmptyClips(),
    });
    setBuildStatus('idle');
    setBuildId(null);
    setDownloadUrl(null);
    setPublishStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Pack metadata — hidden after build since ZIP is already created */}
      {buildStatus !== 'done' && (
        <>
          <div className="bg-mew-surface rounded-xl p-6 mb-6 border border-mew-highlight/30">
            <h2 className="text-2xl font-bold mb-4">Voice Pack Info</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-mew-muted mb-1">Pack Name *</label>
                  <input
                    type="text"
                    value={pack.name}
                    onChange={(e) => setPack((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Silly Derp Cat"
                    maxLength={50}
                    className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-mew-muted mb-1">Voice Gender</label>
                  <select
                    value={pack.gender}
                    onChange={(e) => setPack((p) => ({ ...p, gender: e.target.value as VoiceGender }))}
                    className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text focus:outline-none focus:border-mew-accent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-mew-muted">Description</label>
                  <span className={`text-xs ${pack.description.length > 180 ? 'text-amber-400' : 'text-mew-muted/50'}`}>
                    {pack.description.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  value={pack.description}
                  onChange={(e) => setPack((p) => ({ ...p, description: e.target.value }))}
                  placeholder="A goofy cat voice with lots of derp energy"
                  maxLength={200}
                  className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg px-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent"
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
        </>
      )}

      {/* Action recorders */}
      {buildStatus !== 'done' && (
        <div className="space-y-4 mb-8">
          {VOICE_ACTIONS.map((action) => (
            <ActionRecorder
              key={action}
              action={action}
              clips={pack.clips[action]}
              normalClips={action === 'Sing' ? pack.clips.Normal : undefined}
              onAddClip={handleAddClip}
              onRemoveClip={(clipId) => handleRemoveClip(action, clipId)}
              onUpdateClip={handleUpdateClip}
              onMoveClip={(clipId, toAction) => handleMoveClip(clipId, action, toAction)}
              onCopyClip={(clipId, toAction, fromAction) => handleCopyClip(clipId, fromAction || action, toAction)}
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
                className="inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-3 px-8 rounded-lg font-bold text-lg transition-colors"
              >
                Download ZIP
              </a>

              {publishStatus === 'published' ? (
                <div className="inline-flex items-center justify-center gap-2 bg-green-900/30 text-green-400 py-3 px-8 rounded-lg font-bold text-lg">
                  Published!
                </div>
              ) : user ? (
                <button
                  onClick={handlePublish}
                  disabled={publishStatus === 'publishing'}
                  className="inline-flex items-center justify-center gap-2 bg-mew-accent hover:brightness-125 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 px-8 rounded-lg font-bold text-lg transition-all"
                >
                  {publishStatus === 'publishing' ? 'Publishing...' : 'Publish to Library'}
                </button>
              ) : (
                <button onClick={login} className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <img
                    src="https://community.fastly.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
                    alt="Sign in through Steam"
                    height="35"
                  />
                  <span className="text-mew-muted text-sm">to publish</span>
                </button>
              )}
            </div>

            {publishStatus === 'error' && (
              <p className="text-red-400 text-sm">{errorMsg || 'Failed to publish. Try again?'}</p>
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
              disabled={buildStatus === 'building' || buildStatus === 'converting' || !canBuild}
              className="w-full bg-mew-accent hover:brightness-125 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 px-8 rounded-lg font-bold text-lg transition-all"
            >
              {buildStatus === 'converting'
                ? `Converting audio... (${conversionProgress.done}/${conversionProgress.total})`
                : buildStatus === 'building'
                  ? 'Uploading...'
                  : 'Build Voice Pack'}
            </button>
            {!canBuild && (
              <p className="text-mew-muted text-sm mt-2 text-center">
                {!pack.name.trim() && missingCore.length > 0
                  ? `Need a pack name and clips for: ${missingCore.join(', ')}`
                  : !pack.name.trim()
                    ? 'Enter a pack name to build'
                    : `Still need clips for: ${missingCore.join(', ')}`}
              </p>
            )}
            {canBuild && !meetsRecommended && (
              <p className="text-amber-400 text-sm mt-2 text-center">
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
