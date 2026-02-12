import { useState } from 'react';
import { PackBuilder } from '@/components/pack-builder/PackBuilder';
import { LibraryBrowser } from '@/components/library/LibraryBrowser';
import { InstructionsPage } from '@/components/instructions/InstructionsPage';
import { useAuth } from '@/contexts/AuthContext';

type Page = 'create' | 'browse' | 'instructions';

function App() {
  const [page, setPage] = useState<Page>('create');
  const { user, loading, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-mew-bg">
      {/* Header */}
      <header className="border-b border-mew-highlight/30 bg-mew-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐱</span>
            <div>
              <h1 className="text-xl font-bold text-mew-text">MewVoice</h1>
              <p className="text-xs text-mew-muted">Custom cat voices for Mewgenics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              <button
                onClick={() => setPage('create')}
                className={`font-medium text-sm transition-colors ${
                  page === 'create' ? 'text-mew-accent' : 'text-mew-muted hover:text-mew-text'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => setPage('browse')}
                className={`font-medium text-sm transition-colors ${
                  page === 'browse' ? 'text-mew-accent' : 'text-mew-muted hover:text-mew-text'
                }`}
              >
                Browse Packs
              </button>
              <button
                onClick={() => setPage('instructions')}
                className={`font-medium text-sm transition-colors ${
                  page === 'instructions' ? 'text-mew-accent' : 'text-mew-muted hover:text-mew-text'
                }`}
              >
                Instructions
              </button>
            </nav>

            <div className="border-l border-mew-highlight/30 pl-4">
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-mew-highlight/30 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <img
                    src={user.avatarUrl}
                    alt={user.personaName}
                    className="w-8 h-8 rounded-full border border-mew-highlight/50"
                  />
                  <span className="text-sm text-mew-text font-medium hidden sm:inline">
                    {user.personaName}
                  </span>
                  <button
                    onClick={logout}
                    className="text-xs text-mew-muted hover:text-mew-text transition-colors"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button onClick={login} className="hover:opacity-80 transition-opacity">
                  <img
                    src="https://community.fastly.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
                    alt="Sign in through Steam"
                    height="35"
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8">
        {page === 'create' && <PackBuilder />}
        {page === 'browse' && <LibraryBrowser />}
        {page === 'instructions' && <InstructionsPage />}
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
