import {
  FIVE_LEVEL_ORDER,
  getNextFiveLevel,
  getNextLevelNumber,
  levelNumberToDifficultyBand,
  normalizeLevelNumber,
  type FiveDifficultyLevel,
} from './settingsLogic';
import {
  getQueuedIdSet,
  getRedemptionMeta,
  getRetiredIdSet,
  selectComebackCandidate,
  shuffleQuestionOptions,
} from './retirementQueueLogic';
import { CURATED_TRIVIA_BANK, type CuratedBankTriviaItem } from './triviaBank';
import { CURATED_WORD_MEANINGS } from './wordMeanings';
import {
  getBucketRemainingCount,
  getBucketSeenKeys,
  markBucketKeySeen,
  pickZeroRepeatItem,
} from './zeroRepeatDeck';

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
  /** Trivia-mode ONLY: true when returning from redemptionQueue for 2X XP */
  isRedemptionRound?: boolean;
  /** Number of prior failed attempts if returning from redemptionQueue */
  redemptionWrongCount?: number;
}

export const TRIVIA_LEVEL_CLIMB_TOTAL = 5;
export const TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD = 5;
export const TRIVIA_BONUS_UNLOCK_HOURS = 24;

const TRIVIA_CLIMB_QUESTION_BASE_SEC = [28, 23, 18, 14, 10] as const;

/**
 * Returns the countdown time limit (seconds) for a Trivia Level Climb question (1..5).
 * Shrinks concurrently as the player approaches the 5th question to level up.
 */
export function getTriviaQuestionTimeLimitSeconds(
  levelNumber: number,
  questionIndex: number
): number {
  const lv = normalizeLevelNumber(levelNumber, 1);
  const levelScale = Math.max(0.65, 1 - (lv - 1) * 0.04);
  const clampedIdx = Math.max(
    0,
    Math.min(TRIVIA_LEVEL_CLIMB_TOTAL - 1, Math.floor(questionIndex))
  );
  const base = TRIVIA_CLIMB_QUESTION_BASE_SEC[clampedIdx];
  return Math.max(6, Math.round(base * levelScale));
}

export interface TriviaClimbProgress {
  levelNumber: number;
  currentLevel: FiveDifficultyLevel;
  questionIndex: number; // 0..4 within current 5-question timed stage
  correctCount: number; // 5 out of 5 unlocks next level
  stageComplete: boolean;
  promotedToLevelNumber: number | null;
  promotedToLevel: FiveDifficultyLevel | null;
}

export function createTriviaClimbState(
  level: FiveDifficultyLevel | number = 1
): TriviaClimbProgress {
  const levelNumber = normalizeLevelNumber(level, 1);
  return {
    levelNumber,
    currentLevel: levelNumberToDifficultyBand(levelNumber),
    questionIndex: 0,
    correctCount: 0,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
}

export function advanceTriviaLevelClimb(
  climb: TriviaClimbProgress,
  isCorrectInTime: boolean
): TriviaClimbProgress {
  if (climb.stageComplete) return climb;
  const levelNumber = normalizeLevelNumber(climb.levelNumber ?? climb.currentLevel, 1);
  if (!isCorrectInTime) {
    // Miss or timeout resets concurrent climb streak back to 0/5
    return {
      ...climb,
      levelNumber,
      questionIndex: 0,
      correctCount: 0,
      stageComplete: false,
      promotedToLevelNumber: null,
      promotedToLevel: null,
    };
  }
  const nextCorrect = climb.correctCount + 1;
  const nextIndex = climb.questionIndex + 1;
  if (nextIndex >= TRIVIA_LEVEL_CLIMB_TOTAL) {
    const passed = nextCorrect >= TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD;
    const nextNum = passed ? getNextLevelNumber(levelNumber) : null;
    const legacyNext = passed ? getNextFiveLevel(climb.currentLevel) : null;
    return {
      levelNumber,
      currentLevel: climb.currentLevel,
      questionIndex: TRIVIA_LEVEL_CLIMB_TOTAL,
      correctCount: nextCorrect,
      stageComplete: true,
      promotedToLevelNumber: nextNum,
      promotedToLevel: legacyNext,
    };
  }
  return {
    ...climb,
    levelNumber,
    questionIndex: nextIndex,
    correctCount: nextCorrect,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
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
  nowMs: number = Date.now(),
  mastermindUnlocked: boolean = false
): boolean {
  const spec = getTriviaCategoryById(categoryId);
  if (!spec.isBonusLocked) return true;
  if (spec.id === 'mastermind-vault' && mastermindUnlocked) return true;
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

const CURATED_VOCAB_WORDS = Object.keys(CURATED_WORD_MEANINGS);

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateProceduralTriviaQuestion(params: {
  categoryId: string;
  level: FiveDifficultyLevel;
  excludeSet: Set<string>;
  personalizationReason?: string;
}): TriviaQuestion {
  const { categoryId, level, excludeSet, personalizationReason } = params;
  const catMeta = getTriviaCategoryById(categoryId);

  // Pick a unique word from 1,800+ curated English dictionary definitions that hasn't been used in trivia
  const startOffset = Math.floor(Math.random() * CURATED_VOCAB_WORDS.length);
  for (let i = 0; i < CURATED_VOCAB_WORDS.length; i++) {
    const word = CURATED_VOCAB_WORDS[(startOffset + i) % CURATED_VOCAB_WORDS.length];
    const id = `proc:vocab:${categoryId}:${word}`;
    const qText =
      categoryId === 'logic-riddles'
        ? `Word Riddle: Which ${word.length}-letter English word matches this meaning — "${CURATED_WORD_MEANINGS[word]}"?`
        : `Vocabulary Challenge: Which ${word.length}-letter word means "${CURATED_WORD_MEANINGS[word]}"?`;

    if (excludeSet.has(id.toLowerCase()) || excludeSet.has(qText.toLowerCase())) {
      continue;
    }

    const sameLen = CURATED_VOCAB_WORDS.filter((w) => w !== word && w.length === word.length);
    const distractors: string[] = [];
    const stepBase = hashString(word) % Math.max(1, sameLen.length);
    for (let d = 0; d < sameLen.length && distractors.length < 3; d++) {
      const candidate = sameLen[(stepBase + d * 17) % sameLen.length];
      if (!distractors.includes(candidate)) {
        distractors.push(candidate);
      }
    }
    while (distractors.length < 3) {
      distractors.push(CURATED_VOCAB_WORDS[(distractors.length * 43 + 7) % CURATED_VOCAB_WORDS.length]);
    }

    const rawOptions = [word, ...distractors];
    const correctSlot = hashString(id) % 4;
    const ordered: [string, string, string, string] = ['', '', '', ''];
    ordered[correctSlot] = word;
    let di = 1;
    for (let s = 0; s < 4; s++) {
      if (s !== correctSlot) {
        ordered[s] = rawOptions[di++];
      }
    }

    return {
      id,
      question: qText,
      options: ordered,
      correctIndex: correctSlot,
      explanation: `${word}: ${CURATED_WORD_MEANINGS[word]}.`,
      funFact: `${word} has ${word.length} letters and makes a great crossword anchor!`,
      category: catMeta.name,
      difficulty: level,
      ...(personalizationReason ? { personalizationReason } : {}),
    };
  }

  // Fallback mathematical sequence riddle stamped with unique non-retired seed
  for (let attempt = 0; attempt < 50; attempt++) {
    const step = 3 + ((attempt * 5 + Math.floor(Math.random() * 19)) % 23);
    const start = 4 + ((attempt * 7 + Math.floor(Math.random() * 97)) % 120);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const answer = start + step * 4;
    const uid = `proc:seq:${start}:${step}`;
    if (excludeSet.has(uid.toLowerCase())) continue;
    return {
      id: uid,
      question: `Number Pattern: What comes next in the sequence ${seq.join(', ')}, ...?`,
      options: [
        String(answer - step),
        String(answer),
        String(answer + 2),
        String(answer + step),
      ],
      correctIndex: 1,
      explanation: `Each term increases steadily by +${step}, so ${seq[3]} + ${step} = ${answer}.`,
      funFact: 'Arithmetic progressions keep patterns predictable across unlimited steps.',
      category: catMeta.name,
      difficulty: level,
      ...(personalizationReason ? { personalizationReason } : {}),
    };
  }

  const uid = `proc:seq:${Date.now()}:${Math.floor(Math.random() * 10000)}`;
  const step = 7;
  const start = 11 + (Date.now() % 40);
  const seq = [start, start + step, start + step * 2, start + step * 3];
  const answer = start + step * 4;
  return {
    id: uid,
    question: `Number Pattern: What comes next in the sequence ${seq.join(', ')}, ...?`,
    options: [
      String(answer - step),
      String(answer),
      String(answer + 3),
      String(answer + step),
    ],
    correctIndex: 1,
    explanation: `Each term increases steadily by +${step}, so ${seq[3]} + ${step} = ${answer}.`,
    funFact: 'Arithmetic progressions keep patterns predictable across unlimited steps.',
    category: catMeta.name,
    difficulty: level,
    ...(personalizationReason ? { personalizationReason } : {}),
  };
}

/**
 * Draws the next zero-repeat question from the curated offline bank for `categoryId` + `level`.
 * Uses global + bucket zero-repeat tracking and unlimited procedural word/logic generation when pools finish.
 */
export function drawZeroRepeatTriviaQuestion(params: {
  categoryId: string;
  level?: FiveDifficultyLevel | number;
  levelNumber?: number;
  excludeTexts?: string[];
  context?: {
    locationLabel?: string;
    interests?: string[];
  };
}): TriviaQuestion {
  const { categoryId, excludeTexts = [], context } = params;
  const levelNumber = normalizeLevelNumber(params.levelNumber ?? params.level, 1);
  const level = levelNumberToDifficultyBand(levelNumber);

  let personalizationReason: string | undefined;
  if (categoryId === 'for-you-local') {
    const interestNote = context?.interests?.length ? context.interests.slice(0, 2).join(' & ') : 'Smart Mix';
    personalizationReason = context?.locationLabel
      ? `Tuned for ${context.locationLabel} · ${interestNote}`
      : `Tailored Offline Mix · ${interestNote}`;
  } else if (categoryId === 'local-trending' && context?.locationLabel) {
    personalizationReason = `Regional Highlight · ${context.locationLabel}`;
  }

  // 1. Check Smart Comeback Queue (returns after 15..25 rounds, or >=30 rounds on 2nd miss, ~every 8-10 rounds)
  const comebackEntry = selectComebackCandidate('trivia', (entry) => {
    const bankMatch = CURATED_TRIVIA_BANK.find((item) => item.id === entry.id);
    if (categoryId === 'for-you-local' || categoryId === 'surprise-me') {
      return Boolean(bankMatch || entry.snapshot?.question);
    }
    if (categoryId === 'faith-study') {
      return Boolean(
        bankMatch?.categoryId.startsWith('faith:') ||
          entry.snapshot?.categoryId === 'faith-study'
      );
    }
    if (bankMatch) return bankMatch.categoryId === categoryId;
    return entry.snapshot?.categoryId === categoryId && Boolean(entry.snapshot?.question);
  });

  if (comebackEntry) {
    const bankMatch = CURATED_TRIVIA_BANK.find((item) => item.id === comebackEntry.id);
    const snapQ = comebackEntry.snapshot?.question as TriviaQuestion | undefined;
    const rawReturning: TriviaQuestion | null = bankMatch
      ? toTriviaQuestion(bankMatch, personalizationReason)
      : snapQ
      ? {
          ...snapQ,
          id: comebackEntry.id,
          ...(personalizationReason ? { personalizationReason } : {}),
        }
      : null;

    if (rawReturning) {
      const meta = getRedemptionMeta('trivia');
      const shuffled = shuffleQuestionOptions(
        rawReturning,
        comebackEntry.wrongCount + meta.totalRoundsPlayed
      );
      return {
        ...shuffled,
        id: comebackEntry.id,
        isRedemptionRound: true,
        redemptionWrongCount: comebackEntry.wrongCount,
      };
    }
  }

  // 2. Serve a brand-new unseen question (strictly excluding retiredIds & active redemptionQueue IDs)
  const retiredIds = getRetiredIdSet('trivia');
  const queuedIds = getQueuedIdSet('trivia');
  const basePool = filterBankForCategory(categoryId);
  const exactOnly = basePool.filter((q) => q.level === level);
  const tierPool = getTierPoolWithNeighborFallback(basePool, level);

  const catGlobalBucket = `trivia:${categoryId}:seen_all`;
  const allVaultBucket = `trivia:global_vault:seen_all`;
  const alreadySeenCat = getBucketSeenKeys(catGlobalBucket);
  const alreadySeenAll = getBucketSeenKeys(allVaultBucket);
  const combinedExcludes = Array.from(
    new Set([
      ...excludeTexts,
      ...alreadySeenCat,
      ...alreadySeenAll,
      ...retiredIds,
      ...queuedIds,
    ])
  );
  const excludeSet = new Set(combinedExcludes.map((t) => t.trim().toLowerCase()));

  const isEligibleNew = (q: CuratedBankTriviaItem): boolean => {
    const cleanId = q.id.toLowerCase();
    return (
      !retiredIds.has(q.id) &&
      !queuedIds.has(q.id) &&
      !excludeSet.has(cleanId) &&
      !excludeSet.has(q.question.trim().toLowerCase())
    );
  };

  const exactRemaining =
    exactOnly.length > 0
      ? getBucketRemainingCount(
          `trivia:${categoryId}:${level}`,
          exactOnly,
          (q) => q.id,
          combinedExcludes
        )
      : 0;

  let chosen: CuratedBankTriviaItem | null = null;
  if (exactRemaining > 0) {
    const filteredExact = exactOnly.filter(isEligibleNew);
    if (filteredExact.length > 0) {
      chosen = pickZeroRepeatItem(
        `trivia:${categoryId}:${level}`,
        filteredExact,
        (q) => q.id,
        combinedExcludes
      );
    }
  }

  if (!chosen) {
    const unseenTier = tierPool.filter(isEligibleNew);
    const unseenBase = basePool.filter(isEligibleNew);
    const unseenWholeBank = CURATED_TRIVIA_BANK.filter(isEligibleNew);

    const poolToUse =
      unseenTier.length > 0
        ? unseenTier
        : unseenBase.length > 0
        ? unseenBase
        : unseenWholeBank;

    if (poolToUse.length > 0) {
      chosen = pickZeroRepeatItem(
        `trivia:${categoryId}:spillover`,
        poolToUse,
        (q) => q.id,
        combinedExcludes
      );
    }
  }

  if (chosen) {
    markBucketKeySeen(catGlobalBucket, chosen.id);
    markBucketKeySeen(catGlobalBucket, chosen.question);
    markBucketKeySeen(allVaultBucket, chosen.id);
    markBucketKeySeen(allVaultBucket, chosen.question);
    return toTriviaQuestion(chosen, personalizationReason);
  }

  const procedural = generateProceduralTriviaQuestion({
    categoryId,
    level,
    excludeSet,
    personalizationReason,
  });
  if (procedural.id) {
    markBucketKeySeen(catGlobalBucket, procedural.id);
    markBucketKeySeen(allVaultBucket, procedural.id);
  }
  markBucketKeySeen(catGlobalBucket, procedural.question);
  markBucketKeySeen(allVaultBucket, procedural.question);
  return procedural;
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
