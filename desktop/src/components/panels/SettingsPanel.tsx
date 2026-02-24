import * as cmd from '@/lib/commands';
import { APP_VERSION } from '@/lib/version';
import { useState } from 'react';

interface SettingsPanelProps {
  modRoot: string | null;
  autoSync: boolean;
  onSetModRoot: (path: string | null) => void;
  onSetAutoSync: (enabled: boolean) => void;
  onScan: () => void;
}

export default function SettingsPanel({
  modRoot,
  autoSync,
  onSetModRoot,
  onSetAutoSync,
  onScan,
}: SettingsPanelProps) {
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  // TODO: Add updateError state to show specific error messages to users instead of generic "Failed to check for updates"

  const handleCheckUpdate = async () => {
    // Check if running in Tauri (not plain browser)
    if (!('__TAURI_INTERNALS__' in window)) {
      setUpdateStatus('Updates require the desktop app');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateStatus('Checking for updates...');

      // Lazy-load Tauri plugins to avoid issues in browser mode
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');

      const update = await check();

      if (update) {
        // TODO: Consider adding a "Skip" button to cancel download mid-progress
        setUpdateStatus(`Found version ${update.version}. Downloading...`);
        let downloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              setUpdateStatus(`Downloading (0%)...`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              if (contentLength > 0) {
                const percent = Math.round((downloaded / contentLength) * 100);
                setUpdateStatus(`Downloading (${percent}%)...`);
              }
              break;
            case 'Finished':
              setUpdateStatus('Installing update...');
              break;
          }
        });

        setUpdateStatus('Update installed. Restarting...');
        await relaunch();
      } else {
        setUpdateStatus('App is up to date.');
      }
    } catch (err) {
      console.error('Update failed:', err);
      // TODO: Display specific error message (network error, no update endpoint, etc.) instead of generic failure
      setUpdateStatus('Failed to check for updates.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleBrowse = async () => {
    const selected = await cmd.pickFolder();
    if (selected) {
      onSetModRoot(selected);
      onScan();
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      {/* Mod root path */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-mew-muted mb-2">
          Mewtator Mod Root
        </label>
        <p className="text-xs text-mew-muted/60 mb-3">
          The root mods directory for Mewtator (e.g., .../Mewtator/mods/).
          The app writes to a MewVoice subfolder inside this.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={modRoot ?? ''}
            readOnly
            placeholder="Not configured"
            className="flex-1 px-3 py-2 text-sm bg-mew-bg border border-mew-highlight/50 rounded selectable"
          />
          <button
            onClick={handleBrowse}
            className="px-3 py-2 text-sm bg-mew-surface border border-mew-highlight/50 rounded hover:bg-mew-highlight/30 transition-colors"
          >
            Browse
          </button>
        </div>
        <div className="flex gap-2">
          {modRoot && (
            <button
              onClick={() => onSetModRoot(null)}
              className="px-3 py-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Auto-sync toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-mew-muted">
              Auto-Sync
            </label>
            <p className="text-xs text-mew-muted/60 mt-0.5">
              Automatically regenerate the voice patch when packs or weights change.
              Off by default — use the "Regenerate" button manually.
            </p>
          </div>
          <button
            onClick={() => onSetAutoSync(!autoSync)}
            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${autoSync ? 'bg-mew-accent' : 'bg-mew-surface'
              }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoSync ? 'left-5' : 'left-0.5'
                }`}
            />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="pt-6 border-t border-mew-highlight/30">
        <h3 className="text-sm font-medium text-mew-muted mb-2">About</h3>
        <p className="text-xs text-mew-muted/60">
          MewVoice Desktop v{APP_VERSION} — Voice Pack Manager for Mewgenics.
        </p>
        <p className="text-xs text-mew-muted/60 mt-1 mb-4">
          This app generates a merged catgen.gon.patch inside the MewVoice mod folder.
          It never modifies base game files.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckUpdate}
            disabled={isUpdating}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isUpdating
                ? 'bg-mew-highlight/50 text-mew-muted cursor-not-allowed'
                : 'bg-mew-surface border border-mew-highlight/50 text-mew-text hover:bg-mew-highlight/30'
              }`}
          >
            {isUpdating ? 'Checking...' : 'Check for Updates'}
          </button>
          {updateStatus && (
            <span className="text-xs text-mew-accent">{updateStatus}</span>
          )}
        </div>
      </div>
    </div>
  );
}
