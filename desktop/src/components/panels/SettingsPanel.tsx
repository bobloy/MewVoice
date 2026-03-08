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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater')['check']>>>(null);
  const [updateReadyToRestart, setUpdateReadyToRestart] = useState(false);

  const handleCheckUpdate = async () => {
    // Check if running in Tauri (not plain browser)
    if (!('__TAURI_INTERNALS__' in window)) {
      setUpdateStatus('Updates require the desktop app');
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setPendingUpdate(null);
      setUpdateReadyToRestart(false);
      setDownloadProgress(null);
      setUpdateStatus('Checking for updates...');

      // Lazy-load Tauri plugins to avoid issues in browser mode
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        setPendingUpdate(update);
        setUpdateStatus(`Update available: v${update.version}. Review details, then choose whether to install.`);
      } else {
        setUpdateStatus('App is up to date.');
      }
    } catch (err) {
      console.error('Update failed:', err);
      setUpdateStatus('Failed to check for updates.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!pendingUpdate) return;
    try {
      setIsDownloadingUpdate(true);
      setDownloadProgress(0);
      setUpdateStatus(`Downloading v${pendingUpdate.version}...`);
      let downloaded = 0;
      let contentLength = 0;

      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            setDownloadProgress(0);
            setUpdateStatus('Downloading update...');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const percent = Math.round((downloaded / contentLength) * 100);
              setDownloadProgress(percent);
              setUpdateStatus(`Downloading update (${percent}%)...`);
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            setUpdateStatus('Update downloaded and installed. Restart to apply.');
            break;
        }
      });

      setUpdateReadyToRestart(true);
      setPendingUpdate(null);
    } catch (err) {
      console.error('Update install failed:', err);
      setUpdateStatus('Failed to download/install update.');
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleRestartToApplyUpdate = async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      setUpdateStatus('Restarting to apply update...');
      await relaunch();
    } catch (err) {
      console.error('Failed to restart:', err);
      setUpdateStatus('Update is installed, but restart failed. Please restart the app manually.');
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
    <div className="flex flex-col min-h-0 flex-1">
      <h2 className="flex-shrink-0 text-xl font-semibold mb-6">Settings</h2>

      <div className="flex-1 min-h-0 overflow-y-auto max-w-lg">

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
            disabled={isCheckingUpdate || isDownloadingUpdate}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isCheckingUpdate || isDownloadingUpdate
                ? 'bg-mew-highlight/50 text-mew-muted cursor-not-allowed'
                : 'bg-mew-surface border border-mew-highlight/50 text-mew-text hover:bg-mew-highlight/30'
              }`}
          >
            {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
          </button>
          {updateStatus && (
            <span className="text-xs text-mew-accent">{updateStatus}</span>
          )}
        </div>

        {pendingUpdate && (
          <div className="mt-3 p-3 text-xs rounded border border-mew-highlight/40 bg-mew-bg/50">
            <p className="text-mew-text font-medium mb-2">
              Update available: v{pendingUpdate.version}
            </p>
            {pendingUpdate.body && (
              <p className="text-mew-muted/80 mb-3 whitespace-pre-wrap">
                {pendingUpdate.body}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallUpdate}
                disabled={isDownloadingUpdate}
                className={`px-3 py-1.5 rounded transition-colors ${isDownloadingUpdate
                    ? 'bg-mew-highlight/50 text-mew-muted cursor-not-allowed'
                    : 'bg-mew-accent text-white hover:bg-mew-accent/80'
                  }`}
              >
                {isDownloadingUpdate ? 'Installing...' : 'Download and Install'}
              </button>
              <button
                onClick={() => {
                  setPendingUpdate(null);
                  setUpdateStatus('Update postponed.');
                }}
                disabled={isDownloadingUpdate}
                className="px-3 py-1.5 rounded border border-mew-highlight/50 text-mew-text hover:bg-mew-highlight/20 transition-colors"
              >
                Later
              </button>
              {downloadProgress !== null && isDownloadingUpdate && (
                <span className="text-mew-muted">{downloadProgress}%</span>
              )}
            </div>
          </div>
        )}

        {updateReadyToRestart && (
          <div className="mt-3 p-3 text-xs rounded border border-mew-highlight/40 bg-mew-bg/50">
            <p className="text-mew-text mb-2">
              Update installed. Restart is required to finish applying it.
            </p>
            <button
              onClick={handleRestartToApplyUpdate}
              className="px-3 py-1.5 rounded bg-mew-accent text-white hover:bg-mew-accent/80 transition-colors"
            >
              Restart to Apply Update
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
