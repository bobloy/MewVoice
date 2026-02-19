import { useMemo } from 'react';
import type { InstalledVoicePack } from '@/types/manager';
import { buildVoicePatch, computeSpawnDistribution } from '@/lib/patchBuilder';

interface VoiceRegistrationPanelProps {
  packs: InstalledVoicePack[];
  modRoot: string | null;
  patchDirty: boolean;
  onRegenerate: () => void;
}

export default function VoiceRegistrationPanel({
  packs,
  modRoot,
  patchDirty,
  onRegenerate,
}: VoiceRegistrationPanelProps) {
  const enabledPacks = packs.filter((p) => p.isEnabled);
  const patchContent = useMemo(() => buildVoicePatch(packs), [packs]);
  const distribution = useMemo(() => computeSpawnDistribution(packs), [packs]);

  if (!modRoot) {
    return (
      <div className="text-center py-12">
        <p className="text-mew-muted text-lg mb-2">No mod folder configured</p>
        <p className="text-mew-muted/60 text-sm">
          Go to Settings to set your Mewtator mod root path.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Voice Registration</h2>
          <p className="text-sm text-mew-muted mt-1">
            {enabledPacks.length} pack{enabledPacks.length !== 1 ? 's' : ''} enabled
          </p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={!patchDirty && enabledPacks.length > 0}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            patchDirty
              ? 'bg-mew-accent text-white hover:bg-mew-accent/80'
              : 'bg-mew-surface border border-mew-highlight/50 text-mew-muted'
          }`}
        >
          {patchDirty ? 'Regenerate Voice Patch' : 'Patch Up to Date'}
        </button>
      </div>

      {/* Dirty indicator */}
      {patchDirty && (
        <div className="mb-4 px-3 py-2 rounded bg-mew-accent/10 border border-mew-accent/30 text-sm text-mew-accent">
          Voice patch is out of sync with your current settings. Click "Regenerate" to apply changes.
        </div>
      )}

      {/* Spawn distribution table */}
      {enabledPacks.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-mew-muted mb-3">Spawn Distribution</h3>
          <div className="space-y-1.5">
            {enabledPacks
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((pack) => {
                const pct = distribution.get(pack.id) ?? 0;
                return (
                  <div key={pack.id} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate" title={pack.name}>
                      {pack.name}
                    </span>
                    <div className="flex-1 h-4 bg-mew-bg rounded overflow-hidden">
                      <div
                        className="h-full bg-mew-accent/60 rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-mew-muted w-16 text-right tabular-nums">
                      {pct.toFixed(1)}% (x{pack.frequency})
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center py-8 border border-dashed border-mew-highlight/30 rounded-lg">
          <p className="text-mew-muted">No packs enabled</p>
          <p className="text-sm text-mew-muted/60 mt-1">
            Enable packs in the Installed Packs panel to register them.
          </p>
        </div>
      )}

      {/* Patch preview */}
      <div>
        <h3 className="text-sm font-medium text-mew-muted mb-2">
          Patch Preview
          <span className="text-xs text-mew-muted/60 ml-2">
            MewVoice/data/catgen.gon.patch
          </span>
        </h3>
        <pre className="selectable bg-mew-bg border border-mew-highlight/30 rounded-lg p-4 text-sm font-mono text-mew-sage overflow-x-auto">
          {patchContent}
        </pre>
      </div>

      {/* Write target info */}
      <p className="mt-3 text-xs text-mew-muted/60">
        Write target: {modRoot}/MewVoice/data/catgen.gon.patch
      </p>
    </div>
  );
}
