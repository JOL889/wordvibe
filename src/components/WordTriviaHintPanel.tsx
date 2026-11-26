import React from 'react';
import { BookOpen, ChevronUp, Plus, Sparkles } from 'lucide-react';

interface WordTriviaHintPanelProps {
  panelRef?: React.RefObject<HTMLElement | null>;
  unlockedClues: Record<string, string>;
  wordLength: number;
  categoryName: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onRequestAnotherLine: () => void;
}

function formatSlotTitle(key: string): string {
  const [slotType, rawIdx] = key.split('-');
  const num = Number(rawIdx) + 1;
  return slotType === 'col' ? `Col ${num} Down` : `Row ${num} Across`;
}

export const WordTriviaHintPanel: React.FC<WordTriviaHintPanelProps> = ({
  panelRef,
  unlockedClues,
  wordLength,
  categoryName,
  isOpen,
  onToggleOpen,
  onRequestAnotherLine,
}) => {
  const entries = Object.entries(unlockedClues);
  if (!isOpen || entries.length === 0) return null;

  return (
    <section
      ref={panelRef}
      data-testid="word-trivia-panel"
      aria-label="Unlocked crossword line clues"
      className="mx-auto my-1.5 w-full max-w-xl px-3 sm:px-4 animate-stage-enter"
    >
      <div className="rounded-2xl border wv-border wv-card px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
              <span className="font-bold wv-text">Unlocked Word Clues</span>
              <span className="wv-text-muted" aria-hidden="true">
                ·
              </span>
              <span className="wv-text-muted">{categoryName}</span>
              <span className="wv-text-muted" aria-hidden="true">
                ·
              </span>
              <span className="font-bold wv-accent-text">{wordLength}-Letter Words</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              data-testid="another-line-trivia-btn"
              onClick={onRequestAnotherLine}
              className="inline-flex items-center gap-1 rounded-lg border wv-accent-pill px-2.5 py-1 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>More Clues (Ad)</span>
            </button>

            <button
              type="button"
              data-testid="collapse-word-trivia-btn"
              onClick={onToggleOpen}
              aria-label="Hide word clues"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold wv-text-muted hover:opacity-80 cursor-pointer whitespace-nowrap"
            >
              <span>Hide</span>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 space-y-2 border-t wv-border pt-2.5">
          {entries.map(([key, clueText]) => (
            <div
              key={key}
              data-testid={`unlocked-clue-${key}`}
              className="rounded-xl border wv-border wv-card-muted px-3 py-2 text-sm leading-relaxed"
            >
              <span className="inline-flex items-center gap-1 font-bold wv-accent-text mr-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {formatSlotTitle(key)}:
              </span>
              <span className="wv-text font-medium">{clueText}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
