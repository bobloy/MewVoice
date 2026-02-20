import type { InstalledVoicePack } from '@/types/manager';

interface InstalledPacksPanelProps {
  packs: InstalledVoicePack[];
  modRoot: string | null;
  onToggle: (packId: string) => void;
  onSetFrequency: (packId: string, freq: number) => void;
  onImport: (zipPath: string) => void;
  onUninstall: (packId: string) => void;
  onScan: () => void;
  patchDirty: boolean;
}

export default function InstalledPacksPanel({
  packs,
  modRoot,
  onToggle,
  onSetFrequency,
  onImport,
  onUninstall,
  onScan,
  patchDirty,
}: InstalledPacksPanelProps) {
  const handleImport = async () => {
    try {
      let selected: string | null = null;
      if ('__TAURI_INTERNALS__' in window) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        selected = await open({
          multiple: false,
          filters: [{ name: 'Voice Pack', extensions: ['zip'] }],
        });
      } else {
        selected = window.prompt('Enter path to .zip file:');
      }
      if (selected) {
        onImport(selected);
      }
    } catch (e) {
      console.error('Import dialog error:', e);
    }
  };

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
          <h2 className="text-xl font-semibold">Installed Voice Packs</h2>
          <p className="text-sm text-mew-muted mt-1">
            {packs.length} pack{packs.length !== 1 ? 's' : ''} installed
            {patchDirty && (
              <span className="text-mew-accent ml-2">
                (patch out of sync)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onScan}
            className="px-3 py-1.5 text-sm bg-mew-surface border border-mew-highlight/50 rounded hover:bg-mew-highlight/30 transition-colors"
          >
            Rescan Folder
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1.5 text-sm bg-mew-accent text-white rounded hover:bg-mew-accent/80 transition-colors"
          >
            Import ZIP
          </button>
        </div>
      </div>

      {packs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-mew-highlight/30 rounded-lg">
          <p className="text-mew-muted">No voice packs found</p>
          <p className="text-sm text-mew-muted/60 mt-1">
            Import a .zip from MewVoice or click "Rescan Folder" to detect existing packs.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packs.map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              onToggle={() => onToggle(pack.id)}
              onSetFrequency={(f) => onSetFrequency(pack.id, f)}
              onUninstall={() => onUninstall(pack.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PackRow({
  pack,
  onToggle,
  onSetFrequency,
  onUninstall,
}: {
  pack: InstalledVoicePack;
  onToggle: () => void;
  onSetFrequency: (freq: number) => void;
  onUninstall: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
        pack.isEnabled
          ? 'bg-mew-surface border-mew-highlight/40'
          : 'bg-mew-surface/50 border-mew-highlight/20 opacity-60'
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
          pack.isEnabled ? 'bg-mew-accent' : 'bg-mew-highlight'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            pack.isEnabled ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>

      {/* Pack info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{pack.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-mew-highlight/40 text-mew-muted flex-shrink-0">
            {pack.gender === 'female' ? 'F' : 'M'}
          </span>
          {pack.isBasePack && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-mew-sage/30 text-mew-sage flex-shrink-0">
              Base
            </span>
          )}
        </div>
        <p className="text-xs text-mew-muted truncate">
          {pack.author && `by ${pack.author} · `}
          {pack.folderName}
        </p>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <label className="text-xs text-mew-muted">Weight:</label>
        <input
          type="number"
          min={1}
          max={99}
          value={pack.frequency}
          onChange={(e) => onSetFrequency(parseInt(e.target.value) || 1)}
          className="w-12 px-1.5 py-0.5 text-sm text-center bg-mew-bg border border-mew-highlight/50 rounded"
          disabled={!pack.isEnabled}
        />
      </div>

      {/* Uninstall */}
      {!pack.isBasePack && (
        <button
          onClick={() => {
            if (confirm(`Uninstall "${pack.name}"? This removes the voice files from the mod folder.`)) {
              onUninstall();
            }
          }}
          className="text-red-400/60 hover:text-red-400 text-sm px-1 flex-shrink-0"
          title="Uninstall pack"
        >
          Remove
        </button>
      )}
    </div>
  );
}
