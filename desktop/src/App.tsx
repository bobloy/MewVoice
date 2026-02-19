import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import type { Panel } from '@/components/layout/Sidebar';
import InstalledPacksPanel from '@/components/panels/InstalledPacksPanel';
import VoiceRegistrationPanel from '@/components/panels/VoiceRegistrationPanel';
import SettingsPanel from '@/components/panels/SettingsPanel';
import { useAppState } from '@/hooks/useAppState';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('packs');
  const app = useAppState();

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
      patchDirty={app.patchDirty}
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
          patchDirty={app.patchDirty}
        />
      )}
      {activePanel === 'registration' && (
        <VoiceRegistrationPanel
          packs={app.state.packs}
          modRoot={app.state.mewtatorModRoot}
          patchDirty={app.patchDirty}
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
