import React from 'react';
import { ArrowRight, BookOpen, Lock, PlusCircle, Share2, ShieldCheck } from 'lucide-react';
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
  const showActiveTriviaToggle = status === 'playing' && wordTriviaUnlocked;
  const showPostGame = status !== 'playing' || canSaveStreak;

  if (!showActiveTriviaToggle && !showPostGame) {
    return null;
  }

  return (
    <div
      data-testid="rewarded-dock"
      className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 px-3 py-1"
    >
      {showActiveTriviaToggle && (
        <button
          type="button"
          data-testid="toggle-word-trivia-btn"
          aria-expanded={wordTriviaOpen}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleWordTrivia();
          }}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold wv-accent-pill transition-colors cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{wordTriviaOpen ? 'Hide Clue' : 'Show Clue'}</span>
        </button>
      )}

      {status === 'lost' && !extraAttemptGranted && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onWatchAdExtraAttempt();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer"
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
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-emerald-700/40 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/60 whitespace-nowrap shrink-0 cursor-pointer"
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
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2 text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
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
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Summary</span>
          </button>

          {mode === 'sprint' &&
            (isCategoryLockedForNext ? (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onWatchAdUnlockCategory();
                }}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>+5 Plays (Ad)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onNewSprintWord();
                }}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Next Word</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
        </>
      )}
    </div>
  );
};
