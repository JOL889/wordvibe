import React from 'react';
import { ArrowRight, Lock, Share2, ShieldCheck } from 'lucide-react';
import type { PuzzleStatus } from '../game/puzzleLogic';
import type { SessionPlayMode } from '../game/settingsLogic';

interface RewardedDockProps {
  sessionMode: SessionPlayMode;
  status: PuzzleStatus;
  canSaveStreak: boolean;
  previousLostStreak: number;
  isCategoryLockedForNext: boolean;
  onWatchAdSaveStreak: () => void;
  onWatchAdUnlockCategory: () => void;
  onNextBoard: () => void;
  onShareResult: () => void;
  onOpenSummary: () => void;
}

export const RewardedDock: React.FC<RewardedDockProps> = ({
  sessionMode,
  status,
  canSaveStreak,
  previousLostStreak,
  isCategoryLockedForNext,
  onWatchAdSaveStreak,
  onWatchAdUnlockCategory,
  onNextBoard,
  onShareResult,
  onOpenSummary,
}) => {
  const showPostGame = status !== 'playing' || canSaveStreak;
  if (!showPostGame) {
    return null;
  }

  return (
    <div
      data-testid="rewarded-dock"
      className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 px-3 py-1"
    >
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
                onNextBoard();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{sessionMode === 'level_climb' ? 'Next Board' : 'Next Sprint Board'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
