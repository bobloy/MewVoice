import { useState, useEffect, useCallback } from 'react';
import { VoicePackMeta, VOICE_ACTIONS, ACTION_RECOMMENDED_CLIPS, CORE_ACTIONS } from '@/types/voicepack';
import { listVoicePacks, getPublishedDownloadUrl, deleteVoicePack } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function LibraryBrowser() {
  const [packs, setPacks] = useState<VoicePackMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fetchPacks = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await listVoicePacks(p, 12);
      setPacks(result.packs);
      setTotal(result.total);
    } catch {
      setError('Failed to load voice packs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks(page);
  }, [page, fetchPacks]);

  const handleDelete = useCallback(async (packId: string) => {
    try {
      await deleteVoicePack(packId);
      // Remove from local state
      setPacks((prev) => prev.filter((p) => p.id !== packId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }, []);

  const totalPages = Math.ceil(total / 12);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">🐱</div>
        <p className="text-mew-muted">Loading voice packs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchPacks(page)}
          className="bg-mew-accent hover:bg-mew-accent/80 text-mew-text py-2 px-6 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="text-6xl mb-4">😿</div>
        <h2 className="text-xl font-bold text-mew-text mb-2">No voice packs yet</h2>
        <p className="text-mew-muted">
          Be the first! Create a voice pack and publish it to the community library.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-mew-text">Community Voice Packs</h2>
        <span className="text-mew-muted text-sm">{total} pack{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {packs.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            isOwner={!!user && !!pack.steamId && user.steamId === pack.steamId}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg bg-mew-surface border border-mew-highlight/30 text-mew-text disabled:opacity-30 hover:border-mew-accent/50 transition-colors"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-mew-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg bg-mew-surface border border-mew-highlight/30 text-mew-text disabled:opacity-30 hover:border-mew-accent/50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

interface PackCardProps {
  pack: VoicePackMeta;
  isOwner: boolean;
  onDelete: (id: string) => void;
}

function PackCard({ pack, isOwner, onDelete }: PackCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totalClips = Object.values(pack.clipCounts).reduce((sum, n) => sum + n, 0);
  const genderIcon = pack.gender === 'female' ? '♀' : pack.gender === 'male' ? '♂' : '⚥';

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(pack.id);
    setConfirmDelete(false);
  };

  return (
    <div className="bg-mew-surface rounded-xl p-5 border border-mew-highlight/30 hover:border-mew-accent/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-mew-text truncate">{pack.name}</h3>
          <div className="flex items-center gap-2 text-mew-muted text-sm">
            {pack.steamAvatar && (
              <img
                src={pack.steamAvatar}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>
              by {pack.steamName || pack.author || 'Anonymous'} {genderIcon}
            </span>
          </div>
        </div>
        <span className="text-2xl ml-2">🐱</span>
      </div>

      {pack.description && (
        <p className="text-mew-muted text-sm mb-3 line-clamp-2">{pack.description}</p>
      )}

      {/* Clip count grid */}
      <div className="grid grid-cols-3 gap-1 mb-4 text-xs">
        {VOICE_ACTIONS.map((action) => {
          const count = pack.clipCounts[action] || 0;
          const info = ACTION_RECOMMENDED_CLIPS[action];
          const isCore = CORE_ACTIONS.includes(action);
          const gridClass = count === 0
            ? 'bg-mew-bg/50 text-mew-muted/50'
            : count >= info.recommended
              ? 'bg-green-900/40 text-green-400'
              : count < info.gameMin && isCore
                ? 'bg-red-900/40 text-red-400'
                : 'bg-amber-900/40 text-amber-400';
          return (
            <div
              key={action}
              className={`px-2 py-1 rounded text-center ${gridClass}`}
            >
              {action} {count > 0 && <span className="font-bold">{count}</span>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-mew-muted space-x-3">
          <span>{totalClips} clips</span>
          <span>{pack.downloads} download{pack.downloads !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="text-xs bg-red-600 hover:bg-red-500 text-white py-1 px-2 rounded transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-mew-muted hover:text-mew-text py-1 px-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300 py-1 px-2 rounded hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )
          )}
          <a
            href={getPublishedDownloadUrl(pack.id)}
            className="bg-mew-accent hover:bg-mew-accent/80 text-mew-text py-1.5 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
