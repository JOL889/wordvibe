import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  Grid2x2,
  Lightbulb,
  Play,
  Rows3,
  Shuffle,
  Sparkles,
  Split,
} from 'lucide-react';
import type { WordLength } from '../data/words';
import {
  evaluateGuess,
  type CursorDirection,
  type GridBoxHint,
  type PuzzleStatus,
  type TileState,
  type TypingDirection,
} from '../game/puzzleLogic';
import type { CompletedWordSquare } from '../game/wordSquareLogic';

interface PuzzleGridProps {
  length: WordLength;
  maxAttempts: number;
  rowGuesses: (string | null)[];
  rowDrafts: string[][];
  activeRow: number;
  activeCol: number;
  typingDirection: TypingDirection;
  onChangeDirection: (dir: TypingDirection) => void;
  target: string;
  status: PuzzleStatus;
  shakeRow: number | null;
  revealingRow: number | null;
  lastWonRow: number | null;
  showWinBurst?: boolean;
  boardAnimKey: string;
  gridHintBoxes: GridBoxHint[];
  defaultHintText?: string;
  progressiveNudge?: string;
  eliminatedLetters?: string[];
  solveFunFact?: string;
  hintsRemaining?: number;
  fiftyFiftyUsed?: boolean;
  wordTriviaUnlocked?: boolean;
  onTriggerHint?: () => void;
  onTriggerFiftyFifty?: () => void;
  onTriggerWordTrivia?: () => void;
  onTriggerSkipWord?: () => void;
  completedWordSquare: CompletedWordSquare | null;
  onSelectCell: (rowIdx: number, colIdx: number) => void;
  onKey: (key: string) => void;
  onMoveCursor: (dir: CursorDirection) => void;
}

const INPUT_SENTINEL = ' ';

const STATE_STYLES: Record<TileState, string> = {
  correct:
    'wv-tile-correct bg-[#1E6B52] border-[#1E6B52] text-white dark:bg-emerald-600 dark:border-emerald-600 shadow-xs',
  present:
    'wv-tile-present bg-amber-600 border-amber-600 text-white dark:bg-amber-500 dark:border-amber-500 dark:text-zinc-950 shadow-xs',
  absent:
    'wv-tile-absent bg-zinc-500/90 border-zinc-500/90 text-white dark:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200',
  tbd: 'bg-white dark:bg-zinc-900 border-zinc-700/80 dark:border-zinc-300 text-zinc-900 dark:text-zinc-50 shadow-[0_1px_2px_rgba(24,24,27,0.05)] animate-tile-pop',
  empty:
    'bg-white/85 dark:bg-zinc-900/60 border-stone-300/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 shadow-[0_1px_2px_rgba(24,24,27,0.03)]',
};

const STATE_LABELS: Record<TileState, string> = {
  correct: 'correct position',
  present: 'wrong position',
  absent: 'not in word',
  tbd: 'entered',
  empty: 'empty',
};

const WIN_BURST_PARTICLES = [
  { tx: '-64px', ty: '-48px', rot: '-45deg', color: 'bg-emerald-500', delay: '0ms' },
  { tx: '-42px', ty: '-74px', rot: '25deg', color: 'bg-amber-400', delay: '30ms' },
  { tx: '-14px', ty: '-82px', rot: '-20deg', color: 'bg-emerald-400', delay: '15ms' },
  { tx: '18px', ty: '-80px', rot: '40deg', color: 'bg-amber-500', delay: '40ms' },
  { tx: '48px', ty: '-68px', rot: '-35deg', color: 'bg-emerald-600', delay: '20ms' },
  { tx: '68px', ty: '-44px', rot: '55deg', color: 'bg-amber-400', delay: '50ms' },
  { tx: '-74px', ty: '-14px', rot: '-65deg', color: 'bg-amber-500', delay: '35ms' },
  { tx: '74px', ty: '-16px', rot: '70deg', color: 'bg-emerald-400', delay: '25ms' },
  { tx: '-52px', ty: '28px', rot: '45deg', color: 'bg-emerald-500', delay: '45ms' },
  { tx: '52px', ty: '28px', rot: '-50deg', color: 'bg-amber-400', delay: '55ms' },
];

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({
  length,
  maxAttempts,
  rowGuesses,
  rowDrafts,
  activeRow,
  activeCol,
  typingDirection,
  onChangeDirection,
  target,
  status,
  shakeRow,
  revealingRow,
  lastWonRow,
  showWinBurst = false,
  boardAnimKey,
  gridHintBoxes,
  defaultHintText,
  progressiveNudge,
  eliminatedLetters = [],
  solveFunFact,
  hintsRemaining = 0,
  fiftyFiftyUsed = false,
  wordTriviaUnlocked = false,
  onTriggerHint,
  onTriggerFiftyFifty,
  onTriggerWordTrivia,
  onTriggerSkipWord,
  completedWordSquare,
  onSelectCell,
  onKey,
  onMoveCursor,
}) => {
  const [postView, setPostView] = useState<'cross' | 'guesses'>('cross');
  const [isDealing, setIsDealing] = useState(true);
  const [hintTooltip, setHintTooltip] = useState(false);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsDealing(true);
    const timer = window.setTimeout(() => {
      setIsDealing(false);
    }, 620);
    return () => window.clearTimeout(timer);
  }, [boardAnimKey]);

  useEffect(() => {
    if (status === 'playing') {
      setPostView('cross');
    } else if (revealingRow === null && completedWordSquare) {
      setPostView('cross');
    }
  }, [status, revealingRow, completedWordSquare]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const focusDeviceKeyboard = () => {
    const input = deviceInputRef.current;
    if (!input || status !== 'playing') return;
    input.value = INPUT_SENTINEL;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    try {
      input.setSelectionRange(INPUT_SENTINEL.length, INPUT_SENTINEL.length);
    } catch {
      // Ignore if selection range unsupported
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
      const dirMap: Record<string, CursorDirection> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      onMoveCursor(dirMap[e.key]);
    }
  };

  const startHintLongPress = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setHintTooltip(true);
      window.setTimeout(() => setHintTooltip(false), 2400);
    }, 450);
  };

  const cancelHintLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const rows = Array.from({ length: maxAttempts });

  // Large, responsive full-screen Android letter tiles (56px-64px on 4/5L, safe fit on 360px for 6L)
  const tileSizeClass =
    length === 6
      ? 'h-[clamp(44px,13.5vw,54px)] w-[clamp(44px,13.5vw,54px)] text-[22px] sm:text-[26px]'
      : length === 4
      ? 'h-[clamp(56px,16vw,64px)] w-[clamp(56px,16vw,64px)] text-[26px] sm:text-[30px]'
      : 'h-[clamp(54px,15.5vw,62px)] w-[clamp(54px,15.5vw,62px)] text-[26px] sm:text-[30px]';

  const showCompletedCrossGrid =
    status !== 'playing' &&
    revealingRow === null &&
    Boolean(completedWordSquare) &&
    postView === 'cross';

  const activeDraft =
    activeRow >= 0 && activeRow < maxAttempts ? rowDrafts[activeRow] || [] : [];
  const filledInActiveRow = activeDraft.filter((ch) => ch !== '').length;
  const activeRowReady =
    status === 'playing' &&
    activeRow >= 0 &&
    activeRow < maxAttempts &&
    rowGuesses[activeRow] === null &&
    filledInActiveRow === length;
  const anyRowReady =
    activeRowReady ||
    (status === 'playing' &&
      rowDrafts.some(
        (d, idx) => rowGuesses[idx] === null && d.every((ch) => ch !== '')
      ));

  return (
    <div className="mx-auto my-0.5 flex w-full max-w-md flex-col items-center gap-2 px-2.5 sm:px-3 select-none">
      {/* Completed Cross-Grid View Switcher when round finishes */}
      {status !== 'playing' && completedWordSquare && revealingRow === null && (
        <div
          className="flex items-center justify-between w-full max-w-[360px] text-[11px] animate-stage-enter"
          role="group"
          aria-label="Completed board view"
        >
          <span className="font-semibold wv-accent-text">
            All Horizontal &amp; Vertical Words Valid
          </span>
          <div className="inline-flex rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              data-testid="view-cross-grid-btn"
              onClick={() => setPostView('cross')}
              aria-pressed={postView === 'cross'}
              className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
                postView === 'cross'
                  ? 'wv-accent-btn'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Grid2x2 className="h-3 w-3" aria-hidden="true" />
              <span>Cross-Grid</span>
            </button>
            <button
              type="button"
              data-testid="view-guesses-btn"
              onClick={() => setPostView('guesses')}
              aria-pressed={postView === 'guesses'}
              className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
                postView === 'guesses'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Rows3 className="h-3 w-3" aria-hidden="true" />
              <span>Guesses</span>
            </button>
          </div>
        </div>
      )}

      {showCompletedCrossGrid && completedWordSquare ? (
        <div
          data-testid="completed-cross-grid"
          aria-label={`${length} by ${length} completed horizontal and vertical English word grid`}
          className="flex w-full flex-col items-center gap-3 animate-stage-enter"
        >
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 p-3 sm:p-4 shadow-sm amoled-surface">
            {completedWordSquare.rows.map((rowWord, rIdx) => (
              <div key={rIdx} className="flex items-center gap-1.5 sm:gap-2" data-cross-row={rIdx}>
                {rowWord.split('').map((ch, cIdx) => {
                  const isTargetTile =
                    (completedWordSquare.targetPlacement.orientation === 'row' &&
                      completedWordSquare.targetPlacement.index === rIdx) ||
                    (completedWordSquare.targetPlacement.orientation === 'col' &&
                      completedWordSquare.targetPlacement.index === cIdx);

                  return (
                    <div
                      key={cIdx}
                      aria-label={`Row ${rIdx + 1} column ${cIdx + 1}: ${ch}`}
                      style={{ animationDelay: `${(rIdx * length + cIdx) * 28}ms` }}
                      className={`relative flex items-center justify-center rounded-xl border-2 font-bold uppercase tracking-wide animate-tile-deal ${tileSizeClass} ${
                        isTargetTile
                          ? 'wv-tile-correct bg-emerald-700 border-emerald-700 text-white dark:bg-emerald-600 dark:border-emerald-600'
                          : 'bg-[#FAF9F6] dark:bg-zinc-900 border-zinc-800/80 dark:border-zinc-400/70 text-zinc-900 dark:text-zinc-50'
                      }`}
                    >
                      <span>{ch}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="grid w-full max-w-[360px] grid-cols-2 gap-3 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 px-3.5 py-2.5 text-xs amoled-surface">
            <div>
              <div className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
                <ArrowRight className="h-3 w-3 wv-accent-text" aria-hidden="true" />
                <span>Horizontal ({length})</span>
              </div>
              <ol className="mt-1 space-y-0.5 font-mono-tabular text-[11px] text-zinc-600 dark:text-zinc-300">
                {completedWordSquare.rows.map((w, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-3 text-zinc-400">{idx + 1}.</span>
                    <span
                      className={
                        w === completedWordSquare.target
                          ? 'font-bold wv-accent-text'
                          : 'font-semibold'
                      }
                    >
                      {w}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
                <ArrowDown className="h-3 w-3 wv-accent-text" aria-hidden="true" />
                <span>Vertical ({length})</span>
              </div>
              <ol className="mt-1 space-y-0.5 font-mono-tabular text-[11px] text-zinc-600 dark:text-zinc-300">
                {completedWordSquare.cols.map((w, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-3 text-zinc-400">{idx + 1}.</span>
                    <span
                      className={
                        w === completedWordSquare.target
                          ? 'font-bold wv-accent-text'
                          : 'font-semibold'
                      }
                    >
                      {w}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div
          key={boardAnimKey}
          data-testid="puzzle-grid"
          data-word-length={length}
          data-max-attempts={maxAttempts}
          data-active-row={activeRow}
          data-active-col={activeCol}
          data-typing-direction={typingDirection}
          role="region"
          aria-label={`${length}-letter word guessing grid`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              focusDeviceKeyboard();
            }
          }}
          className="relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-0.5"
        >
          {/* Spontaneous Native Input Bridge (16px font-size prevents mobile auto-zoom) */}
          <input
            ref={deviceInputRef}
            data-testid="device-keyboard-input"
            data-device-keyboard="true"
            type="text"
            inputMode="text"
            enterKeyHint="send"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Puzzle letter input"
            disabled={status !== 'playing'}
            defaultValue={INPUT_SENTINEL}
            onFocus={(e) => {
              resetSentinel(e.currentTarget);
            }}
            onChange={handleDeviceInputChange}
            onKeyDown={handleDeviceInputKeyDown}
            className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 opacity-0 text-base caret-transparent"
          />

          {/* Celebratory Geometric Confetti Burst on Win */}
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
                      animationDelay: p.delay,
                    } as React.CSSProperties
                  }
                  className={`absolute block h-2.5 w-2.5 rounded-sm ${p.color} animate-confetti-burst`}
                />
              ))}
            </div>
          )}

          {rows.map((_, rowIdx) => {
            const submittedWord = rowGuesses[rowIdx];
            const isSubmitted = submittedWord !== null && submittedWord !== undefined;
            const isActiveRow = !isSubmitted && rowIdx === activeRow && status === 'playing';
            const draftChars = rowDrafts[rowIdx] || new Array<string>(length).fill('');
            const evaluated: TileState[] = isSubmitted
              ? evaluateGuess(submittedWord, target)
              : new Array(length).fill('empty');

            const isWinRow = status === 'won' && rowIdx === lastWonRow;
            const isShaking = shakeRow === rowIdx;
            const isRevealing = revealingRow === rowIdx;
            const isRowReadyToSubmit =
              isActiveRow &&
              typingDirection === 'across' &&
              activeCol >= length &&
              draftChars.every((ch) => ch !== '');

            return (
              <div
                key={rowIdx}
                data-row-index={rowIdx}
                data-row-active={isActiveRow ? 'true' : 'false'}
                data-row-ready={isRowReadyToSubmit ? 'true' : 'false'}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-xl transition-all duration-150 ${
                  isRowReadyToSubmit
                    ? 'bg-emerald-50/75 dark:bg-emerald-950/25 ring-1 ring-emerald-600/40 dark:ring-emerald-400/40 p-0.5 -m-0.5'
                    : isActiveRow && typingDirection === 'across'
                    ? 'bg-stone-200/45 dark:bg-zinc-800/35 p-0.5 -m-0.5'
                    : ''
                } ${isShaking ? 'animate-row-shake' : ''}`}
              >
                {Array.from({ length }).map((__, colIdx) => {
                  const char = isSubmitted ? submittedWord[colIdx] || '' : draftChars[colIdx] || '';
                  const boxHint = !isSubmitted
                    ? gridHintBoxes.find((h) => h.row === rowIdx && h.col === colIdx)
                    : undefined;
                  const state: TileState = isSubmitted
                    ? evaluated[colIdx]
                    : char
                    ? 'tbd'
                    : 'empty';

                  const showHintGhost = Boolean(boxHint && !char && status === 'playing');
                  const displayChar = char || (showHintGhost ? boxHint!.letter : '');
                  const isCursorCell =
                    status === 'playing' &&
                    !isSubmitted &&
                    activeRow < maxAttempts &&
                    rowIdx === activeRow &&
                    activeCol < length &&
                    colIdx === activeCol;
                  const isActiveDownColCell =
                    status === 'playing' &&
                    typingDirection === 'down' &&
                    !isSubmitted &&
                    colIdx === activeCol;

                  const animationStyle: React.CSSProperties | undefined = isRevealing
                    ? { animationDelay: `${colIdx * 85}ms` }
                    : isWinRow
                    ? { animationDelay: `${colIdx * 65}ms` }
                    : isDealing && !isSubmitted && state === 'empty'
                    ? { animationDelay: `${(rowIdx * length + colIdx) * 14}ms` }
                    : undefined;

                  const animClass = isRevealing
                    ? 'animate-tile-flip'
                    : isWinRow
                    ? 'animate-tile-bounce'
                    : state === 'tbd'
                    ? 'animate-tile-pop'
                    : showHintGhost
                    ? 'animate-hint-glint'
                    : isDealing && !isSubmitted
                    ? 'animate-tile-deal'
                    : '';

                  if (isSubmitted || status !== 'playing') {
                    return (
                      <div
                        key={colIdx}
                        data-tile-state={state}
                        aria-label={
                          char
                            ? `Row ${rowIdx + 1} column ${colIdx + 1}: ${char}, ${STATE_LABELS[state]}`
                            : `Row ${rowIdx + 1} column ${colIdx + 1}: empty`
                        }
                        style={animationStyle}
                        className={`relative flex items-center justify-center rounded-xl border-2 font-bold uppercase tracking-wide transition-transform duration-150 ${tileSizeClass} ${STATE_STYLES[state]} ${animClass}`}
                      >
                        <span>{displayChar}</span>
                        {state === 'correct' && (
                          <Check
                            className="absolute top-1 right-1 h-2.5 w-2.5 opacity-85"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        )}
                        {state === 'present' && (
                          <CircleDot
                            className="absolute top-1 right-1 h-2.5 w-2.5 opacity-85"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={colIdx}
                      type="button"
                      data-tile-state={state}
                      data-cursor-active={isCursorCell ? 'true' : 'false'}
                      data-smart-hint={boxHint ? boxHint.source : undefined}
                      aria-label={
                        char
                          ? `Row ${rowIdx + 1} column ${colIdx + 1}: ${char}, tap to edit`
                          : showHintGhost
                          ? `Row ${rowIdx + 1} column ${colIdx + 1}: hint letter ${boxHint!.letter}, tap to type`
                          : `Row ${rowIdx + 1} column ${colIdx + 1}: empty, tap to select box`
                      }
                      style={animationStyle}
                      onClick={() => {
                        onSelectCell(rowIdx, colIdx);
                        focusDeviceKeyboard();
                      }}
                      className={`relative flex items-center justify-center rounded-xl border-2 font-bold uppercase tracking-wide transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${tileSizeClass} ${animClass} ${
                        showHintGhost
                          ? 'border-dashed border-emerald-600/85 dark:border-emerald-400/85 bg-emerald-50/75 dark:bg-emerald-950/35 text-emerald-700/85 dark:text-emerald-300/90'
                          : isActiveDownColCell && !char
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-600/50 dark:border-emerald-500/45 text-zinc-900 dark:text-zinc-100'
                          : isActiveRow && !char
                          ? 'bg-white dark:bg-zinc-900 border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100'
                          : `${STATE_STYLES[state]} hover:border-zinc-500 dark:hover:border-zinc-400`
                      } ${
                        isCursorCell
                          ? 'scale-[1.04] ring-2 ring-emerald-700/45 dark:ring-emerald-400/45 border-emerald-700 dark:border-emerald-400 shadow-xs'
                          : ''
                      }`}
                    >
                      <span>{displayChar}</span>
                      {showHintGhost && (
                        <Sparkles
                          className="absolute top-1 right-1 h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 opacity-80"
                          aria-hidden="true"
                        />
                      )}
                      {isCursorCell &&
                        (typingDirection === 'down' ? (
                          <span
                            aria-hidden="true"
                            className="animate-caret-breathe absolute right-1.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-600 dark:bg-emerald-400"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="animate-caret-breathe absolute bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-emerald-600 dark:bg-emerald-400"
                          />
                        ))}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Compact Icon-Based Action Bar (Mobile Game Style) */}
      {status === 'playing' && (
        <div className="w-full max-w-[380px] pt-1 space-y-2">
          {hintTooltip && (
            <div
              role="status"
              className="mx-auto w-fit rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-white dark:text-zinc-900 shadow-md animate-toast-up"
            >
              Watch short ad to reveal a smart letter box
            </div>
          )}

          <div
            data-testid="icon-action-bar"
            role="toolbar"
            aria-label="Puzzle actions"
            className="grid grid-cols-6 gap-1.5"
          >
            {/* 1. Hint Bulb + Video Badge */}
            <button
              type="button"
              data-testid="action-hint-btn"
              disabled={hintsRemaining <= 0}
              onClick={() => {
                if (onTriggerHint) onTriggerHint();
              }}
              onPointerDown={startHintLongPress}
              onPointerUp={cancelHintLongPress}
              onPointerLeave={cancelHintLongPress}
              title="Reveal 1 vertical hint letter (Video reward)"
              aria-label={`Hint (${hintsRemaining} left)`}
              className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 transition-transform active:scale-90 hover:border-amber-500/60 disabled:opacity-40 cursor-pointer amoled-surface"
            >
              <span className="relative">
                <Lightbulb className="h-[18px] w-[18px] text-amber-500" aria-hidden="true" />
                <Play
                  className="absolute -right-2 -top-1 h-2.5 w-2.5 fill-amber-500 text-amber-500"
                  aria-hidden="true"
                />
              </span>
              <span className="text-[10px] font-semibold leading-none">Hint</span>
              <span className="absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono-tabular text-[9px] font-bold text-zinc-950">
                {hintsRemaining}
              </span>
            </button>

            {/* 2. 50/50 Split */}
            <button
              type="button"
              data-testid="action-fifty-btn"
              disabled={fiftyFiftyUsed}
              onClick={() => {
                if (onTriggerFiftyFifty) onTriggerFiftyFifty();
              }}
              title="Eliminate 5 unused dead letters"
              aria-label={fiftyFiftyUsed ? '50/50 split used' : 'Use 50/50 dead letter elimination'}
              className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 transition-transform active:scale-90 hover:border-sky-500/60 disabled:opacity-40 cursor-pointer amoled-surface"
            >
              <Split className="h-[18px] w-[18px] text-sky-500" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">50/50</span>
              <span className="absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-200 px-1 font-mono-tabular text-[9px] font-bold text-white dark:text-zinc-900">
                {fiftyFiftyUsed ? '0' : '1'}
              </span>
            </button>

            {/* 3. Direction Swap (Across / Down) */}
            <button
              type="button"
              data-testid="dir-toggle-btn"
              aria-pressed={typingDirection === 'down'}
              aria-label={`Switch direction (currently ${typingDirection})`}
              title={`Typing ${typingDirection} — tap to switch`}
              onClick={() => {
                onChangeDirection(typingDirection === 'across' ? 'down' : 'across');
                focusDeviceKeyboard();
              }}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 transition-transform active:scale-90 hover:border-emerald-500/60 cursor-pointer amoled-surface"
            >
              {typingDirection === 'across' ? (
                <ArrowRight className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
              ) : (
                <ArrowDown className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
              )}
              <span className="text-[10px] font-semibold leading-none capitalize">
                {typingDirection}
              </span>
            </button>

            {/* 4. Word Trivia Clue */}
            <button
              type="button"
              data-testid="action-trivia-btn"
              onClick={() => {
                if (onTriggerWordTrivia) onTriggerWordTrivia();
              }}
              title="Unlock or view conversational word clue"
              aria-label="Word Trivia Clue"
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border transition-transform active:scale-90 cursor-pointer amoled-surface ${
                wordTriviaUnlocked
                  ? 'wv-accent-pill border'
                  : 'border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/60'
              }`}
            >
              <BookOpen className="h-[18px] w-[18px] wv-accent-text" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Clue</span>
              {!wordTriviaUnlocked && (
                <span className="absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 font-mono-tabular text-[8px] font-bold text-white">
                  AI
                </span>
              )}
            </button>

            {/* 5. Shuffle / Skip Word */}
            <button
              type="button"
              data-testid="action-skip-btn"
              onClick={() => {
                if (onTriggerSkipWord) onTriggerSkipWord();
              }}
              title="Skip to a fresh word"
              aria-label="Skip to a backup word"
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 transition-transform active:scale-90 hover:border-violet-500/60 cursor-pointer amoled-surface"
            >
              <Shuffle className="h-[18px] w-[18px] text-violet-400" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Skip</span>
            </button>

            {/* 6. Primary Checkmark Submit */}
            <button
              type="button"
              data-testid="submit-guess-btn"
              onClick={() => {
                onKey('ENTER');
                focusDeviceKeyboard();
              }}
              aria-label="Submit guess"
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl font-bold transition-transform active:scale-90 cursor-pointer ${
                anyRowReady
                  ? 'wv-accent-btn shadow-md'
                  : 'border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Check className="h-[19px] w-[19px]" strokeWidth={2.75} aria-hidden="true" />
              <span className="text-[10px] font-bold leading-none">Submit</span>
            </button>
          </div>

          {/* Default Smart Hint + Progressive Secondary Nudge + 50/50 Eliminated Letters */}
          {defaultHintText && (
            <p
              data-testid="default-smart-hint-banner"
              className="flex items-center justify-center gap-1.5 text-[11px] font-medium wv-accent-text"
            >
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{defaultHintText}</span>
            </p>
          )}

          {progressiveNudge && (
            <div
              data-testid="progressive-nudge-banner"
              className="rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-center text-xs font-medium text-amber-900 dark:text-amber-200 animate-stage-enter"
            >
              {progressiveNudge}
            </div>
          )}

          {eliminatedLetters.length > 0 && (
            <div
              data-testid="eliminated-letters-bar"
              className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400"
            >
              <span className="font-semibold">Not in word:</span>
              {eliminatedLetters.map((ch) => (
                <span
                  key={ch}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-800 px-1 font-mono-tabular text-[10px] font-bold text-zinc-500 dark:text-zinc-400 line-through"
                >
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bite-Sized "Did You Know?" Fun Fact Immediately on Solve / Round End */}
      {status !== 'playing' && solveFunFact && (
        <div
          data-testid="puzzle-fun-fact"
          className="mt-1 w-full max-w-[380px] rounded-xl border border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-800 dark:text-amber-100 animate-stage-enter"
        >
          <span className="font-bold text-amber-700 dark:text-amber-300">Did You Know? </span>
          <span>{solveFunFact}</span>
        </div>
      )}
    </div>
  );
};
