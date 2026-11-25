import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Lock,
  PlusCircle,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import type { GameMode, PuzzleStatus } from '../game/puzzleLogic';

interface RewardedDockProps {
  mode: GameMode;
  status: PuzzleStatus;
  wordTriviaUnlocked: boolean;
  wordTriviaOpen: boolean;
  extraAttemptGranted: boolean;
  canSaveStreak: boolean;
  previousLostStreak: number;
  isCategoryLockedForNext: boolean;
  onToggleWordTrivia: () => void;
  onWatchAdExtraAttempt: () => void;
  onWatchAdSaveStreak: () => void;
  onWatchAdUnlockCategory: () => void;
  onNewSprintWord: () => void;
  onShareResult: () => void;
  onOpenSummary: () => void;
}

export const RewardedDock: React.FC<RewardedDockProps> = ({
  mode,
  status,
  wordTriviaUnlocked,
  wordTriviaOpen,
  extraAttemptGranted,
  canSaveStreak,
  previousLostStreak,
  isCategoryLockedForNext,
  onToggleWordTrivia,
  onWatchAdExtraAttempt,
  onWatchAdSaveStreak,
  onWatchAdUnlockCategory,
  onNewSprintWord,
  onShareResult,
  onOpenSummary,
}) => {
  const showExtraAttempt = status === 'lost' && !extraAttemptGranted;
  const showWordTriviaBtn = status === 'playing' && wordTriviaUnlocked;
  const showPostGame = status !== 'playing' || canSaveStreak || showWordTriviaBtn;

  if (!showPostGame) {
    return null;
  }

  return (
    <div
      data-testid="rewarded-dock"
      className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 px-3 py-1"
    >
      {showWordTriviaBtn && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleWordTrivia();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-border wv-card px-4 py-2 text-xs font-bold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>{wordTriviaOpen ? 'Hide Clue' : 'Show Clue'}</span>
        </button>
      )}

      {showExtraAttempt && (
        <button
          type="button"
          data-testid="dock-extra-attempt-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onWatchAdExtraAttempt();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>+1 Attempt (Ad)</span>
        </button>
      )}

      {canSaveStreak && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onWatchAdSaveStreak();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-accent-pill px-4 py-2 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Save Streak ({previousLostStreak})</span>
        </button>
      )}

      {status !== 'playing' && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onShareResult();
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSummary();
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-border wv-card px-4 py-2 text-xs font-bold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Summary</span>
          </button>

          {isCategoryLockedForNext ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onWatchAdUnlockCategory();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>+5 Plays (Ad)</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="dock-next-board-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onNewSprintWord();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{mode === 'daily' ? 'Practice Sprint' : 'Next Sprint Word'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
