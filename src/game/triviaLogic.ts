import { FIVE_LEVEL_ORDER, type FiveDifficultyLevel } from './settingsLogic';
import { CURATED_TRIVIA_BANK, type CuratedBankTriviaItem } from './triviaBank';
import { pickZeroRepeatItem } from './zeroRepeatDeck';

export type TriviaDifficulty =
  | FiveDifficultyLevel
  | 'easy'
  | 'medium'
  | 'hard';

export interface GroundingSourceLink {
  title: string;
  url: string;
}

export interface TriviaQuestion {
  id?: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  funFact?: string;
  category: string;
  difficulty: TriviaDifficulty;
  personalizationReason?: string;
  groundingSources?: GroundingSourceLink[];
}

export const TRIVIA_ROUND_LENGTH = 5;
export const TRIVIA_LEVEL_CLIMB_TOTAL = 10;
export const TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD = 8;
export const TRIVIA_BONUS_UNLOCK_HOURS = 24;

export function computeFiftyFiftyIndices(correctIndex: number, seed = 0): [number, number] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  const start = Math.abs(Math.floor(seed)) % wrong.length;
  return [wrong[start], wrong[(start + 1) % wrong.length]];
}

export function normalizeToFiveLevel(diff: TriviaDifficulty): FiveDifficultyLevel {
  if (diff === 'novice' || diff === 'beginner' || diff === 'intermediate' || diff === 'expert' || diff === 'legendary') {
    return diff;
  }
  if (diff === 'easy') return 'novice';
  if (diff === 'hard') return 'expert';
  return 'intermediate';
}

export function getTriviaDifficultyForStreak(streak: number, selectedLevel?: TriviaDifficulty): TriviaDifficulty {
  if (selectedLevel) return normalizeToFiveLevel(selectedLevel);
  if (streak >= 8) return 'legendary';
  if (streak >= 5) return 'expert';
  if (streak >= 3) return 'intermediate';
  if (streak >= 2) return 'beginner';
  return 'novice';
}

export function getStreakMultiplier(streak: number): number {
  const s = Math.max(0, Math.floor(streak));
  if (s >= 8) return 3;
  if (s >= 5) return 2.5;
  if (s >= 3) return 2;
  if (s >= 2) return 1.5;
  return 1;
}

export function calculateTriviaXp(difficulty: TriviaDifficulty, streakAfterAnswer: number): number {
  const norm = normalizeToFiveLevel(difficulty);
  const base =
    norm === 'legendary'
      ? 150
      : norm === 'expert'
      ? 120
      : norm === 'intermediate'
      ? 80
      : norm === 'beginner'
      ? 50
      : 30;
  const mult = getStreakMultiplier(streakAfterAnswer);
  return Math.round(base * mult);
}

export interface TriviaCategorySpec {
  id: string;
  name: string;
  tagline: string;
  isBonusLocked: boolean;
}

export const TRIVIA_CATEGORIES: TriviaCategorySpec[] = [
  {
    id: 'for-you-local',
    name: 'For You · Personal Mix',
    tagline: 'Tailored to your interests, streak level & zero-repeat vault',
    isBonusLocked: false,
  },
  {
    id: 'local-trending',
    name: 'Science, Space & World',
    tagline: 'Major global breakthroughs, cosmos milestones & earth events',
    isBonusLocked: false,
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge',
    tagline: 'History, geography, arts & everyday wonders',
    isBonusLocked: false,
  },
  {
    id: 'science',
    name: 'Science & Cosmos',
    tagline: 'Physics, biology, tech breakthroughs & space',
    isBonusLocked: false,
  },
  {
    id: 'pop-culture',
    name: 'Pop Culture',
    tagline: 'Cinema, music hits, awards & classic icons',
    isBonusLocked: false,
  },
  {
    id: 'logic-riddles',
    name: 'Logic & Riddles',
    tagline: 'Lateral puzzles, wordplay & deductive twists',
    isBonusLocked: false,
  },
  {
    id: 'faith-study',
    name: 'Faith Study',
    tagline: 'Bible, Quran, Torah, Gita, Dharma & World Wisdom',
    isBonusLocked: false,
  },
  {
    id: 'surprise-me',
    name: 'Surprise Me',
    tagline: 'All-categories shuffle with zero repeats',
    isBonusLocked: false,
  },
  {
    id: 'mastermind-vault',
    name: 'Mastermind Vault',
    tagline: '24-hour elite bonus theme: deep curiosities & tough twists',
    isBonusLocked: true,
  },
];

export function getTriviaCategoryById(id: string): TriviaCategorySpec {
  return TRIVIA_CATEGORIES.find((c) => c.id === id) || TRIVIA_CATEGORIES[0];
}

export function isTriviaCategoryUnlocked(
  categoryId: string,
  unlockExpiryMap: Record<string, number>,
  nowMs: number = Date.now()
): boolean {
  const spec = getTriviaCategoryById(categoryId);
  if (!spec.isBonusLocked) return true;
  const expiresAt = unlockExpiryMap[spec.id] || 0;
  return expiresAt > nowMs;
}

export function getTriviaUnlockRemainingHours(
  categoryId: string,
  unlockExpiryMap: Record<string, number>,
  nowMs: number = Date.now()
): number {
  const expiresAt = unlockExpiryMap[categoryId] || 0;
  if (expiresAt <= nowMs) return 0;
  return Math.max(1, Math.ceil((expiresAt - nowMs) / (60 * 60 * 1000)));
}

function toTriviaQuestion(
  item: CuratedBankTriviaItem,
  personalizationReason?: string
): TriviaQuestion {
  return {
    id: item.id,
    question: item.question,
    options: item.options,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    funFact: item.funFact,
    category: item.categoryLabel,
    difficulty: item.level,
    ...(personalizationReason ? { personalizationReason } : {}),
  };
}

function filterBankForCategory(categoryId: string): CuratedBankTriviaItem[] {
  if (categoryId === 'for-you-local' || categoryId === 'surprise-me') {
    return CURATED_TRIVIA_BANK;
  }
  if (categoryId === 'faith-study') {
    return CURATED_TRIVIA_BANK.filter((q) => q.categoryId.startsWith('faith:'));
  }
  const exact = CURATED_TRIVIA_BANK.filter((q) => q.categoryId === categoryId);
  if (exact.length > 0) return exact;
  return CURATED_TRIVIA_BANK;
}

function getTierPoolWithNeighborFallback(
  pool: CuratedBankTriviaItem[],
  level: FiveDifficultyLevel
): CuratedBankTriviaItem[] {
  const exactTier = pool.filter((q) => q.level === level);
  if (exactTier.length >= 4) return exactTier;

  const idx = FIVE_LEVEL_ORDER.indexOf(level);
  const adjacentTiers = new Set<FiveDifficultyLevel>([level]);
  if (idx > 0) adjacentTiers.add(FIVE_LEVEL_ORDER[idx - 1]);
  if (idx < FIVE_LEVEL_ORDER.length - 1) adjacentTiers.add(FIVE_LEVEL_ORDER[idx + 1]);

  const expanded = pool.filter((q) => adjacentTiers.has(q.level));
  return expanded.length > 0 ? expanded : pool;
}

/**
 * Draws the next zero-repeat question from the massive curated offline bank for `categoryId` + `level`.
 * Uses `zeroRepeatDeck.ts` persisted to `localStorage` so repeat probability is 0% even across
 * new sessions and page reloads until an entire deck is exhausted.
 */
export function drawZeroRepeatTriviaQuestion(params: {
  categoryId: string;
  level: FiveDifficultyLevel;
  excludeTexts?: string[];
  context?: {
    locationLabel?: string;
    interests?: string[];
  };
}): TriviaQuestion {
  const { categoryId, level, excludeTexts = [], context } = params;
  const basePool = filterBankForCategory(categoryId);
  const tierPool = getTierPoolWithNeighborFallback(basePool, level);

  // Also include full-bank overflow of that tier only if the category tier is small,
  // preserving category specificity first via exact matching.
  const exactOnly = basePool.filter((q) => q.level === level);
  const candidatePool = exactOnly.length > 0 ? exactOnly : tierPool;

  const excludeSet = new Set(excludeTexts.map((t) => t.trim().toLowerCase()));
  const filteredPool = candidatePool.filter(
    (q) => !excludeSet.has(q.question.trim().toLowerCase())
  );
  const effectivePool = filteredPool.length > 0 ? filteredPool : candidatePool;

  const picked = pickZeroRepeatItem(
    `trivia:${categoryId}:${level}`,
    effectivePool,
    (q) => q.id,
    excludeTexts
  );

  let personalizationReason: string | undefined;
  if (categoryId === 'for-you-local') {
    const interestNote = context?.interests?.length ? context.interests.slice(0, 2).join(' & ') : 'Smart Mix';
    personalizationReason = context?.locationLabel
      ? `Tuned for ${context.locationLabel} · ${interestNote}`
      : `Tailored Offline Mix · ${interestNote}`;
  } else if (categoryId === 'local-trending' && context?.locationLabel) {
    personalizationReason = `Regional Highlight · ${context.locationLabel}`;
  }

  return toTriviaQuestion(picked, personalizationReason);
}

/**
 * Compatibility helper preserved for tests & callers — routes straight to the zero-repeat curated bank.
 */
export function pickFallbackTriviaQuestion(
  categoryId: string,
  difficulty: TriviaDifficulty,
  seenQuestions: string[],
  context?: {
    locationLabel?: string;
    interests?: string[];
  }
): TriviaQuestion {
  return drawZeroRepeatTriviaQuestion({
    categoryId,
    level: normalizeToFiveLevel(difficulty),
    excludeTexts: seenQuestions,
    context,
  });
}
