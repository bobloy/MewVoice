import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { deleteVoicePack } from '@/lib/api';
import { useLibraryPacks } from '@/components/library/useLibraryPacks';
import { LibraryToolbar } from '@/components/library/LibraryToolbar';
import { PackCard } from '@/components/library/PackCard';

export function LibraryBrowser() {
  const { user, login } = useAuth();
  const {
    filters,
    setFilters,
    resetFilters,
    packs,
    total,
    hasMore,
    initialLoading,
    refreshing,
    loadingMore,
    error,
    loadMore,
    refresh,
    updatePackVote,
    removePack,
  } = useLibraryPacks();

  // Audio preview — only one card plays at a time
  const [playingPackId, setPlayingPackId] = useState<string | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleDelete = useCallback(
    async (packId: string) => {
      try {
        await deleteVoicePack(packId);
        removePack(packId);
      } catch {
        // Error is shown by the card's own state
      }
    },
    [removePack],
  );

  const handleVote = useCallback(
    (packId: string, vote: 1 | -1 | 0) => {
      updatePackVote(packId, vote);
    },
    [updatePackVote],
  );

  // Check if any filters are non-default
  const hasActiveFilters =
    filters.q !== '' ||
    filters.gender !== 'all' ||
    filters.hasRecommended ||
    filters.minScore !== 0 ||
    filters.author !== '';

  // First load — full-screen loading, no toolbar yet
  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">&#128049;</div>
        <p className="text-mew-muted">Loading voice packs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <LibraryToolbar
        filters={filters}
        setFilters={setFilters}
        total={total}
        isLoggedIn={!!user}
        userSteamId={user?.steamId}
      />

      {/* Content area with refreshing overlay */}
      <div className="relative">
        {/* Overlay for filter/sort changes — keeps existing cards visible */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-mew-bg/60 backdrop-blur-sm rounded-xl min-h-[200px]">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-bounce">&#128049;</div>
              <p className="text-mew-muted text-sm">Loading...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="bg-mew-accent hover:brightness-125 text-white py-2 px-6 rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {!error && packs.length === 0 ? (
          <div className="text-center py-20">
            {hasActiveFilters ? (
              <>
                <div className="text-5xl mb-4">&#128568;</div>
                <h2 className="text-xl font-bold text-mew-text mb-2">No packs match your filters</h2>
                <p className="text-mew-muted mb-4">
                  Try adjusting your search or filters to find more packs.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-mew-accent hover:underline text-sm"
                >
                  Reset all filters
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">&#128575;</div>
                <h2 className="text-xl font-bold text-mew-text mb-2">No voice packs yet</h2>
                <p className="text-mew-muted">
                  Be the first! Create a voice pack and publish it to the community library.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  isLoggedIn={!!user}
                  currentUserId={user?.steamId}
                  onVote={handleVote}
                  onDelete={handleDelete}
                  onLoginRequired={login}
                  playingPackId={playingPackId}
                  onPlayStateChange={setPlayingPackId}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-mew-muted">
                  <div className="text-2xl animate-bounce">&#128049;</div>
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
              {!hasMore && packs.length > 0 && !refreshing && (
                <p className="text-mew-muted text-sm">That's all! {total} pack{total !== 1 ? 's' : ''} total.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
