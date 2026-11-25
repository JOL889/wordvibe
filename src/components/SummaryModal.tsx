import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Crown,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD,
  CROSSWORD_LEVEL_CLIMB_TOTAL,
  getCrosswordProgressSummary,
  type CrosswordBoardState,
  type CrosswordLevelClimbState,
} from '../game/crosswordLogic';
import type { StatsData } from '../game/puzzleLogic';
import { FIVE_LEVEL_META, type SessionPlayMode } from '../game/settingsLogic';

interface SummaryModalProps {
  open: boolean;
  sessionMode: SessionPlayMode;
  board: CrosswordBoardState;
  climbState: CrosswordLevelClimbState;
  categoryName: string;
  isPremiumCategory: boolean;
  categoryPlaysRemaining: number;
  countdown: string;
  stats: StatsData;
  canSaveStreak: boolean;
  canDoubleXp?: boolean;
  lastPuzzleXpEarned?: number;
  personalizedReason?: string;
  personalizedCulturalNote?: string;
  funFact?: string;
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
  board,
  climbState,
  categoryName,
  isPremiumCategory,
  categoryPlaysRemaining,
  countdown,
  stats,
  canSaveStreak,
  canDoubleXp = false,
  lastPuzzleXpEarned = 0,
  personalizedReason,
  personalizedCulturalNote,
  funFact,
  onClose,
  onShare,
  onWatchAdSaveStreak,
  onWatchAdDoubleXp,
  onWatchAdUnlockCategory,
  onNextBoard,
}) => {
  if (!open) return null;

  const isBoardWon = board.status === 'won';
  const prog = getCrosswordProgressSummary(board);
  const levelLabel = FIVE_LEVEL_META[board.level]?.label || board.level;
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

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
              {sessionMode === 'level_climb' ? 'Level Climb' : 'Endless Sprint'} · {levelLabel} ·{' '}
              {board.length}×{board.length}
            </p>
            <h2 id="summary-modal-title" className="mt-1 font-display text-2xl font-bold wv-text">
              {isBoardWon ? 'Crossword Solved!' : 'Crossword Stats'}
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

        {/* Climb Stage Status Banner */}
        {sessionMode === 'level_climb' && (
          <div className="mt-3.5 rounded-xl border wv-border wv-card-muted p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold wv-accent-text">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>
                  {climbState.stageComplete
                    ? climbState.promotedToLevel
                      ? `Level Up to ${FIVE_LEVEL_META[climbState.promotedToLevel].label}!`
                      : `Stage Complete (${climbState.roundPassedCount}/${CROSSWORD_LEVEL_CLIMB_TOTAL})`
                    : `Climb Progress · ${FIVE_LEVEL_META[climbState.currentLevel].label}`}
                </span>
              </span>
              <span className="font-mono-tabular font-bold wv-text">
                {climbState.roundIndex}/{CROSSWORD_LEVEL_CLIMB_TOTAL}
              </span>
            </div>
            <p className="mt-1 wv-text-muted">
              {climbState.stageComplete
                ? climbState.promotedToLevel
                  ? `You passed ${climbState.roundPassedCount}/10 cleanly (8 required). Next round begins at ${FIVE_LEVEL_META[climbState.promotedToLevel].label}!`
                  : `Scored ${climbState.roundPassedCount}/10 clean boards. Pass at least ${CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD}/10 to unlock the next level.`
                : `${climbState.roundPassedCount} clean passes so far (need ${CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD}/${CROSSWORD_LEVEL_CLIMB_TOTAL} with ≤4 wrong checks to promote).`}
            </p>
          </div>
        )}

        {isBoardWon && (
          <div className="mt-3.5 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border wv-border wv-card-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                <div>
                  <span className="text-xs wv-text-muted">Linked Words Solved</span>
                  <p className="font-mono-tabular text-base font-bold wv-text">
                    {prog.solvedWordsCount} / {prog.totalWords}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs wv-text-muted">Wrong Checks / Hints</span>
                <p className="font-mono-tabular text-sm font-bold wv-text">
                  {board.wrongChecks} err · {board.hintsUsed} hints
                </p>
              </div>
            </div>

            {personalizedReason && (
              <div className="rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold wv-accent-text">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{personalizedReason}</span>
                </div>
                {personalizedCulturalNote && (
                  <p className="mt-1 leading-relaxed wv-text-muted">{personalizedCulturalNote}</p>
                )}
              </div>
            )}

            {funFact && (
              <div className="rounded-xl border border-amber-500/35 wv-card-muted px-3.5 py-2.5 text-xs leading-relaxed wv-text">
                <span className="font-bold text-amber-500">Did You Know? </span>
                <span>{funFact}</span>
              </div>
            )}

            <div
              data-testid="summary-cross-words"
              className="rounded-xl border wv-border wv-card-muted px-3.5 py-3 text-xs"
            >
              <div className="font-bold wv-text">
                Completed Linked Grid ({board.length}×{board.length})
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
                ? `${categoryPlaysRemaining} plays left`
                : '0 plays left · Watch Ad for +5'}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t wv-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <div>
              <div className="text-[11px] font-medium wv-text-muted">Daily Cycle Reset</div>
              <div className="font-mono-tabular text-sm font-bold wv-text">{countdown}</div>
            </div>
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
                <span>
                  {sessionMode === 'level_climb'
                    ? climbState.stageComplete
                      ? climbState.promotedToLevel
                        ? `Start ${FIVE_LEVEL_META[climbState.promotedToLevel].shortLabel}`
                        : 'Retry Stage'
                      : 'Next Climb Board'
                    : 'Next Crossword'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
