import { useState, useCallback, useEffect, useRef } from 'react';
import { VoicePackMeta, LibraryFilters } from '@/types/voicepack';
import { listVoicePacks, voteVoicePack } from '@/lib/api';

const DEFAULT_FILTERS: LibraryFilters = {
  sort: 'newest',
  q: '',
  gender: 'all',
  minScore: 0,
  hasRecommended: false,
  author: '',
};

const BATCH_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function useLibraryPacks() {
  const [filters, setFiltersState] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [packs, setPacks] = useState<VoicePackMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Debounce ref for search text
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current fetch to avoid stale responses
  const fetchIdRef = useRef(0);
  // Track whether initial load is done
  const hasLoadedRef = useRef(false);
  // Track packs with an in-flight vote request to prevent double-submit
  const votingPackIds = useRef(new Set<string>());
  const searchQueryRef = useRef(filters.q);
  // Keep latest non-search filters for q-only debounced fetches
  const nonSearchFiltersRef = useRef({
    sort: filters.sort,
    gender: filters.gender,
    minScore: filters.minScore,
    hasRecommended: filters.hasRecommended,
    author: filters.author,
  });

  const fetchPacks = useCallback(async (f: LibraryFilters, offset: number, append: boolean) => {
    const id = ++fetchIdRef.current;
    if (append) {
      setLoadingMore(true);
    } else if (!hasLoadedRef.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      const result = await listVoicePacks(f, offset, BATCH_SIZE);
      // Only apply if this is still the latest fetch
      if (id !== fetchIdRef.current) return;
      if (append) {
        setPacks((prev) => [...prev, ...result.packs]);
      } else {
        setPacks(result.packs);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
      hasLoadedRef.current = true;
    } catch {
      if (id !== fetchIdRef.current) return;
      setError('Failed to load voice packs.');
    } finally {
      if (id === fetchIdRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    searchQueryRef.current = filters.q;
  }, [filters.q]);

  useEffect(() => {
    nonSearchFiltersRef.current = {
      sort: filters.sort,
      gender: filters.gender,
      minScore: filters.minScore,
      hasRecommended: filters.hasRecommended,
      author: filters.author,
    };
  }, [filters.sort, filters.gender, filters.minScore, filters.hasRecommended, filters.author]);

  // Initial load + refetch when filters change (except q, which is debounced)
  useEffect(() => {
    fetchPacks(
      {
        ...nonSearchFiltersRef.current,
        q: searchQueryRef.current,
      },
      0,
      false,
    );
  }, [fetchPacks, filters.sort, filters.gender, filters.minScore, filters.hasRecommended, filters.author]);

  // Debounced search
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

  const setFilters = useCallback((update: Partial<LibraryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchPacks(filters, packs.length, true);
  }, [loadingMore, hasMore, filters, packs.length, fetchPacks]);

  const refresh = useCallback(() => {
    fetchPacks(filters, 0, false);
  }, [filters, fetchPacks]);

  /**
   * Optimistic vote update — mutates local state, fires API, reverts on error.
   * Ignores repeat clicks while a request for the same pack is in flight.
   */
  const updatePackVote = useCallback(async (packId: string, vote: 1 | -1 | 0) => {
    if (votingPackIds.current.has(packId)) return;
    votingPackIds.current.add(packId);

    // Snapshot for rollback
    const prevPacks = packs;

    // Optimistic update
    setPacks((current) =>
      current.map((p) => {
        if (p.id !== packId) return p;
        const oldVote = p.userVote || 0;
        const scoreDelta = vote - oldVote;
        return { ...p, score: p.score + scoreDelta, userVote: vote };
      }),
    );

    try {
      const result = await voteVoicePack(packId, vote);
      // Apply server truth
      setPacks((current) =>
        current.map((p) =>
          p.id === packId ? { ...p, score: result.score, userVote: result.userVote } : p,
        ),
      );
    } catch {
      // Revert on failure
      setPacks(prevPacks);
    } finally {
      votingPackIds.current.delete(packId);
    }
  }, [packs]);

  /** Remove a pack from local state (after delete) */
  const removePack = useCallback((packId: string) => {
    setPacks((current) => current.filter((p) => p.id !== packId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return {
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
  };
}
