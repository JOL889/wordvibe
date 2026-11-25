import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Lock,
  PlusCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { WordLength } from '../data/words';
import type { GameMode, PuzzleStatus, StatsData } from '../game/puzzleLogic';
import type { CompletedWordSquare } from '../game/wordSquareLogic';

interface SummaryModalProps {
  open: boolean;
  mode: GameMode;
  length: WordLength;
  categoryName: string;
  isPremiumCategory: boolean;
  categoryPlaysRemaining: number;
  status: PuzzleStatus;
  target: string;
  guessesCount: number;
  maxAttempts: number;
  puzzleNumber: number;
  countdown: string;
  stats: StatsData;
  extraAttemptGranted: boolean;
  canSaveStreak: boolean;
  canDoubleXp?: boolean;
  lastPuzzleXpEarned?: number;
  personalizedReason?: string;
  personalizedCulturalNote?: string;
  funFact?: string;
  completedWordSquare: CompletedWordSquare | null;
  onClose: () => void;
  onShare: () => void;
  onWatchAdExtraAttempt: () => void;
  onWatchAdSaveStreak: () => void;
  onWatchAdDoubleXp?: () => void;
  onWatchAdUnlockCategory: () => void;
  onPlaySprint: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  open,
  mode,
  length,
  categoryName,
  isPremiumCategory,
  categoryPlaysRemaining,
  status,
  target,
  guessesCount,
  maxAttempts,
  puzzleNumber,
  countdown,
  stats,
  extraAttemptGranted,
  canSaveStreak,
  canDoubleXp = false,
  lastPuzzleXpEarned = 0,
  personalizedReason,
  personalizedCulturalNote,
  funFact,
  completedWordSquare,
  onClose,
  onShare,
  onWatchAdExtraAttempt,
  onWatchAdSaveStreak,
  onWatchAdDoubleXp,
  onWatchAdUnlockCategory,
  onPlaySprint,
}) => {
  if (!open) return null;

  const isBoardWon = status === 'won';
  const isBoardFinished = status !== 'playing';
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const maxDist = Math.max(1, ...Object.values(stats.guessDistribution || {}));

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
              {mode === 'daily' ? `Daily Challenge · #${puzzleNumber}` : 'Practice Sprint'}
              {` · ${length}-Letter`}
            </p>
            <h2
              id="summary-modal-title"
              className="mt-1 font-display text-2xl font-bold wv-text"
            >
              {isBoardWon
                ? 'Word Solved!'
                : status === 'lost'
                ? 'Round Complete'
                : 'WordVibe Statistics'}
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

        {isBoardFinished && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border wv-border wv-card-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-5 w-5 shrink-0 ${isBoardWon ? 'text-emerald-500' : 'text-amber-500'}`}
                  aria-hidden="true"
                />
                <div>
                  <span className="text-xs wv-text-muted">Answer</span>
                  <p className="font-mono-tabular text-base font-bold tracking-wider wv-text">
                    {target}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs wv-text-muted">Attempts</span>
                <p className="font-mono-tabular text-sm font-bold wv-text">
                  {isBoardWon ? `${guessesCount}/${maxAttempts}` : `X/${maxAttempts}`}
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
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-800 dark:text-amber-100">
                <span className="font-bold text-amber-700 dark:text-amber-300">Did You Know? </span>
                <span>{funFact}</span>
              </div>
            )}

            {completedWordSquare && (
              <div
                data-testid="summary-cross-words"
                className="rounded-xl border wv-border wv-card-muted px-3.5 py-3 text-xs"
              >
                <div className="font-bold wv-text">
                  Solved Cross-Grid ({completedWordSquare.length}×{completedWordSquare.length})
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 font-mono-tabular text-[11px] wv-text">
                  <div>
                    <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Across</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{completedWordSquare.rows.join(' · ')}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Down</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{completedWordSquare.cols.join(' · ')}</p>
                  </div>
                </div>
              </div>
            )}
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

        {/* Guess Distribution */}
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider wv-text-muted">
            Guess Distribution
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map((attempt) => {
            const count = stats.guessDistribution?.[attempt] || 0;
            const widthPct = Math.max(8, Math.round((count / maxDist) * 100));
            const highlight = isBoardWon && guessesCount === attempt;
            return (
              <div key={attempt} className="flex items-center gap-2 text-xs">
                <span className="w-3 font-mono-tabular font-semibold wv-text-muted">{attempt}</span>
                <div className="flex-1">
                  <div
                    style={{ width: `${count === 0 ? 8 : widthPct}%` }}
                    className={`flex h-5 items-center justify-end rounded px-1.5 font-mono-tabular text-[11px] font-bold ${
                      highlight
                        ? 'wv-accent-btn'
                        : count > 0
                        ? 'bg-zinc-600 text-white dark:bg-zinc-700'
                        : 'wv-card-muted wv-text-muted'
                    }`}
                  >
                    {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {((status === 'lost' && !extraAttemptGranted) ||
          canSaveStreak ||
          (isBoardWon && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp)) && (
          <div className="mt-4 flex flex-col gap-2 border-t wv-border pt-4">
            {status === 'lost' && !extraAttemptGranted && (
              <button
                type="button"
                onClick={onWatchAdExtraAttempt}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for +1 Extra Attempt</span>
              </button>
            )}
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
            {isBoardFinished && (
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
                onClick={onPlaySprint}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <span>{mode === 'daily' ? 'Practice Sprint' : 'Next Sprint Word'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
