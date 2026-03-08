import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import type { Panel } from './Sidebar';

interface ShellProps {
  activePanel: Panel;
  onNavigate: (panel: Panel) => void;
  patchDirty: boolean;
  error: string | null;
  onClearError: () => void;
  children: ReactNode;
}

export default function Shell({
  activePanel,
  onNavigate,
  patchDirty,
  error,
  onClearError,
  children,
}: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activePanel={activePanel}
        onNavigate={onNavigate}
        patchDirty={patchDirty}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {error && (
          <div className="flex-shrink-0 bg-red-900/40 border-b border-red-700/50 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-red-300 selectable">{error}</span>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-200 text-sm px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
