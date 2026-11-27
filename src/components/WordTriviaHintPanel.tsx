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

export const WordTriviaHintPanel: React.FC<WordTriviaHintPanelProps> = React.memo(({
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
      className="mx-auto my-2 w-full max-w-2xl lg:max-w-3xl px-3 sm:px-6 animate-stage-enter"
    >
      <div className="rounded-3xl border wv-border wv-card px-5 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <BookOpen className="h-5 w-5 shrink-0 wv-accent-text" aria-hidden="true" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm sm:text-base">
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

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-testid="another-line-trivia-btn"
              onClick={onRequestAnotherLine}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border wv-accent-pill px-3 py-1.5 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>More Clues</span>
            </button>

            <button
              type="button"
              data-testid="collapse-word-trivia-btn"
              onClick={onToggleOpen}
              aria-label="Hide word clues"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-semibold wv-text-muted hover:opacity-80 cursor-pointer whitespace-nowrap"
            >
              <span>Hide</span>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2.5 border-t wv-border pt-3">
          {entries.map(([key, clueText]) => (
            <div
              key={key}
              data-testid={`unlocked-clue-${key}`}
              className="rounded-2xl border wv-border wv-card-muted px-4 py-2.5 text-sm sm:text-base leading-relaxed"
            >
              <span className="inline-flex items-center gap-1.5 font-bold wv-accent-text mr-2">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {formatSlotTitle(key)}:
              </span>
              <span className="wv-text font-medium">{clueText}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
