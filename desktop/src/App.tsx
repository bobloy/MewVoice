import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import type { Panel } from '@/components/layout/Sidebar';
import InstalledPacksPanel from '@/components/panels/InstalledPacksPanel';
import BasePacksPanel from '@/components/panels/BasePacksPanel';
import VoiceRegistrationPanel from '@/components/panels/VoiceRegistrationPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import { useAppState } from '@/hooks/useAppState';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('packs');
  const app = useAppState();

  // Don't show dirty indicator when auto-sync will handle it
  const showDirty = app.patchDirty && !app.state.autoSync;

  // Auto-sync: regenerate patch whenever packs change (if enabled)
  useEffect(() => {
    if (app.state.autoSync && app.patchDirty && app.state.mewtatorModRoot) {
      app.regeneratePatch();
    }
  }, [app.state.autoSync, app.patchDirty, app.state.mewtatorModRoot, app.regeneratePatch]);

  // Auto-scan packs when mod root changes
  useEffect(() => {
    if (app.state.mewtatorModRoot && !app.loading) {
      app.scanPacks();
    }
  // Only run when modRoot actually changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.state.mewtatorModRoot]);

  if (app.loading) {
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
          packs={app.state.packs}
          modRoot={app.state.mewtatorModRoot}
          onToggle={app.togglePack}
          onSetFrequency={app.setFrequency}
          onImport={app.importZip}
          onUninstall={app.uninstallPack}
          onScan={app.scanPacks}
          patchDirty={showDirty}
        />
      )}
      {activePanel === 'base-packs' && (
        <BasePacksPanel
          mutedBasePacks={app.state.mutedBasePacks}
          onToggleMute={app.toggleMuteBasePack}
        />
      )}
      {activePanel === 'registration' && (
        <VoiceRegistrationPanel
          packs={app.state.packs}
          mutedBasePacks={app.state.mutedBasePacks}
          modRoot={app.state.mewtatorModRoot}
          patchDirty={showDirty}
          onRegenerate={app.regeneratePatch}
        />
      )}
      {activePanel === 'settings' && (
        <SettingsPanel
          modRoot={app.state.mewtatorModRoot}
          autoSync={app.state.autoSync}
          onSetModRoot={app.setModRoot}
          onSetAutoSync={app.setAutoSync}
          onScan={app.scanPacks}
        />
      )}
    </Shell>
  );
}

export default App;
