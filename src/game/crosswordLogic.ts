import { SOLUTION_WORDS, VALID_WORDS, type WordLength } from '../data/words';
import { getCategoryById } from '../data/categories';
import { evaluateGuess, type TileState, type TypingDirection } from './puzzleLogic';
import {
  formatLevelLabel,
  getNextFiveLevel,
  getNextLevelNumber,
  levelNumberToDifficultyBand,
  normalizeLevelNumber,
  type FiveDifficultyLevel,
} from './settingsLogic';
import { buildConsonantVowelMeaningClue, hasCuratedWordMeaning } from './wordMeanings';
import {
  buildCompletedWordSquare,
  getPrecomputedTargetsForLength,
  type CompletedWordSquare,
} from './wordSquareLogic';
import {
  getBucketSeenKeys,
  markBucketKeySeen,
  pickZeroRepeatItem,
} from './zeroRepeatDeck';

export type CrosswordSlotType = 'row' | 'col';

export interface CrosswordBoardState {
  boardId: string;
  length: WordLength;
  levelNumber: number;
  level: FiveDifficultyLevel;
  categoryId: string;
  /** Verified L x L asymmetric English word square (2*L distinct words) */
  solution: CompletedWordSquare;
  /** User-entered grid characters (empty string if blank) */
  userGrid: string[][];
  /** Starter intersection anchors given at level difficulty */
  anchorCells: boolean[][];
  /** Cells locked in green (either starter anchors, ad-hints, or part of a solved word) */
  lockedCells: boolean[][];
  /** Individual completion status per horizontal row (0..L-1) */
  solvedRows: boolean[];
  /** Individual completion status per vertical column (0..L-1) */
  solvedCols: boolean[];
  /** Ephemeral letter evaluation feedback per cell from the last Enter check on an un-solved line */
  feedbackGrid: (TileState | null)[][];
  /** Ad-unlocked clues keyed by `row-<idx>` or `col-<idx>` ("3 consonants, 2 vowels — ...") */
  unlockedClues: Record<string, string>;
  /** Number of unlimited ad-watched letter hints revealed on this board */
  hintsUsed: number;
  /** Number of wrong line checks on this board (Level Climb scoring uses clean solves) */
  wrongChecks: number;
  /** Game completion state — only 'won' once EVERY row AND column is solved individually */
  status: 'playing' | 'won';
}

export interface CrosswordLevelClimbState {
  levelNumber: number;
  currentLevel: FiveDifficultyLevel;
  roundIndex: number; // 0..9 (10 puzzles per climb stage)
  roundPassedCount: number; // >= 8 out of 10 promotes level
  stageComplete: boolean;
  promotedToLevelNumber: number | null;
  promotedToLevel: FiveDifficultyLevel | null;
}

export const CROSSWORD_LEVEL_CLIMB_TOTAL = 10;
export const CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD = 8;

const FALLBACK_VALID_SQUARES: Record<WordLength, string[]> = {
  4: ['STAR', 'ORCA', 'NARC', 'EPEE'],
  5: ['HERDS', 'AVAIL', 'DIZZY', 'STEEL', 'TEENY'],
  6: ['PASTAS', 'ACCUSE', 'SHARPS', 'TERBIA', 'INFORM', 'LESSEE'],
};

function createBoolGrid(length: number, fill = false): boolean[][] {
  return Array.from({ length }, () => new Array<boolean>(length).fill(fill));
}

function createEmptyGrid(length: number): string[][] {
  return Array.from({ length }, () => new Array<string>(length).fill(''));
}

function createFeedbackGrid(length: number): (TileState | null)[][] {
  return Array.from({ length }, () => new Array<TileState | null>(length).fill(null));
}

/**
 * Ranks word difficulty roughly by rare letters, double letters, and word length fit
 * so Novice receives friendly everyday words while Expert/Legendary receive trickier sets.
 */
function scoreWordComplexity(word: string): number {
  let score = 0;
  const freqMap: Record<string, number> = {};
  for (const ch of word) {
    freqMap[ch] = (freqMap[ch] || 0) + 1;
    if ('QXZJKVW'.includes(ch)) score += 3;
    else if ('FYBPG'.includes(ch)) score += 1;
    else if ('EAROTLISN'.includes(ch)) score -= 0.5;
  }
  for (const count of Object.values(freqMap)) {
    if (count > 1) score += 2;
  }
  return score;
}

function filterWordsByLevel(pool: readonly string[], level: FiveDifficultyLevel): string[] {
  if (pool.length <= 8) return [...pool];
  const sorted = [...pool].sort((a, b) => scoreWordComplexity(a) - scoreWordComplexity(b));
  const n = sorted.length;
  if (level === 'novice') return sorted.slice(0, Math.max(8, Math.ceil(n * 0.4)));
  if (level === 'beginner') {
    return sorted.slice(Math.floor(n * 0.15), Math.max(10, Math.ceil(n * 0.58)));
  }
  if (level === 'intermediate') {
    return sorted.slice(Math.floor(n * 0.3), Math.max(10, Math.ceil(n * 0.78)));
  }
  if (level === 'expert') {
    return sorted.slice(Math.floor(n * 0.55));
  }
  // legendary
  return sorted.slice(Math.floor(n * 0.72));
}

function anchorCountForDifficulty(length: WordLength, levelNumber: number): number {
  const lv = normalizeLevelNumber(levelNumber);
  if (lv <= 1) return length === 4 ? 6 : length === 5 ? 9 : 13;
  if (lv === 2) return length === 4 ? 4 : length === 5 ? 6 : 9;
  if (lv === 3) return length === 4 ? 3 : length === 5 ? 4 : 6;
  if (lv === 4) return length === 4 ? 1 : length === 5 ? 2 : 3;
  return 0; // Level 5+: zero starter anchors
}

function pickCrosswordSolution(params: {
  length: WordLength;
  levelNumber: number;
  categoryId: string;
  forcedTarget?: string;
}): CompletedWordSquare {
  const { length, levelNumber, categoryId, forcedTarget } = params;
  const band = levelNumberToDifficultyBand(levelNumber);
  const globalBucket = `crossword:global:${length}`;

  if (forcedTarget) {
    const clean = forcedTarget.trim().toUpperCase();
    const built = buildCompletedWordSquare(clean, length);
    if (built) return built;
  }

  const category = getCategoryById(categoryId);
  const catWords =
    length === 4 ? category.words4 : length === 6 ? category.words6 : category.words5;
  const globalPool = SOLUTION_WORDS[length];
  const precomputedForLen = getPrecomputedTargetsForLength(length);
  const mergedPool = Array.from(
    new Set([...catWords, ...filterWordsByLevel(globalPool, band), ...precomputedForLen])
  );

  const isAllCuratedSquare = (sq: CompletedWordSquare): boolean =>
    sq.rows.every((w) => hasCuratedWordMeaning(w)) &&
    sq.cols.every((w) => hasCuratedWordMeaning(w));

  // Try up to 10 zero-repeat target draws (respecting global seen boards) preferring squares with 100% curated meanings
  const globalSeen = getBucketSeenKeys(globalBucket);
  const tried: string[] = [...globalSeen];
  const maxAttempts = length === 6 ? 5 : 10;
  let backupBuilt: CompletedWordSquare | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pickedWord = pickZeroRepeatItem(
      `crossword:${categoryId}:${length}:${levelNumber}`,
      mergedPool,
      (w) => w,
      tried
    );
    tried.push(pickedWord);
    const built = buildCompletedWordSquare(pickedWord, length);
    if (built) {
      if (isAllCuratedSquare(built)) {
        markBucketKeySeen(globalBucket, built.target);
        return built;
      }
      if (!backupBuilt) backupBuilt = built;
    }
  }

  // Zero-repeat draw from precomputed verified asymmetric words (100% curated dictionary meanings!)
  if (precomputedForLen.length > 0) {
    const guaranteedPick = pickZeroRepeatItem(
      `crossword:precomputed:${length}`,
      precomputedForLen,
      (w) => w,
      globalSeen
    );
    const builtGuaranteed = buildCompletedWordSquare(guaranteedPick, length);
    if (builtGuaranteed) {
      markBucketKeySeen(globalBucket, builtGuaranteed.target);
      return builtGuaranteed;
    }
  }

  if (backupBuilt) {
    markBucketKeySeen(globalBucket, backupBuilt.target);
    return backupBuilt;
  }

  // Fallback with guaranteed common words for requested length
  for (const word of ['CRANE', 'STAR', 'AGENDA', 'INFORM', 'HEART', 'PEACE', 'LIGHT', 'MIND', 'BLUE']) {
    if (word.length === length) {
      const built = buildCompletedWordSquare(word, length);
      if (built) {
        markBucketKeySeen(globalBucket, built.target);
        return built;
      }
    }
  }

  const backupRows = FALLBACK_VALID_SQUARES[length] || FALLBACK_VALID_SQUARES[5];
  const actualLen = backupRows.length as WordLength;
  return {
    length: actualLen,
    target: backupRows[0],
    rows: backupRows,
    cols: Array.from({ length: actualLen }, (_, c) => backupRows.map((r) => r[c]).join('')),
    targetPlacement: { orientation: 'row', index: 0 },
  };
}

function selectAnchorPositions(length: WordLength, count: number): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  // Spread evenly without ever completing an entire row or column automatically!
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < length; r++) {
    for (let c = 0; c < length; c++) {
      candidates.push([r, c]);
    }
  }
  // Shuffle deterministically-free for variety while guaranteeing no row or col becomes 100% full
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const rowCounts = new Array<number>(length).fill(0);
  const colCounts = new Array<number>(length).fill(0);
  const maxPerLine = Math.max(1, length - 2); // Leave at least 2 empty boxes in every line

  for (const [r, c] of candidates) {
    if (positions.length >= count) break;
    if (rowCounts[r] >= maxPerLine || colCounts[c] >= maxPerLine) continue;
    positions.push([r, c]);
    rowCounts[r]++;
    colCounts[c]++;
  }
  return positions;
}

export function createCrosswordBoard(params: {
  length: WordLength;
  level?: FiveDifficultyLevel | number;
  levelNumber?: number;
  categoryId?: string;
  forcedTarget?: string;
}): CrosswordBoardState {
  const categoryId = params.categoryId || 'general-classic';
  const levelNumber = normalizeLevelNumber(params.levelNumber ?? params.level, 1);
  const band = levelNumberToDifficultyBand(levelNumber);
  const solution = pickCrosswordSolution({
    length: params.length,
    levelNumber,
    categoryId,
    forcedTarget: params.forcedTarget,
  });

  const L = solution.length;
  const userGrid = createEmptyGrid(L);
  const anchorCells = createBoolGrid(L, false);
  const lockedCells = createBoolGrid(L, false);
  const anchorCount = anchorCountForDifficulty(L, levelNumber);
  const anchors = selectAnchorPositions(L, anchorCount);

  for (const [r, c] of anchors) {
    const letter = solution.rows[r][c];
    userGrid[r][c] = letter;
    anchorCells[r][c] = true;
    lockedCells[r][c] = true;
  }

  return {
    boardId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    length: L,
    levelNumber,
    level: band,
    categoryId,
    solution,
    userGrid,
    anchorCells,
    lockedCells,
    solvedRows: new Array<boolean>(L).fill(false),
    solvedCols: new Array<boolean>(L).fill(false),
    feedbackGrid: createFeedbackGrid(L),
    unlockedClues: {},
    hintsUsed: 0,
    wrongChecks: 0,
    status: 'playing',
  };
}

export function getFirstEditableCell(board: CrosswordBoardState): { row: number; col: number } {
  const L = board.length;
  for (let r = 0; r < L; r++) {
    for (let c = 0; c < L; c++) {
      if (!board.lockedCells[r][c]) return { row: r, col: c };
    }
  }
  return { row: 0, col: 0 };
}

export function findNextEditableAlongLine(
  board: CrosswordBoardState,
  row: number,
  col: number,
  dir: TypingDirection,
  includeCurrent = false
): { row: number; col: number } | null {
  const L = board.length;
  if (dir === 'across') {
    for (let c = includeCurrent ? col : col + 1; c < L; c++) {
      if (!board.lockedCells[row][c]) return { row, col: c };
    }
    return null;
  }
  for (let r = includeCurrent ? row : row + 1; r < L; r++) {
    if (!board.lockedCells[r][col]) return { row: r, col };
  }
  return null;
}

export function findPrevEditableAlongLine(
  board: CrosswordBoardState,
  row: number,
  col: number,
  dir: TypingDirection
): { row: number; col: number } | null {
  if (dir === 'across') {
    for (let c = col - 1; c >= 0; c--) {
      if (!board.lockedCells[row][c]) return { row, col: c };
    }
    return null;
  }
  for (let r = row - 1; r >= 0; r--) {
    if (!board.lockedCells[r][col]) return { row: r, col };
  }
  return null;
}

export function findNextOpenWordCursor(
  board: CrosswordBoardState,
  currentRow: number,
  currentCol: number,
  dir: TypingDirection
): { row: number; col: number; dir: TypingDirection } | null {
  const L = board.length;
  if (dir === 'across') {
    for (let step = 1; step <= L; step++) {
      const nr = (currentRow + step) % L;
      if (!board.solvedRows[nr]) {
        const cell = findNextEditableAlongLine(board, nr, 0, 'across', true);
        if (cell) return { ...cell, dir: 'across' };
      }
    }
  } else {
    for (let step = 1; step <= L; step++) {
      const nc = (currentCol + step) % L;
      if (!board.solvedCols[nc]) {
        const cell = findNextEditableAlongLine(board, 0, nc, 'down', true);
        if (cell) return { ...cell, dir: 'down' };
      }
    }
  }

  for (let r = 0; r < L; r++) {
    for (let c = 0; c < L; c++) {
      if (!board.lockedCells[r][c]) {
        const nextDir: TypingDirection = !board.solvedRows[r] ? 'across' : 'down';
        return { row: r, col: c, dir: nextDir };
      }
    }
  }
  return null;
}

export interface CrosswordKeyResult {
  board: CrosswordBoardState;
  nextRow: number;
  nextCol: number;
  nextDir: TypingDirection;
  outcome:
    | 'typed'
    | 'erased'
    | 'noop'
    | 'line_incomplete'
    | 'not_in_dictionary'
    | 'wrong_word'
    | 'line_solved'
    | 'board_won';
  solvedLineLabel?: string;
  solvedWord?: string;
}

/**
 * Pure key handler for the linked L x L crossword board:
 * - Typing A..Z writes into the clicked cell `(row, col)` (or next editable cell along `dir`),
 *   allowing the player to start from ANY square horizontally OR vertically without wrapping.
 * - Pressing ENTER verifies ONLY the single active row (if Across) or single active column (if Down).
 *   Completing one row does NOT complete the other rows or columns.
 */
export function applyCrosswordKey(
  board: CrosswordBoardState,
  row: number,
  col: number,
  dir: TypingDirection,
  key: string
): CrosswordKeyResult {
  const L = board.length;
  const upper = key.toUpperCase();

  if (board.status === 'won') {
    return { board, nextRow: row, nextCol: col, nextDir: dir, outcome: 'noop' };
  }

  // Letter entry A..Z
  if (/^[A-Z]$/.test(upper)) {
    const writeTarget =
      row >= 0 &&
      row < L &&
      col >= 0 &&
      col < L &&
      !board.lockedCells[row][col]
        ? { row, col }
        : findNextEditableAlongLine(board, Math.min(L - 1, Math.max(0, row)), Math.min(L - 1, Math.max(0, col)), dir, true);

    if (!writeTarget) {
      return { board, nextRow: row, nextCol: col, nextDir: dir, outcome: 'noop' };
    }

    const nextGrid = board.userGrid.map((r) => [...r]);
    const nextFeedback = board.feedbackGrid.map((r) => [...r]);
    nextGrid[writeTarget.row][writeTarget.col] = upper;
    // Clear stale feedback on the edited line
    if (dir === 'across') {
      for (let c = 0; c < L; c++) nextFeedback[writeTarget.row][c] = null;
    } else {
      for (let r = 0; r < L; r++) nextFeedback[r][writeTarget.col] = null;
    }

    const nextCursor = findNextEditableAlongLine(
      { ...board, userGrid: nextGrid },
      writeTarget.row,
      writeTarget.col,
      dir,
      false
    );

    return {
      board: {
        ...board,
        userGrid: nextGrid,
        feedbackGrid: nextFeedback,
      },
      nextRow: nextCursor ? nextCursor.row : writeTarget.row,
      nextCol: nextCursor ? nextCursor.col : writeTarget.col,
      nextDir: dir,
      outcome: 'typed',
    };
  }

  // Backspace
  if (upper === 'BACKSPACE') {
    const r = Math.min(L - 1, Math.max(0, row));
    const c = Math.min(L - 1, Math.max(0, col));
    const nextGrid = board.userGrid.map((rowArr) => [...rowArr]);
    const nextFeedback = board.feedbackGrid.map((rowArr) => [...rowArr]);

    if (!board.lockedCells[r][c] && nextGrid[r][c] !== '') {
      nextGrid[r][c] = '';
      nextFeedback[r][c] = null;
      return {
        board: { ...board, userGrid: nextGrid, feedbackGrid: nextFeedback },
        nextRow: r,
        nextCol: c,
        nextDir: dir,
        outcome: 'erased',
      };
    }

    const prev = findPrevEditableAlongLine(board, r, c, dir);
    if (prev) {
      nextGrid[prev.row][prev.col] = '';
      nextFeedback[prev.row][prev.col] = null;
      return {
        board: { ...board, userGrid: nextGrid, feedbackGrid: nextFeedback },
        nextRow: prev.row,
        nextCol: prev.col,
        nextDir: dir,
        outcome: 'erased',
      };
    }

    return { board, nextRow: r, nextCol: c, nextDir: dir, outcome: 'noop' };
  }

  // ENTER -> verify ONLY the active horizontal row or vertical column individually
  if (upper === 'ENTER') {
    const rIdx = Math.min(L - 1, Math.max(0, row));
    const cIdx = Math.min(L - 1, Math.max(0, col));

    const chars =
      dir === 'across'
        ? board.userGrid[rIdx]
        : Array.from({ length: L }, (_, r) => board.userGrid[r][cIdx]);

    if (chars.some((ch) => !ch)) {
      return {
        board,
        nextRow: rIdx,
        nextCol: cIdx,
        nextDir: dir,
        outcome: 'line_incomplete',
      };
    }

    const candidate = chars.join('');
    const targetWord =
      dir === 'across' ? board.solution.rows[rIdx] : board.solution.cols[cIdx];

    if (candidate !== targetWord) {
      const isValidDictWord = VALID_WORDS[L].has(candidate);
      const evalStates = evaluateGuess(candidate, targetWord);
      const nextFeedback = board.feedbackGrid.map((r) => [...r]);
      if (dir === 'across') {
        for (let c = 0; c < L; c++) nextFeedback[rIdx][c] = evalStates[c];
      } else {
        for (let r = 0; r < L; r++) nextFeedback[r][cIdx] = evalStates[r];
      }

      return {
        board: {
          ...board,
          feedbackGrid: nextFeedback,
          wrongChecks: board.wrongChecks + 1,
        },
        nextRow: rIdx,
        nextCol: cIdx,
        nextDir: dir,
        outcome: isValidDictWord ? 'wrong_word' : 'not_in_dictionary',
      };
    }

    // Exact match on ONLY this row or this column!
    const nextLocked = board.lockedCells.map((r) => [...r]);
    const nextFeedback = board.feedbackGrid.map((r) => [...r]);
    const nextSolvedRows = [...board.solvedRows];
    const nextSolvedCols = [...board.solvedCols];

    if (dir === 'across') {
      nextSolvedRows[rIdx] = true;
      for (let c = 0; c < L; c++) {
        nextLocked[rIdx][c] = true;
        nextFeedback[rIdx][c] = 'correct';
      }
    } else {
      nextSolvedCols[cIdx] = true;
      for (let r = 0; r < L; r++) {
        nextLocked[r][cIdx] = true;
        nextFeedback[r][cIdx] = 'correct';
      }
    }

    // Also mark any orthogonal row/column solved ONLY if every single cell in that line is already locked & exact
    for (let r = 0; r < L; r++) {
      if (
        !nextSolvedRows[r] &&
        board.userGrid[r].join('') === board.solution.rows[r] &&
        nextLocked[r].every(Boolean)
      ) {
        nextSolvedRows[r] = true;
      }
    }
    for (let c = 0; c < L; c++) {
      const colStr = Array.from({ length: L }, (_, rr) => board.userGrid[rr][c]).join('');
      const colAllLocked = Array.from({ length: L }, (_, rr) => nextLocked[rr][c]).every(Boolean);
      if (!nextSolvedCols[c] && colStr === board.solution.cols[c] && colAllLocked) {
        nextSolvedCols[c] = true;
      }
    }

    const allSolved = nextSolvedRows.every(Boolean) && nextSolvedCols.every(Boolean);
    const updatedBoard: CrosswordBoardState = {
      ...board,
      lockedCells: nextLocked,
      feedbackGrid: nextFeedback,
      solvedRows: nextSolvedRows,
      solvedCols: nextSolvedCols,
      status: allSolved ? 'won' : 'playing',
    };

    const lineLabel =
      dir === 'across' ? `Row ${rIdx + 1} Across` : `Col ${cIdx + 1} Down`;

    if (allSolved) {
      return {
        board: updatedBoard,
        nextRow: rIdx,
        nextCol: cIdx,
        nextDir: dir,
        outcome: 'board_won',
        solvedLineLabel: lineLabel,
        solvedWord: candidate,
      };
    }

    const nextOpen = findNextOpenWordCursor(updatedBoard, rIdx, cIdx, dir);
    return {
      board: updatedBoard,
      nextRow: nextOpen ? nextOpen.row : rIdx,
      nextCol: nextOpen ? nextOpen.col : cIdx,
      nextDir: nextOpen ? nextOpen.dir : dir,
      outcome: 'line_solved',
      solvedLineLabel: lineLabel,
      solvedWord: candidate,
    };
  }

  return { board, nextRow: row, nextCol: col, nextDir: dir, outcome: 'noop' };
}

/**
 * Reveals 1 unrevealed letter cell on the crossword grid (unlimited via watched ads!).
 */
export function applyUnlimitedCrosswordHint(
  board: CrosswordBoardState,
  preferredRow: number,
  preferredCol: number
): { board: CrosswordBoardState; revealedRow: number; revealedCol: number; letter: string } | null {
  if (board.status !== 'playing') return null;
  const L = board.length;
  const openCells: Array<[number, number]> = [];

  // Prioritize unlocked cells matching wrong/blank in active row or col first
  for (let r = 0; r < L; r++) {
    for (let c = 0; c < L; c++) {
      if (!board.lockedCells[r][c] && board.userGrid[r][c] !== board.solution.rows[r][c]) {
        openCells.push([r, c]);
      }
    }
  }
  if (openCells.length === 0) {
    for (let r = 0; r < L; r++) {
      for (let c = 0; c < L; c++) {
        if (!board.lockedCells[r][c]) openCells.push([r, c]);
      }
    }
  }
  if (openCells.length === 0) return null;

  openCells.sort((a, b) => {
    const aSame = Number(a[0] === preferredRow || a[1] === preferredCol);
    const bSame = Number(b[0] === preferredRow || b[1] === preferredCol);
    return bSame - aSame;
  });

  const [r, c] = openCells[0];
  const letter = board.solution.rows[r][c];
  const nextGrid = board.userGrid.map((rowArr) => [...rowArr]);
  const nextLocked = board.lockedCells.map((rowArr) => [...rowArr]);
  nextGrid[r][c] = letter;
  nextLocked[r][c] = true;

  const nextSolvedRows = [...board.solvedRows];
  const nextSolvedCols = [...board.solvedCols];
  for (let ri = 0; ri < L; ri++) {
    if (!nextSolvedRows[ri] && nextLocked[ri].every(Boolean) && nextGrid[ri].join('') === board.solution.rows[ri]) {
      nextSolvedRows[ri] = true;
    }
  }
  for (let ci = 0; ci < L; ci++) {
    const colStr = Array.from({ length: L }, (_, rr) => nextGrid[rr][ci]).join('');
    const colLocked = Array.from({ length: L }, (_, rr) => nextLocked[rr][ci]).every(Boolean);
    if (!nextSolvedCols[ci] && colLocked && colStr === board.solution.cols[ci]) {
      nextSolvedCols[ci] = true;
    }
  }
  const allSolved = nextSolvedRows.every(Boolean) && nextSolvedCols.every(Boolean);

  return {
    board: {
      ...board,
      userGrid: nextGrid,
      lockedCells: nextLocked,
      solvedRows: nextSolvedRows,
      solvedCols: nextSolvedCols,
      hintsUsed: board.hintsUsed + 1,
      status: allSolved ? 'won' : 'playing',
    },
    revealedRow: r,
    revealedCol: c,
    letter,
  };
}

/**
 * Unlocks a consonant/vowel breakdown + explanation clue for a specific Row (Across) or Column (Down) word.
 */
export function unlockCrosswordLineClue(
  board: CrosswordBoardState,
  slotType: CrosswordSlotType,
  index: number,
  categoryName?: string
): { board: CrosswordBoardState; clueKey: string; clueText: string } {
  const safeIdx = Math.min(board.length - 1, Math.max(0, index));
  const word =
    slotType === 'row' ? board.solution.rows[safeIdx] : board.solution.cols[safeIdx];
  const clue = buildConsonantVowelMeaningClue(word, categoryName);
  const clueKey = `${slotType}-${safeIdx}`;
  return {
    board: {
      ...board,
      unlockedClues: {
        ...board.unlockedClues,
        [clueKey]: clue.fullClue,
      },
    },
    clueKey,
    clueText: clue.fullClue,
  };
}

export function getCrosswordProgressSummary(board: CrosswordBoardState): {
  solvedRowsCount: number;
  solvedColsCount: number;
  totalWords: number;
  solvedWordsCount: number;
} {
  const solvedRowsCount = board.solvedRows.filter(Boolean).length;
  const solvedColsCount = board.solvedCols.filter(Boolean).length;
  const totalWords = board.length * 2;
  return {
    solvedRowsCount,
    solvedColsCount,
    totalWords,
    solvedWordsCount: solvedRowsCount + solvedColsCount,
  };
}

export function createCrosswordClimbState(
  level: FiveDifficultyLevel | number = 1
): CrosswordLevelClimbState {
  const levelNumber = normalizeLevelNumber(level, 1);
  return {
    levelNumber,
    currentLevel: levelNumberToDifficultyBand(levelNumber),
    roundIndex: 0,
    roundPassedCount: 0,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
}

export function isCleanCrosswordPass(board: CrosswordBoardState): boolean {
  return board.status === 'won' && board.wrongChecks <= 4;
}

export function advanceCrosswordLevelClimb(
  climb: CrosswordLevelClimbState,
  passedCleanly: boolean
): CrosswordLevelClimbState {
  if (climb.stageComplete) return climb;
  const levelNumber = normalizeLevelNumber(climb.levelNumber ?? climb.currentLevel, 1);
  const nextPassed = climb.roundPassedCount + (passedCleanly ? 1 : 0);
  const nextRound = climb.roundIndex + 1;
  if (nextRound >= CROSSWORD_LEVEL_CLIMB_TOTAL) {
    const promoted = nextPassed >= CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD;
    const nextNum = promoted ? getNextLevelNumber(levelNumber) : null;
    const legacyNext = promoted ? getNextFiveLevel(climb.currentLevel) : null;
    return {
      levelNumber,
      currentLevel: climb.currentLevel,
      roundIndex: CROSSWORD_LEVEL_CLIMB_TOTAL,
      roundPassedCount: nextPassed,
      stageComplete: true,
      promotedToLevelNumber: nextNum,
      promotedToLevel: legacyNext,
    };
  }
  return {
    ...climb,
    levelNumber,
    roundIndex: nextRound,
    roundPassedCount: nextPassed,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
}

export function formatCrosswordShareText(board: CrosswordBoardState): string {
  const prog = getCrosswordProgressSummary(board);
  const levelLabel = formatLevelLabel(board.levelNumber ?? normalizeLevelNumber(board.level, 1));
  const category = getCategoryById(board.categoryId);
  const rowBadges = board.solvedRows.map((s) => (s ? '🟩' : '⬜')).join('');
  const colBadges = board.solvedCols.map((s) => (s ? '🟨' : '⬜')).join('');
  return [
    `WordVibe ${board.length}×${board.length} Crossword · ${levelLabel}`,
    `${category.name} · ${prog.solvedWordsCount}/${prog.totalWords} linked words`,
    `Rows ${rowBadges}`,
    `Cols ${colBadges}`,
  ].join('\n');
}
