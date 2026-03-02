import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { PackBuilder } from '@/components/pack-builder/PackBuilder';
import { LibraryBrowser } from '@/components/library/LibraryBrowser';
import { InstructionsPage } from '@/components/instructions/InstructionsPage';
import { useAuth } from '@/hooks/useAuth';

function App() {
  const { user, loading, login, logout } = useAuth();
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `font-medium text-sm transition-colors ${
      isActive ? 'text-mew-accent' : 'text-mew-muted hover:text-mew-text'
    }`;

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
              <NavLink to="/create" className={navLinkClass}>
                Create
              </NavLink>
              <NavLink to="/browse" className={navLinkClass}>
                Browse Packs
              </NavLink>
              <NavLink to="/instructions" className={navLinkClass}>
                Instructions
              </NavLink>
            </nav>

            <div className="border-l border-mew-highlight/30 pl-4">
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-mew-highlight/30 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.personaName}
                      className="w-8 h-8 rounded-full border border-mew-highlight/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-mew-highlight/50 flex items-center justify-center text-xs text-mew-text">
                      {user.personaName.charAt(0).toUpperCase()}
                    </div>
                  )}
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
        {/* TODO: Split route-level bundles so /browse can load without create-page recorder code. */}
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<PackBuilder />} />
          <Route path="/browse" element={<LibraryBrowser />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="*" element={<Navigate to="/create" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-mew-highlight/20 py-6 mt-12">
        <p className="text-center text-mew-muted text-sm">
          Community tool — not affiliated with Edmund McMillen or Tyler Glaiel.
          Voice packs are compatible with Mewtator for Mewgenics.
        </p>
      </footer>
    </div>
  );
}

export default App;
