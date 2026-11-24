import React from 'react';
import { ChevronDown, Compass, Lock, Sparkles, Unlock } from 'lucide-react';
import { CATEGORIES, type PuzzleCategory } from '../data/categories';
import type { WordLength } from '../data/words';
import type { GameMode } from '../game/puzzleLogic';
import { soundService } from '../services/soundService';

interface ModeControlsProps {
  mode: GameMode;
  length: WordLength;
  autoLengthMode?: boolean;
  activeCategory: PuzzleCategory;
  categoryPlaysRemaining: number;
  puzzleNumber: number;
  countdown: string;
  currentStreak: number;
  sprintSolved: number;
  isPersonalizedRound?: boolean;
  personalizedClue?: string;
  personalizedReason?: string;
  loadingPersonalizedPuzzle?: boolean;
  onPlayPersonalizedPuzzle?: () => void;
  onChangeMode: (nextMode: GameMode) => void;
  onChangeLength: (nextLength: WordLength) => void;
  onToggleAutoLength?: () => void;
  onOpenCategories: () => void;
}

const LENGTHS: WordLength[] = [4, 5, 6];

export const ModeControls: React.FC<ModeControlsProps> = ({
  mode,
  length,
  autoLengthMode = false,
  activeCategory,
  categoryPlaysRemaining,
  puzzleNumber,
  countdown,
  currentStreak,
  sprintSolved,
  isPersonalizedRound = false,
  personalizedClue,
  personalizedReason,
  loadingPersonalizedPuzzle = false,
  onPlayPersonalizedPuzzle,
  onChangeMode,
  onChangeLength,
  onToggleAutoLength,
  onOpenCategories,
}) => {
  return (
    <section
      aria-label="Puzzle mode, topic, and word length"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-4 pt-1 sm:pt-1.5 pb-0.5"
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:justify-between">
        {/* Segmented Game Mode Selector */}
        <div
          role="group"
          aria-label="Game mode"
          className="inline-flex items-center rounded-lg bg-stone-200/60 dark:bg-zinc-800/80 p-0.5"
        >
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeMode('daily');
            }}
            aria-pressed={mode === 'daily'}
            className={`min-h-10 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'daily'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Daily Challenge
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeMode('sprint');
            }}
            aria-pressed={mode === 'sprint'}
            className={`min-h-10 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'sprint'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Practice Sprint
          </button>
        </div>

        {/* Segmented Word Length Selector + Auto 4–6 Probability Toggle */}
        <div
          role="group"
          aria-label="Word length"
          className="inline-flex items-center rounded-lg bg-stone-200/60 dark:bg-zinc-800/80 p-0.5"
        >
          {onToggleAutoLength && (
            <button
              type="button"
              data-testid="length-auto-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleAutoLength();
              }}
              aria-pressed={autoLengthMode}
              title="Vary word length across 4, 5, or 6 letters"
              className={`min-h-10 rounded-md px-2 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                autoLengthMode
                  ? 'wv-accent-btn shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Auto 4–6
            </button>
          )}
          {LENGTHS.map((len) => (
            <button
              key={len}
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeLength(len);
              }}
              aria-pressed={!autoLengthMode && length === len}
              className={`min-h-10 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                length === len
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {len}L
            </button>
          ))}
        </div>
      </div>

      {/* 5-Level Difficulty Picker for Puzzle */}
      <div className="flex w-full flex-col gap-1 rounded-xl border border-stone-200/85 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-2.5 shadow-[0_1px_2px_rgba(24,24,27,0.03)] amoled-surface">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Puzzle Level (5 Tiers):
          </span>
          <span className="font-mono-tabular text-[10px] font-semibold text-[#1E6B52] dark:text-emerald-400">
            Novice · Beginner · Intermed. · Expert · Legendary
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {(
            [
              { id: 'novice', label: 'Novice' },
              { id: 'beginner', label: 'Beginner' },
              { id: 'intermediate', label: 'Intermed.' },
              { id: 'expert', label: 'Expert' },
              { id: 'legendary', label: 'Legendary' },
            ] as const
          ).map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                soundService.playTapPop();
              }}
              className="flex items-center justify-center rounded-lg border border-stone-200/70 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:border-stone-400 hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact 100-Category Topic Bar + Quick For You Personalized Trigger */}
      <div className="flex w-full items-center gap-1.5">
        <button
          type="button"
          data-testid="category-picker-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenCategories();
          }}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-stone-200/85 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 px-3 py-1.5 text-xs transition-colors hover:border-stone-300 dark:hover:border-zinc-700 cursor-pointer amoled-surface"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {isPersonalizedRound ? (
              <Sparkles
                className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            ) : activeCategory.isPremium ? (
              categoryPlaysRemaining > 0 ? (
                <Unlock
                  className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                  aria-hidden="true"
                />
              ) : (
                <Lock
                  className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              )
            ) : (
              <Compass
                className="h-3.5 w-3.5 shrink-0 wv-accent-text"
                aria-hidden="true"
              />
            )}
            <span className="truncate font-semibold text-zinc-800 dark:text-zinc-100">
              {isPersonalizedRound ? 'Topic: For You (Trend Pick)' : `Topic: ${activeCategory.name}`}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {activeCategory.isPremium && !isPersonalizedRound ? (
              <span
                className={`font-mono-tabular font-semibold ${
                  categoryPlaysRemaining > 0
                    ? 'wv-accent-text'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {categoryPlaysRemaining > 0
                  ? `${categoryPlaysRemaining} left`
                  : '0 left · Ad (+5)'}
              </span>
            ) : (
              <span>{CATEGORIES.length} Topics</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          </span>
        </button>

        {onPlayPersonalizedPuzzle && (
          <button
            type="button"
            data-testid="puzzle-for-you-btn"
            disabled={loadingPersonalizedPuzzle}
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayPersonalizedPuzzle();
            }}
            title="Generate a personalized word based on your location & interests"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-emerald-700/25 bg-emerald-50/70 dark:border-emerald-500/35 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-[#1E6B52] dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{loadingPersonalizedPuzzle ? '...' : 'For You'}</span>
          </button>
        )}
      </div>

      {isPersonalizedRound && personalizedClue && (
        <div
          data-testid="personalized-clue-banner"
          className="w-full rounded-lg border border-emerald-700/20 dark:border-emerald-500/25 bg-white/80 dark:bg-zinc-900/75 px-3 py-1.5 text-left"
        >
          <p className="text-[10px] font-semibold text-[#1E6B52] dark:text-emerald-300 leading-tight">
            {personalizedReason || 'Personalized Trend Clue'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-200 leading-snug">
            Clue: {personalizedClue}
          </p>
        </div>
      )}

      {/* Unboxed quiet metadata strip with typographic separators */}
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
        {mode === 'daily' ? (
          <>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Daily #{puzzleNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Next in{' '}
              <span className="font-mono-tabular font-medium text-zinc-800 dark:text-zinc-200">
                {countdown}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Streak{' '}
              <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                {currentStreak}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Practice Sprint
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Solved{' '}
              <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                {sprintSolved}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{length}-Letter Words</span>
          </>
        )}
      </div>
    </section>
  );
};
