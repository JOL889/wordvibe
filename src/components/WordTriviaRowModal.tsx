import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, X } from 'lucide-react';
import type { CrosswordBoardState, CrosswordSlotType } from '../game/crosswordLogic';
import type { TypingDirection } from '../game/puzzleLogic';

interface WordTriviaRowModalProps {
  open: boolean;
  board: CrosswordBoardState;
  activeRow: number;
  activeCol: number;
  typingDirection: TypingDirection;
  onCancel: () => void;
  onConfirmSlot: (slotType: CrosswordSlotType, index: number) => void;
}

export const WordTriviaRowModal: React.FC<WordTriviaRowModalProps> = ({
  open,
  board,
  activeRow,
  activeCol,
  typingDirection,
  onCancel,
  onConfirmSlot,
}) => {
  const [slotType, setSlotType] = useState<CrosswordSlotType>(
    typingDirection === 'down' ? 'col' : 'row'
  );
  const [slotIndex, setSlotIndex] = useState<number>(
    typingDirection === 'down' ? activeCol : activeRow
  );
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const initialType: CrosswordSlotType = typingDirection === 'down' ? 'col' : 'row';
    const initialIdx = initialType === 'row' ? activeRow : activeCol;

    const isUnsolved = (t: CrosswordSlotType, i: number) =>
      t === 'row' ? !board.solvedRows[i] : !board.solvedCols[i];

    if (isUnsolved(initialType, initialIdx)) {
      setSlotType(initialType);
      setSlotIndex(initialIdx);
      return;
    }

    const firstRow = board.solvedRows.findIndex((s) => !s);
    if (firstRow !== -1) {
      setSlotType('row');
      setSlotIndex(firstRow);
      return;
    }

    const firstCol = board.solvedCols.findIndex((s) => !s);
    if (firstCol !== -1) {
      setSlotType('col');
      setSlotIndex(firstCol);
      return;
    }

    setSlotType('row');
    setSlotIndex(0);
  }, [open, activeRow, activeCol, typingDirection, board.solvedRows, board.solvedCols]);

  if (!open) return null;

  const L = board.length;
  const selectedLabel =
    slotType === 'row' ? `Row ${slotIndex + 1} Across` : `Col ${slotIndex + 1} Down`;

  return (
    <div
      data-testid="word-trivia-row-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-trivia-row-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 wv-accent-text" aria-hidden="true" />
            <div>
              <h2 id="word-trivia-row-title" className="font-display text-lg font-bold wv-text">
                Unlock Line Clue (Watch Ad)
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed wv-text-muted">
                Pick any Row (Across) or Column (Down) to reveal its consonant/vowel count and word
                explanation after a short rewarded ad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close clue selector"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Across Rows */}
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider wv-text-muted">
            <ArrowRight className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
            <span>Horizontal Rows (Across)</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: L }, (_, r) => {
              const solved = board.solvedRows[r];
              const hasClue = Boolean(board.unlockedClues[`row-${r}`]);
              const isSelected = slotType === 'row' && slotIndex === r;
              const preview = board.userGrid[r].map((c) => c || '_').join('');

              return (
                <button
                  key={`pick-row-${r}`}
                  type="button"
                  data-testid={`trivia-row-option-${r + 1}`}
                  disabled={solved}
                  onClick={() => {
                    setSlotType('row');
                    setSlotIndex(r);
                  }}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                    solved
                      ? 'wv-border wv-card-muted opacity-45 cursor-not-allowed'
                      : isSelected
                      ? 'wv-accent-pill border-2 font-bold cursor-pointer'
                      : 'wv-border wv-card wv-text hover:opacity-90 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="font-bold">Row {r + 1}</div>
                    <div className="text-[10px] wv-text-muted">
                      {solved ? 'Solved' : hasClue ? 'Unlocked' : 'Open'}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-[11px] font-bold tracking-widest">
                    {preview}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Down Columns */}
        <div className="mt-3.5">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider wv-text-muted">
            <ArrowDown className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
            <span>Vertical Columns (Down)</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: L }, (_, c) => {
              const solved = board.solvedCols[c];
              const hasClue = Boolean(board.unlockedClues[`col-${c}`]);
              const isSelected = slotType === 'col' && slotIndex === c;
              const preview = Array.from({ length: L }, (_, r) => board.userGrid[r][c] || '_').join('');

              return (
                <button
                  key={`pick-col-${c}`}
                  type="button"
                  data-testid={`trivia-col-option-${c + 1}`}
                  disabled={solved}
                  onClick={() => {
                    setSlotType('col');
                    setSlotIndex(c);
                  }}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                    solved
                      ? 'wv-border wv-card-muted opacity-45 cursor-not-allowed'
                      : isSelected
                      ? 'wv-accent-pill border-2 font-bold cursor-pointer'
                      : 'wv-border wv-card wv-text hover:opacity-90 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="font-bold">Col {c + 1}</div>
                    <div className="text-[10px] wv-text-muted">
                      {solved ? 'Solved' : hasClue ? 'Unlocked' : 'Open'}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-[11px] font-bold tracking-widest">
                    {preview}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border wv-border wv-card-muted px-4 py-2 text-xs font-bold wv-text hover:opacity-90 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-trivia-row-btn"
            onClick={() => onConfirmSlot(slotType, slotIndex)}
            className="inline-flex items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2 text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <span>Watch Ad · {selectedLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
