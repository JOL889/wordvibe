import React from 'react';
import { ArrowDown, ArrowRight, CheckCircle2, Lock, Share2, ShieldCheck, Trophy, X, Zap } from 'lucide-react';
import type { WordLength } from '../data/words';
import type { CrosswordBoardState, CrosswordLevelClimbState } from '../game/crosswordLogic';
import { CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD, CROSSWORD_LEVEL_CLIMB_TOTAL } from '../game/crosswordLogic';
import type { StatsData } from '../game/puzzleLogic';
import { FIVE_LEVEL_META, type FiveDifficultyLevel, type SessionPlayMode } from '../game/settingsLogic';

interface SummaryModalProps {
  open: boolean;
  sessionMode: SessionPlayMode;
  level: FiveDifficultyLevel;
  climbState: CrosswordLevelClimbState;
  length: WordLength;
  categoryName: string;
  isPremiumCategory: boolean;
  categoryPlaysRemaining: number;
  puzzleNumber: number;
  countdown: string;
  stats: StatsData;
  board: CrosswordBoardState | null;
  canSaveStreak: boolean;
  canDoubleXp?: boolean;
  lastPuzzleXpEarned?: number;
  onClose: () => void;
  onShare: () => void;
  onWatchAdSaveStreak: () => void;
  onWatchAdDoubleXp?: () => void;
  onWatchAdUnlockCategory: () => void;
  onNextBoard: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  open,
  sessionMode,
  level,
  climbState,
  length,
  categoryName,
  isPremiumCategory,
  categoryPlaysRemaining,
  puzzleNumber,
  countdown,
  stats,
  board,
  canSaveStreak,
  canDoubleXp = false,
  lastPuzzleXpEarned = 0,
  onClose,
  onShare,
  onWatchAdSaveStreak,
  onWatchAdDoubleXp,
  onWatchAdUnlockCategory,
  onNextBoard,
}) => {
  if (!open) return null;

  const isBoardWon = board?.status === 'won';
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const levelMeta = FIVE_LEVEL_META[level];
  const solvedRows = board ? board.solvedRows.filter(Boolean).length : 0;
  const solvedCols = board ? board.solvedCols.filter(Boolean).length : 0;

  return (
    <div
      data-testid="summary-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs"
    >
      <div className="my-auto w-full max-w-md rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
              {sessionMode === 'level_climb'
                ? `Level Climb · ${levelMeta.label} · ${length}×${length}`
                : `Endless Sprint · ${levelMeta.label} · ${length}×${length}`}
              {' · '}#{puzzleNumber}
            </p>
            <h2
              id="summary-modal-title"
              className="mt-1 font-display text-2xl font-bold wv-text"
            >
              {isBoardWon ? 'Crossword Complete!' : 'WordVibe Statistics'}
            </h2>
            <p className="mt-0.5 text-xs wv-text-muted">{categoryName}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {isBoardWon && board && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border wv-border wv-card-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-xs wv-text-muted">All {board.length * 2} Linked Words Solved</span>
                  <p className="font-mono-tabular text-sm font-bold wv-text">
                    {solvedRows} Across · {solvedCols} Down
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs wv-text-muted">Checks / Hints</span>
                <p className="font-mono-tabular text-sm font-bold wv-text">
                  {board.wrongChecks} miss · {board.hintsUsed} hints
                </p>
              </div>
            </div>

            {sessionMode === 'level_climb' && (
              <div className="rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-xs">
                <div className="flex items-center justify-between font-bold wv-text">
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                    {climbState.promotedToLevel
                      ? `Promoted to ${FIVE_LEVEL_META[climbState.promotedToLevel].label}!`
                      : `Level Climb Progress (${levelMeta.label})`}
                  </span>
                  <span className="font-mono-tabular wv-accent-text">
                    {climbState.roundPassedCount}/{CROSSWORD_LEVEL_CLIMB_TOTAL} Clean (Need {CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD})
                  </span>
                </div>
              </div>
            )}

            <div
              data-testid="summary-cross-words"
              className="rounded-xl border wv-border wv-card-muted px-3.5 py-3 text-xs"
            >
              <div className="font-bold wv-text">
                Solved Crossword Words ({board.length}×{board.length})
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 font-mono-tabular text-[11px] wv-text">
                <div>
                  <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Across</span>
                  </div>
                  <p className="mt-1 leading-relaxed">{board.solution.rows.join(' · ')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Down</span>
                  </div>
                  <p className="mt-1 leading-relaxed">{board.solution.cols.join(' · ')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 Key Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{stats.gamesPlayed}</div>
            <div className="mt-0.5 text-[11px] font-medium wv-text-muted">Played</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{winRate}%</div>
            <div className="mt-0.5 text-[11px] font-medium wv-text-muted">Win Rate</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-accent-text">
              {stats.currentStreak}
            </div>
            <div className="mt-0.5 text-[11px] font-medium wv-text-muted">Streak</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{stats.bestStreak}</div>
            <div className="mt-0.5 text-[11px] font-medium wv-text-muted">Best</div>
          </div>
        </div>

        {(canSaveStreak || (isBoardWon && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp)) && (
          <div className="mt-4 flex flex-col gap-2 border-t wv-border pt-4">
            {isBoardWon && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp && (
              <button
                type="button"
                data-testid="puzzle-double-xp-btn"
                onClick={onWatchAdDoubleXp}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for 2x Weekly XP (+{lastPuzzleXpEarned} XP)</span>
              </button>
            )}
            {canSaveStreak && (
              <button
                type="button"
                onClick={onWatchAdSaveStreak}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border wv-accent-pill px-4 py-2.5 text-sm font-bold cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad to Save Streak ({stats.previousLostStreak} days)</span>
              </button>
            )}
          </div>
        )}

        {isPremiumCategory && (
          <div className="mt-4 flex items-center justify-between rounded-xl border wv-border wv-card-muted px-3.5 py-2 text-xs">
            <span className="font-semibold wv-text">{categoryName} Access</span>
            <span className="font-mono-tabular font-bold wv-accent-text">
              {categoryPlaysRemaining > 0
                ? `${categoryPlaysRemaining} ${categoryPlaysRemaining === 1 ? 'play' : 'plays'} left`
                : '0 plays left · Watch Ad for +5'}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t wv-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-medium wv-text-muted">Daily Reset</div>
            <div className="font-mono-tabular text-lg font-bold wv-text">{countdown}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isBoardWon && (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span>Share</span>
              </button>
            )}

            {isPremiumCategory && categoryPlaysRemaining <= 0 ? (
              <button
                type="button"
                onClick={onWatchAdUnlockCategory}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 cursor-pointer whitespace-nowrap"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>+5 Plays (Ad)</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="summary-next-board-btn"
                onClick={onNextBoard}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <span>{sessionMode === 'level_climb' ? 'Next Board' : 'Next Sprint Board'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
