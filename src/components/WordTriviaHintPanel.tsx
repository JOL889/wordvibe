import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { PuzzleWordTrivia } from '../game/wordTriviaLogic';

interface WordTriviaHintPanelProps {
  panelRef?: React.RefObject<HTMLElement | null>;
  rowNumber: number;
  unlockedRows?: number[];
  wordLength: number;
  categoryName: string;
  trivia: PuzzleWordTrivia | null;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onRetry: () => void;
  onSelectUnlockedRow?: (rowNum: number) => void;
  onRequestAnotherLine?: () => void;
}

export const WordTriviaHintPanel: React.FC<WordTriviaHintPanelProps> = ({
  panelRef,
  rowNumber,
  unlockedRows = [],
  wordLength,
  categoryName,
  trivia,
  loading,
  error,
  isOpen,
  onToggleOpen,
  onRetry,
  onSelectUnlockedRow,
  onRequestAnotherLine,
}) => {
  const [showLateralClue, setShowLateralClue] = useState(false);

  useEffect(() => {
    setShowLateralClue(false);
  }, [rowNumber]);

  if (!isOpen) return null;

  const sortedUnlockedRows = [...unlockedRows].sort((a, b) => a - b);

  return (
    <section
      ref={panelRef}
      data-testid="word-trivia-panel"
      aria-label="Row word trivia clue"
      className="mx-auto my-1.5 w-full max-w-xl px-3 sm:px-4"
    >
      <div className="rounded-xl border border-stone-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen
              className="h-4 w-4 shrink-0 text-[#1E6B52] dark:text-emerald-400"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Row {rowNumber} Word Trivia
              </span>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {trivia ? trivia.domain : categoryName}
              </span>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-[#1E6B52] dark:text-emerald-400">
                {wordLength}-Letter Word Clue
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onRequestAnotherLine && !loading && (
              <button
                type="button"
                data-testid="another-line-trivia-btn"
                onClick={onRequestAnotherLine}
                className="inline-flex items-center gap-1 rounded-md border border-[#1E6B52]/30 dark:border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-950/35 px-2 py-1 text-[11px] font-semibold text-[#1E6B52] dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                <span>Another Line</span>
              </button>
            )}

            <button
              type="button"
              data-testid="collapse-word-trivia-btn"
              onClick={onToggleOpen}
              aria-label="Hide word trivia"
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              <span>Hide</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {sortedUnlockedRows.length > 1 && onSelectUnlockedRow && (
          <div
            className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-stone-200/60 dark:border-zinc-800/80 pt-2 text-[11px]"
            role="group"
            aria-label="Unlocked row clues"
          >
            <span className="font-medium text-zinc-500 dark:text-zinc-400">Unlocked rows:</span>
            {sortedUnlockedRows.map((num) => {
              const isCurrent = num === rowNumber;
              return (
                <button
                  key={num}
                  type="button"
                  data-testid={`switch-unlocked-row-${num}`}
                  onClick={() => onSelectUnlockedRow(num)}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#1E6B52] text-white dark:bg-emerald-600'
                      : 'border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Row {num}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div
            data-testid="word-trivia-loading"
            className="mt-2.5 flex items-center gap-2 border-t border-stone-200/70 dark:border-zinc-800 pt-2.5 text-xs text-zinc-600 dark:text-zinc-300"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
            <span>Generating clue for Row {rowNumber}...</span>
          </div>
        ) : error ? (
          <div
            data-testid="word-trivia-error"
            className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 dark:border-zinc-800 pt-2.5"
          >
            <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>
            <button
              type="button"
              data-testid="retry-word-trivia-btn"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        ) : trivia ? (
          <div className="mt-2.5 border-t border-stone-200/70 dark:border-zinc-800 pt-2.5">
            <p className="text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-100">
              {trivia.riddle}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                Form: {trivia.answerFormatNote} · Row {rowNumber}
                {trivia.personalizedFor ? ` · Tuned for ${trivia.personalizedFor}` : ''}
              </span>

              <button
                type="button"
                data-testid="toggle-lateral-clue-btn"
                onClick={() => setShowLateralClue((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#1E6B52] dark:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer whitespace-nowrap shrink-0"
              >
                {showLateralClue ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hide Lateral Clue</span>
                    <ChevronUp className="h-3 w-3" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Lateral Clue</span>
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {showLateralClue && (
              <p
                data-testid="word-trivia-lateral-clue"
                className="mt-2 border-t border-stone-200/60 dark:border-zinc-800/80 pt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300"
              >
                {trivia.lateralClue}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};
