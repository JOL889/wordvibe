import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Lock,
  Share2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import type { CrosswordBoardState } from '../game/crosswordLogic';
import type { SessionPlayMode } from '../game/settingsLogic';

interface RewardedDockProps {
  sessionMode: SessionPlayMode;
  board: CrosswordBoardState;
  cluePanelOpen: boolean;
  canSaveStreak: boolean;
  previousLostStreak: number;
  isCategoryLockedForNext: boolean;
  onToggleCluePanel: () => void;
  onWatchAdSaveStreak: () => void;
  onWatchAdUnlockCategory: () => void;
  onNewBoard: () => void;
  onShareResult: () => void;
  onInviteFriends?: () => void;
  onOpenSummary: () => void;
}

export const RewardedDock: React.FC<RewardedDockProps> = ({
  sessionMode,
  board,
  cluePanelOpen,
  canSaveStreak,
  previousLostStreak,
  isCategoryLockedForNext,
  onToggleCluePanel,
  onWatchAdSaveStreak,
  onWatchAdUnlockCategory,
  onNewBoard,
  onShareResult,
  onInviteFriends,
  onOpenSummary,
}) => {
  const unlockedCount = Object.keys(board.unlockedClues).length;
  const showCluesBtn = board.status === 'playing' && unlockedCount > 0;
  const showDock = board.status !== 'playing' || canSaveStreak || showCluesBtn;

  if (!showDock) {
    return null;
  }

  return (
    <div
      data-testid="rewarded-dock"
      className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 px-3 py-1"
    >
      {showCluesBtn && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleCluePanel();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-border wv-card px-4 py-2 text-xs sm:text-sm font-bold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>{cluePanelOpen ? 'Hide Clues' : `Show Clues (${unlockedCount})`}</span>
        </button>
      )}

      {canSaveStreak && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onWatchAdSaveStreak();
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-accent-pill px-4 py-2 text-xs sm:text-sm font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Save Streak ({previousLostStreak})</span>
        </button>
      )}

      {board.status !== 'playing' && (
        <>
          <button
            type="button"
            data-testid="dock-share-progress-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onShareResult();
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-3.5 py-2 text-xs sm:text-sm font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share Progress</span>
          </button>

          {onInviteFriends && (
            <button
              type="button"
              data-testid="dock-invite-friends-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onInviteFriends();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-border wv-card px-3.5 py-2 text-xs sm:text-sm font-bold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4 wv-accent-text" aria-hidden="true" />
              <span>Invite Friends</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSummary();
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border wv-border wv-card px-4 py-2 text-xs sm:text-sm font-bold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
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
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2 text-xs sm:text-sm font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>Unlock Topic</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="dock-next-board-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onNewBoard();
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2 text-xs sm:text-sm font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{sessionMode === 'level_climb' ? 'Next Climb Board' : 'Next Crossword'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
