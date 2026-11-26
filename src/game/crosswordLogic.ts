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
import {
  getQueuedIdSet,
  getRetiredIdSet,
  selectComebackCandidate,
} from './retirementQueueLogic';
import {
  buildConsonantVowelMeaningClue,
  countWordConsonantsAndVowels,
  hasCuratedWordMeaning,
} from './wordMeanings';
import {
  buildCompletedWordSquare,
  getPrecomputedTargetsForLength,
  validateWordSquare,
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
  /** Permanent item ID tracked in retiredIds / redemptionQueue (e.g. `puzzle:5:HEART` or `faith:word:islam:PEACE`) */
  puzzleItemId: string;
  /** Which retirement mode owns this board's outcome */
  trackerMode?: 'puzzle' | 'faith';
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
  /** Ad-unlocked clues keyed by `row-<idx>` or `col-<idx>` */
  unlockedClues: Record<string, string>;
  /** Number of unlimited ad-watched letter hints revealed on this board */
  hintsUsed: number;
  /** Number of wrong line checks on this board (Level Climb scoring uses clean solves) */
  wrongChecks: number;
  /** Game completion state — only 'won' once EVERY row AND column is solved individually */
  status: 'playing' | 'won';
}

export function formatActiveWordLetterStats(
  word: string,
  direction: TypingDirection
): string {
  const { length, vowels, consonants } = countWordConsonantsAndVowels(word);
  const dirLabel = direction === 'down' ? 'Down' : 'Across';
  const letterLabel = length === 1 ? 'Letter' : 'Letters';
  const vowelLabel = vowels === 1 ? 'Vowel' : 'Vowels';
  const consonantLabel = consonants === 1 ? 'Consonant' : 'Consonants';
  return `${dirLabel} • ${length} ${letterLabel} (${vowels} ${vowelLabel}, ${consonants} ${consonantLabel})`;
}

export interface CrosswordLevelClimbState {
  levelNumber: number;
  currentLevel: FiveDifficultyLevel;
  roundIndex: number; // 0..4 (5 concurrent timed puzzles per climb stage)
  roundPassedCount: number; // 5 out of 5 within timer promotes level
  stageComplete: boolean;
  promotedToLevelNumber: number | null;
  promotedToLevel: FiveDifficultyLevel | null;
}

export const CROSSWORD_LEVEL_CLIMB_TOTAL = 5;
export const CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD = 5;

const CROSSWORD_CLIMB_SPEED_MULTIPLIERS = [1.0, 0.84, 0.70, 0.58, 0.46] as const;

/**
 * Returns the countdown time limit (seconds) for a Level Climb puzzle round.
 * As the player advances concurrently from Puzzle 1/5 -> Puzzle 5/5 to level up,
 * each subsequent puzzle gives a faster/tighter countdown.
 */
export function getCrosswordRoundTimeLimitSeconds(
  length: WordLength,
  levelNumber: number,
  roundIndex: number
): number {
  const baseSec = length === 4 ? 100 : length === 5 ? 160 : 220;
  const lv = normalizeLevelNumber(levelNumber, 1);
  const levelScale = Math.max(0.68, 1 - (lv - 1) * 0.04);
  const clampedIdx = Math.max(
    0,
    Math.min(CROSSWORD_LEVEL_CLIMB_TOTAL - 1, Math.floor(roundIndex))
  );
  const roundScale = CROSSWORD_CLIMB_SPEED_MULTIPLIERS[clampedIdx];
  const minFloor = length === 4 ? 25 : length === 5 ? 40 : 55;
  return Math.max(minFloor, Math.round(baseSec * levelScale * roundScale));
}

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

function makePuzzleItemId(length: WordLength, target: string): string {
  return `puzzle:${length}:${target.trim().toUpperCase()}`;
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

  // 1. Check Smart Comeback Queue for Puzzle Mode (seamless — NO badge, normal XP)
  const comebackEntry = selectComebackCandidate('puzzle', (entry) => {
    const snapLen = Number(entry.snapshot?.length);
    if (snapLen === 4 || snapLen === 5 || snapLen === 6) {
      return snapLen === length;
    }
    const parts = entry.id.split(':');
    return parts.length >= 3 && Number(parts[1]) === length;
  });

  if (comebackEntry) {
    const snapRows = comebackEntry.snapshot?.rows;
    const snapTarget =
      typeof comebackEntry.snapshot?.target === 'string'
        ? comebackEntry.snapshot.target.toUpperCase()
        : (comebackEntry.id.split(':')[2] || '').toUpperCase();

    if (
      Array.isArray(snapRows) &&
      snapRows.length === length &&
      snapRows.every((r): r is string => typeof r === 'string') &&
      validateWordSquare(snapRows, length)
    ) {
      const cols = Array.from({ length }, (_, c) => snapRows.map((r) => r[c]).join(''));
      const rIdx = snapRows.indexOf(snapTarget);
      const cIdx = rIdx === -1 ? cols.indexOf(snapTarget) : -1;
      return {
        length,
        target: snapTarget || snapRows[0],
        rows: snapRows,
        cols,
        targetPlacement: {
          orientation: rIdx !== -1 ? 'row' : 'col',
          index: rIdx !== -1 ? rIdx : Math.max(0, cIdx),
        },
      };
    }

    if (snapTarget.length === length) {
      const rebuilt = buildCompletedWordSquare(snapTarget, length);
      if (rebuilt) return rebuilt;
    }
  }

  const retiredIds = getRetiredIdSet('puzzle');
  const queuedIds = getQueuedIdSet('puzzle');
  const isAvailablePuzzleWord = (w: string): boolean => {
    const pid = makePuzzleItemId(length, w);
    return !retiredIds.has(pid) && !queuedIds.has(pid);
  };

  const category = getCategoryById(categoryId);
  const catWords =
    length === 4 ? category.words4 : length === 6 ? category.words6 : category.words5;
  const globalPool = SOLUTION_WORDS[length];
  const precomputedForLen = getPrecomputedTargetsForLength(length);
  const rawMergedPool = Array.from(
    new Set([...catWords, ...filterWordsByLevel(globalPool, band), ...precomputedForLen])
  );
  const eligiblePool = rawMergedPool.filter(isAvailablePuzzleWord);
  const mergedPool = eligiblePool.length > 0 ? eligiblePool : rawMergedPool;

  const isAllCuratedSquare = (sq: CompletedWordSquare): boolean =>
    sq.rows.every((w) => hasCuratedWordMeaning(w)) &&
    sq.cols.every((w) => hasCuratedWordMeaning(w));

  const retiredTargetWords = Array.from(retiredIds)
    .filter((id) => id.startsWith(`puzzle:${length}:`))
    .map((id) => id.slice(`puzzle:${length}:`.length));
  const queuedTargetWords = Array.from(queuedIds)
    .filter((id) => id.startsWith(`puzzle:${length}:`))
    .map((id) => id.slice(`puzzle:${length}:`.length));

  // Try zero-repeat target draws (excluding retiredIds, queuedIds, and seen boards) preferring curated meanings
  const globalSeen = getBucketSeenKeys(globalBucket);
  const tried: string[] = [...globalSeen, ...retiredTargetWords, ...queuedTargetWords];
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
    if (!isAvailablePuzzleWord(pickedWord) && eligiblePool.length > 0) continue;
    const built = buildCompletedWordSquare(pickedWord, length);
    if (built && (isAvailablePuzzleWord(built.target) || eligiblePool.length === 0)) {
      if (isAllCuratedSquare(built)) {
        markBucketKeySeen(globalBucket, built.target);
        return built;
      }
      if (!backupBuilt) backupBuilt = built;
    }
  }

  // Zero-repeat draw from precomputed verified asymmetric words (skipping retired & queued)
  const freshPrecomputed = precomputedForLen.filter(isAvailablePuzzleWord);
  if (freshPrecomputed.length > 0) {
    const guaranteedPick = pickZeroRepeatItem(
      `crossword:precomputed:${length}`,
      freshPrecomputed,
      (w) => w,
      [...globalSeen, ...retiredTargetWords, ...queuedTargetWords]
    );
    const builtGuaranteed = buildCompletedWordSquare(guaranteedPick, length);
    if (builtGuaranteed) {
      markBucketKeySeen(globalBucket, builtGuaranteed.target);
      return builtGuaranteed;
    }
  }

  if (backupBuilt && isAvailablePuzzleWord(backupBuilt.target)) {
    markBucketKeySeen(globalBucket, backupBuilt.target);
    return backupBuilt;
  }

  // Procedural fallback across VALID_WORDS[length] when curated/precomputed pools are retired or exhausted
  const dictWords = Array.from(VALID_WORDS[length]);
  const stepOffset = (retiredIds.size * 31 + levelNumber * 17) % Math.max(1, dictWords.length);
  const procCap = length === 6 ? 12 : 30;
  for (let i = 0; i < Math.min(dictWords.length, procCap); i++) {
    const candidate = dictWords[(stepOffset + i * 7) % dictWords.length];
    if (!isAvailablePuzzleWord(candidate)) continue;
    const built = buildCompletedWordSquare(candidate, length);
    if (built) {
      markBucketKeySeen(globalBucket, built.target);
      return built;
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
  trackerMode?: 'puzzle' | 'faith';
  faithReligion?: string;
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

  const trackerMode = params.trackerMode || 'puzzle';
  const puzzleItemId =
    trackerMode === 'faith' && params.faithReligion
      ? `faith:word:${params.faithReligion}:${solution.target}`
      : makePuzzleItemId(L, solution.target);

  return {
    boardId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    puzzleItemId,
    trackerMode,
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

  // ENTER -> verify completed word across OR down (direction-agnostic when completed!)
  if (upper === 'ENTER') {
    const rIdx = Math.min(L - 1, Math.max(0, row));
    const cIdx = Math.min(L - 1, Math.max(0, col));

    const getRowChars = (r: number) => board.userGrid[r];
    const getColChars = (c: number) =>
      Array.from({ length: L }, (_, rr) => board.userGrid[rr][c]);

    const isLineExact = (slotType: CrosswordSlotType, idx: number): boolean => {
      if (slotType === 'row') {
        if (board.solvedRows[idx]) return false;
        const chars = getRowChars(idx);
        return !chars.some((ch) => !ch) && chars.join('') === board.solution.rows[idx];
      }
      if (board.solvedCols[idx]) return false;
      const chars = getColChars(idx);
      return !chars.some((ch) => !ch) && chars.join('') === board.solution.cols[idx];
    };

    const isLineFilledUnsolved = (slotType: CrosswordSlotType, idx: number): boolean => {
      if (slotType === 'row') {
        return !board.solvedRows[idx] && !getRowChars(idx).some((ch) => !ch);
      }
      return !board.solvedCols[idx] && !getColChars(idx).some((ch) => !ch);
    };

    // 1. Check active line first, then orthogonal line at cursor, then any completed exact unsolved line
    let exactMatch: { slotType: CrosswordSlotType; index: number } | null = null;
    const primarySlot: CrosswordSlotType = dir === 'across' ? 'row' : 'col';
    const primaryIdx = dir === 'across' ? rIdx : cIdx;
    const orthoSlot: CrosswordSlotType = dir === 'across' ? 'col' : 'row';
    const orthoIdx = dir === 'across' ? cIdx : rIdx;

    if (isLineExact(primarySlot, primaryIdx)) {
      exactMatch = { slotType: primarySlot, index: primaryIdx };
    } else if (isLineExact(orthoSlot, orthoIdx)) {
      exactMatch = { slotType: orthoSlot, index: orthoIdx };
    } else {
      for (let r = 0; r < L; r++) {
        if (isLineExact('row', r)) {
          exactMatch = { slotType: 'row', index: r };
          break;
        }
      }
      if (!exactMatch) {
        for (let c = 0; c < L; c++) {
          if (isLineExact('col', c)) {
            exactMatch = { slotType: 'col', index: c };
            break;
          }
        }
      }
    }

    if (!exactMatch) {
      // Check if active or orthogonal line is filled with a wrong guess
      let wrongSlot: { slotType: CrosswordSlotType; index: number } | null = null;
      if (isLineFilledUnsolved(primarySlot, primaryIdx)) {
        wrongSlot = { slotType: primarySlot, index: primaryIdx };
      } else if (isLineFilledUnsolved(orthoSlot, orthoIdx)) {
        wrongSlot = { slotType: orthoSlot, index: orthoIdx };
      }

      if (!wrongSlot) {
        return {
          board,
          nextRow: rIdx,
          nextCol: cIdx,
          nextDir: dir,
          outcome: 'line_incomplete',
        };
      }

      const candidate =
        wrongSlot.slotType === 'row'
          ? getRowChars(wrongSlot.index).join('')
          : getColChars(wrongSlot.index).join('');
      const targetWord =
        wrongSlot.slotType === 'row'
          ? board.solution.rows[wrongSlot.index]
          : board.solution.cols[wrongSlot.index];
      const isValidDictWord = VALID_WORDS[L].has(candidate);
      const evalStates = evaluateGuess(candidate, targetWord);
      const nextFeedback = board.feedbackGrid.map((r) => [...r]);
      if (wrongSlot.slotType === 'row') {
        for (let c = 0; c < L; c++) nextFeedback[wrongSlot.index][c] = evalStates[c];
      } else {
        for (let r = 0; r < L; r++) nextFeedback[r][wrongSlot.index] = evalStates[r];
      }

      return {
        board: {
          ...board,
          feedbackGrid: nextFeedback,
          wrongChecks: board.wrongChecks + 1,
        },
        nextRow: rIdx,
        nextCol: cIdx,
        nextDir: wrongSlot.slotType === 'row' ? 'across' : 'down',
        outcome: isValidDictWord ? 'wrong_word' : 'not_in_dictionary',
      };
    }

    // Exact match on the resolved horizontal row OR vertical column!
    const solveSlot = exactMatch.slotType;
    const solveIdx = exactMatch.index;
    const solveDir: TypingDirection = solveSlot === 'row' ? 'across' : 'down';
    const candidate =
      solveSlot === 'row' ? board.solution.rows[solveIdx] : board.solution.cols[solveIdx];

    const nextLocked = board.lockedCells.map((r) => [...r]);
    const nextFeedback = board.feedbackGrid.map((r) => [...r]);
    const nextSolvedRows = [...board.solvedRows];
    const nextSolvedCols = [...board.solvedCols];

    if (solveSlot === 'row') {
      nextSolvedRows[solveIdx] = true;
      for (let c = 0; c < L; c++) {
        nextLocked[solveIdx][c] = true;
        nextFeedback[solveIdx][c] = 'correct';
      }
    } else {
      nextSolvedCols[solveIdx] = true;
      for (let r = 0; r < L; r++) {
        nextLocked[r][solveIdx] = true;
        nextFeedback[r][solveIdx] = 'correct';
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
      solveSlot === 'row' ? `Row ${solveIdx + 1} Across` : `Col ${solveIdx + 1} Down`;
    const solvedCursorRow = solveSlot === 'row' ? solveIdx : rIdx;
    const solvedCursorCol = solveSlot === 'col' ? solveIdx : cIdx;

    if (allSolved) {
      return {
        board: updatedBoard,
        nextRow: solvedCursorRow,
        nextCol: solvedCursorCol,
        nextDir: solveDir,
        outcome: 'board_won',
        solvedLineLabel: lineLabel,
        solvedWord: candidate,
      };
    }

    const nextOpen = findNextOpenWordCursor(
      updatedBoard,
      solvedCursorRow,
      solvedCursorCol,
      solveDir
    );
    return {
      board: updatedBoard,
      nextRow: nextOpen ? nextOpen.row : solvedCursorRow,
      nextCol: nextOpen ? nextOpen.col : solvedCursorCol,
      nextDir: nextOpen ? nextOpen.dir : solveDir,
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
 * Unlocks a dictionary meaning clue for a specific Row (Across) or Column (Down) word.
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
  return board.status === 'won';
}

export function advanceCrosswordLevelClimb(
  climb: CrosswordLevelClimbState,
  passedInTime: boolean
): CrosswordLevelClimbState {
  if (climb.stageComplete) return climb;
  const levelNumber = normalizeLevelNumber(climb.levelNumber ?? climb.currentLevel, 1);
  if (!passedInTime) {
    // Must beat all 5 puzzles concurrently within the timer to promote; reset streak to 0/5
    return {
      ...climb,
      levelNumber,
      roundIndex: 0,
      roundPassedCount: 0,
      stageComplete: false,
      promotedToLevelNumber: null,
      promotedToLevel: null,
    };
  }
  const nextPassed = climb.roundPassedCount + 1;
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
