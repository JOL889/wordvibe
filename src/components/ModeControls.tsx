import React from 'react';
import { ChevronDown, Compass, Lock, Sparkles, Trophy, Unlock, Zap } from 'lucide-react';
import { CATEGORIES, type PuzzleCategory } from '../data/categories';
import type { WordLength } from '../data/words';
import type { CrosswordLevelClimbState } from '../game/crosswordLogic';
import {
  FIVE_LEVEL_META,
  FIVE_LEVEL_ORDER,
  type FiveDifficultyLevel,
  type SessionPlayMode,
} from '../game/settingsLogic';
import { soundService } from '../services/soundService';

interface ModeControlsProps {
  sessionMode: SessionPlayMode;
  level: FiveDifficultyLevel;
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
  onChangeLevel: (nextLevel: FiveDifficultyLevel) => void;
  onChangeLength: (nextLength: WordLength) => void;
  onToggleAutoLength?: () => void;
  onOpenCategories: () => void;
}

const LENGTHS: WordLength[] = [4, 5, 6];

export const ModeControls: React.FC<ModeControlsProps> = ({
  sessionMode,
  level,
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
  onChangeLevel,
  onChangeLength,
  onToggleAutoLength,
  onOpenCategories,
}) => {
  return (
    <section
      aria-label="Crossword mode, difficulty level, topic, and board size"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-1.5 px-3 sm:px-4 pt-1.5 pb-1"
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
              soundService.playTapPop();
              onChangeSessionMode('level_climb');
            }}
            aria-pressed={sessionMode === 'level_climb'}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
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
              soundService.playTapPop();
              onChangeSessionMode('sprint');
            }}
            aria-pressed={sessionMode === 'sprint'}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`min-h-10 rounded-lg px-2 py-1 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
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
                  soundService.playTapPop();
                  onChangeLength(len);
                }}
                aria-pressed={active}
                className={`min-h-10 rounded-lg px-2.5 py-1 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
                }`}
              >
                {len}×{len}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 5-Level Difficulty Switcher */}
      <div className="flex w-full flex-col gap-1.5 rounded-xl border wv-border wv-card p-2.5 shadow-xs">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider wv-text-muted">
            Difficulty Tier
          </span>
          <span
            data-testid="puzzle-active-level-badge"
            className="font-mono-tabular text-[11px] font-bold wv-accent-text"
          >
            {FIVE_LEVEL_META[level].label} ({FIVE_LEVEL_META[level].badge})
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {FIVE_LEVEL_ORDER.map((lvlId) => {
            const meta = FIVE_LEVEL_META[lvlId];
            const active = level === lvlId;
            return (
              <button
                key={lvlId}
                type="button"
                data-testid={`puzzle-level-${lvlId}`}
                aria-pressed={active}
                onClick={(e) => {
                  e.currentTarget.blur();
                  soundService.playTapPop();
                  onChangeLevel(lvlId);
                }}
                className={`flex min-h-9 items-center justify-center rounded-lg border py-1.5 px-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                  active
                    ? 'wv-accent-btn border-transparent'
                    : 'wv-border wv-card-muted wv-text hover:opacity-90'
                }`}
              >
                {meta.shortLabel}
              </button>
            );
          })}
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
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-1.5 text-xs transition-opacity hover:opacity-90 cursor-pointer"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {isPersonalizedRound ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0 wv-accent-text" aria-hidden="true" />
            ) : activeCategory.isPremium ? (
              categoryPlaysRemaining > 0 ? (
                <Unlock className="h-3.5 w-3.5 shrink-0 wv-accent-text" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
              )
            ) : (
              <Compass className="h-3.5 w-3.5 shrink-0 wv-accent-text" aria-hidden="true" />
            )}
            <span className="truncate font-bold wv-text">
              {isPersonalizedRound ? 'Topic: For You Pick' : `Topic: ${activeCategory.name}`}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium wv-text-muted">
            {activeCategory.isPremium && !isPersonalizedRound ? (
              <span
                className={`font-mono-tabular font-bold ${
                  categoryPlaysRemaining > 0 ? 'wv-accent-text' : 'text-amber-500'
                }`}
              >
                {categoryPlaysRemaining > 0
                  ? `${categoryPlaysRemaining} left`
                  : '0 left · Ad (+5)'}
              </span>
            ) : (
              <span>{CATEGORIES.length} Topics</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 wv-text-muted" aria-hidden="true" />
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
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border wv-accent-pill px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>For You</span>
          </button>
        )}
      </div>

      {isPersonalizedRound && personalizedClue && (
        <div
          data-testid="personalized-clue-banner"
          className="w-full rounded-xl border wv-border wv-card-muted px-3 py-1.5 text-left"
        >
          <p className="text-[10px] font-bold wv-accent-text leading-tight">
            {personalizedReason || 'Curated Pick'}
          </p>
          <p className="mt-0.5 text-[11px] wv-text leading-snug">{personalizedClue}</p>
        </div>
      )}

      {/* Session Progress Strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-xs wv-text-muted">
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
              to Level Up
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
