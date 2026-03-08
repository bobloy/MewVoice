interface ResumeSessionModalProps {
  savedAt: Date;
  onResume: () => void;
  onDiscard: () => void;
}

export function ResumeSessionModal({ savedAt, onResume, onDiscard }: ResumeSessionModalProps) {
  const timeAgo = formatTimeAgo(savedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mew-surface border border-mew-border/50 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-2">Resume previous session?</h2>
        <p className="text-mew-muted text-sm mb-6">
          You have an unsaved recording session from{' '}
          <span className="text-mew-text">{timeAgo}</span>. Would you like to pick up where you left
          off, or start fresh?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full bg-mew-accent hover:brightness-125 text-white py-2.5 px-4 rounded-lg font-semibold transition-all"
          >
            Resume session
          </button>
          <button
            onClick={onDiscard}
            className="w-full bg-transparent hover:bg-mew-bg border border-mew-border/50 text-mew-muted hover:text-mew-text py-2.5 px-4 rounded-lg font-semibold transition-all"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
