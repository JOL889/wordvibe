import { SOLUTION_WORDS, VALID_WORDS, type WordLength } from '../data/words';
import {
  CATEGORIES,
  getCategoryById,
  getCategoryWords,
  PREMIUM_UNLOCK_PLAYS,
  type PuzzleCategory,
} from '../data/categories';

export type GameMode = 'daily' | 'sprint';
export type TileState = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';
export type PuzzleStatus = 'playing' | 'won' | 'lost';

export const BASE_ATTEMPTS = 6;
export const MAX_BONUS_ATTEMPTS = 1;
export const STREAK_SAVE_COOLDOWN_DAYS = 7;

// Anchor epoch for sequential daily puzzle numbers
const EPOCH_DATE_UTC = Date.UTC(2025, 0, 1);

export interface StatsData {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  previousLostStreak: number;
  lastDailyWinDate: string | null;
  lastStreakSaveDate: string | null;
  guessDistribution: Record<number, number>; // keys 1..7
  sprintSolved: number;
  dailyWinDates: string[];
  dailySolvedLengthsByDate: Record<string, WordLength[]>;
  sprintSolvedByDate: Record<string, number>;
}

export const DEFAULT_STATS: StatsData = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  previousLostStreak: 0,
  lastDailyWinDate: null,
  lastStreakSaveDate: null,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  sprintSolved: 0,
  dailyWinDates: [],
  dailySolvedLengthsByDate: {},
  sprintSolvedByDate: {},
};

/**
 * Evaluates a guess against a target word using standard two-pass Wordle rules:
 * Pass 1 assigns exact 'correct' (green) matches and consumes target letters.
 * Pass 2 assigns 'present' (amber) only up to remaining occurrences in target.
 */
export function evaluateGuess(guess: string, target: string): TileState[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const len = t.length;
  const result: TileState[] = new Array(len).fill('absent');
  const remainingCounts: Record<string, number> = {};

  for (let i = 0; i < len; i++) {
    if (g[i] === t[i]) {
      result[i] = 'correct';
    } else {
      const ch = t[i];
      remainingCounts[ch] = (remainingCounts[ch] || 0) + 1;
    }
  }

  for (let i = 0; i < len; i++) {
    if (result[i] === 'correct') continue;
    const ch = g[i];
    if (remainingCounts[ch] && remainingCounts[ch] > 0) {
      result[i] = 'present';
      remainingCounts[ch] -= 1;
    }
  }

  return result;
}

const STATE_PRIORITY: Record<TileState, number> = {
  empty: 0,
  tbd: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

/**
 * Derives the highest-priority known state for each letter across submitted guesses.
 * Priority: correct > present > absent.
 */
export function deriveKeyboardStates(
  guesses: string[],
  target: string,
  eliminatedLetters: string[] = []
): Record<string, TileState> {
  const map: Record<string, TileState> = {};

  for (const letter of eliminatedLetters) {
    const upper = letter.toUpperCase();
    map[upper] = 'absent';
  }

  for (const guess of guesses) {
    const states = evaluateGuess(guess, target);
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i].toUpperCase();
      const nextState = states[i];
      const prevState = map[ch];
      if (!prevState || STATE_PRIORITY[nextState] > STATE_PRIORITY[prevState]) {
        map[ch] = nextState;
      }
    }
  }

  return map;
}

export function isValidGuessWord(word: string, length: WordLength): boolean {
  const clean = word.trim().toUpperCase();
  return clean.length === length && VALID_WORDS[length].has(clean);
}

/**
 * Returns local calendar date key formatted as YYYY-MM-DD.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyToUTC(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function getDaysBetween(dateKeyA: string, dateKeyB: string): number {
  const a = parseDateKeyToUTC(dateKeyA);
  const b = parseDateKeyToUTC(dateKeyB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function getDailyPuzzleNumber(dateKey: string): number {
  const diff = Math.round((parseDateKeyToUTC(dateKey) - EPOCH_DATE_UTC) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Deterministic hash-based daily target selection tied to local dateKey + word length + category.
 */
export function getDailyTargetWord(
  dateKey: string,
  length: WordLength,
  categoryId = 'general-classic'
): string {
  const isDefault = categoryId === 'general-classic';
  const catPool = isDefault ? [] : getCategoryWords(categoryId, length);
  const pool = catPool.length > 0 ? catPool : SOLUTION_WORDS[length];
  const seedStr = isDefault
    ? `${dateKey}-L${length}-LEXICON`
    : `${dateKey}-L${length}-CAT-${categoryId}-LEXICON`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = (hash >>> 0) % pool.length;
  return pool[idx];
}

export function getRandomSprintWord(
  length: WordLength,
  excludeWords: string[] = [],
  categoryId = 'general-classic'
): string {
  const isDefault = categoryId === 'general-classic';
  const catPool = isDefault ? [] : getCategoryWords(categoryId, length);
  const pool = catPool.length > 0 ? catPool : SOLUTION_WORDS[length];
  const excluded = new Set(excludeWords.map((w) => w.toUpperCase()));
  const candidates = pool.filter((w) => !excluded.has(w));
  const source = candidates.length > 0 ? candidates : pool;
  const idx = Math.floor(Math.random() * source.length);
  return source[idx];
}

/**
 * Selects a fresh word for a category on a given day, avoiding previously served words today
 * and never repeating `excludeWord` back-to-back.
 */
export function pickNextCategoryWord(params: {
  categoryId: string;
  length: WordLength;
  dateKey: string;
  usedWordsToday?: string[];
  excludeWord?: string;
  mode?: GameMode;
}): string {
  const {
    categoryId,
    length,
    dateKey,
    usedWordsToday = [],
    excludeWord,
    mode = 'daily',
  } = params;
  const isDefault = categoryId === 'general-classic';
  const catPool = isDefault ? [] : getCategoryWords(categoryId, length);
  const pool = catPool.length > 0 ? catPool : SOLUTION_WORDS[length];

  const usedSet = new Set(usedWordsToday.map((w) => w.toUpperCase()));
  if (excludeWord) usedSet.add(excludeWord.toUpperCase());

  if (usedSet.size === 0 && mode === 'daily') {
    return getDailyTargetWord(dateKey, length, categoryId);
  }

  let candidates = pool.filter((w) => !usedSet.has(w));
  if (candidates.length === 0) {
    // All words in this category+length were already seen today; cycle cleanly excluding immediate prior word
    const lastUsed =
      excludeWord?.toUpperCase() ||
      usedWordsToday[usedWordsToday.length - 1]?.toUpperCase() ||
      '';
    candidates = pool.filter((w) => w !== lastUsed);
    if (candidates.length === 0) candidates = pool;
  }

  const seedStr = `${dateKey}-L${length}-CAT-${categoryId}-STEP-${usedWordsToday.length}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return candidates[(hash >>> 0) % candidates.length];
}

export function isCategoryAccessible(
  category: PuzzleCategory,
  playsRemaining: Record<string, number>
): boolean {
  if (!category.isPremium) return true;
  return (playsRemaining[category.id] || 0) > 0;
}

export function getCategoryRemainingPlays(
  category: PuzzleCategory,
  playsRemaining: Record<string, number>
): number {
  if (!category.isPremium) return Infinity;
  return Math.max(0, playsRemaining[category.id] || 0);
}

export function grantCategoryPlays(
  playsRemaining: Record<string, number>,
  categoryId: string,
  plays: number = PREMIUM_UNLOCK_PLAYS
): Record<string, number> {
  const current = Math.max(0, playsRemaining[categoryId] || 0);
  return {
    ...playsRemaining,
    [categoryId]: current + plays,
  };
}

export function consumeCategoryPlay(
  category: PuzzleCategory,
  playsRemaining: Record<string, number>
): Record<string, number> {
  if (!category.isPremium) return playsRemaining;
  const current = Math.max(0, playsRemaining[category.id] || 0);
  return {
    ...playsRemaining,
    [category.id]: Math.max(0, current - 1),
  };
}

export function getTimeUntilMidnightMs(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export interface SmartHintResult {
  type: 'reveal_position' | 'eliminate_letters';
  position?: number;
  letter?: string;
  eliminatedLetters?: string[];
  message: string;
}

/**
 * Generates a smart clue: prefers revealing an unconfirmed position's exact letter,
 * or if all positions are already confirmed, eliminates up to 4 unused dead letters.
 */
export function generateSmartHint(
  guesses: string[],
  target: string,
  alreadyHintedPositions: number[] = [],
  alreadyEliminated: string[] = []
): SmartHintResult {
  const t = target.toUpperCase();
  const confirmedPositions = new Set<number>(alreadyHintedPositions);

  for (const g of guesses) {
    const evalStates = evaluateGuess(g, t);
    evalStates.forEach((st, idx) => {
      if (st === 'correct') confirmedPositions.add(idx);
    });
  }

  const unconfirmed: number[] = [];
  for (let i = 0; i < t.length; i++) {
    if (!confirmedPositions.has(i)) unconfirmed.push(i);
  }

  if (unconfirmed.length > 0) {
    // Pick the first unconfirmed index deterministically so hints are predictable & clear
    const pos = unconfirmed[0];
    const letter = t[pos];
    return {
      type: 'reveal_position',
      position: pos,
      letter,
      message: `Hint: Letter #${pos + 1} is "${letter}".`,
    };
  }

  // Fallback: eliminate up to 4 keyboard letters not in target and not already known absent
  const keyStates = deriveKeyboardStates(guesses, t, alreadyEliminated);
  const targetLetters = new Set(t.split(''));
  const candidates = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'
    .split('')
    .filter((ch) => !targetLetters.has(ch) && !keyStates[ch]);
  const eliminated = candidates.slice(0, 4);

  return {
    type: 'eliminate_letters',
    eliminatedLetters: eliminated,
    message:
      eliminated.length > 0
        ? `Hint: Letters ${eliminated.join(', ')} are not in this word.`
        : 'All target positions are already revealed!',
  };
}

export interface GridBoxHint {
  row: number;
  col: number;
  letter: string;
  source: 'default' | 'rewarded';
}

export const MIN_PROBABILITY_WORD_LENGTH: WordLength = 4;
export const MAX_VERTICAL_HINT_BOXES = 4;
const VALID_HINT_WORD_LENGTHS: readonly WordLength[] = [4, 5, 6];
const AVERAGE_HINT_LETTER_POOL = new Set(['E', 'A', 'O', 'I', 'R', 'T', 'N', 'S', 'L', 'C', 'D']);

/**
 * Checks that placing a hint at (row, col) keeps at most 1 hinted box
 * per horizontal row and up to 4 hinted boxes vertically across the puzzle.
 */
export function canPlaceHintBox(
  existingHints: GridBoxHint[],
  row: number,
  col: number
): boolean {
  if (row < 0 || col < 0) return false;
  if (existingHints.length >= MAX_VERTICAL_HINT_BOXES) return false;
  if (existingHints.some((h) => h.row === row)) return false;
  const colVerticalCount = existingHints.filter((h) => h.col === col).length;
  return colVerticalCount < MAX_VERTICAL_HINT_BOXES;
}

function pickAverageHintColumn(
  cleanTarget: string,
  excludedCols: Set<number>,
  roll: number
): number {
  const len = cleanTarget.length;
  const available: number[] = [];
  for (let c = 0; c < len; c++) {
    if (!excludedCols.has(c)) available.push(c);
  }
  if (available.length === 0) {
    return Math.min(len - 1, Math.floor(roll * len));
  }

  // Prefer interior positions (1..len-2) and average-frequency letters so hints stay balanced
  const scored = available.map((col) => {
    const isEdge = col === 0 || col === len - 1;
    const isOpening = col === 0;
    const ch = cleanTarget[col] || '';
    const isBalancedLetter = AVERAGE_HINT_LETTER_POOL.has(ch);
    let score = 0;
    if (!isOpening) score += 3;
    if (!isEdge) score += 2;
    if (isBalancedLetter) score += 2;
    return { col, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topPool = scored.filter((item) => item.score >= topScore - 1).map((item) => item.col);
  return topPool[Math.min(topPool.length - 1, Math.floor(roll * topPool.length))];
}

/**
 * Probability-based word-length selector that alternates among 4-, 5-, and 6-letter words
 * and never drops below 4.
 */
export function rollProbabilityWordLength(params: {
  previousLength?: WordLength | number | null;
  roll?: number;
} = {}): WordLength {
  const { previousLength, roll } = params;
  const normalizedPrev: WordLength | null =
    previousLength === 4 || previousLength === 5 || previousLength === 6
      ? previousLength
      : null;

  const weights: Record<WordLength, number> =
    normalizedPrev === 4
      ? { 4: 0.14, 5: 0.48, 6: 0.38 }
      : normalizedPrev === 5
      ? { 4: 0.42, 5: 0.16, 6: 0.42 }
      : normalizedPrev === 6
      ? { 4: 0.38, 5: 0.48, 6: 0.14 }
      : { 4: 0.32, 5: 0.38, 6: 0.30 };

  const r =
    typeof roll === 'number' && Number.isFinite(roll)
      ? Math.max(0, Math.min(0.999999, roll))
      : Math.random();

  let cumulative = 0;
  for (const len of VALID_HINT_WORD_LENGTHS) {
    cumulative += weights[len];
    if (r < cumulative) {
      return Math.max(MIN_PROBABILITY_WORD_LENGTH, len) as WordLength;
    }
  }
  return 5;
}

/**
 * Generates balanced, non-giveaway vertical hint boxes (at most 1 per horizontal row,
 * up to 4 hints vertically across the puzzle).
 */
export function pickDefaultSmartHintBoxes(params: {
  target: string;
  maxAttempts?: number;
  roll?: number;
}): GridBoxHint[] {
  const cleanTarget = params.target.trim().toUpperCase();
  const len = Math.max(1, cleanTarget.length);
  const maxAttempts = Math.max(2, params.maxAttempts ?? BASE_ATTEMPTS);
  const r1 =
    typeof params.roll === 'number' && Number.isFinite(params.roll)
      ? Math.max(0, Math.min(0.999999, params.roll))
      : Math.random();
  const r2 = (r1 * 1.73 + 0.37) % 1;

  const firstCol = pickAverageHintColumn(cleanTarget, new Set<number>(), r1);
  const hints: GridBoxHint[] = [
    {
      row: 0,
      col: firstCol,
      letter: cleanTarget[firstCol] || '',
      source: 'default',
    },
  ];

  // Add a second vertical hint on a lower row while keeping revealed letters average:
  // on 4-letter words echo the same vertical column (25% letter reveal);
  // on 5- and 6-letter words reveal one more interior position (~33-40% letter reveal).
  const secondRow = Math.min(maxAttempts - 1, 3);
  if (canPlaceHintBox(hints, secondRow, firstCol)) {
    const secondCol =
      len >= 5
        ? pickAverageHintColumn(cleanTarget, new Set<number>([firstCol]), r2)
        : firstCol;
    if (canPlaceHintBox(hints, secondRow, secondCol)) {
      hints.push({
        row: secondRow,
        col: secondCol,
        letter: cleanTarget[secondCol] || '',
        source: 'default',
      });
    }
  }

  return hints;
}

export function pickDefaultSmartHintBox(params: {
  target: string;
  maxAttempts?: number;
  roll?: number;
}): GridBoxHint {
  return pickDefaultSmartHintBoxes(params)[0];
}

/**
 * Places an optional rewarded hint vertically (up to 4 vertical boxes total, max 1 per horizontal row)
 * while preventing spoiling the final remaining letter.
 */
export function placeRewardedHintBox(params: {
  existingHints: GridBoxHint[];
  guesses: string[];
  rowGuesses: (string | null)[];
  target: string;
  preferredRow: number;
  maxAttempts: number;
}): { hint: GridBoxHint | null; eliminatedLetters?: string[]; message: string } {
  const { existingHints, guesses, rowGuesses, target, preferredRow, maxAttempts } = params;
  const cleanTarget = target.trim().toUpperCase();
  const confirmedCols = new Set<number>(existingHints.map((h) => h.col));

  for (const g of guesses) {
    const evalStates = evaluateGuess(g, cleanTarget);
    evalStates.forEach((st, idx) => {
      if (st === 'correct') confirmedCols.add(idx);
    });
  }

  const candidateRows: number[] = [];
  if (
    preferredRow >= 0 &&
    preferredRow < maxAttempts &&
    rowGuesses[preferredRow] === null
  ) {
    candidateRows.push(preferredRow);
  }
  for (let r = 0; r < maxAttempts; r++) {
    if (r !== preferredRow && rowGuesses[r] === null) {
      candidateRows.push(r);
    }
  }

  // Keep hints average: never spoil the last remaining hidden position when len - 1 positions are known
  const hasRoomForNewLetter = confirmedCols.size < Math.max(1, cleanTarget.length - 1);
  let chosenCol: number | undefined;
  if (hasRoomForNewLetter) {
    const nextCol = pickAverageHintColumn(cleanTarget, confirmedCols, 0.42);
    if (!confirmedCols.has(nextCol)) {
      chosenCol = nextCol;
    }
  }

  const chosenRow =
    chosenCol !== undefined
      ? candidateRows.find((r) => canPlaceHintBox(existingHints, r, chosenCol!))
      : undefined;

  if (chosenCol !== undefined && chosenRow !== undefined) {
    const letter = cleanTarget[chosenCol];
    return {
      hint: {
        row: chosenRow,
        col: chosenCol,
        letter,
        source: 'rewarded',
      },
      message: `Clue: Row ${chosenRow + 1}, Box ${chosenCol + 1} is "${letter}".`,
    };
  }

  const fallback = generateSmartHint(
    guesses,
    cleanTarget,
    Array.from(confirmedCols)
  );
  return {
    hint: null,
    eliminatedLetters: fallback.eliminatedLetters,
    message: fallback.message,
  };
}

export type HintClueWordCount = 4 | 5 | 6;

export interface HintUserContext {
  cityToken?: string;
  timeOfDay?: string;
}

function sanitizeSingleToken(raw: string | undefined, fallback: string): string {
  const cleaned = (raw || '').trim().split(/\s+/)[0]?.replace(/[^a-zA-Z0-9-]/g, '') || '';
  return cleaned.length >= 2 && cleaned.length <= 14 ? cleaned : fallback;
}

/**
 * Generates a concise personalized clue caption whose word count alternates
 * probabilistically among 4, 5, and 6 words (strictly >= 4 words).
 */
export function buildSmartHintClueText(params: {
  hint: GridBoxHint;
  previousClueWords?: HintClueWordCount | null;
  roll?: number;
  userContext?: HintUserContext;
}): { text: string; wordCount: HintClueWordCount } {
  const { hint, previousClueWords, roll, userContext } = params;
  const wordCount = rollProbabilityWordLength({
    previousLength: previousClueWords,
    roll,
  }) as HintClueWordCount;

  const rNum = hint.row + 1;
  const cNum = hint.col + 1;
  const letter = hint.letter.toUpperCase();
  const timeToken = sanitizeSingleToken(userContext?.timeOfDay, 'Today');
  const cityToken = sanitizeSingleToken(userContext?.cityToken, timeToken);

  if (wordCount === 4) {
    return {
      wordCount: 4,
      text: `Try ${letter} at ${rNum}-${cNum}`,
    };
  }
  if (wordCount === 5) {
    return {
      wordCount: 5,
      text: `${timeToken} clue puts ${letter} ${rNum}-${cNum}`,
    };
  }
  return {
    wordCount: 6,
    text: `${cityToken} clue places ${letter} at ${rNum}-${cNum}`,
  };
}

export interface ProgressiveNudgeParams {
  guess: string;
  target: string;
  attemptIndex: number;
  categoryName?: string;
}

/**
 * Generates a friendly, witty secondary nudge after a missed guess ("desirable difficulty")
 * without directly leaking the hidden target word.
 */
export function getProgressiveGuessNudge(params: ProgressiveNudgeParams): string {
  const { guess, target, attemptIndex, categoryName } = params;
  const g = guess.trim().toUpperCase();
  const t = target.trim().toUpperCase();
  const evalStates = evaluateGuess(g, t);
  const exactMatches = evalStates.filter((s) => s === 'correct').length;
  const misplacedMatches = evalStates.filter((s) => s === 'present').length;
  const vowelsInTarget = t.split('').filter((ch) => 'AEIOU'.includes(ch));
  const uniqueVowels = Array.from(new Set(vowelsInTarget));
  const hasDoubleLetter = new Set(t.split('')).size < t.length;

  if (attemptIndex <= 1) {
    if (exactMatches + misplacedMatches >= 3) {
      return `Warm trail! You already tagged ${exactMatches + misplacedMatches} right letters—just tighten their seats.`;
    }
    return `Vowel check: this word packs ${vowelsInTarget.length} vowel${vowelsInTarget.length === 1 ? '' : 's'} (${uniqueVowels.length} unique) inside.`;
  }

  if (attemptIndex === 2) {
    if (hasDoubleLetter) {
      return `Plot twist wink: one letter makes a sneaky double appearance in this answer!`;
    }
    const ending = t[t.length - 1];
    const isVowelEnd = 'AEIOUY'.includes(ending);
    return `Cadence hint: every letter here is unique, and it wraps up on a ${isVowelEnd ? 'vowel-like sound' : 'crisp consonant'}.`;
  }

  if (attemptIndex === 3) {
    const commonRhymeTail = t.slice(-2);
    const topicNote = categoryName && categoryName !== 'Classic Mix' ? ` (${categoryName})` : '';
    return `Rhyme & rhythm nudge${topicNote}: listen for a "-${commonRhymeTail.toLowerCase()}" style finish when sounding options aloud.`;
  }

  const openingGroup =
    'AEIOU'.includes(t[0])
      ? 'starts with an open vowel'
      : 'BCDFGHJKLMNPQRSTVWXYZ'.includes(t[0]) && 'AEIOU'.includes(t[1])
      ? 'opens cleanly with consonant + vowel'
      : 'opens with a punchy consonant blend';
  return `Final stretch wink: the answer ${openingGroup} and carries ${t.length - vowelsInTarget.length} consonants.`;
}

export interface ShareParams {
  mode: GameMode;
  puzzleNumber: number;
  length: WordLength;
  guesses: string[];
  target: string;
  won: boolean;
  maxAttempts: number;
  streak: number;
  categoryId?: string;
}

export function formatShareText(params: ShareParams): string {
  const { mode, puzzleNumber, length, guesses, target, won, maxAttempts, streak, categoryId } =
    params;
  const score = won ? `${guesses.length}/${maxAttempts}` : `X/${maxAttempts}`;
  const category = categoryId && categoryId !== 'general-classic' ? getCategoryById(categoryId) : null;
  const categoryTag = category ? ` · ${category.name}` : '';
  const header =
    mode === 'daily'
      ? `WordVibe Daily #${puzzleNumber}${categoryTag} (${length}-Letter) ${score}`
      : `WordVibe Sprint${categoryTag} (${length}-Letter) ${score}`;

  const gridLines = guesses.map((g) =>
    evaluateGuess(g, target)
      .map((state) => {
        if (state === 'correct') return '🟩';
        if (state === 'present') return '🟨';
        return '⬛';
      })
      .join('')
  );

  const streakLine = mode === 'daily' && streak > 0 ? `\nStreak: ${streak} day${streak === 1 ? '' : 's'}` : '';
  return `${header}${streakLine}\n\n${gridLines.join('\n')}`;
}

/**
 * Checks whether a daily streak was broken (either lost today or missed a day)
 * and hasn't been recovered within the cooldown period.
 */
export function canRecoverStreak(stats: StatsData, todayKey: string): boolean {
  if (stats.previousLostStreak <= 0) return false;
  if (stats.currentStreak > 0) return false;
  if (!stats.lastStreakSaveDate) return true;
  const daysSinceSave = getDaysBetween(stats.lastStreakSaveDate, todayKey);
  return daysSinceSave >= STREAK_SAVE_COOLDOWN_DAYS;
}

export function applyStreakRecovery(stats: StatsData, todayKey: string): StatsData {
  if (!canRecoverStreak(stats, todayKey)) return stats;
  const restored = stats.previousLostStreak;
  const nextDailyWinDates = stats.dailyWinDates.includes(todayKey)
    ? stats.dailyWinDates
    : [...stats.dailyWinDates, todayKey];
  return {
    ...stats,
    currentStreak: restored,
    bestStreak: Math.max(stats.bestStreak, restored),
    previousLostStreak: 0,
    lastDailyWinDate: todayKey,
    lastStreakSaveDate: todayKey,
    dailyWinDates: nextDailyWinDates,
  };
}

export function updateStatsOnCompletion(
  stats: StatsData,
  params: {
    mode: GameMode;
    won: boolean;
    attemptsUsed: number;
    todayKey: string;
    length?: WordLength;
  }
): StatsData {
  const { mode, won, attemptsUsed, todayKey, length = 5 } = params;
  const nextDist = { ...stats.guessDistribution };
  if (won) {
    nextDist[attemptsUsed] = (nextDist[attemptsUsed] || 0) + 1;
  }

  if (mode === 'sprint') {
    const prevTodaySprint = stats.sprintSolvedByDate[todayKey] || 0;
    return {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      gamesWon: stats.gamesWon + (won ? 1 : 0),
      guessDistribution: nextDist,
      sprintSolved: stats.sprintSolved + (won ? 1 : 0),
      sprintSolvedByDate: won
        ? { ...stats.sprintSolvedByDate, [todayKey]: prevTodaySprint + 1 }
        : stats.sprintSolvedByDate,
    };
  }

  // Daily mode streak math
  let nextStreak = stats.currentStreak;
  let nextPreviousLost = stats.previousLostStreak;

  if (won) {
    if (stats.lastDailyWinDate === todayKey) {
      // Already counted a daily win today (e.g. another word length) -> preserve streak without double-counting days
      nextStreak = Math.max(1, stats.currentStreak);
    } else if (stats.lastDailyWinDate) {
      const gap = getDaysBetween(stats.lastDailyWinDate, todayKey);
      nextStreak = gap === 1 ? stats.currentStreak + 1 : 1;
      if (gap > 1 && stats.currentStreak > 0) {
        nextPreviousLost = stats.currentStreak;
      }
    } else {
      nextStreak = 1;
    }
  } else {
    if (stats.currentStreak > 0) {
      nextPreviousLost = stats.currentStreak;
    }
    nextStreak = 0;
  }

  const nextDailyWinDates =
    won && !stats.dailyWinDates.includes(todayKey)
      ? [...stats.dailyWinDates, todayKey]
      : stats.dailyWinDates;

  const existingLengths = stats.dailySolvedLengthsByDate[todayKey] || [];
  const nextLengthsForDay =
    won && !existingLengths.includes(length) ? [...existingLengths, length] : existingLengths;
  const nextSolvedLengthsByDate = won
    ? { ...stats.dailySolvedLengthsByDate, [todayKey]: nextLengthsForDay }
    : stats.dailySolvedLengthsByDate;

  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (won ? 1 : 0),
    currentStreak: nextStreak,
    bestStreak: Math.max(stats.bestStreak, nextStreak),
    previousLostStreak: nextPreviousLost,
    lastDailyWinDate: won ? todayKey : stats.lastDailyWinDate,
    guessDistribution: nextDist,
    dailyWinDates: nextDailyWinDates,
    dailySolvedLengthsByDate: nextSolvedLengthsByDate,
  };
}

export type WeekDayState = 'completed' | 'today' | 'missed' | 'upcoming';

export interface WeekStreakDay {
  dateKey: string;
  shortLabel: string;
  dayNumber: number;
  state: WeekDayState;
  isToday: boolean;
}

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatUTCDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the 7 days of the current week (Mon..Sun) with completion state
 * derived from persisted dailyWinDates.
 */
export function getWeekStreakDays(
  todayKey: string,
  dailyWinDates: string[]
): WeekStreakDay[] {
  const todayUtc = parseDateKeyToUTC(todayKey);
  const utcDay = new Date(todayUtc).getUTCDay(); // 0=Sun..6=Sat
  const offsetFromMonday = (utcDay + 6) % 7;
  const mondayUtc = todayUtc - offsetFromMonday * 24 * 60 * 60 * 1000;
  const winSet = new Set(dailyWinDates);

  return WEEK_DAY_LABELS.map((shortLabel, idx) => {
    const dayUtc = mondayUtc + idx * 24 * 60 * 60 * 1000;
    const dateKey = formatUTCDateKey(dayUtc);
    const dayNumber = new Date(dayUtc).getUTCDate();
    const isToday = dateKey === todayKey;
    const isCompleted = winSet.has(dateKey);

    let state: WeekDayState;
    if (isCompleted) {
      state = 'completed';
    } else if (isToday) {
      state = 'today';
    } else if (dayUtc < todayUtc) {
      state = 'missed';
    } else {
      state = 'upcoming';
    }

    return {
      dateKey,
      shortLabel,
      dayNumber,
      state,
      isToday,
    };
  });
}

export interface HomeChallenge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  actionLabel: string;
  targetMode: GameMode;
  targetLength: WordLength;
  openCategories?: boolean;
}

export function getHomeChallenges(params: {
  todayKey: string;
  stats: StatsData;
  exploredCategoriesCount: number;
}): HomeChallenge[] {
  const { todayKey, stats, exploredCategoriesCount } = params;
  const solvedLengths = new Set(stats.dailySolvedLengthsByDate[todayKey] || []);
  const sprintToday = stats.sprintSolvedByDate[todayKey] || 0;
  const explored = Math.max(1, exploredCategoriesCount);

  const c1Done = solvedLengths.has(5);
  const c2Done = solvedLengths.has(4);
  const c3Done = solvedLengths.has(6);
  const c4Count = Math.min(3, sprintToday);
  const c5Count = Math.min(3, explored);

  return [
    {
      id: 'daily-5',
      title: 'Daily 5-Letter Word',
      description: 'Solve today’s classic 5-letter puzzle to lock in your streak.',
      current: c1Done ? 1 : 0,
      target: 1,
      completed: c1Done,
      actionLabel: 'Play 5L',
      targetMode: 'daily',
      targetLength: 5,
    },
    {
      id: 'daily-4',
      title: 'Quick 4-Letter Warmup',
      description: 'Complete today’s 4-letter board for a fast daily win.',
      current: c2Done ? 1 : 0,
      target: 1,
      completed: c2Done,
      actionLabel: 'Play 4L',
      targetMode: 'daily',
      targetLength: 4,
    },
    {
      id: 'daily-6',
      title: 'Master 6-Letter Test',
      description: 'Crack today’s longer 6-letter word in six attempts or fewer.',
      current: c3Done ? 1 : 0,
      target: 1,
      completed: c3Done,
      actionLabel: 'Play 6L',
      targetMode: 'daily',
      targetLength: 6,
    },
    {
      id: 'sprint-trio',
      title: 'Practice Sprint Trio',
      description: 'Solve 3 endless sprint words today to sharpen your instincts.',
      current: c4Count,
      target: 3,
      completed: c4Count >= 3,
      actionLabel: 'Sprint',
      targetMode: 'sprint',
      targetLength: 5,
    },
    {
      id: 'topic-explorer',
      title: 'Topic Explorer',
      description: `Explore 3 curated word categories out of ${CATEGORIES.length} available themes.`,
      current: c5Count,
      target: 3,
      completed: c5Count >= 3,
      actionLabel: 'Topics',
      targetMode: 'daily',
      targetLength: 5,
      openCategories: true,
    },
  ];
}

export function createEmptyDrafts(rows: number, length: number): string[][] {
  return Array.from({ length: rows }, () => new Array<string>(length).fill(''));
}

export function computeSelectCellCol(rowDraft: string[], clickedCol: number): number {
  return Math.max(0, Math.min(rowDraft.length - 1, clickedCol));
}

export type CursorDirection = 'left' | 'right' | 'up' | 'down';

export function moveCursorDirection(
  rowGuesses: (string | null)[],
  activeRow: number,
  activeCol: number,
  direction: CursorDirection,
  length: number
): { row: number; col: number } {
  const clampedCol = Math.max(0, Math.min(length - 1, activeCol));
  if (direction === 'left') {
    return { row: activeRow, col: Math.max(0, clampedCol - 1) };
  }
  if (direction === 'right') {
    return { row: activeRow, col: Math.min(length - 1, clampedCol + 1) };
  }

  const step = direction === 'up' ? -1 : 1;
  let nextRow = activeRow + step;
  while (nextRow >= 0 && nextRow < rowGuesses.length) {
    if (rowGuesses[nextRow] === null) {
      return { row: nextRow, col: clampedCol };
    }
    nextRow += step;
  }
  return { row: activeRow, col: clampedCol };
}

export function applyLetterToDraft(
  drafts: string[][],
  row: number,
  col: number,
  letter: string,
  length: number
): { drafts: string[][]; nextCol: number } {
  const upper = letter.toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return { drafts, nextCol: col };
  if (row < 0 || row >= drafts.length) return { drafts, nextCol: col };

  // Once cursor reaches the right edge (col >= length), stop without wrapping to the beginning.
  if (col >= length) {
    return { drafts, nextCol: length };
  }

  const targetCol = Math.max(0, col);
  const currentRow = drafts[row] || new Array<string>(length).fill('');
  const nextRow = [...currentRow];
  nextRow[targetCol] = upper;
  const nextDrafts = drafts.map((r, idx) => (idx === row ? nextRow : r));

  // Move strictly left-to-right box by box and stop at the right edge.
  const nextCol = Math.min(length, targetCol + 1);
  return { drafts: nextDrafts, nextCol };
}

export function applyBackspaceToDraft(
  drafts: string[][],
  row: number,
  col: number,
  length: number
): { drafts: string[][]; nextCol: number } {
  if (row < 0 || row >= drafts.length) return { drafts, nextCol: col };
  const currentRow = drafts[row] || new Array<string>(length).fill('');
  const nextRow = [...currentRow];

  if (col < length && nextRow[col] !== '') {
    nextRow[col] = '';
    const nextDrafts = drafts.map((r, idx) => (idx === row ? nextRow : r));
    return { drafts: nextDrafts, nextCol: col };
  }

  if (col > 0) {
    const prevCol = col - 1;
    nextRow[prevCol] = '';
    const nextDrafts = drafts.map((r, idx) => (idx === row ? nextRow : r));
    return { drafts: nextDrafts, nextCol: prevCol };
  }

  return { drafts, nextCol: 0 };
}

export function findNextUnsubmittedRow(
  rowGuesses: (string | null)[],
  fromRow: number
): number | null {
  for (let idx = fromRow + 1; idx < rowGuesses.length; idx++) {
    if (rowGuesses[idx] === null) return idx;
  }
  return null;
}

export function findPrevUnsubmittedRow(
  rowGuesses: (string | null)[],
  fromRow: number
): number | null {
  for (let idx = Math.min(fromRow - 1, rowGuesses.length - 1); idx >= 0; idx--) {
    if (rowGuesses[idx] === null) return idx;
  }
  return null;
}

export type TypingDirection = 'across' | 'down';

/**
 * Types a letter in either left-to-right ('across') or top-to-bottom ('down') direction,
 * stopping cleanly at the right edge or bottom edge without wrapping back to the beginning.
 */
export function applyLetterInDirection(
  drafts: string[][],
  rowGuesses: (string | null)[],
  row: number,
  col: number,
  letter: string,
  length: number,
  direction: TypingDirection
): { drafts: string[][]; nextRow: number; nextCol: number } {
  if (direction === 'across') {
    const res = applyLetterToDraft(drafts, row, col, letter, length);
    return { drafts: res.drafts, nextRow: row, nextCol: res.nextCol };
  }

  const upper = letter.toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return { drafts, nextRow: row, nextCol: col };
  if (col < 0 || col >= length) return { drafts, nextRow: row, nextCol: col };
  // Once vertical typing reaches past the bottom open row, stop without wrapping to the top.
  if (row >= drafts.length || rowGuesses[row] !== null) {
    return { drafts, nextRow: drafts.length, nextCol: col };
  }

  const targetRow = Math.max(0, row);
  const currentRow = drafts[targetRow] || new Array<string>(length).fill('');
  const nextRowArr = [...currentRow];
  nextRowArr[col] = upper;
  const nextDrafts = drafts.map((r, idx) => (idx === targetRow ? nextRowArr : r));

  const nextOpen = findNextUnsubmittedRow(rowGuesses, targetRow);
  const nextRow = nextOpen !== null ? nextOpen : drafts.length;
  return { drafts: nextDrafts, nextRow, nextCol: col };
}

export function applyBackspaceInDirection(
  drafts: string[][],
  rowGuesses: (string | null)[],
  row: number,
  col: number,
  length: number,
  direction: TypingDirection
): { drafts: string[][]; nextRow: number; nextCol: number } {
  if (direction === 'across') {
    const res = applyBackspaceToDraft(drafts, row, col, length);
    return { drafts: res.drafts, nextRow: row, nextCol: res.nextCol };
  }

  if (col < 0 || col >= length) return { drafts, nextRow: row, nextCol: col };

  if (row < drafts.length && rowGuesses[row] === null) {
    const currentRow = drafts[row] || new Array<string>(length).fill('');
    if (currentRow[col] !== '') {
      const nextRowArr = [...currentRow];
      nextRowArr[col] = '';
      const nextDrafts = drafts.map((r, idx) => (idx === row ? nextRowArr : r));
      return { drafts: nextDrafts, nextRow: row, nextCol: col };
    }
  }

  const prevOpen = findPrevUnsubmittedRow(rowGuesses, row);
  if (prevOpen !== null) {
    const prevRowArr = [...(drafts[prevOpen] || new Array<string>(length).fill(''))];
    prevRowArr[col] = '';
    const nextDrafts = drafts.map((r, idx) => (idx === prevOpen ? prevRowArr : r));
    return { drafts: nextDrafts, nextRow: prevOpen, nextCol: col };
  }

  return { drafts, nextRow: Math.max(0, Math.min(row, drafts.length - 1)), nextCol: col };
}


