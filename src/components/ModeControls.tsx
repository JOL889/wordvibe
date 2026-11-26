import React from 'react';
import {
  ChevronDown,
  Compass,
  Lock,
  Minus,
  Plus,
  Sparkles,
  Trophy,
  Unlock,
  Zap,
} from 'lucide-react';
import { CATEGORIES, type PuzzleCategory } from '../data/categories';
import type { WordLength } from '../data/words';
import type { CrosswordLevelClimbState } from '../game/crosswordLogic';
import {
  formatLevelLabel,
  normalizeLevelNumber,
  type SessionPlayMode,
} from '../game/settingsLogic';

interface ModeControlsProps {
  sessionMode: SessionPlayMode;
  levelNumber: number;
  climbState: CrosswordLevelClimbState;
  length: WordLength;
  autoLengthMode?: boolean;
  activeCategory: PuzzleCategory;
  categoryPlaysRemaining: number;
  currentStreak: number;
  sprintSolved: number;
  isPersonalizedRound?: boolean;
  personalizedClue?: string;
  personalizedReason?: string;
  onPlayPersonalizedPuzzle?: () => void;
  onChangeSessionMode: (nextMode: SessionPlayMode) => void;
  onChangeLevelNumber: (nextLevel: number) => void;
  onChangeLength: (nextLength: WordLength) => void;
  onToggleAutoLength?: () => void;
  onOpenCategories: () => void;
}

const LENGTHS: WordLength[] = [4, 5, 6];

export const ModeControls: React.FC<ModeControlsProps> = ({
  sessionMode,
  levelNumber,
  climbState,
  length,
  autoLengthMode = false,
  activeCategory,
  categoryPlaysRemaining,
  currentStreak,
  sprintSolved,
  isPersonalizedRound = false,
  personalizedClue,
  personalizedReason,
  onPlayPersonalizedPuzzle,
  onChangeSessionMode,
  onChangeLevelNumber,
  onChangeLength,
  onToggleAutoLength,
  onOpenCategories,
}) => {
  const safeLevel = normalizeLevelNumber(levelNumber, 1);

  return (
    <section
      aria-label="Crossword mode, level, topic, and board size"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-1.5 px-3 sm:px-4 pt-1 pb-0.5"
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:justify-between">
        {/* Session Mode: Level Climb (8/10) vs Endless Sprint */}
        <div
          role="group"
          aria-label="Puzzle session mode"
          className="inline-flex items-center rounded-xl border wv-border wv-card-muted p-0.5"
        >
          <button
            type="button"
            data-testid="puzzle-mode-climb-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeSessionMode('level_climb');
            }}
            aria-pressed={sessionMode === 'level_climb'}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
              sessionMode === 'level_climb'
                ? 'wv-accent-btn'
                : 'wv-text-muted hover:opacity-90'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Level Climb</span>
          </button>
          <button
            type="button"
            data-testid="puzzle-mode-sprint-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeSessionMode('sprint');
            }}
            aria-pressed={sessionMode === 'sprint'}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
              sessionMode === 'sprint'
                ? 'wv-accent-btn'
                : 'wv-text-muted hover:opacity-90'
            }`}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Endless Sprint</span>
          </button>
        </div>

        {/* Board Dimensions Selector (4x4, 5x5, 6x6 + Auto) */}
        <div
          role="group"
          aria-label="Grid dimensions"
          className="inline-flex items-center rounded-xl border wv-border wv-card-muted p-0.5"
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
              title="Vary grid size across 4×4, 5×5, and 6×6"
              className={`min-h-10 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                autoLengthMode ? 'wv-gold-pill' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              Auto
            </button>
          )}
          {LENGTHS.map((len) => {
            const active = !autoLengthMode && length === len;
            return (
              <button
                key={len}
                type="button"
                data-testid={`length-${len}-btn`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onChangeLength(len);
                }}
                aria-pressed={active}
                className={`min-h-10 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
                }`}
              >
                {len}×{len}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unbounded Numbered Level Progression Bar (Starts at Level 1 and keeps climbing) */}
      <div className="flex w-full items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-1.5 shadow-xs">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider wv-text-muted">
            Current Level
          </span>
          <span className="text-xs wv-text-muted">
            {sessionMode === 'level_climb'
              ? `Pass 8/10 cleanly to reach Level ${safeLevel + 1}`
              : `Open number climb · ${formatLevelLabel(safeLevel)}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="puzzle-level-dec"
            disabled={safeLevel <= 1}
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeLevelNumber(Math.max(1, safeLevel - 1));
            }}
            aria-label="Previous level"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border wv-border wv-card-muted wv-text transition-transform active:scale-95 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          <span
            data-testid="puzzle-active-level-badge"
            className="inline-flex min-h-9 min-w-[92px] items-center justify-center rounded-xl wv-accent-btn px-3 py-1 font-mono-tabular text-sm font-extrabold"
          >
            {formatLevelLabel(safeLevel)}
          </span>

          <button
            type="button"
            data-testid="puzzle-level-inc"
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeLevelNumber(safeLevel + 1);
            }}
            aria-label="Next level"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border wv-border wv-card-muted wv-text transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Category Picker + Offline For You Button */}
      <div className="flex w-full items-center gap-1.5">
        <button
          type="button"
          data-testid="category-picker-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenCategories();
          }}
          className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-1 text-xs sm:text-sm transition-opacity hover:opacity-90 cursor-pointer"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {isPersonalizedRound ? (
              <Sparkles className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
            ) : activeCategory.isPremium ? (
              categoryPlaysRemaining > 0 ? (
                <Unlock className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
              )
            ) : (
              <Compass className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
            )}
            <span className="truncate font-bold wv-text">
              {isPersonalizedRound ? 'Topic: For You Pick' : `Topic: ${activeCategory.name}`}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium wv-text-muted">
            {activeCategory.isPremium && !isPersonalizedRound ? (
              <span className="font-mono-tabular font-bold wv-accent-text">
                {categoryPlaysRemaining > 0
                  ? `${categoryPlaysRemaining} left`
                  : '0 left · Ad (+5)'}
              </span>
            ) : (
              <span>{CATEGORIES.length} Topics</span>
            )}
            <ChevronDown className="h-4 w-4 wv-text-muted" aria-hidden="true" />
          </span>
        </button>

        {onPlayPersonalizedPuzzle && (
          <button
            type="button"
            data-testid="puzzle-for-you-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayPersonalizedPuzzle();
            }}
            title="Start a crossword tailored to your profile interests"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border wv-accent-pill px-3 py-1 text-xs sm:text-sm font-bold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>For You</span>
          </button>
        )}
      </div>

      {isPersonalizedRound && personalizedClue && (
        <div
          data-testid="personalized-clue-banner"
          className="w-full rounded-xl border wv-border wv-card-muted px-3.5 py-2 text-left"
        >
          <p className="text-xs font-bold wv-accent-text leading-tight">
            {personalizedReason || 'Curated Pick'}
          </p>
          <p className="mt-0.5 text-sm wv-text leading-snug">{personalizedClue}</p>
        </div>
      )}

      {/* Session Progress Strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-xs sm:text-sm wv-text-muted">
        {sessionMode === 'level_climb' ? (
          <>
            <span data-testid="puzzle-climb-progress" className="font-bold wv-text">
              Climb · Board {Math.min(10, climbState.roundIndex + 1)}/10
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Passed{' '}
              <span className="font-mono-tabular font-bold wv-accent-text">
                {climbState.roundPassedCount}/8
              </span>{' '}
              to Level {safeLevel + 1}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Streak{' '}
              <span className="font-mono-tabular font-bold wv-accent-text">{currentStreak}</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-bold wv-text">Endless Sprint</span>
            <span aria-hidden="true">·</span>
            <span>
              Solved{' '}
              <span className="font-mono-tabular font-bold wv-accent-text">{sprintSolved}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Streak{' '}
              <span className="font-mono-tabular font-bold wv-accent-text">{currentStreak}</span>
            </span>
          </>
        )}
      </div>
    </section>
  );
};
