import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Compass,
  Lightbulb,
  Lock,
  Play,
  RefreshCw,
  Shuffle,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { getCategoryById, type PuzzleCategory } from '../data/categories';
import {
  formatActiveWordLetterStats,
  getCrosswordProgressSummary,
  type CrosswordBoardState,
  type CrosswordSlotType,
} from '../game/crosswordLogic';
import type { CursorDirection, TileState, TypingDirection } from '../game/puzzleLogic';
import { getWordMeaningClue } from '../game/wordMeanings';

export interface SelectedDictionaryWord {
  word: string;
  label: string;
  meaning: string;
}

interface PuzzleGridProps {
  board: CrosswordBoardState;
  activeRow: number;
  activeCol: number;
  typingDirection: TypingDirection;
  shakeLine: { type: 'row' | 'col'; index: number } | null;
  showWinBurst?: boolean;
  boardAnimKey: string;
  solveFunFact?: string;
  selectedDictWord?: SelectedDictionaryWord | null;
  puzzleTimedOut?: boolean;
  featuredTopics?: PuzzleCategory[];
  categoryPlaysRemainingMap?: Record<string, number>;
  onChangeDirection: (dir: TypingDirection) => void;
  onSelectCell: (rowIdx: number, colIdx: number, explicitDirection?: TypingDirection) => void;
  onSelectDictWord?: (entry: SelectedDictionaryWord | null) => void;
  onRetryTimedRound?: () => void;
  onSelectFeaturedTopic?: (category: PuzzleCategory) => void;
  onOpenTopicsExplorer?: () => void;
  onKey: (key: string) => void;
  onMoveCursor: (dir: CursorDirection) => void;
  onTriggerHint: () => void;
  onTriggerWordClue: () => void;
  onUnlockActiveClue?: (slotType: CrosswordSlotType, index: number) => void;
  onTriggerSkipBoard: () => void;
}

const INPUT_SENTINEL = ' ';

const WIN_BURST_PARTICLES = [
  { tx: '-64px', ty: '-48px', rot: '-45deg', colorVar: 'var(--wv-confetti-1)', delay: '0ms' },
  { tx: '-42px', ty: '-74px', rot: '25deg', colorVar: 'var(--wv-confetti-2)', delay: '30ms' },
  { tx: '-14px', ty: '-82px', rot: '-20deg', colorVar: 'var(--wv-confetti-3)', delay: '15ms' },
  { tx: '18px', ty: '-80px', rot: '40deg', colorVar: 'var(--wv-confetti-4)', delay: '40ms' },
  { tx: '48px', ty: '-68px', rot: '-35deg', colorVar: 'var(--wv-confetti-1)', delay: '20ms' },
  { tx: '68px', ty: '-44px', rot: '55deg', colorVar: 'var(--wv-confetti-2)', delay: '50ms' },
  { tx: '-74px', ty: '-14px', rot: '-65deg', colorVar: 'var(--wv-confetti-3)', delay: '35ms' },
  { tx: '74px', ty: '-16px', rot: '70deg', colorVar: 'var(--wv-confetti-4)', delay: '25ms' },
  { tx: '-52px', ty: '28px', rot: '45deg', colorVar: 'var(--wv-confetti-2)', delay: '45ms' },
  { tx: '52px', ty: '28px', rot: '-50deg', colorVar: 'var(--wv-confetti-3)', delay: '55ms' },
];

const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

function getCornerBonusMarker(
  r: number,
  c: number,
  len: number
): { label: string; cls: string } | null {
  const isCorner = (r === 0 || r === len - 1) && (c === 0 || c === len - 1);
  const mid = Math.floor(len / 2);
  if (isCorner) {
    return {
      label: 'TW',
      cls: 'border-[var(--wv-accent)]/40 bg-[var(--wv-accent-soft)]',
    };
  }
  if (r === mid && c === mid) {
    return {
      label: '★',
      cls: 'border-[var(--wv-accent)]/55 bg-[var(--wv-accent-soft)]',
    };
  }
  if ((r === 0 || r === len - 1 || c === 0 || c === len - 1) && (r === mid || c === mid)) {
    return {
      label: 'DL',
      cls: 'border-[var(--wv-accent)]/35 bg-[var(--wv-accent-soft)]',
    };
  }
  return null;
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({
  board,
  activeRow,
  activeCol,
  typingDirection,
  shakeLine,
  showWinBurst = false,
  boardAnimKey,
  solveFunFact,
  selectedDictWord = null,
  puzzleTimedOut = false,
  featuredTopics = [],
  categoryPlaysRemainingMap = {},
  onChangeDirection,
  onSelectCell,
  onSelectDictWord,
  onRetryTimedRound,
  onSelectFeaturedTopic,
  onOpenTopicsExplorer,
  onKey,
  onMoveCursor,
  onTriggerHint,
  onTriggerWordClue,
  onUnlockActiveClue,
  onTriggerSkipBoard,
}) => {
  const [isDealing, setIsDealing] = useState(true);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsDealing(true);
    const timer = window.setTimeout(() => {
      setIsDealing(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [boardAnimKey]);

  const L = board.length;
  const progress = getCrosswordProgressSummary(board);
  const unlockedClueCount = Object.keys(board.unlockedClues).length;

  const category = getCategoryById(board.categoryId);
  const safeRow = Math.min(L - 1, Math.max(0, activeRow));
  const safeCol = Math.min(L - 1, Math.max(0, activeCol));
  const activeWord =
    typingDirection === 'across' ? board.solution.rows[safeRow] : board.solution.cols[safeCol];
  const activeSlotType: CrosswordSlotType = typingDirection === 'down' ? 'col' : 'row';
  const activeSlotIndex = typingDirection === 'down' ? safeCol : safeRow;
  const activeClueKey = `${activeSlotType}-${activeSlotIndex}`;
  const unlockedMainClue = board.unlockedClues[activeClueKey];
  const activeLineLabel =
    typingDirection === 'across'
      ? `Row ${safeRow + 1} Across`
      : `Col ${safeCol + 1} Down`;
  const activeLineSolved =
    typingDirection === 'across' ? board.solvedRows[safeRow] : board.solvedCols[safeCol];
  const activeWordStats = formatActiveWordLetterStats(activeWord, typingDirection);

  const focusDeviceKeyboard = () => {
    const input = deviceInputRef.current;
    if (!input || board.status !== 'playing') return;
    input.value = INPUT_SENTINEL;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    try {
      input.setSelectionRange(INPUT_SENTINEL.length, INPUT_SENTINEL.length);
    } catch {
      // Ignore unsupported range
    }
  };

  const resetSentinel = (input: HTMLInputElement) => {
    input.value = INPUT_SENTINEL;
    try {
      input.setSelectionRange(INPUT_SENTINEL.length, INPUT_SENTINEL.length);
    } catch {
      // Ignore
    }
  };

  const handleDeviceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const raw = input.value;
    if (raw.length === 0) {
      onKey('BACKSPACE');
      resetSentinel(input);
      return;
    }
    const letters = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
    for (const ch of letters) {
      onKey(ch);
    }
    resetSentinel(input);
  };

  const handleDeviceInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onKey('ENTER');
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      onKey('BACKSPACE');
      resetSentinel(e.currentTarget);
      return;
    }
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      const map: Record<string, CursorDirection> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      onMoveCursor(map[e.key]);
    }
  };

  const tileSizeClass =
    L === 6
      ? 'h-[clamp(46px,12.8vw,56px)] w-[clamp(46px,12.8vw,56px)] text-[23px] sm:text-[26px]'
      : L === 4
      ? 'h-[clamp(60px,16vw,70px)] w-[clamp(60px,16vw,70px)] text-[29px] sm:text-[33px]'
      : 'h-[clamp(52px,14.2vw,62px)] w-[clamp(52px,14.2vw,62px)] text-[26px] sm:text-[30px]';

  const getFeedbackClass = (
    fb: TileState | null,
    isLocked: boolean,
    isCursor: boolean,
    inActiveLine: boolean,
    ch: string,
    bonusCls?: string
  ): string => {
    if (isLocked) {
      return 'wv-tile-correct border-2 font-display font-bold';
    }
    if (fb === 'present') {
      return 'wv-tile-present border-2 font-display font-bold';
    }
    if (fb === 'absent') {
      return 'wv-tile-absent border-2 font-display font-bold';
    }
    if (ch) {
      return `wv-tile-wooden border-2 font-display font-bold animate-tile-pop ${
        isCursor ? 'ring-2 ring-[var(--wv-accent)] scale-[1.05]' : ''
      }`;
    }
    return `wv-tile-empty border-2 font-display font-bold ${bonusCls || ''} ${
      isCursor
        ? 'ring-2 ring-[var(--wv-accent)] scale-[1.04]'
        : inActiveLine
        ? 'border-[var(--wv-accent)]/70'
        : ''
    }`;
  };

  return (
    <div className="mx-auto my-0.5 flex w-full max-w-md flex-col items-center gap-1.5 px-2.5 sm:px-3 select-none">
      {/* Top Active Line Letter Breakdown (Stats Only — Main Clue Locked Below Until Ad) */}
      {board.status === 'playing' && (
        <div
          data-testid="active-line-clue"
          className="w-full max-w-[390px] rounded-xl border wv-border wv-card px-3 py-2 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider wv-accent-text">
              {typingDirection === 'across' ? (
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{activeLineLabel}</span>
            </span>
            <span className="font-mono-tabular text-xs font-bold wv-text-muted">
              {activeLineSolved ? 'Solved ✓' : `${L} letters`}
            </span>
          </div>
          <p
            data-testid="active-line-letter-stats"
            className="mt-0.5 text-sm font-bold leading-snug wv-text"
          >
            {activeWordStats}
          </p>
        </div>
      )}

      {/* Across & Down Individual Word Progress Pill Strip */}
      <div
        data-testid="crossword-progress-bar"
        className="flex w-full max-w-[390px] items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-1 text-xs sm:text-sm shadow-xs"
      >
        <div className="flex items-center gap-1.5 font-bold wv-text">
          <ArrowRight className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>Across</span>
          <span
            data-testid="crossword-solved-rows-count"
            className="font-mono-tabular wv-accent-text"
          >
            {progress.solvedRowsCount}/{L}
          </span>
        </div>

        <span className="font-mono-tabular text-xs font-bold wv-text-muted">
          {progress.solvedWordsCount}/{progress.totalWords} Words
        </span>

        <div className="flex items-center gap-1.5 font-bold wv-text">
          <ArrowDown className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>Down</span>
          <span
            data-testid="crossword-solved-cols-count"
            className="font-mono-tabular wv-accent-text"
          >
            {progress.solvedColsCount}/{L}
          </span>
        </div>
      </div>

      {/* Tactile L x L Linked Crossword Board (Phone-motion parallax surface) */}
      <div
        key={boardAnimKey}
        data-testid="puzzle-grid"
        data-word-length={L}
        data-active-row={activeRow}
        data-active-col={activeCol}
        data-typing-direction={typingDirection}
        role="region"
        aria-label={`${L} by ${L} linked crossword puzzle grid`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            focusDeviceKeyboard();
          }
        }}
        className="wv-tilt-surface relative flex flex-col items-center rounded-2xl border-2 wv-border wv-card p-2.5 sm:p-3 shadow-md"
      >
        {/* Native Device Keyboard Bridge (Enter checks active row or col!) */}
        <input
          ref={deviceInputRef}
          data-testid="device-keyboard-input"
          data-device-keyboard="true"
          type="text"
          inputMode="text"
          enterKeyHint="done"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Crossword letter input — press Enter on your keyboard to verify the active word"
          disabled={board.status !== 'playing'}
          defaultValue={INPUT_SENTINEL}
          onFocus={(e) => resetSentinel(e.currentTarget)}
          onChange={handleDeviceInputChange}
          onKeyDown={handleDeviceInputKeyDown}
          className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 opacity-0 text-base caret-transparent"
        />

        {showWinBurst && (
          <div
            data-testid="win-burst"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          >
            {WIN_BURST_PARTICLES.map((p, idx) => (
              <span
                key={idx}
                style={
                  {
                    '--tx': p.tx,
                    '--ty': p.ty,
                    '--rot': p.rot,
                    backgroundColor: p.colorVar,
                    animationDelay: p.delay,
                  } as React.CSSProperties
                }
                className="absolute block h-2.5 w-2.5 rounded-sm animate-confetti-burst"
              />
            ))}
          </div>
        )}

        {/* Top Column Indicator Headers (D1..DL) */}
        <div className="mb-1.5 flex items-center gap-1.5 sm:gap-2 pl-7">
          {Array.from({ length: L }, (_, cIdx) => {
            const colSolved = board.solvedCols[cIdx];
            const isColActive =
              board.status === 'playing' && typingDirection === 'down' && activeCol === cIdx;
            return (
              <button
                key={`col-hdr-${cIdx}`}
                type="button"
                onClick={() => {
                  const openR = board.lockedCells.findIndex((rowArr) => !rowArr[cIdx]);
                  onSelectCell(openR >= 0 ? openR : 0, cIdx, 'down');
                  focusDeviceKeyboard();
                }}
                aria-label={`Column ${cIdx + 1} Down ${colSolved ? 'solved' : ''}`}
                className={`flex h-6 items-center justify-center rounded-md font-mono-tabular text-xs font-bold transition-colors cursor-pointer ${
                  L === 6
                    ? 'w-[clamp(46px,12.8vw,56px)]'
                    : L === 4
                    ? 'w-[clamp(60px,16vw,70px)]'
                    : 'w-[clamp(52px,14.2vw,62px)]'
                } ${
                  colSolved
                    ? 'wv-accent-pill border'
                    : isColActive
                    ? 'wv-accent-btn'
                    : 'wv-text-muted hover:opacity-80'
                }`}
              >
                {colSolved ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : `D${cIdx + 1}`}
              </button>
            );
          })}
        </div>

        {/* Grid Rows (A1..AL) */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {Array.from({ length: L }, (_, rIdx) => {
            const rowSolved = board.solvedRows[rIdx];
            const isRowActive =
              board.status === 'playing' && typingDirection === 'across' && activeRow === rIdx;
            const isRowShaking = shakeLine?.type === 'row' && shakeLine.index === rIdx;

            return (
              <div
                key={`row-${rIdx}`}
                data-row-index={rIdx}
                data-row-solved={rowSolved ? 'true' : 'false'}
                className={`flex items-center gap-1.5 sm:gap-2 ${
                  isRowShaking ? 'animate-row-shake' : ''
                }`}
              >
                {/* Row Number Pill */}
                <button
                  type="button"
                  onClick={() => {
                    const openC = board.lockedCells[rIdx].findIndex((locked) => !locked);
                    onSelectCell(rIdx, openC >= 0 ? openC : 0, 'across');
                    focusDeviceKeyboard();
                  }}
                  aria-label={`Row ${rIdx + 1} Across ${rowSolved ? 'solved' : ''}`}
                  className={`flex h-7 w-6 shrink-0 items-center justify-center rounded-md font-mono-tabular text-xs font-bold transition-colors cursor-pointer ${
                    rowSolved
                      ? 'wv-accent-pill border'
                      : isRowActive
                      ? 'wv-accent-btn'
                      : 'wv-text-muted hover:opacity-80'
                  }`}
                >
                  {rowSolved ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : `A${rIdx + 1}`}
                </button>

                {/* Squares in Row */}
                {Array.from({ length: L }, (__, cIdx) => {
                  const char = board.userGrid[rIdx][cIdx] || '';
                  const isLocked = board.lockedCells[rIdx][cIdx];
                  const fb = board.feedbackGrid[rIdx][cIdx];
                  const isCursor =
                    board.status === 'playing' && rIdx === activeRow && cIdx === activeCol;
                  const inActiveLine =
                    board.status === 'playing' &&
                    ((typingDirection === 'across' && rIdx === activeRow) ||
                      (typingDirection === 'down' && cIdx === activeCol));
                  const isColShaking = shakeLine?.type === 'col' && shakeLine.index === cIdx;
                  const bonus = !char && !isLocked ? getCornerBonusMarker(rIdx, cIdx, L) : null;
                  const pts = char ? LETTER_POINTS[char] || 1 : 0;

                  const animDelay = isDealing
                    ? { animationDelay: `${(rIdx * L + cIdx) * 18}ms` }
                    : board.status === 'won'
                    ? { animationDelay: `${(rIdx + cIdx) * 45}ms` }
                    : undefined;

                  return (
                    <button
                      key={`cell-${rIdx}-${cIdx}`}
                      type="button"
                      data-testid={`cell-${rIdx}-${cIdx}`}
                      data-locked={isLocked ? 'true' : 'false'}
                      data-cursor-active={isCursor ? 'true' : 'false'}
                      style={animDelay}
                      aria-label={`Row ${rIdx + 1} Column ${cIdx + 1}${
                        char ? `: ${char}` : ': empty'
                      }${isLocked ? ', locked' : ''}`}
                      onClick={() => {
                        if (board.status === 'won' && onSelectDictWord) {
                          const rowWord = board.solution.rows[rIdx];
                          const colWord = board.solution.cols[cIdx];
                          const pickCol =
                            selectedDictWord?.word === rowWord && colWord !== rowWord;
                          const chosenWord = pickCol ? colWord : rowWord;
                          const chosenLabel = pickCol
                            ? `Col ${cIdx + 1} Down`
                            : `Row ${rIdx + 1} Across`;
                          onSelectDictWord({
                            word: chosenWord,
                            label: chosenLabel,
                            meaning: getWordMeaningClue(chosenWord, category.name),
                          });
                          return;
                        }
                        onSelectCell(rIdx, cIdx);
                        focusDeviceKeyboard();
                      }}
                      className={`relative flex items-center justify-center rounded-xl uppercase transition-transform duration-150 active:scale-95 cursor-pointer ${tileSizeClass} ${
                        board.status === 'won'
                          ? 'animate-tile-bounce'
                          : isDealing
                          ? 'animate-tile-deal'
                          : ''
                      } ${isColShaking ? 'animate-row-shake' : ''} ${getFeedbackClass(
                        fb,
                        isLocked,
                        isCursor,
                        inActiveLine,
                        char,
                        bonus?.cls
                      )}`}
                    >
                      <span>{char}</span>

                      {!char && bonus && (
                        <span
                          aria-hidden="true"
                          className="font-mono-tabular text-[11px] font-extrabold opacity-75"
                        >
                          {bonus.label}
                        </span>
                      )}

                      {char && !isLocked && (
                        <span
                          aria-hidden="true"
                          className="absolute right-1 bottom-0.5 font-mono-tabular text-[10px] font-bold opacity-75"
                        >
                          {pts}
                        </span>
                      )}

                      {isLocked && (
                        <Check
                          className="absolute top-1 right-1 h-2.5 w-2.5 opacity-85"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      )}

                      {isCursor &&
                        !isLocked &&
                        (typingDirection === 'down' ? (
                          <span
                            aria-hidden="true"
                            className="animate-caret-breathe absolute right-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--wv-accent)]"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="animate-caret-breathe absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[var(--wv-accent)]"
                          />
                        ))}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Keyboard Tip */}
        {board.status === 'playing' && (
          <p className="mt-3 text-center text-xs font-medium wv-text-muted">
            Type Across or Down from any box · Press{' '}
            <kbd className="rounded border wv-border wv-card-muted px-1.5 py-0.5 font-mono-tabular text-xs font-bold wv-text">
              Enter
            </kbd>{' '}
            on your keyboard to verify line
          </p>
        )}
      </div>

      {/* Tactile Action Bar */}
      {board.status === 'playing' && (
        <div
          data-testid="icon-action-bar"
          role="toolbar"
          aria-label="Crossword tools"
          className="grid w-full max-w-[390px] grid-cols-4 gap-2 pt-0.5"
        >
          {/* 1. Unlimited Hint (Ad) */}
          <button
            type="button"
            data-testid="action-hint-btn"
            onClick={onTriggerHint}
            title="Watch a quick ad to reveal any open tile (Unlimited)"
            aria-label="Unlimited Hint via rewarded ad"
            className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border wv-border wv-card py-1.5 wv-text transition-transform active:scale-95 hover:opacity-90 cursor-pointer"
          >
            <span className="relative">
              <Lightbulb className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
              <Play
                className="absolute -right-2 -top-1 h-2.5 w-2.5 fill-[var(--wv-accent)] text-[var(--wv-accent)]"
                aria-hidden="true"
              />
            </span>
            <span className="text-xs font-bold leading-none">Hint</span>
            <span className="absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full wv-gold-pill px-1 font-mono-tabular text-[11px] font-extrabold">
              ∞
            </span>
          </button>

          {/* 2. Direction Toggle (Across / Down) */}
          <button
            type="button"
            data-testid="dir-toggle-btn"
            aria-pressed={typingDirection === 'down'}
            aria-label={`Switch typing direction (currently ${typingDirection})`}
            onClick={() => {
              onChangeDirection(typingDirection === 'across' ? 'down' : 'across');
              focusDeviceKeyboard();
            }}
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border wv-border wv-card py-1.5 wv-text transition-transform active:scale-95 hover:opacity-90 cursor-pointer"
          >
            {typingDirection === 'across' ? (
              <ArrowRight className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
            )}
            <span className="text-xs font-bold leading-none capitalize">
              {typingDirection}
            </span>
          </button>

          {/* 3. Word Meaning Clue (Ad) */}
          <button
            type="button"
            data-testid="action-trivia-btn"
            onClick={onTriggerWordClue}
            title="Watch an ad to reveal a short dictionary explanation clue"
            aria-label="Unlock Word Clue via rewarded ad"
            className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border py-1.5 transition-transform active:scale-95 cursor-pointer ${
              unlockedClueCount > 0 ? 'wv-accent-pill' : 'wv-border wv-card wv-text hover:opacity-90'
            }`}
          >
            <BookOpen className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
            <span className="text-xs font-bold leading-none">Clue (Ad)</span>
            {unlockedClueCount > 0 && (
              <span className="absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full wv-accent-btn px-1 font-mono-tabular text-[11px] font-bold">
                {unlockedClueCount}
              </span>
            )}
          </button>

          {/* 4. New / Fresh Board */}
          <button
            type="button"
            data-testid="action-skip-btn"
            onClick={onTriggerSkipBoard}
            title="Deal a fresh zero-repeat crossword board (or shake phone!)"
            aria-label="Deal a fresh crossword board"
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border wv-border wv-card py-1.5 wv-text transition-transform active:scale-95 hover:opacity-90 cursor-pointer"
          >
            <Shuffle className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
            <span className="text-xs font-bold leading-none">New Grid</span>
          </button>
        </div>
      )}

      {/* Lower Word Clue Section (Hidden/Locked Until User Watches Ad for This Word) */}
      {board.status === 'playing' && (
        <div
          data-testid="lower-word-clue-card"
          data-clue-locked={unlockedMainClue ? 'false' : 'true'}
          className="w-full max-w-[390px] rounded-xl border wv-border wv-card px-3.5 py-2.5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider wv-accent-text">
              {unlockedMainClue ? (
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{activeLineLabel} Clue</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border wv-border wv-card-muted px-2 py-0.5 font-mono-tabular text-[11px] font-bold wv-text-muted">
              {unlockedMainClue ? 'Unlocked' : 'Ad Locked'}
            </span>
          </div>

          {unlockedMainClue ? (
            <p
              data-testid="lower-clue-text"
              className="mt-1.5 text-sm font-semibold leading-snug wv-text"
            >
              {unlockedMainClue}
            </p>
          ) : (
            <div className="mt-1.5 flex items-center justify-between gap-2.5">
              <p
                data-testid="lower-clue-locked-msg"
                className="text-xs sm:text-sm font-medium leading-snug wv-text-muted"
              >
                Watch a quick ad to unlock this {typingDirection === 'down' ? 'Down' : 'Across'} clue.
              </p>
              <button
                type="button"
                data-testid="unlock-active-clue-btn"
                onClick={() => {
                  if (onUnlockActiveClue) {
                    onUnlockActiveClue(activeSlotType, activeSlotIndex);
                  } else {
                    onTriggerWordClue();
                  }
                }}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl wv-accent-btn px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                <span>Watch Ad to Unlock Clue</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Time's Up Retry Banner for Level Climb */}
      {puzzleTimedOut && board.status === 'playing' && onRetryTimedRound && (
        <div
          data-testid="puzzle-timeout-banner"
          className="flex w-full max-w-[390px] items-center justify-between gap-3 rounded-xl border-2 wv-border wv-card px-3.5 py-2.5 shadow-sm animate-stage-enter"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold wv-accent-text">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Time&apos;s Up! Climb reset to 1/5</span>
            </div>
            <p className="text-xs wv-text-muted">
              Beat all 5 shrinking-timer puzzles in a row to level up.
            </p>
          </div>
          <button
            type="button"
            data-testid="puzzle-retry-timed-btn"
            onClick={onRetryTimedRound}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl wv-gold-pill px-3 py-1.5 text-xs font-extrabold cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry 1/5</span>
          </button>
        </div>
      )}

      {/* Celebratory Linked Word Lists (Interactive Tap-for-Meaning Dictionary) & Fun Fact on Board Solve */}
      {board.status === 'won' && (
        <div
          data-testid="completed-cross-grid"
          className="mt-1 w-full max-w-[390px] space-y-2.5 animate-stage-enter"
        >
          <div className="rounded-xl border wv-border wv-card px-3.5 py-2.5 text-xs sm:text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold wv-accent-text">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tap any word or grid tile for its definition</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 font-bold wv-accent-text">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Across ({L})</span>
                </div>
                <ol className="mt-1 space-y-1 font-mono-tabular text-xs wv-text">
                  {board.solution.rows.map((w, idx) => {
                    const isPicked =
                      selectedDictWord?.word === w &&
                      selectedDictWord?.label === `Row ${idx + 1} Across`;
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          data-testid={`solved-word-row-${idx}`}
                          onClick={() =>
                            onSelectDictWord?.({
                              word: w,
                              label: `Row ${idx + 1} Across`,
                              meaning: getWordMeaningClue(w, category.name),
                            })
                          }
                          className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors cursor-pointer ${
                            isPicked
                              ? 'wv-accent-btn'
                              : 'hover:opacity-85 wv-card-muted border wv-border'
                          }`}
                        >
                          <span className="w-3.5 opacity-75">{idx + 1}.</span>
                          <span className="font-bold">{w}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold wv-accent-text">
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Down ({L})</span>
                </div>
                <ol className="mt-1 space-y-1 font-mono-tabular text-xs wv-text">
                  {board.solution.cols.map((w, idx) => {
                    const isPicked =
                      selectedDictWord?.word === w &&
                      selectedDictWord?.label === `Col ${idx + 1} Down`;
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          data-testid={`solved-word-col-${idx}`}
                          onClick={() =>
                            onSelectDictWord?.({
                              word: w,
                              label: `Col ${idx + 1} Down`,
                              meaning: getWordMeaningClue(w, category.name),
                            })
                          }
                          className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors cursor-pointer ${
                            isPicked
                              ? 'wv-accent-btn'
                              : 'hover:opacity-85 wv-card-muted border wv-border'
                          }`}
                        >
                          <span className="w-3.5 opacity-75">{idx + 1}.</span>
                          <span className="font-bold">{w}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>

          {selectedDictWord && (
            <div
              data-testid="post-solve-dictionary-card"
              className="rounded-xl border-2 wv-border wv-card px-3.5 py-2.5 text-sm shadow-xs animate-stage-enter"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-display text-base font-bold wv-accent-text">
                  <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{selectedDictWord.word}</span>
                </span>
                <span className="rounded-md border wv-border wv-card-muted px-2 py-0.5 text-xs font-bold wv-text-muted">
                  {selectedDictWord.label}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed wv-text">
                {selectedDictWord.meaning}
              </p>
            </div>
          )}

          {solveFunFact && (
            <div
              data-testid="puzzle-fun-fact"
              className="rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-sm leading-relaxed wv-text"
            >
              <span className="inline-flex items-center gap-1 font-bold wv-accent-text">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Did You Know?
              </span>{' '}
              <span>{solveFunFact}</span>
            </div>
          )}
        </div>
      )}

      {/* Boldly Advertised Featured Topics Card (Watch Ad for Any Topic of Choice) */}
      {featuredTopics.length > 0 && onSelectFeaturedTopic && onOpenTopicsExplorer && (
        <div
          data-testid="puzzle-topics-showcase"
          className="mt-1 w-full max-w-[390px] rounded-xl border-2 wv-border wv-card p-3 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider wv-accent-text">
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Featured Topics · Watch Ad to Unlock</span>
            </div>
            <button
              type="button"
              data-testid="topics-showcase-all-btn"
              onClick={onOpenTopicsExplorer}
              className="text-xs font-bold wv-accent-text hover:underline cursor-pointer whitespace-nowrap"
            >
              All 100 Topics →
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {featuredTopics.slice(0, 3).map((topic) => {
              const plays = topic.isPremium ? categoryPlaysRemainingMap[topic.id] || 0 : -1;
              const isSelected = topic.id === board.categoryId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  data-testid={`featured-topic-${topic.id}`}
                  onClick={() => onSelectFeaturedTopic(topic)}
                  className={`flex flex-col items-start justify-between rounded-lg border p-2 text-left transition-transform active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'wv-accent-btn border-transparent'
                      : 'wv-border wv-card-muted wv-text hover:opacity-90'
                  }`}
                >
                  <span className="line-clamp-1 w-full text-xs font-extrabold">
                    {topic.name}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold opacity-90">
                    {topic.isPremium ? (
                      plays > 0 ? (
                        <>
                          <Unlock className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{plays} left</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>Ad (+5)</span>
                        </>
                      )
                    ) : (
                      <span>Free Play</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
