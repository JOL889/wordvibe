import type { TriviaQuestion } from './triviaLogic';

export type GameTrackingMode = 'trivia' | 'faith' | 'puzzle';

export interface RedemptionQueueItem {
  id: string;
  wrongCount: number;
  itemsPlayedSince: number;
  minRoundsWait: number;
  /** Optional mode-specific payload to reconstruct the returning item offline */
  snapshot?: Record<string, unknown>;
}

export interface RedemptionMetaState {
  roundsSinceLastComeback: number;
  totalRoundsPlayed: number;
}

const MEMORY_STORAGE = new Map<string, string>();

const RETIRED_KEY = (mode: GameTrackingMode) => `wordvibe_${mode}_retired_ids_v1`;
const QUEUE_KEY = (mode: GameTrackingMode) => `wordvibe_${mode}_redemption_queue_v1`;
const META_KEY = (mode: GameTrackingMode) => `wordvibe_${mode}_redemption_meta_v1`;

function readStorageRaw(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage quota / security errors
  }
  return MEMORY_STORAGE.get(key) ?? null;
}

function writeStorageRaw(key: string, value: string): void {
  MEMORY_STORAGE.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota / security errors
  }
}

function hashId(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getRetiredIds(mode: GameTrackingMode): string[] {
  const raw = readStorageRaw(RETIRED_KEY(mode));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0)));
  } catch {
    return [];
  }
}

export function getRetiredIdSet(mode: GameTrackingMode): Set<string> {
  return new Set(getRetiredIds(mode));
}

function saveRetiredIds(mode: GameTrackingMode, ids: string[]): void {
  const deduped = Array.from(new Set(ids.filter((x) => typeof x === 'string' && x.length > 0)));
  writeStorageRaw(RETIRED_KEY(mode), JSON.stringify(deduped));
}

export function getRedemptionQueue(mode: GameTrackingMode): RedemptionQueueItem[] {
  const raw = readStorageRaw(QUEUE_KEY(mode));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const clean: RedemptionQueueItem[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        !seen.has(item.id)
      ) {
        seen.add(item.id);
        clean.push({
          id: item.id,
          wrongCount: typeof item.wrongCount === 'number' ? Math.max(1, item.wrongCount) : 1,
          itemsPlayedSince:
            typeof item.itemsPlayedSince === 'number' ? Math.max(0, item.itemsPlayedSince) : 0,
          minRoundsWait:
            typeof item.minRoundsWait === 'number'
              ? Math.max(15, item.minRoundsWait)
              : 15 + (hashId(item.id) % 11),
          ...(item.snapshot && typeof item.snapshot === 'object'
            ? { snapshot: item.snapshot as Record<string, unknown> }
            : {}),
        });
      }
    }
    return clean;
  } catch {
    return [];
  }
}

export function getQueuedIdSet(mode: GameTrackingMode): Set<string> {
  return new Set(getRedemptionQueue(mode).map((item) => item.id));
}

function saveRedemptionQueue(mode: GameTrackingMode, queue: RedemptionQueueItem[]): void {
  writeStorageRaw(QUEUE_KEY(mode), JSON.stringify(queue));
}

export function getRedemptionMeta(mode: GameTrackingMode): RedemptionMetaState {
  const raw = readStorageRaw(META_KEY(mode));
  if (!raw) {
    return { roundsSinceLastComeback: 0, totalRoundsPlayed: 0 };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      roundsSinceLastComeback:
        typeof parsed?.roundsSinceLastComeback === 'number'
          ? Math.max(0, parsed.roundsSinceLastComeback)
          : 0,
      totalRoundsPlayed:
        typeof parsed?.totalRoundsPlayed === 'number'
          ? Math.max(0, parsed.totalRoundsPlayed)
          : 0,
    };
  } catch {
    return { roundsSinceLastComeback: 0, totalRoundsPlayed: 0 };
  }
}

function saveRedemptionMeta(mode: GameTrackingMode, meta: RedemptionMetaState): void {
  writeStorageRaw(META_KEY(mode), JSON.stringify(meta));
}

/**
 * Records the outcome of a single completed or failed item in `mode`:
 * - Correct: immediately adds `id` to `retiredIds` and removes it from `redemptionQueue`.
 * - Wrong (1st fail): adds to `redemptionQueue` with `wrongCount: 1`, `itemsPlayedSince: 0`,
 *   waiting 15..25 rounds (`minRoundsWait`).
 * - Wrong (2nd fail): keeps in `redemptionQueue` with `wrongCount: 2`, resets `itemsPlayedSince: 0`,
 *   waiting at least 30 rounds (`minRoundsWait: 30`) for one final attempt.
 * - Wrong (3rd fail): removes from `redemptionQueue` and permanently retires `id` into `retiredIds`.
 * Always increments `itemsPlayedSince` (+1) on all other items currently in `redemptionQueue`.
 */
export function recordModeOutcome(
  mode: GameTrackingMode,
  id: string,
  correct: boolean,
  snapshot?: Record<string, unknown>
): {
  retired: boolean;
  wrongCount: number;
  wasRedemptionItem: boolean;
} {
  const cleanId = id.trim();
  const retiredIds = getRetiredIds(mode);
  const queue = getRedemptionQueue(mode);
  const meta = getRedemptionMeta(mode);

  const existingIdx = queue.findIndex((entry) => entry.id === cleanId);
  const wasRedemptionItem = existingIdx !== -1;

  // Age all other queued items by 1 round played in this mode
  const agedQueue = queue
    .filter((_, idx) => idx !== existingIdx)
    .map((entry) => ({
      ...entry,
      itemsPlayedSince: entry.itemsPlayedSince + 1,
    }));

  const nextTotalRounds = meta.totalRoundsPlayed + 1;
  const nextRoundsSinceComeback = wasRedemptionItem ? 0 : meta.roundsSinceLastComeback + 1;

  if (!cleanId) {
    saveRedemptionQueue(mode, agedQueue);
    saveRedemptionMeta(mode, {
      roundsSinceLastComeback: nextRoundsSinceComeback,
      totalRoundsPlayed: nextTotalRounds,
    });
    return { retired: false, wrongCount: 0, wasRedemptionItem: false };
  }

  if (correct) {
    const nextRetired = retiredIds.includes(cleanId) ? retiredIds : [...retiredIds, cleanId];
    saveRetiredIds(mode, nextRetired);
    saveRedemptionQueue(mode, agedQueue);
    saveRedemptionMeta(mode, {
      roundsSinceLastComeback: nextRoundsSinceComeback,
      totalRoundsPlayed: nextTotalRounds,
    });
    return { retired: true, wrongCount: 0, wasRedemptionItem };
  }

  // Failed attempt
  const existing = existingIdx !== -1 ? queue[existingIdx] : null;
  const nextWrongCount = existing ? existing.wrongCount + 1 : 1;

  if (nextWrongCount >= 3) {
    // Retire permanently after 3 failed attempts
    const nextRetired = retiredIds.includes(cleanId) ? retiredIds : [...retiredIds, cleanId];
    saveRetiredIds(mode, nextRetired);
    saveRedemptionQueue(mode, agedQueue);
    saveRedemptionMeta(mode, {
      roundsSinceLastComeback: 0,
      totalRoundsPlayed: nextTotalRounds,
    });
    return { retired: true, wrongCount: nextWrongCount, wasRedemptionItem };
  }

  // Fail 1 -> wait 15..25 rounds; Fail 2 -> wait >= 30 rounds for final attempt
  const minRoundsWait =
    nextWrongCount >= 2 ? 30 : 15 + (hashId(cleanId) % 11);

  const updatedEntry: RedemptionQueueItem = {
    id: cleanId,
    wrongCount: nextWrongCount,
    itemsPlayedSince: 0,
    minRoundsWait,
    ...(snapshot || existing?.snapshot ? { snapshot: snapshot || existing?.snapshot } : {}),
  };

  saveRedemptionQueue(mode, [...agedQueue, updatedEntry]);
  saveRedemptionMeta(mode, {
    roundsSinceLastComeback: nextRoundsSinceComeback,
    totalRoundsPlayed: nextTotalRounds,
  });
  return { retired: false, wrongCount: nextWrongCount, wasRedemptionItem };
}

/**
 * Checks whether an eligible failed item in `mode`'s `redemptionQueue` is ready to return:
 * - Item must have waited >= 15..25 rounds (or >= 30 rounds after a 2nd failure).
 * - Global spacing brings a comeback roughly once every 8–10 rounds (`roundsSinceLastComeback >= 8..10`),
 *   so new unseen items still make up the vast majority of rounds.
 */
export function selectComebackCandidate(
  mode: GameTrackingMode,
  filterFn?: (entry: RedemptionQueueItem) => boolean
): RedemptionQueueItem | null {
  const retiredSet = getRetiredIdSet(mode);
  const queue = getRedemptionQueue(mode);
  if (queue.length === 0) return null;

  const meta = getRedemptionMeta(mode);
  const spacingThreshold = 8 + (meta.totalRoundsPlayed % 3); // 8, 9, or 10 rounds
  if (meta.roundsSinceLastComeback < spacingThreshold) {
    return null;
  }

  const eligible = queue.filter((entry) => {
    if (retiredSet.has(entry.id)) return false;
    const requiredWait = Math.max(
      entry.wrongCount >= 2 ? 30 : 15,
      entry.minRoundsWait || 15
    );
    if (entry.itemsPlayedSince < requiredWait) return false;
    return filterFn ? filterFn(entry) : true;
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => b.itemsPlayedSince - a.itemsPlayedSince);
  return eligible[0];
}

/**
 * Shuffles the 4 answer options on a returning multiple-choice question while keeping
 * `correctIndex` accurately aligned to the original correct answer string.
 */
export function shuffleQuestionOptions(
  q: TriviaQuestion,
  salt = 0
): TriviaQuestion {
  const indexed = q.options.map((text, idx) => ({
    text,
    isCorrect: idx === q.correctIndex,
  }));

  // Deterministic/varied Fisher-Yates seeded by question id + salt + random
  let seed = hashId(`${q.id || q.question}::${salt}::${Date.now()}`);
  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  // Guarantee the correct answer moves from its previous slot whenever possible
  let newCorrectIndex = indexed.findIndex((item) => item.isCorrect);
  if (newCorrectIndex === q.correctIndex && indexed.length > 1) {
    const swapIdx = (newCorrectIndex + 1) % indexed.length;
    [indexed[newCorrectIndex], indexed[swapIdx]] = [indexed[swapIdx], indexed[newCorrectIndex]];
    newCorrectIndex = swapIdx;
  }

  return {
    ...q,
    options: [indexed[0].text, indexed[1].text, indexed[2].text, indexed[3].text],
    correctIndex: newCorrectIndex,
  };
}

/**
 * Helper for tests & storage inspection to reset a single mode's retirement + comeback state.
 */
export function clearModeRetirementForTest(mode: GameTrackingMode): void {
  for (const key of [RETIRED_KEY(mode), QUEUE_KEY(mode), META_KEY(mode)]) {
    MEMORY_STORAGE.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }
}
