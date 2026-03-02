import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityLibraryFilters, CommunityPackMeta } from '@/types/library';
import { getCommunityPreviewUrl, listCommunityPacks } from '@/lib/commands';

interface CommunityLibraryPanelProps {
  modRoot: string | null;
  installedPackIds: string[];
  onInstallPack: (packId: string) => Promise<void>;
  onOpenSettings: () => void;
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
// TODO: Move this panel to cursor pagination + virtualization when the library grows further.

const DEFAULT_FILTERS: CommunityLibraryFilters = {
  sort: 'newest',
  q: '',
  gender: 'all',
};

export default function CommunityLibraryPanel({
  modRoot,
  installedPackIds,
  onInstallPack,
  onOpenSettings,
}: CommunityLibraryPanelProps) {
  const [filters, setFilters] = useState<CommunityLibraryFilters>(DEFAULT_FILTERS);
  const [packs, setPacks] = useState<CommunityPackMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingPackIds, setInstallingPackIds] = useState<string[]>([]);
  const [playingPackId, setPlayingPackId] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const fetchIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchQueryRef = useRef(filters.q);
  const nonSearchFiltersRef = useRef({
    sort: filters.sort,
    gender: filters.gender,
  });

  const installedSet = useMemo(() => new Set(installedPackIds), [installedPackIds]);

  const fetchPacks = useCallback(
    async (nextFilters: CommunityLibraryFilters, offset: number, append: boolean) => {
      const fetchId = ++fetchIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else if (!hasLoadedRef.current) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const result = await listCommunityPacks(nextFilters, offset, PAGE_SIZE);
        if (fetchId !== fetchIdRef.current) return;

        if (append) {
          setPacks((current) => [...current, ...result.packs]);
        } else {
          setPacks(result.packs);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
        hasLoadedRef.current = true;
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        setError('Failed to load community packs.');
      } finally {
        if (fetchId === fetchIdRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    searchQueryRef.current = filters.q;
  }, [filters.q]);

  useEffect(() => {
    nonSearchFiltersRef.current = {
      sort: filters.sort,
      gender: filters.gender,
    };
  }, [filters.sort, filters.gender]);

  useEffect(() => {
    fetchPacks(
      {
        ...nonSearchFiltersRef.current,
        q: searchQueryRef.current,
      },
      0,
      false,
    );
  }, [fetchPacks, filters.sort, filters.gender]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPacks(
        {
          ...nonSearchFiltersRef.current,
          q: searchQueryRef.current,
        },
        0,
        false,
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPacks, filters.q]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPacks(filters, packs.length, true);
  }, [hasMore, loadingMore, fetchPacks, filters, packs.length]);

  const refresh = useCallback(() => {
    fetchPacks(filters, 0, false);
  }, [fetchPacks, filters]);

  const handleInstall = useCallback(
    async (packId: string) => {
      // TODO: Surface per-pack download progress from Tauri for better install feedback.
      setInstallingPackIds((current) =>
        current.includes(packId) ? current : [...current, packId],
      );
      try {
        await onInstallPack(packId);
      } finally {
        setInstallingPackIds((current) => current.filter((id) => id !== packId));
      }
    },
    [onInstallPack],
  );

  const handlePreview = useCallback((packId: string) => {
    if (playingPackId === packId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingPackId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const url = getCommunityPreviewUrl(packId);
    const withBust = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    const audio = new Audio(withBust);
    audioRef.current = audio;
    setPlayingPackId(packId);

    audio.play().catch(() => {
      setPlayingPackId(null);
      audioRef.current = null;
    });
    audio.onended = () => {
      setPlayingPackId(null);
      audioRef.current = null;
    };
  }, [playingPackId]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-shrink-0">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Community Library</h2>
          <p className="text-sm text-mew-muted mt-1">
            Browse public MewVoice packs and install them directly.
          </p>
        </div>
      </div>

      {!modRoot && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="text-amber-200">
            Set your Mewtator mod folder in Settings before installing.
          </p>
          <button
            onClick={onOpenSettings}
            className="mt-2 text-xs text-amber-100 underline hover:text-white"
          >
            Open Settings
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={filters.q}
          onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
          placeholder="Search by name, description, or author..."
          className="min-w-[220px] flex-1 px-3 py-1.5 text-sm bg-mew-bg border border-mew-highlight/50 rounded"
        />
        <select
          value={filters.gender}
          onChange={(e) =>
            setFilters((current) => ({
              ...current,
              gender: e.target.value as CommunityLibraryFilters['gender'],
            }))
          }
          className="px-3 py-1.5 text-sm bg-mew-surface border border-mew-highlight/50 rounded"
        >
          <option value="all">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) =>
            setFilters((current) => ({
              ...current,
              sort: e.target.value as CommunityLibraryFilters['sort'],
            }))
          }
          className="px-3 py-1.5 text-sm bg-mew-surface border border-mew-highlight/50 rounded"
        >
          <option value="newest">Newest</option>
          <option value="top">Top score</option>
        </select>
      </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      {initialLoading ? (
        <div className="text-center py-16 text-mew-muted">Loading community packs...</div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-300 mb-3">{error}</p>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-sm bg-mew-accent text-white rounded hover:bg-mew-accent/80"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {refreshing && (
            <p className="text-xs text-mew-muted mb-2">Refreshing...</p>
          )}

          {packs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-mew-highlight/30 rounded-lg">
              <p className="text-mew-muted">No packs found for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {packs.map((pack) => {
                const totalClips = Object.values(pack.clipCounts).reduce((sum, n) => sum + n, 0);
                const isInstalling = installingPackIds.includes(pack.id);
                const isInstalled = installedSet.has(pack.id);
                const isPlaying = playingPackId === pack.id;

                return (
                  <div key={pack.id} className="rounded-lg border border-mew-highlight/30 bg-mew-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{pack.name}</h3>
                        <p className="text-xs text-mew-muted truncate">
                          by {pack.steamName || pack.author || 'Anonymous'}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePreview(pack.id)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          isPlaying
                            ? 'bg-mew-accent text-white border-mew-accent'
                            : 'border-mew-highlight/50 text-mew-muted hover:text-mew-text hover:bg-mew-highlight/20'
                        }`}
                      >
                        {isPlaying ? 'Stop' : 'Preview'}
                      </button>
                    </div>

                    {pack.description && (
                      <p className="text-sm text-mew-muted mt-2 line-clamp-2">
                        {pack.description}
                      </p>
                    )}

                    <div className="mt-3 text-xs text-mew-muted flex flex-wrap gap-x-3 gap-y-1">
                      <span>{totalClips} clips</span>
                      <span>Score: {pack.score}</span>
                      <span>
                        {pack.downloads} download{pack.downloads === 1 ? '' : 's'}
                      </span>
                      {isInstalled && (
                        <span className="text-mew-sage">Installed</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <button
                        onClick={() => handleInstall(pack.id)}
                        disabled={!modRoot || isInstalling}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          !modRoot || isInstalling
                            ? 'bg-mew-surface border border-mew-highlight/50 text-mew-muted'
                            : 'bg-mew-accent text-white hover:bg-mew-accent/80'
                        }`}
                      >
                        {isInstalling ? 'Installing...' : isInstalled ? 'Reinstall' : 'Download + Install'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-mew-muted">{total} total pack{total === 1 ? '' : 's'}</p>
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-3 py-1.5 rounded border border-mew-highlight/50 hover:bg-mew-highlight/20 disabled:opacity-60"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
