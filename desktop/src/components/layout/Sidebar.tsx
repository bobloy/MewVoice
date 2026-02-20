type Panel = 'packs' | 'base-packs' | 'registration' | 'settings';

interface SidebarProps {
  activePanel: Panel;
  onNavigate: (panel: Panel) => void;
  patchDirty: boolean;
}

const NAV_ITEMS: { id: Panel; label: string; icon: string }[] = [
  { id: 'packs', label: 'Installed Packs', icon: '\u{1F4E6}' },
  { id: 'base-packs', label: 'Base Game Voices', icon: '\u{1F3AE}' },
  { id: 'registration', label: 'Voice Patch', icon: '\u{1F3AF}' },
  { id: 'settings', label: 'Settings', icon: '\u{2699}\u{FE0F}' },
];

export default function Sidebar({ activePanel, onNavigate, patchDirty }: SidebarProps) {
  return (
    <nav className="w-52 min-h-screen bg-mew-surface border-r border-mew-highlight/30 flex flex-col">
      <div className="p-4 border-b border-mew-highlight/30">
        <h1 className="text-lg font-semibold text-mew-accent">MewVoice</h1>
        <p className="text-xs text-mew-muted">Voice Pack Manager</p>
      </div>

      <div className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
              activePanel === item.id
                ? 'bg-mew-highlight/40 text-mew-text'
                : 'text-mew-muted hover:bg-mew-highlight/20 hover:text-mew-text'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'registration' && patchDirty && (
              <span className="ml-auto w-2 h-2 rounded-full bg-mew-accent" title="Unsaved changes" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-mew-highlight/30">
        <p className="text-xs text-mew-muted/60">v0.1.0</p>
      </div>
    </nav>
  );
}

export type { Panel };
