import { useState, useRef, useEffect } from 'react';
import { VoicePackMeta, VOICE_ACTIONS, ACTION_RECOMMENDED_CLIPS, CORE_ACTIONS } from '@/types/voicepack';
import { getPublishedDownloadUrl, getPreviewUrl } from '@/lib/api';
import { VoteButtons } from '@/components/library/VoteButtons';

interface PackCardProps {
  pack: VoicePackMeta;
  isLoggedIn: boolean;
  onVote: (packId: string, vote: 1 | -1 | 0) => void;
  onDelete: (packId: string) => void;
  onLoginRequired: () => void;
  currentUserId?: string;
  /** Shared across all cards — the pack ID currently playing audio */
  playingPackId?: string | null;
  onPlayStateChange?: (packId: string | null) => void;
}

export function PackCard({
  pack,
  isLoggedIn,
  onVote,
  onDelete,
  onLoginRequired,
  currentUserId,
  playingPackId,
  onPlayStateChange,
}: PackCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlaying = playingPackId === pack.id;

  const totalClips = Object.values(pack.clipCounts).reduce((sum, n) => sum + n, 0);
  const genderIcon = pack.gender === 'female' ? '\u2640' : pack.gender === 'male' ? '\u2642' : '\u26A5';
  const isOwner = !!currentUserId && !!pack.steamId && currentUserId === pack.steamId;

  // Stop audio when another card starts playing
  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [isPlaying]);

  const handlePreview = () => {
    if (isPlaying) {
      // Stop current
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      onPlayStateChange?.(null);
      return;
    }

    // Stop any other playing card
    onPlayStateChange?.(pack.id);

    // Cache-bust so we get a different random clip each time
    const base = getPreviewUrl(pack.id);
    const url = base + (base.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {
      onPlayStateChange?.(null);
    });
    audio.onended = () => {
      audioRef.current = null;
      onPlayStateChange?.(null);
    };
  };

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
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-mew-text truncate">{pack.name}</h3>
          <div className="flex items-center gap-2 text-mew-muted text-sm">
            {pack.steamAvatar && (
              <img src={pack.steamAvatar} alt="" className="w-5 h-5 rounded-full" />
            )}
            <span>
              by {pack.steamName || pack.author || 'Anonymous'} {genderIcon}
            </span>
          </div>
        </div>
        {/* Preview button — top-right corner, minimal */}
        <button
          onClick={handlePreview}
          className={`ml-2 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            isPlaying
              ? 'bg-mew-accent text-white'
              : 'bg-mew-bg text-mew-muted hover:text-mew-accent hover:bg-mew-highlight/30'
          }`}
          title={isPlaying ? 'Stop preview' : 'Play a random clip'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="4" height="10" rx="1" />
              <rect x="8" y="2" width="4" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Description: always reserve space in grid (2-col), collapse in single-col */}
      {pack.description ? (
        <p className="text-mew-muted text-sm mb-3 line-clamp-2">{pack.description}</p>
      ) : (
        <div className="hidden md:block mb-3 h-[2.5rem]" />
      )}

      {/* Clip count grid */}
      <div className="grid grid-cols-3 gap-1 mb-4 text-xs">
        {VOICE_ACTIONS.map((action) => {
          const count = pack.clipCounts[action] || 0;
          const info = ACTION_RECOMMENDED_CLIPS[action];
          const isCore = CORE_ACTIONS.includes(action);
          const gridClass =
            count === 0
              ? 'bg-mew-bg/50 text-mew-muted/50'
              : count >= info.recommended
                ? 'bg-green-900/40 text-green-400'
                : count < info.gameMin && isCore
                  ? 'bg-red-900/40 text-red-400'
                  : 'bg-amber-900/40 text-amber-400';
          return (
            <div key={action} className={`px-2 py-1 rounded text-center ${gridClass}`}>
              {action} {count > 0 && <span className="font-bold">{count}</span>}
            </div>
          );
        })}
      </div>

      {/* Footer with votes inline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VoteButtons
            score={pack.score}
            userVote={pack.userVote}
            isLoggedIn={isLoggedIn}
            onVote={(vote) => onVote(pack.id, vote)}
            onLoginRequired={onLoginRequired}
          />
          <div className="text-xs text-mew-muted space-x-3">
            <span>{totalClips} clips</span>
            <span>
              {pack.downloads} download{pack.downloads !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner &&
            (confirmDelete ? (
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
            ))}
          <a
            href={getPublishedDownloadUrl(pack.id)}
            className="bg-mew-accent hover:brightness-125 text-white py-1.5 px-4 rounded-lg text-sm font-medium transition-all"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
