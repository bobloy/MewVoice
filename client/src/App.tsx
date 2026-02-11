import { PackBuilder } from '@/components/pack-builder/PackBuilder';

function App() {
  return (
    <div className="min-h-screen bg-mew-bg">
      {/* Header */}
      <header className="border-b border-mew-highlight/30 bg-mew-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐱</span>
            <div>
              <h1 className="text-xl font-bold text-mew-text">Mewgenics Voice Pack Creator</h1>
              <p className="text-xs text-mew-muted">Record custom cat voices for Mewgenics</p>
            </div>
          </div>
          <nav className="flex gap-4">
            <button className="text-mew-accent font-medium text-sm">Create</button>
            <button className="text-mew-muted hover:text-mew-text text-sm transition-colors">
              Browse Packs
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        <PackBuilder />
      </main>

      {/* Footer */}
      <footer className="border-t border-mew-highlight/20 py-6 mt-12">
        <p className="text-center text-mew-muted text-sm">
          Community tool — not affiliated with Edmund McMillen or Tyler Glaiel.
          Voice packs are compatible with Mewgenics GPAK format.
        </p>
      </footer>
    </div>
  );
}

export default App;
