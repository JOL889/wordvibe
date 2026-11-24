import React from 'react';
import { ArrowDown, ArrowRight, Lock, PlusCircle, Share2, ShieldCheck, X, Zap } from 'lucide-react';
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

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const rows = [1, 2, 3, 4, 5, 6];
  if (stats.guessDistribution[7] > 0 || maxAttempts > 6) {
    rows.push(7);
  }
  const maxDist = Math.max(1, ...rows.map((r) => stats.guessDistribution[r] || 0));

  return (
    <div
      data-testid="summary-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto w-full max-w-md rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {mode === 'daily'
                ? `Daily Challenge #${puzzleNumber} · ${categoryName} · ${length}-Letter`
                : `Practice Sprint · ${categoryName} · ${length}-Letter`}
            </p>
            <h2
              id="summary-modal-title"
              className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              {status === 'won'
                ? 'Puzzle Solved'
                : status === 'lost'
                ? 'Out of Attempts'
                : 'Statistics & Streaks'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Answer Reveal & Completed H/V Matrix when round finished */}
        {status !== 'playing' && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Answer</span>
                <p
                  data-testid="answer-reveal"
                  className="font-mono-tabular text-lg font-bold tracking-widest text-zinc-900 dark:text-zinc-50"
                >
                  {target}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Result</span>
                <p className="font-mono-tabular text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {status === 'won' ? `${guessesCount}/${maxAttempts} tries` : `X/${maxAttempts}`}
                </p>
              </div>
            </div>

            {personalizedCulturalNote && (
              <div
                data-testid="summary-cultural-note"
                className="rounded-lg border border-emerald-700/25 dark:border-emerald-500/30 bg-emerald-50/55 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs"
              >
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  {personalizedReason || 'Trending Story & Word Insight'}
                </p>
                <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {personalizedCulturalNote}
                </p>
              </div>
            )}

            {funFact && (
              <div
                data-testid="summary-fun-fact"
                className="rounded-lg border border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs"
              >
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Did You Know?{' '}
                </span>
                <span className="leading-relaxed text-zinc-800 dark:text-amber-100">{funFact}</span>
              </div>
            )}

            {completedWordSquare && (
              <div
                data-testid="summary-cross-words"
                className="rounded-lg border border-stone-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70 px-3.5 py-2.5 text-xs"
              >
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  Completed Cross-Grid ({length}×{length} English Words)
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2 font-mono-tabular text-[11px] text-zinc-600 dark:text-zinc-300">
                  <div>
                    <div className="flex items-center gap-1 font-sans font-medium text-emerald-700 dark:text-emerald-400">
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      <span>Across</span>
                    </div>
                    <p className="mt-0.5 leading-relaxed">
                      {completedWordSquare.rows.join(' · ')}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 font-sans font-medium text-emerald-700 dark:text-emerald-400">
                      <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      <span>Down</span>
                    </div>
                    <p className="mt-0.5 leading-relaxed">
                      {completedWordSquare.cols.join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4 Key Stats */}
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg border border-stone-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.gamesPlayed}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Played
            </div>
          </div>
          <div className="rounded-lg border border-stone-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {winRate}%
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Win Rate
            </div>
          </div>
          <div className="rounded-lg border border-stone-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {stats.currentStreak}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Streak
            </div>
          </div>
          <div className="rounded-lg border border-stone-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.bestStreak}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Best Streak
            </div>
          </div>
        </div>

        {/* Guess Distribution */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Guess Distribution
          </h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {rows.map((attemptNum) => {
              const count = stats.guessDistribution[attemptNum] || 0;
              const pct = Math.max(8, Math.round((count / maxDist) * 100));
              const isCurrentWin = status === 'won' && guessesCount === attemptNum;

              return (
                <div key={attemptNum} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-mono-tabular font-semibold text-zinc-600 dark:text-zinc-400">
                    {attemptNum === 7 ? '+1' : attemptNum}
                  </span>
                  <div className="flex-1">
                    <div
                      className={`flex h-5 items-center justify-end rounded-sm px-2 font-mono-tabular text-[11px] font-semibold text-white transition-all ${
                        isCurrentWin
                          ? 'bg-emerald-700 dark:bg-emerald-600'
                          : count > 0
                          ? 'bg-zinc-600 dark:bg-zinc-700'
                          : 'bg-stone-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                      style={{ width: count > 0 ? `${pct}%` : '24px' }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opt-in Rewarded Lifelines / 2x Weekly XP */}
        {(status === 'lost' && !extraAttemptGranted) || canSaveStreak || (status === 'won' && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp) ? (
          <div className="mt-5 flex flex-col gap-2 border-t border-stone-200 dark:border-zinc-800 pt-4">
            {status === 'won' && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp && (
              <button
                type="button"
                data-testid="puzzle-double-xp-btn"
                onClick={onWatchAdDoubleXp}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for 2x Weekly XP (+{lastPuzzleXpEarned} XP)</span>
              </button>
            )}
            {status === 'lost' && !extraAttemptGranted && (
              <button
                type="button"
                onClick={onWatchAdExtraAttempt}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for +1 Extra Attempt</span>
              </button>
            )}
            {canSaveStreak && (
              <button
                type="button"
                onClick={onWatchAdSaveStreak}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/60 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad to Save Streak ({stats.previousLostStreak} days)</span>
              </button>
            )}
          </div>
        ) : null}

        {/* Premium category remaining plays bar */}
        {isPremiumCategory && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-100/80 dark:bg-zinc-950/70 px-3.5 py-2 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {categoryName} Access
            </span>
            <span
              className={`font-mono-tabular font-semibold ${
                categoryPlaysRemaining > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {categoryPlaysRemaining > 0
                ? `${categoryPlaysRemaining} ${categoryPlaysRemaining === 1 ? 'play' : 'plays'} left`
                : '0 plays left · Watch Ad for +5'}
            </span>
          </div>
        )}

        {/* Footer Countdown + Share + Sprint CTA */}
        <div className="mt-5 flex flex-col gap-3 border-t border-stone-200 dark:border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Next Daily Puzzle
            </div>
            <div className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {countdown}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status !== 'playing' && (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span>Share Result</span>
              </button>
            )}

            {isPremiumCategory && categoryPlaysRemaining <= 0 ? (
              <button
                type="button"
                onClick={onWatchAdUnlockCategory}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 cursor-pointer whitespace-nowrap"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for +5 Plays</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlaySprint}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer whitespace-nowrap"
              >
                <span>{mode === 'sprint' ? 'Next Word' : 'Practice Sprint'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
