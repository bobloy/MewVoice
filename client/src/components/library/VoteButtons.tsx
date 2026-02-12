interface VoteButtonsProps {
  score: number;
  userVote: 1 | -1 | 0 | null | undefined;
  isLoggedIn: boolean;
  onVote: (vote: 1 | -1 | 0) => void;
  onLoginRequired: () => void;
}

export function VoteButtons({ score, userVote, isLoggedIn, onVote, onLoginRequired }: VoteButtonsProps) {
  const handleUp = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    onVote(userVote === 1 ? 0 : 1);
  };

  const handleDown = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    onVote(userVote === -1 ? 0 : -1);
  };

  const upClass =
    userVote === 1
      ? 'text-mew-accent'
      : 'text-mew-muted hover:text-mew-accent';

  const downClass =
    userVote === -1
      ? 'text-red-400'
      : 'text-mew-muted hover:text-red-400';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleUp}
        className={`text-sm leading-none transition-colors ${upClass}`}
        title={userVote === 1 ? 'Remove upvote' : 'Upvote'}
      >
        ▲
      </button>
      <span className={`text-sm font-bold min-w-[1.25rem] text-center ${score > 0 ? 'text-mew-accent' : score < 0 ? 'text-red-400' : 'text-mew-muted'}`}>
        {score}
      </span>
      <button
        onClick={handleDown}
        className={`text-sm leading-none transition-colors ${downClass}`}
        title={userVote === -1 ? 'Remove downvote' : 'Downvote'}
      >
        ▼
      </button>
    </div>
  );
}
