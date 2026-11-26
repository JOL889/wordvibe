import { getUtcWeekKey } from './weeklyLogic';

export const REWARD_MILESTONE_XP = 600_000;
export const REWARD_MILESTONE_NAIRA = 10_000;
export const WEEKLY_PRIZE_POOL_LABEL = 'Weekly #1 Champion: ₦5,000 / ₦10,000 Pool';

export const STANDARD_ROUND_XP_MIN = 25;
export const STANDARD_ROUND_XP_MAX = 40;

export const TIMED_PUZZLE_MIN_XP = 6;
export const TIMED_PUZZLE_MAX_XP = 30;
export const TIMED_TRIVIA_MIN_XP = 3;
export const TIMED_TRIVIA_MAX_XP = 15;
export const SPRINT_PUZZLE_ONLINE_XP = 10;
export const SPRINT_TRIVIA_ONLINE_XP = 5;
export const OFFLINE_WRONG_XP_RATIO = 0.4;

export const MIN_MS_PER_ROUND = 3_000;
export const MAX_XP_PER_BATCH = 1_500;
export const MAX_XP_PER_24H = 15_000;
export const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
export const AUTO_FLUSH_XP_THRESHOLD = 500;
export const AUTO_FLUSH_PLAY_MS = 10 * 60 * 1000; // 10 minutes
export const LEADERBOARD_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const LEADERBOARD_TOP_LIMIT = 25;

export const CLAIM_WHATSAPP_NUMBER = '2349137528772';
export const CLAIM_EMAIL_ADDRESS = 'lawaljustice12@gmail.com';

export type VerifiedRoundMode = 'puzzle' | 'trivia' | 'faith';
export type FirebaseAuthType = 'anonymous' | 'google' | 'email';

export interface PendingOnlineRoundEntry {
  mode: VerifiedRoundMode;
  xp: number;
  completedAtMs: number;
  puzzlesDelta: number;
  triviaDelta: number;
}

export interface PendingOnlineBuffer {
  uid: string;
  weekKey: string;
  startedAtMs: number;
  lastRoundAtMs: number;
  rounds: PendingOnlineRoundEntry[];
  pendingXp: number;
  pendingPuzzlesSolved: number;
  pendingTriviaCorrect: number;
  integrityHash: string;
}

export interface VerifiedRewardLocalState {
  uid: string | null;
  displayName: string;
  authType: FirebaseAuthType;
  verifiedRewardXp: number;
  weeklyRewardXp: number;
  weekKey: string;
  roundsPlayed: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  streak: number;
  dailyVerifiedXp: number;
  dailyWindowStartMs: number;
  lastSyncAtMs: number;
  suspiciousActivity: boolean;
  suspiciousReason: string | null;
  accountCreatedAtMs: number;
  lastClaimId: string | null;
  lastClaimCode: string | null;
  integrityHash: string;
  pendingBuffer: PendingOnlineBuffer;
}

export interface RemoteLeaderboardEntry {
  uid: string;
  name: string;
  weeklyRewardXp: number;
  verifiedRewardXp: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  streak: number;
  weekKey: string;
}

export interface WeeklyLeaderboardCache {
  weekKey: string;
  updatedAtMs: number;
  fetchedAtMs: number;
  prizePoolLabel: string;
  topEntries: RemoteLeaderboardEntry[];
}

export interface RewardClaimInput {
  fullName: string;
  bankName: string;
  accountNumber: string;
}

export interface RewardClaimValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: RewardClaimInput;
}

export interface ClaimConfirmationReceipt {
  claimId: string;
  claimCode: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  verifiedXpAtClaim: number;
  roundsPlayed: number;
  createdAtIso: string;
  whatsappUrl: string;
  emailUrl: string;
}

export function sanitizeLeaderboardDisplayName(name: string): string {
  const cleaned = String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
  return cleaned.length > 0 ? cleaned : 'Player';
}

export function calculateOfflineWrongXp(baseXp: number): number {
  return Math.max(0, Math.round(Math.max(0, baseXp) * OFFLINE_WRONG_XP_RATIO));
}

export function calculateVerifiedRoundXp(params: {
  mode: VerifiedRoundMode;
  won: boolean;
  sessionMode?: 'level_climb' | 'sprint';
  timeRemainingSec?: number;
  timeTotalSec?: number;
  accuracyRatio?: number;
  difficultyWeight?: number;
}): number {
  // Online Faith Mode awards 0 online XP; incorrect / timed-out answers online award 0 XP.
  if (params.mode === 'faith' || !params.won) {
    return 0;
  }

  // Endless Sprint (untimed): fixed lower online rewards
  if (params.sessionMode === 'sprint') {
    return params.mode === 'puzzle' ? SPRINT_PUZZLE_ONLINE_XP : SPRINT_TRIVIA_ONLINE_XP;
  }

  // Timed Mode: scale dynamically based on remaining time ratio (fallback to accuracy/difficulty)
  let ratio: number;
  if (
    typeof params.timeRemainingSec === 'number' &&
    typeof params.timeTotalSec === 'number' &&
    params.timeTotalSec > 0
  ) {
    ratio = Math.max(0, Math.min(1, params.timeRemainingSec / params.timeTotalSec));
  } else {
    const acc =
      typeof params.accuracyRatio === 'number'
        ? Math.max(0, Math.min(1, params.accuracyRatio))
        : 0.7;
    const diff =
      typeof params.difficultyWeight === 'number'
        ? Math.max(0, Math.min(1, params.difficultyWeight))
        : 0.4;
    ratio = Math.max(0, Math.min(1, acc * 0.7 + diff * 0.3));
  }

  if (params.mode === 'puzzle') {
    return Math.max(
      TIMED_PUZZLE_MIN_XP,
      Math.min(
        TIMED_PUZZLE_MAX_XP,
        Math.round(TIMED_PUZZLE_MIN_XP + (TIMED_PUZZLE_MAX_XP - TIMED_PUZZLE_MIN_XP) * ratio)
      )
    );
  }

  return Math.max(
    TIMED_TRIVIA_MIN_XP,
    Math.min(
      TIMED_TRIVIA_MAX_XP,
      Math.round(TIMED_TRIVIA_MIN_XP + (TIMED_TRIVIA_MAX_XP - TIMED_TRIVIA_MIN_XP) * ratio)
    )
  );
}

function fnv1aHex(input: string, seedOffset = 0): string {
  let hash = (0x811c9dc5 ^ seedOffset) >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function computeIntegrityHash(parts: {
  uid: string;
  verifiedRewardXp: number;
  weeklyRewardXp: number;
  roundsPlayed: number;
  dailyVerifiedXp: number;
  pendingXp: number;
  pendingRoundsCount: number;
  weekKey: string;
}): string {
  const canonical = [
    parts.uid || 'anon',
    Math.floor(parts.verifiedRewardXp),
    Math.floor(parts.weeklyRewardXp),
    Math.floor(parts.roundsPlayed),
    Math.floor(parts.dailyVerifiedXp),
    Math.floor(parts.pendingXp),
    Math.floor(parts.pendingRoundsCount),
    parts.weekKey,
    'wv_v1_salt_9384',
  ].join('|');

  return `${fnv1aHex(canonical, 0x1357)}${fnv1aHex(canonical, 0x2468)}${fnv1aHex(
    canonical.split('').reverse().join(''),
    0x9abc
  )}`;
}

export function createEmptyPendingBuffer(
  uid: string | null,
  weekKey: string = getUtcWeekKey()
): PendingOnlineBuffer {
  const safeUid = uid || 'unauthenticated';
  return {
    uid: safeUid,
    weekKey,
    startedAtMs: 0,
    lastRoundAtMs: 0,
    rounds: [],
    pendingXp: 0,
    pendingPuzzlesSolved: 0,
    pendingTriviaCorrect: 0,
    integrityHash: computeIntegrityHash({
      uid: safeUid,
      verifiedRewardXp: 0,
      weeklyRewardXp: 0,
      roundsPlayed: 0,
      dailyVerifiedXp: 0,
      pendingXp: 0,
      pendingRoundsCount: 0,
      weekKey,
    }),
  };
}

export function createDefaultVerifiedRewardState(
  uid: string | null = null,
  displayName = 'Player',
  authType: FirebaseAuthType = 'anonymous',
  nowMs: number = Date.now()
): VerifiedRewardLocalState {
  const weekKey = getUtcWeekKey(nowMs);
  const emptyBuffer = createEmptyPendingBuffer(uid, weekKey);
  const integrityHash = computeIntegrityHash({
    uid: uid || 'unauthenticated',
    verifiedRewardXp: 0,
    weeklyRewardXp: 0,
    roundsPlayed: 0,
    dailyVerifiedXp: 0,
    pendingXp: 0,
    pendingRoundsCount: 0,
    weekKey,
  });
  return {
    uid,
    displayName: sanitizeLeaderboardDisplayName(displayName),
    authType,
    verifiedRewardXp: 0,
    weeklyRewardXp: 0,
    weekKey,
    roundsPlayed: 0,
    puzzlesSolved: 0,
    triviaCorrect: 0,
    streak: 0,
    dailyVerifiedXp: 0,
    dailyWindowStartMs: nowMs,
    lastSyncAtMs: 0,
    suspiciousActivity: false,
    suspiciousReason: null,
    accountCreatedAtMs: nowMs,
    lastClaimId: null,
    lastClaimCode: null,
    integrityHash,
    pendingBuffer: emptyBuffer,
  };
}

export function recomputeStateIntegrityHash(state: VerifiedRewardLocalState): string {
  return computeIntegrityHash({
    uid: state.uid || 'unauthenticated',
    verifiedRewardXp: state.verifiedRewardXp,
    weeklyRewardXp: state.weeklyRewardXp,
    roundsPlayed: state.roundsPlayed,
    dailyVerifiedXp: state.dailyVerifiedXp,
    pendingXp: state.pendingBuffer.pendingXp,
    pendingRoundsCount: state.pendingBuffer.rounds.length,
    weekKey: state.weekKey,
  });
}

export interface RecordOnlineRoundInput {
  isOnline: boolean;
  isSignedIn: boolean;
  mode: VerifiedRoundMode;
  won: boolean;
  sessionMode?: 'level_climb' | 'sprint';
  timeRemainingSec?: number;
  timeTotalSec?: number;
  accuracyRatio?: number;
  difficultyWeight?: number;
  streak?: number;
  nowMs?: number;
}

export interface RecordOnlineRoundResult {
  state: VerifiedRewardLocalState;
  xpQueued: number;
  eligibleForVerifiedReward: boolean;
  blockedReason?:
    | 'offline'
    | 'unauthenticated'
    | 'suspicious_flagged'
    | 'faith_no_online_xp'
    | 'round_not_won'
    | 'pacing_too_fast'
    | 'daily_cap_reached'
    | 'batch_cap_reached';
}

export function recordVerifiedOnlineRound(
  prev: VerifiedRewardLocalState,
  input: RecordOnlineRoundInput
): RecordOnlineRoundResult {
  const nowMs = input.nowMs ?? Date.now();
  const currentWeekKey = getUtcWeekKey(nowMs);

  // Rule 1: Offline rounds or unsigned users NEVER accumulate Verified Online XP
  if (!input.isOnline) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'offline',
    };
  }
  if (!input.isSignedIn || !prev.uid) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'unauthenticated',
    };
  }
  if (prev.suspiciousActivity) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'suspicious_flagged',
    };
  }
  if (input.mode === 'faith') {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'faith_no_online_xp',
    };
  }
  if (!input.won) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'round_not_won',
    };
  }

  // Reconcile UTC week rollover on weeklyRewardXp
  let nextWeeklyXp = prev.weeklyRewardXp;
  let nextWeekKey = prev.weekKey;
  let buffer = { ...prev.pendingBuffer, rounds: [...prev.pendingBuffer.rounds] };

  if (nextWeekKey !== currentWeekKey) {
    nextWeekKey = currentWeekKey;
    nextWeeklyXp = 0;
    buffer = {
      ...buffer,
      weekKey: currentWeekKey,
    };
  }

  // Reconcile 24h daily window
  let nextDailyXp = prev.dailyVerifiedXp;
  let nextDailyWindowStartMs = prev.dailyWindowStartMs || nowMs;
  if (nowMs - nextDailyWindowStartMs >= DAY_WINDOW_MS) {
    nextDailyXp = 0;
    nextDailyWindowStartMs = nowMs;
  }

  // Enforce >= 3s realistic pacing between scored rounds
  if (buffer.lastRoundAtMs > 0 && nowMs - buffer.lastRoundAtMs < MIN_MS_PER_ROUND) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'pacing_too_fast',
    };
  }

  const remainingDailyRoom = Math.max(0, MAX_XP_PER_24H - (nextDailyXp + buffer.pendingXp));
  if (remainingDailyRoom < 1) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'daily_cap_reached',
    };
  }

  const remainingBatchRoom = Math.max(0, MAX_XP_PER_BATCH - buffer.pendingXp);
  if (remainingBatchRoom < 1) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'batch_cap_reached',
    };
  }

  const rawXp = calculateVerifiedRoundXp({
    mode: input.mode,
    won: input.won,
    sessionMode: input.sessionMode,
    timeRemainingSec: input.timeRemainingSec,
    timeTotalSec: input.timeTotalSec,
    accuracyRatio: input.accuracyRatio,
    difficultyWeight: input.difficultyWeight,
  });

  const awardedXp = Math.min(rawXp, remainingBatchRoom, remainingDailyRoom);
  if (awardedXp <= 0) {
    return {
      state: prev,
      xpQueued: 0,
      eligibleForVerifiedReward: false,
      blockedReason: 'batch_cap_reached',
    };
  }

  const roundEntry: PendingOnlineRoundEntry = {
    mode: input.mode,
    xp: awardedXp,
    completedAtMs: nowMs,
    puzzlesDelta: input.mode === 'puzzle' && input.won ? 1 : 0,
    triviaDelta: input.mode === 'trivia' && input.won ? 1 : 0,
  };

  buffer.uid = prev.uid;
  buffer.startedAtMs = buffer.startedAtMs > 0 ? buffer.startedAtMs : nowMs;
  buffer.lastRoundAtMs = nowMs;
  buffer.rounds.push(roundEntry);
  buffer.pendingXp += awardedXp;
  buffer.pendingPuzzlesSolved += roundEntry.puzzlesDelta;
  buffer.pendingTriviaCorrect += roundEntry.triviaDelta;

  const updated: VerifiedRewardLocalState = {
    ...prev,
    weekKey: nextWeekKey,
    weeklyRewardXp: nextWeeklyXp,
    streak: typeof input.streak === 'number' ? Math.max(prev.streak, input.streak) : prev.streak,
    dailyVerifiedXp: nextDailyXp,
    dailyWindowStartMs: nextDailyWindowStartMs,
    pendingBuffer: buffer,
  };

  const newHash = recomputeStateIntegrityHash(updated);
  updated.integrityHash = newHash;
  updated.pendingBuffer = {
    ...updated.pendingBuffer,
    integrityHash: newHash,
  };

  return {
    state: updated,
    xpQueued: awardedXp,
    eligibleForVerifiedReward: true,
  };
}

export function getSyncCooldownRemainingMs(
  lastSyncAtMs: number,
  nowMs: number = Date.now()
): number {
  if (!lastSyncAtMs || lastSyncAtMs <= 0) return 0;
  return Math.max(0, SYNC_COOLDOWN_MS - Math.max(0, nowMs - lastSyncAtMs));
}

export function shouldAutoFlushBatch(
  state: VerifiedRewardLocalState,
  trigger: 'round_end' | 'leaderboard_open' | 'manual_sync' | 'session_exit',
  nowMs: number = Date.now()
): boolean {
  if (!state.uid) return false;
  if (state.pendingBuffer.rounds.length === 0 && state.pendingBuffer.pendingXp === 0) {
    return false;
  }

  if (getSyncCooldownRemainingMs(state.lastSyncAtMs, nowMs) > 0) {
    return false;
  }

  if (trigger === 'manual_sync' || trigger === 'leaderboard_open' || trigger === 'session_exit') {
    return true;
  }

  const activePlayElapsed =
    state.pendingBuffer.startedAtMs > 0 ? nowMs - state.pendingBuffer.startedAtMs : 0;
  return (
    state.pendingBuffer.pendingXp >= AUTO_FLUSH_XP_THRESHOLD ||
    activePlayElapsed >= AUTO_FLUSH_PLAY_MS
  );
}

export interface TamperVerificationResult {
  valid: boolean;
  suspiciousReason: string | null;
}

export function verifyBufferIntegrity(
  state: VerifiedRewardLocalState,
  nowMs: number = Date.now()
): TamperVerificationResult {
  if (state.suspiciousActivity) {
    return {
      valid: false,
      suspiciousReason: state.suspiciousReason || 'Previously flagged suspicious activity',
    };
  }

  const buffer = state.pendingBuffer;
  const expectedHash = recomputeStateIntegrityHash(state);
  if (state.integrityHash !== expectedHash || buffer.integrityHash !== expectedHash) {
    return { valid: false, suspiciousReason: 'Integrity hash mismatch on local reward buffer' };
  }

  if (buffer.pendingXp < 0 || buffer.pendingXp > MAX_XP_PER_BATCH) {
    return { valid: false, suspiciousReason: 'Pending XP batch exceeded 1,500 XP limit' };
  }

  const sumRoundXp = buffer.rounds.reduce((sum, r) => sum + (Number.isFinite(r.xp) ? r.xp : 0), 0);
  if (sumRoundXp !== buffer.pendingXp) {
    return { valid: false, suspiciousReason: 'Round ledger sum does not match pending XP' };
  }

  if (buffer.rounds.length > 0 && buffer.pendingXp > buffer.rounds.length * STANDARD_ROUND_XP_MAX) {
    return { valid: false, suspiciousReason: 'XP per round exceeded 40 XP ceiling' };
  }

  // Human pacing verification: >= 3 seconds per round across batch span
  if (buffer.rounds.length >= 2) {
    const firstTs = buffer.rounds[0].completedAtMs;
    const lastTs = buffer.rounds[buffer.rounds.length - 1].completedAtMs;
    if (lastTs - firstTs < (buffer.rounds.length - 1) * MIN_MS_PER_ROUND) {
      return { valid: false, suspiciousReason: 'Impossible completion speed (< 3s/round)' };
    }
  }
  if (state.lastSyncAtMs > 0 && buffer.rounds.length > 0) {
    const elapsedSinceSync = nowMs - state.lastSyncAtMs;
    if (elapsedSinceSync < buffer.rounds.length * MIN_MS_PER_ROUND) {
      return { valid: false, suspiciousReason: 'Rounds completed faster than 3s/round cooldown' };
    }
  }

  const currentDaily =
    nowMs - (state.dailyWindowStartMs || nowMs) >= DAY_WINDOW_MS ? 0 : state.dailyVerifiedXp;
  if (currentDaily + buffer.pendingXp > MAX_XP_PER_24H) {
    return { valid: false, suspiciousReason: 'Exceeded 15,000 Verified XP 24-hour cap' };
  }

  return { valid: true, suspiciousReason: null };
}

export function resetUnverifiedDeltaAndFlag(
  state: VerifiedRewardLocalState,
  reason: string
): VerifiedRewardLocalState {
  const clearedBuffer = createEmptyPendingBuffer(state.uid, state.weekKey);
  const flagged: VerifiedRewardLocalState = {
    ...state,
    suspiciousActivity: true,
    suspiciousReason: reason.slice(0, 120),
    pendingBuffer: clearedBuffer,
  };
  const hash = recomputeStateIntegrityHash(flagged);
  flagged.integrityHash = hash;
  flagged.pendingBuffer.integrityHash = hash;
  return flagged;
}

export function applySuccessfulBatchSync(
  state: VerifiedRewardLocalState,
  nowMs: number = Date.now(),
  isRemoteCreate = false
): VerifiedRewardLocalState {
  const currentWeekKey = getUtcWeekKey(nowMs);
  const isNewDay = isRemoteCreate || nowMs - (state.dailyWindowStartMs || nowMs) >= DAY_WINDOW_MS;
  const baseVerified = isRemoteCreate ? 0 : state.verifiedRewardXp;
  const baseWeekly = !isRemoteCreate && state.weekKey === currentWeekKey ? state.weeklyRewardXp : 0;
  const baseRounds = isRemoteCreate ? 0 : state.roundsPlayed;
  const basePuzzles = isRemoteCreate ? 0 : state.puzzlesSolved;
  const baseTrivia = isRemoteCreate ? 0 : state.triviaCorrect;
  const baseDaily = isNewDay ? 0 : state.dailyVerifiedXp;
  const deltaXp = state.pendingBuffer.pendingXp;
  const deltaRounds = state.pendingBuffer.rounds.length;

  const cleared = createEmptyPendingBuffer(state.uid, currentWeekKey);
  const synced: VerifiedRewardLocalState = {
    ...state,
    weekKey: currentWeekKey,
    verifiedRewardXp: baseVerified + deltaXp,
    weeklyRewardXp: baseWeekly + deltaXp,
    roundsPlayed: baseRounds + deltaRounds,
    puzzlesSolved: basePuzzles + state.pendingBuffer.pendingPuzzlesSolved,
    triviaCorrect: baseTrivia + state.pendingBuffer.pendingTriviaCorrect,
    dailyVerifiedXp: baseDaily + deltaXp,
    dailyWindowStartMs: isNewDay ? nowMs : state.dailyWindowStartMs || nowMs,
    lastSyncAtMs: nowMs,
    pendingBuffer: cleared,
  };
  const hash = recomputeStateIntegrityHash(synced);
  synced.integrityHash = hash;
  synced.pendingBuffer.integrityHash = hash;
  return synced;
}

export interface RemoteUserXpSnapshot {
  xp: number;
  dailyXp: number;
  weeklyXp: number;
  weekKey: string;
  dailyWindowStartMs: number;
  roundsPlayed: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  streak: number;
}

function toNonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export function extractRemoteUserXpSnapshot(
  data: Record<string, unknown>,
  nowMs: number = Date.now(),
  fallbackDailyStartMs: number = nowMs
): RemoteUserXpSnapshot {
  const currentWeekKey = getUtcWeekKey(nowMs);
  const weekKey =
    typeof data.weekKey === 'string' && data.weekKey.length === 10
      ? data.weekKey
      : currentWeekKey;
  const rawDailyStart =
    typeof data.dailyWindowStartMs === 'number' && Number.isFinite(data.dailyWindowStartMs)
      ? Math.floor(data.dailyWindowStartMs)
      : Math.floor(fallbackDailyStartMs);

  const xp = toNonNegativeInt(
    typeof data.xp === 'number' ? data.xp : data.verifiedRewardXp,
    0
  );
  const rawWeekly = toNonNegativeInt(
    typeof data.weeklyXp === 'number' ? data.weeklyXp : data.weeklyRewardXp,
    0
  );
  const rawDaily = toNonNegativeInt(
    typeof data.dailyXp === 'number' ? data.dailyXp : data.dailyVerifiedXp,
    0
  );

  return {
    xp,
    dailyXp: nowMs - rawDailyStart >= DAY_WINDOW_MS ? 0 : rawDaily,
    weeklyXp: weekKey === currentWeekKey ? rawWeekly : 0,
    weekKey: currentWeekKey,
    dailyWindowStartMs: nowMs - rawDailyStart >= DAY_WINDOW_MS ? nowMs : rawDailyStart,
    roundsPlayed: toNonNegativeInt(data.roundsPlayed, 0),
    puzzlesSolved: toNonNegativeInt(data.puzzlesSolved, 0),
    triviaCorrect: toNonNegativeInt(data.triviaCorrect, 0),
    streak: toNonNegativeInt(data.streak, 0),
  };
}

export function buildUserSyncState(params: {
  localState: VerifiedRewardLocalState;
  remoteData: Record<string, unknown> | null;
  remoteLastSyncMs?: number;
  nowMs?: number;
}): {
  nextState: VerifiedRewardLocalState;
  isRemoteCreate: boolean;
  xp: number;
  dailyXp: number;
  weeklyXp: number;
  deltaXp: number;
  deltaRounds: number;
} {
  const nowMs = params.nowMs ?? Date.now();
  const currentWeekKey = getUtcWeekKey(nowMs);
  const deltaXp = Math.max(
    0,
    Math.min(MAX_XP_PER_BATCH, Math.floor(params.localState.pendingBuffer.pendingXp))
  );
  const deltaRounds = Math.max(0, params.localState.pendingBuffer.rounds.length);

  if (!params.remoteData) {
    const nextState = applySuccessfulBatchSync(params.localState, nowMs, true);
    const xp = Math.min(MAX_XP_PER_BATCH, Math.max(0, Math.floor(nextState.verifiedRewardXp)));
    const dailyXp = Math.max(0, Math.floor(nextState.dailyVerifiedXp));
    const weeklyXp = Math.max(0, Math.floor(nextState.weeklyRewardXp));
    nextState.verifiedRewardXp = xp;
    nextState.dailyVerifiedXp = dailyXp;
    nextState.weeklyRewardXp = weeklyXp;
    const hash = recomputeStateIntegrityHash(nextState);
    nextState.integrityHash = hash;
    nextState.pendingBuffer.integrityHash = hash;
    return {
      nextState,
      isRemoteCreate: true,
      xp,
      dailyXp,
      weeklyXp,
      deltaXp: xp,
      deltaRounds,
    };
  }

  const remoteSnap = extractRemoteUserXpSnapshot(
    params.remoteData,
    nowMs,
    params.remoteLastSyncMs ?? nowMs
  );
  const xp = remoteSnap.xp + deltaXp;
  const dailyXp = remoteSnap.dailyXp + deltaXp;
  const weeklyXp = remoteSnap.weeklyXp + deltaXp;
  const cleared = createEmptyPendingBuffer(params.localState.uid, currentWeekKey);

  const nextState: VerifiedRewardLocalState = {
    ...params.localState,
    weekKey: currentWeekKey,
    verifiedRewardXp: xp,
    weeklyRewardXp: weeklyXp,
    dailyVerifiedXp: dailyXp,
    dailyWindowStartMs: remoteSnap.dailyWindowStartMs,
    roundsPlayed: Math.max(params.localState.roundsPlayed, remoteSnap.roundsPlayed) + deltaRounds,
    puzzlesSolved:
      Math.max(params.localState.puzzlesSolved, remoteSnap.puzzlesSolved) +
      params.localState.pendingBuffer.pendingPuzzlesSolved,
    triviaCorrect:
      Math.max(params.localState.triviaCorrect, remoteSnap.triviaCorrect) +
      params.localState.pendingBuffer.pendingTriviaCorrect,
    streak: Math.max(params.localState.streak, remoteSnap.streak),
    lastSyncAtMs: nowMs,
    pendingBuffer: cleared,
  };
  const hash = recomputeStateIntegrityHash(nextState);
  nextState.integrityHash = hash;
  nextState.pendingBuffer.integrityHash = hash;

  return {
    nextState,
    isRemoteCreate: false,
    xp,
    dailyXp,
    weeklyXp,
    deltaXp,
    deltaRounds,
  };
}

export function isLeaderboardCacheFresh(
  cache: WeeklyLeaderboardCache | null,
  nowMs: number = Date.now()
): boolean {
  if (!cache) return false;
  if (cache.weekKey !== getUtcWeekKey(nowMs)) return false;
  return nowMs - cache.fetchedAtMs < LEADERBOARD_CACHE_TTL_MS;
}

export function mergePlayerIntoLeaderboardTop(
  existingTop: RemoteLeaderboardEntry[],
  player: RemoteLeaderboardEntry,
  weekKey: string = getUtcWeekKey()
): RemoteLeaderboardEntry[] {
  const map = new Map<string, RemoteLeaderboardEntry>();
  for (const item of existingTop) {
    if (!item?.uid || item.weekKey !== weekKey) continue;
    map.set(item.uid, {
      uid: item.uid,
      name: sanitizeLeaderboardDisplayName(item.name),
      weeklyRewardXp: Number(item.weeklyRewardXp) || 0,
      verifiedRewardXp: Number(item.verifiedRewardXp) || 0,
      puzzlesSolved: Math.max(0, Math.floor(Number(item.puzzlesSolved) || 0)),
      triviaCorrect: Math.max(0, Math.floor(Number(item.triviaCorrect) || 0)),
      streak: Math.max(0, Math.floor(Number(item.streak) || 0)),
      weekKey,
    });
  }
  map.set(player.uid, {
    uid: player.uid,
    name: sanitizeLeaderboardDisplayName(player.name),
    weeklyRewardXp: Number(player.weeklyRewardXp) || 0,
    verifiedRewardXp: Number(player.verifiedRewardXp) || 0,
    puzzlesSolved: Math.max(0, Math.floor(Number(player.puzzlesSolved) || 0)),
    triviaCorrect: Math.max(0, Math.floor(Number(player.triviaCorrect) || 0)),
    streak: Math.max(0, Math.floor(Number(player.streak) || 0)),
    weekKey,
  });

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.weeklyRewardXp !== a.weeklyRewardXp) return b.weeklyRewardXp - a.weeklyRewardXp;
      if (b.verifiedRewardXp !== a.verifiedRewardXp) return b.verifiedRewardXp - a.verifiedRewardXp;
      return a.uid.localeCompare(b.uid);
    })
    .slice(0, LEADERBOARD_TOP_LIMIT);
}

export function validateRewardClaimInput(
  input: RewardClaimInput,
  verifiedRewardXp: number,
  suspiciousActivity: boolean
): RewardClaimValidationResult {
  if (suspiciousActivity) {
    return {
      valid: false,
      error: 'Account flagged for suspicious activity and is ineligible for cash claims.',
    };
  }
  if (verifiedRewardXp < REWARD_MILESTONE_XP) {
    const needed = REWARD_MILESTONE_XP - Math.max(0, Math.floor(verifiedRewardXp));
    return {
      valid: false,
      error: `Need ${needed.toLocaleString()} more Verified Online XP to reach ${REWARD_MILESTONE_XP.toLocaleString()} XP.`,
    };
  }

  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  const bankName = input.bankName.trim().replace(/\s+/g, ' ');
  const accountNumber = input.accountNumber.replace(/\D/g, '');

  if (fullName.length < 2 || fullName.length > 80) {
    return { valid: false, error: 'Enter your full legal name (2–80 characters).' };
  }
  if (bankName.length < 2 || bankName.length > 60) {
    return { valid: false, error: 'Enter your bank name (2–60 characters).' };
  }
  if (!/^[0-9]{10}$/.test(accountNumber)) {
    return { valid: false, error: 'Account number must be exactly 10 digits.' };
  }

  return {
    valid: true,
    sanitized: { fullName, bankName, accountNumber },
  };
}

export function generateClaimCode(uid: string, nowMs: number = Date.now()): string {
  const tail = fnv1aHex(`${uid}:${nowMs}:${Math.random()}`, 0x55aa)
    .slice(0, 6)
    .toUpperCase();
  const datePart = new Date(nowMs).toISOString().slice(2, 10).replace(/-/g, '');
  return `WV-${datePart}-${tail}`;
}

export function buildClaimPayoutMessage(params: {
  claimId: string;
  claimCode: string;
  uid: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  verifiedXpAtClaim: number;
  roundsPlayed: number;
}): string {
  return [
    'MindSpark / WordVibe ₦10,000 Milestone Claim',
    `Claim ID: ${params.claimId}`,
    `Claim Code: ${params.claimCode}`,
    `Player UID: ${params.uid}`,
    `Full Name: ${params.fullName}`,
    `Bank Name: ${params.bankName}`,
    `Account Number: ${params.accountNumber}`,
    `Verified XP at Claim: ${params.verifiedXpAtClaim.toLocaleString()} XP`,
    `Verified Rounds Played: ${params.roundsPlayed}`,
    'Please verify my claim record in Firestore before payout.',
  ].join('\n');
}

export function buildWhatsAppClaimUrl(params: {
  claimId: string;
  claimCode: string;
  uid: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  verifiedXpAtClaim: number;
  roundsPlayed: number;
}): string {
  const text = buildClaimPayoutMessage(params);
  return `https://wa.me/${CLAIM_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildEmailClaimUrl(params: {
  claimId: string;
  claimCode: string;
  uid: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  verifiedXpAtClaim: number;
  roundsPlayed: number;
}): string {
  const subject = `WordVibe ₦10,000 Reward Claim (${params.claimCode})`;
  const body = buildClaimPayoutMessage(params);
  return `mailto:${CLAIM_EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
