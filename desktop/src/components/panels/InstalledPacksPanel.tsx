import { useCallback, useState } from 'react';
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

const MEWVOICE_URL = 'https://mewvoice.com';

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
  const [showOpenFallbackModal, setShowOpenFallbackModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyMewVoiceUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MEWVOICE_URL);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }, []);

  const showManualOpenFallback = useCallback(async () => {
    setShowOpenFallbackModal(true);
    setCopyStatus('idle');
    await copyMewVoiceUrl();
  }, [copyMewVoiceUrl]);

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

  const handleOpenMewVoice = async () => {
    try {
      if ('__TAURI_INTERNALS__' in window) {
        // Use Tauri opener plugin to open external link
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(MEWVOICE_URL);
      } else {
        window.open(MEWVOICE_URL, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('Failed to open MewVoice:', e);
      // TODO(stretch): Add an in-app library/download page so desktop users can browse voice packs without leaving the app.
      await showManualOpenFallback();
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
            onClick={handleOpenMewVoice}
            className="px-3 py-1.5 text-sm bg-mew-surface border border-mew-highlight/50 rounded hover:bg-mew-highlight/30 transition-colors"
          >
            Download More Voices
          </button>
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
          <button
            onClick={handleOpenMewVoice}
            className="inline-block mt-4 px-4 py-2 text-sm bg-mew-accent text-white rounded hover:bg-mew-accent/80 transition-colors"
          >
            Download More Voices
          </button>
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

      {showOpenFallbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-lg border border-mew-highlight/40 bg-mew-surface p-5">
            <h3 className="text-lg font-semibold mb-2">Open MewVoice manually</h3>
            <p className="text-sm text-mew-muted mb-3">
              The app could not open your browser automatically. The URL is below.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                readOnly
                value={MEWVOICE_URL}
                className="flex-1 px-3 py-2 text-sm bg-mew-bg border border-mew-highlight/50 rounded"
              />
              <button
                onClick={copyMewVoiceUrl}
                className="px-3 py-2 text-sm bg-mew-accent text-white rounded hover:bg-mew-accent/80 transition-colors"
              >
                Copy Link
              </button>
            </div>
            {copyStatus === 'copied' && (
              <p className="text-xs text-mew-sage mb-3">Link copied to clipboard.</p>
            )}
            {copyStatus === 'failed' && (
              <p className="text-xs text-red-300 mb-3">Copy failed. Select and copy the URL manually.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowOpenFallbackModal(false)}
                className="px-3 py-2 text-sm bg-mew-bg border border-mew-highlight/50 rounded hover:bg-mew-highlight/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
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
  const totalClips = pack.clipCounts
    ? Object.values(pack.clipCounts).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        pack.isEnabled
          ? 'bg-mew-surface border-mew-highlight/40'
          : 'bg-mew-surface/50 border-mew-highlight/20 opacity-60'
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 mt-1 ${
          pack.isEnabled ? 'bg-mew-accent' : 'bg-mew-surface'
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
        {pack.author && (
          <p className="text-sm text-mew-muted mt-0.5">
            by {pack.author}
          </p>
        )}
        {pack.description && (
          <p className="text-xs text-mew-muted/70 mt-1 line-clamp-2">
            {pack.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-mew-muted/60">
          {totalClips > 0 && (
            <span>{totalClips} clip{totalClips !== 1 ? 's' : ''}</span>
          )}
          <span className="text-mew-muted/40">{pack.folderName}</span>
        </div>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
        <label className="text-xs text-mew-muted">Weight:</label>
        <input
          type="number"
          min={0}
          max={99}
          value={pack.frequency}
          onChange={(e) => onSetFrequency(parseInt(e.target.value) || 0)}
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
          className="text-red-400/60 hover:text-red-400 text-sm px-1 flex-shrink-0 mt-1"
          title="Uninstall pack"
        >
          Remove
        </button>
      )}
    </div>
  );
}
