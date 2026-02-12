import { LibraryFilters } from '@/types/voicepack';

interface LibraryToolbarProps {
  filters: LibraryFilters;
  setFilters: (update: Partial<LibraryFilters>) => void;
  total: number;
  isLoggedIn: boolean;
  userSteamId?: string;
}

export function LibraryToolbar({ filters, setFilters, total, isLoggedIn, userSteamId }: LibraryToolbarProps) {
  const isMyPacks = !!filters.author && filters.author === userSteamId;

  return (
    <div className="bg-mew-surface rounded-xl p-4 border border-mew-highlight/30 mb-6 space-y-3">
      {/* Top row: Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mew-muted text-sm">
            &#128269;
          </span>
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="Search packs..."
            maxLength={100}
            className="w-full bg-mew-bg border border-mew-highlight/50 rounded-lg pl-9 pr-4 py-2 text-mew-text placeholder:text-mew-muted/50 focus:outline-none focus:border-mew-accent text-sm"
          />
        </div>

        {/* Sort toggle */}
        <div className="flex rounded-lg border border-mew-highlight/50 overflow-hidden">
          <button
            onClick={() => setFilters({ sort: 'newest' })}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filters.sort === 'newest'
                ? 'bg-mew-accent text-white'
                : 'bg-mew-bg text-mew-muted hover:text-mew-text'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setFilters({ sort: 'top' })}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filters.sort === 'top'
                ? 'bg-mew-accent text-white'
                : 'bg-mew-bg text-mew-muted hover:text-mew-text'
            }`}
          >
            Top Rated
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Gender filter */}
        <select
          value={filters.gender}
          onChange={(e) => setFilters({ gender: e.target.value as LibraryFilters['gender'] })}
          className="bg-mew-bg border border-mew-highlight/50 rounded-lg px-3 py-1.5 text-sm text-mew-text focus:outline-none focus:border-mew-accent"
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        {/* Complete packs toggle */}
        <button
          onClick={() => setFilters({ hasRecommended: !filters.hasRecommended })}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            filters.hasRecommended
              ? 'bg-green-900/40 text-green-400 border-green-800/50'
              : 'bg-mew-bg text-mew-muted border-mew-highlight/50 hover:text-mew-text'
          }`}
        >
          Complete Packs
        </button>

        {/* Hide negative toggle */}
        <button
          onClick={() => setFilters({ minScore: filters.minScore === 0 ? -9999 : 0 })}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            filters.minScore === 0
              ? 'bg-mew-accent/20 text-mew-accent border-mew-accent/30'
              : 'bg-mew-bg text-mew-muted border-mew-highlight/50 hover:text-mew-text'
          }`}
        >
          Hide Negative
        </button>

        {/* My Packs toggle (logged-in only) */}
        {isLoggedIn && userSteamId && (
          <button
            onClick={() => setFilters({ author: isMyPacks ? '' : userSteamId })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              isMyPacks
                ? 'bg-mew-accent/20 text-mew-accent border-mew-accent/30'
                : 'bg-mew-bg text-mew-muted border-mew-highlight/50 hover:text-mew-text'
            }`}
          >
            My Packs
          </button>
        )}

        {/* Result count */}
        <span className="text-mew-muted text-xs ml-auto">
          {total} pack{total !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
