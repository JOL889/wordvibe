import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, X } from 'lucide-react';

interface WordTriviaRowModalProps {
  open: boolean;
  maxAttempts: number;
  wordLength: number;
  activeRow: number;
  rowGuesses: (string | null)[];
  rowDrafts: string[][];
  unlockedTriviaRows?: number[];
  onCancel: () => void;
  onConfirmRow: (rowNumber: number) => void;
}

const EMPTY_ROWS: number[] = [];

export const WordTriviaRowModal: React.FC<WordTriviaRowModalProps> = ({
  open,
  maxAttempts,
  wordLength,
  activeRow,
  rowGuesses,
  rowDrafts,
  unlockedTriviaRows = EMPTY_ROWS,
  onCancel,
  onConfirmRow,
}) => {
  const [selectedRow, setSelectedRow] = useState<number>(() => Math.min(activeRow + 1, maxAttempts));
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const isRowOpen = (idx: number) =>
      idx >= 0 && idx < maxAttempts && (rowGuesses[idx] === null || rowGuesses[idx] === undefined);

    const activeRowNum = activeRow + 1;
    if (isRowOpen(activeRow) && !unlockedTriviaRows.includes(activeRowNum)) {
      setSelectedRow(activeRowNum);
      return;
    }

    const firstFreshOpenIdx = rowGuesses.findIndex(
      (g, idx) => (g === null || g === undefined) && !unlockedTriviaRows.includes(idx + 1)
    );
    if (firstFreshOpenIdx !== -1) {
      setSelectedRow(firstFreshOpenIdx + 1);
      return;
    }

    const firstOpenIdx = rowGuesses.findIndex((g) => g === null || g === undefined);
    setSelectedRow(
      isRowOpen(activeRow) ? activeRowNum : firstOpenIdx !== -1 ? firstOpenIdx + 1 : 1
    );
  }, [open, activeRow, maxAttempts, rowGuesses, unlockedTriviaRows]);

  if (!open) return null;

  return (
    <div
      data-testid="word-trivia-row-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-trivia-row-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <BookOpen
              className="mt-0.5 h-5 w-5 shrink-0 text-[#1E6B52] dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <h2
                id="word-trivia-row-title"
                className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-50"
              >
                Choose Row for Clue
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Which row ({wordLength} letters) would you like the word trivia clue for?
                You will watch a short rewarded ad next to unlock it.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close row selector"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="radiogroup"
          aria-label="Puzzle rows"
          className="mt-4 grid grid-cols-2 gap-2"
        >
          {Array.from({ length: maxAttempts }, (_, idx) => {
            const rowNum = idx + 1;
            const submitted = rowGuesses[idx];
            const draft = rowDrafts[idx] || [];
            const isSubmitted = submitted !== null && submitted !== undefined;
            const isAlreadyUnlocked = unlockedTriviaRows.includes(rowNum);
            const isSelected = selectedRow === rowNum;
            const previewLetters = isSubmitted
              ? submitted
              : draft.some((ch) => ch !== '')
              ? draft.map((ch) => ch || '_').join('')
              : '_'.repeat(wordLength);

            return (
              <button
                key={rowNum}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`trivia-row-option-${rowNum}`}
                disabled={isSubmitted}
                onClick={() => setSelectedRow(rowNum)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isSubmitted
                    ? 'border-stone-200/70 dark:border-zinc-800/70 bg-stone-100/70 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                    : isSelected
                    ? 'border-[#1E6B52] dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-50 cursor-pointer'
                    : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-stone-300 dark:hover:border-zinc-700 cursor-pointer'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Row {rowNum}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isSubmitted
                      ? 'Submitted'
                      : isAlreadyUnlocked
                      ? 'Clue unlocked'
                      : idx === activeRow
                      ? 'Current line'
                      : 'Open line'}
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold tracking-widest text-zinc-600 dark:text-zinc-300">
                  {previewLetters}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-trivia-row-btn"
            onClick={() => onConfirmRow(selectedRow)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E6B52] dark:bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#175541] dark:hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
          >
            <span>Watch Ad for Row {selectedRow}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
