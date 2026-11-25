/**
 * Zero-Repeat Persistent Deck Tracker
 *
 * Tracks seen item keys per logical bucket (e.g. `trivia:science:novice`, `puzzle:5:novice`)
 * inside `localStorage` (with in-memory SSR fallback) so that across new rounds,
 * difficulty switches, and full app reloads, the probability of drawing a repeated
 * question or puzzle target is 0% until every item in that bucket has been played.
 */

const DECK_STORAGE_KEY = 'wordvibe_zero_repeat_deck_v1';

type DeckStore = Record<string, { seen: string[]; lastKey?: string }>;

const memoryStore: DeckStore = {};

function loadStore(): DeckStore {
  if (typeof window === 'undefined') {
    return memoryStore;
  }
  try {
    const raw = window.localStorage.getItem(DECK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as DeckStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: DeckStore): void {
  if (typeof window === 'undefined') {
    Object.assign(memoryStore, store);
    return;
  }
  try {
    window.localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Picks an item from `pool` that has NEVER been seen in `bucketKey`.
 * Persists selection immediately so even starting a new game or reloading
 * yields 0% repeat probability until the entire pool is exhausted.
 */
export function pickZeroRepeatItem<T>(
  bucketKey: string,
  pool: readonly T[],
  getKey: (item: T) => string,
  extraExcludeKeys: readonly string[] = []
): T {
  if (pool.length === 0) {
    throw new Error(`pickZeroRepeatItem called with empty pool for bucket: ${bucketKey}`);
  }

  const store = loadStore();
  const bucket = store[bucketKey] || { seen: [] };
  const seenSet = new Set(bucket.seen.map(normalizeKey));
  const extraSet = new Set(extraExcludeKeys.map(normalizeKey));

  let available = pool.filter((item) => {
    const k = normalizeKey(getKey(item));
    return !seenSet.has(k) && !extraSet.has(k);
  });

  if (available.length === 0) {
    // Full pool exhausted -> reset bucket cleanly while still avoiding immediate lastKey & extraExcludeKeys
    const lastNorm = bucket.lastKey ? normalizeKey(bucket.lastKey) : '';
    const nonLast = pool.filter((item) => {
      const k = normalizeKey(getKey(item));
      return k !== lastNorm && !extraSet.has(k);
    });
    available =
      nonLast.length > 0
        ? nonLast
        : pool.filter((item) => normalizeKey(getKey(item)) !== lastNorm);
    if (available.length === 0) {
      available = [...pool];
    }
    bucket.seen = [];
  }

  // Deterministic-free shuffled draw among unseen candidates
  const chosenIdx = Math.floor(Math.random() * available.length);
  const chosen = available[chosenIdx];
  const chosenKey = normalizeKey(getKey(chosen));

  store[bucketKey] = {
    seen: [...bucket.seen, chosenKey],
    lastKey: chosenKey,
  };
  saveStore(store);

  return chosen;
}

export function getBucketSeenKeys(bucketKey: string): string[] {
  const store = loadStore();
  const bucket = store[bucketKey];
  return bucket && Array.isArray(bucket.seen) ? [...bucket.seen] : [];
}

export function markBucketKeySeen(bucketKey: string, key: string): void {
  const norm = normalizeKey(key);
  if (!norm) return;
  const store = loadStore();
  const bucket = store[bucketKey] || { seen: [] };
  if (!bucket.seen.includes(norm)) {
    store[bucketKey] = {
      seen: [...bucket.seen, norm],
      lastKey: norm,
    };
    saveStore(store);
  }
}

export function getBucketRemainingCount<T>(
  bucketKey: string,
  pool: readonly T[],
  getKey: (item: T) => string,
  extraExcludeKeys: readonly string[] = []
): number {
  const store = loadStore();
  const bucket = store[bucketKey];
  const seenSet = new Set((bucket?.seen || []).map(normalizeKey));
  const extraSet = new Set(extraExcludeKeys.map(normalizeKey));
  let unseen = 0;
  for (const item of pool) {
    const k = normalizeKey(getKey(item));
    if (!seenSet.has(k) && !extraSet.has(k)) unseen++;
  }
  return unseen;
}

export function clearZeroRepeatDeckForTest(): void {
  if (typeof window === 'undefined') {
    for (const k of Object.keys(memoryStore)) {
      delete memoryStore[k];
    }
    return;
  }
  try {
    window.localStorage.removeItem(DECK_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
