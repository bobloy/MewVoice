import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import type { Panel } from '@/components/layout/Sidebar';
import InstalledPacksPanel from '@/components/panels/InstalledPacksPanel';
import CommunityLibraryPanel from '@/components/panels/CommunityLibraryPanel';
import BasePacksPanel from '@/components/panels/BasePacksPanel';
import VoiceRegistrationPanel from '@/components/panels/VoiceRegistrationPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import { useAppState } from '@/hooks/useAppState';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('packs');
  const app = useAppState();
  const { state, loading, patchDirty, regeneratePatch, scanPacks } = app;

  // Don't show dirty indicator when auto-sync will handle it
  const showDirty = patchDirty && !state.autoSync;

  // Auto-sync: regenerate patch whenever packs change (if enabled)
  useEffect(() => {
    if (state.autoSync && patchDirty && state.mewtatorModRoot) {
      regeneratePatch();
    }
  }, [state.autoSync, patchDirty, state.mewtatorModRoot, regeneratePatch]);

  // Auto-scan packs when mod root changes
  useEffect(() => {
    if (state.mewtatorModRoot && !loading) {
      scanPacks();
    }
  }, [state.mewtatorModRoot, loading, scanPacks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-mew-muted">Loading...</p>
      </div>
    );
  }

  return (
    <Shell
      activePanel={activePanel}
      onNavigate={setActivePanel}
      patchDirty={showDirty}
      error={app.error}
      onClearError={app.clearError}
    >
      {activePanel === 'packs' && (
        <InstalledPacksPanel
          packs={state.packs}
          modRoot={state.mewtatorModRoot}
          onToggle={app.togglePack}
          onSetFrequency={app.setFrequency}
          onImport={app.importZip}
          onUninstall={app.uninstallPack}
          onScan={scanPacks}
          patchDirty={showDirty}
        />
      )}
      {activePanel === 'library' && (
        <CommunityLibraryPanel
          modRoot={state.mewtatorModRoot}
          installedPackIds={state.packs.map((pack) => pack.id)}
          onInstallPack={app.installPublishedPack}
          onOpenSettings={() => setActivePanel('settings')}
        />
      )}
      {activePanel === 'base-packs' && (
        <BasePacksPanel
          mutedBasePacks={state.mutedBasePacks}
          onToggleMute={app.toggleMuteBasePack}
        />
      )}
      {activePanel === 'registration' && (
        <VoiceRegistrationPanel
          packs={state.packs}
          mutedBasePacks={state.mutedBasePacks}
          modRoot={state.mewtatorModRoot}
          patchDirty={showDirty}
          onRegenerate={regeneratePatch}
          onSetFrequency={app.setFrequency}
        />
      )}
      {activePanel === 'settings' && (
        <SettingsPanel
          modRoot={state.mewtatorModRoot}
          autoSync={state.autoSync}
          onSetModRoot={app.setModRoot}
          onSetAutoSync={app.setAutoSync}
          onScan={scanPacks}
        />
      )}
    </Shell>
  );
}

export default App;
