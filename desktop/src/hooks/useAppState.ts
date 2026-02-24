import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, InstalledVoicePack } from '@/types/manager';
import { createDefaultState } from '@/types/manager';
import { buildVoicePatch, hashPatchContent } from '@/lib/patchBuilder';
import * as cmd from '@/lib/commands';

export function useAppState() {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patchDirty, setPatchDirty] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load state on mount
  useEffect(() => {
    cmd
      .loadState()
      .then((s) => {
        // Backfill mutedBasePacks for states saved before this field existed
        if (!s.mutedBasePacks) s.mutedBasePacks = [];
        setState(s);
        setLoading(false);
      })
      .catch(() => {
        // First run — no saved state yet
        setLoading(false);
      });
  }, []);

  // Auto-save state on changes (debounced 500ms)
  useEffect(() => {
    if (loading) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      cmd.saveState(state).catch((e) => setError(String(e)));
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state, loading]);

  // Recompute dirty state when packs or muted base packs change
  useEffect(() => {
    if (loading) return;
    const patch = buildVoicePatch(state.packs, state.mutedBasePacks);
    hashPatchContent(patch).then((hash) => {
      setPatchDirty(hash !== state.lastPatchHash);
    });
  }, [state.packs, state.mutedBasePacks, state.lastPatchHash, loading]);

  const setModRoot = useCallback((path: string | null) => {
    setState((s) => ({ ...s, mewtatorModRoot: path }));
  }, []);

  const setAutoSync = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, autoSync: enabled }));
  }, []);

  const addPack = useCallback((pack: InstalledVoicePack) => {
    setState((s) => ({
      ...s,
      packs: [...s.packs.filter((p) => p.id !== pack.id), pack],
    }));
  }, []);

  const removePack = useCallback((packId: string) => {
    setState((s) => ({
      ...s,
      packs: s.packs.filter((p) => p.id !== packId),
    }));
  }, []);

  const togglePack = useCallback((packId: string) => {
    setState((s) => ({
      ...s,
      packs: s.packs.map((p) =>
        p.id === packId ? { ...p, isEnabled: !p.isEnabled } : p,
      ),
    }));
  }, []);

  const setFrequency = useCallback((packId: string, frequency: number) => {
    setState((s) => ({
      ...s,
      packs: s.packs.map((p) =>
        p.id === packId ? { ...p, frequency: Math.max(0, frequency) } : p,
      ),
    }));
  }, []);

  const toggleMuteBasePack = useCallback((packId: string) => {
    setState((s) => {
      const muted = s.mutedBasePacks.includes(packId)
        ? s.mutedBasePacks.filter((id) => id !== packId)
        : [...s.mutedBasePacks, packId];
      return { ...s, mutedBasePacks: muted };
    });
  }, []);

  const regeneratePatch = useCallback(async () => {
    if (!state.mewtatorModRoot) {
      setError('Mewtator mod root not configured');
      return;
    }
    try {
      const content = buildVoicePatch(state.packs, state.mutedBasePacks);
      await cmd.writeVoicePatch(state.mewtatorModRoot, content);
      const hash = await hashPatchContent(content);
      setState((s) => ({ ...s, lastPatchHash: hash }));
      setPatchDirty(false);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [state.mewtatorModRoot, state.packs, state.mutedBasePacks]);

  const importZip = useCallback(
    async (zipPath: string) => {
      if (!state.mewtatorModRoot) {
        setError('Mewtator mod root not configured');
        return;
      }
      try {
        const pack = await cmd.installPack(zipPath, state.mewtatorModRoot);
        addPack(pack);
        setError(null);
      } catch (e) {
        setError(String(e));
      }
    },
    [state.mewtatorModRoot, addPack],
  );

  const uninstallPack = useCallback(
    async (packId: string) => {
      if (!state.mewtatorModRoot) return;
      const pack = state.packs.find((p) => p.id === packId);
      if (!pack) return;
      try {
        await cmd.uninstallPack(state.mewtatorModRoot, pack.folderName);
        removePack(packId);
        setError(null);
      } catch (e) {
        setError(String(e));
      }
    },
    [state.mewtatorModRoot, state.packs, removePack],
  );

  const scanPacks = useCallback(async () => {
    if (!state.mewtatorModRoot) return;
    try {
      const packs = await cmd.scanInstalledPacks(state.mewtatorModRoot);
      setState((s) => {
        // Merge scanned packs: keep existing state for known packs, add new ones
        // TODO: Also handle packs that were deleted from disk - currently only adds/updates, never removes
        const existing = new Map(s.packs.map((p) => [p.id, p]));
        const merged = packs.map((scanned) => {
          const prev = existing.get(scanned.id);
          if (prev) {
            // Keep user's enabled/frequency settings, update metadata
            return { ...scanned, isEnabled: prev.isEnabled, frequency: prev.frequency };
          }
          return scanned;
        });
        return { ...s, packs: merged };
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [state.mewtatorModRoot]);

  return {
    state,
    loading,
    error,
    patchDirty,
    setModRoot,
    setAutoSync,
    addPack,
    removePack,
    togglePack,
    setFrequency,
    toggleMuteBasePack,
    regeneratePatch,
    importZip,
    uninstallPack,
    scanPacks,
    clearError: () => setError(null),
  };
}
