import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySuccessfulBatchSync,
  buildEmailClaimUrl,
  buildUserSyncState,
  buildWhatsAppClaimUrl,
  calculateOfflineWrongXp,
  calculateVerifiedRoundXp,
  CLAIM_EMAIL_ADDRESS,
  CLAIM_WHATSAPP_NUMBER,
  createDefaultVerifiedRewardState,
  extractRemoteUserXpSnapshot,
  getSyncCooldownRemainingMs,
  isLeaderboardCacheFresh,
  LEADERBOARD_CACHE_TTL_MS,
  MAX_XP_PER_24H,
  MAX_XP_PER_BATCH,
  mergePlayerIntoLeaderboardTop,
  reconcileVerifiedStateUid,
  recordVerifiedOnlineRound,
  resetUnverifiedDeltaAndFlag,
  REWARD_MILESTONE_XP,
  shouldAutoFlushBatch,
  SPRINT_PUZZLE_ONLINE_XP,
  SPRINT_TRIVIA_ONLINE_XP,
  SYNC_COOLDOWN_MS,
  TIMED_PUZZLE_MAX_XP,
  TIMED_PUZZLE_MIN_XP,
  TIMED_TRIVIA_MAX_XP,
  TIMED_TRIVIA_MIN_XP,
  validateRewardClaimInput,
  verifyBufferIntegrity,
} from './verifiedRewardsLogic';
import { getUtcWeekKey } from './weeklyLogic';

test('calculateVerifiedRoundXp enforces Faith=0, Wrong=0, Timed scaling (30/15), and Sprint (10/5)', () => {
  // Faith always awards 0 online XP
  assert.equal(calculateVerifiedRoundXp({ mode: 'faith', won: true }), 0);
  assert.equal(calculateVerifiedRoundXp({ mode: 'faith', won: false }), 0);

  // Wrong / timed-out answers online always award 0 XP
  assert.equal(calculateVerifiedRoundXp({ mode: 'puzzle', won: false, sessionMode: 'level_climb' }), 0);
  assert.equal(calculateVerifiedRoundXp({ mode: 'trivia', won: false, sessionMode: 'level_climb' }), 0);
  assert.equal(calculateVerifiedRoundXp({ mode: 'trivia', won: false, sessionMode: 'sprint' }), 0);

  // Timed Puzzle: max 30 XP for instant solve, proportionally lower near 0s (>= 6 XP)
  const fastPuzzle = calculateVerifiedRoundXp({
    mode: 'puzzle',
    won: true,
    sessionMode: 'level_climb',
    timeRemainingSec: 160,
    timeTotalSec: 160,
  });
  const slowPuzzle = calculateVerifiedRoundXp({
    mode: 'puzzle',
    won: true,
    sessionMode: 'level_climb',
    timeRemainingSec: 5,
    timeTotalSec: 160,
  });
  assert.equal(fastPuzzle, TIMED_PUZZLE_MAX_XP);
  assert.ok(slowPuzzle >= TIMED_PUZZLE_MIN_XP && slowPuzzle < fastPuzzle);

  // Timed Trivia: max 15 XP at 15s, lower near 0s (>= 3 XP)
  const fastTrivia = calculateVerifiedRoundXp({
    mode: 'trivia',
    won: true,
    sessionMode: 'level_climb',
    timeRemainingSec: 15,
    timeTotalSec: 15,
  });
  const slowTrivia = calculateVerifiedRoundXp({
    mode: 'trivia',
    won: true,
    sessionMode: 'level_climb',
    timeRemainingSec: 1,
    timeTotalSec: 15,
  });
  assert.equal(fastTrivia, TIMED_TRIVIA_MAX_XP);
  assert.ok(slowTrivia >= TIMED_TRIVIA_MIN_XP && slowTrivia < fastTrivia);

  // Endless Sprint (untimed): 10 XP puzzle, 5 XP trivia
  assert.equal(calculateVerifiedRoundXp({ mode: 'puzzle', won: true, sessionMode: 'sprint' }), SPRINT_PUZZLE_ONLINE_XP);
  assert.equal(calculateVerifiedRoundXp({ mode: 'trivia', won: true, sessionMode: 'sprint' }), SPRINT_TRIVIA_ONLINE_XP);

  // Offline wrong answer helper: 40% rounded to nearest integer
  assert.equal(calculateOfflineWrongXp(25), 10);
  assert.equal(calculateOfflineWrongXp(15), 6);
  assert.equal(calculateOfflineWrongXp(5), 2);
  assert.equal(calculateOfflineWrongXp(35), 14);
});

test('online Faith rounds and online wrong answers queue 0 Verified Online XP', () => {
  const now = Date.UTC(2026, 10, 26, 11, 0, 0);
  const state = createDefaultVerifiedRewardState('uid-faith', 'Mary', 'google', now);

  const faithRes = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'faith',
    won: true,
    nowMs: now + 5000,
  });
  assert.equal(faithRes.eligibleForVerifiedReward, false);
  assert.equal(faithRes.blockedReason, 'faith_no_online_xp');
  assert.equal(faithRes.xpQueued, 0);
  assert.equal(faithRes.state.pendingBuffer.pendingXp, 0);

  const wrongRes = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: false,
    sessionMode: 'level_climb',
    nowMs: now + 10000,
  });
  assert.equal(wrongRes.eligibleForVerifiedReward, false);
  assert.equal(wrongRes.blockedReason, 'round_not_won');
  assert.equal(wrongRes.xpQueued, 0);
});

test('offline or unauthenticated rounds award 0 Verified Online XP', () => {
  const now = Date.UTC(2026, 10, 26, 10, 0, 0);
  const signedInState = createDefaultVerifiedRewardState('uid-123', 'Aria', 'google', now);

  const offlineRes = recordVerifiedOnlineRound(signedInState, {
    isOnline: false,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: now + 5000,
  });
  assert.equal(offlineRes.eligibleForVerifiedReward, false);
  assert.equal(offlineRes.blockedReason, 'offline');
  assert.equal(offlineRes.xpQueued, 0);
  assert.equal(offlineRes.state.pendingBuffer.pendingXp, 0);

  const anonLocal = createDefaultVerifiedRewardState(null, 'Guest', 'anonymous', now);
  const unauthRes = recordVerifiedOnlineRound(anonLocal, {
    isOnline: true,
    isSignedIn: false,
    mode: 'trivia',
    won: true,
    nowMs: now + 5000,
  });
  assert.equal(unauthRes.eligibleForVerifiedReward, false);
  assert.equal(unauthRes.blockedReason, 'unauthenticated');
  assert.equal(unauthRes.xpQueued, 0);
});

test('online authenticated rounds buffer cleanly, enforce >= 3s pacing, and pass integrity check', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-abc', 'Solomon', 'email', t0);

  const r1 = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    accuracyRatio: 0.9,
    difficultyWeight: 0.8,
    nowMs: t0 + 10_000,
  });
  assert.equal(r1.eligibleForVerifiedReward, true);
  assert.ok(r1.xpQueued >= TIMED_PUZZLE_MIN_XP && r1.xpQueued <= TIMED_PUZZLE_MAX_XP);
  state = r1.state;

  // Immediate round < 3 seconds later is blocked
  const tooFast = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: true,
    nowMs: t0 + 11_200,
  });
  assert.equal(tooFast.eligibleForVerifiedReward, false);
  assert.equal(tooFast.blockedReason, 'pacing_too_fast');

  // Round after 4 seconds succeeds
  const r2 = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: true,
    nowMs: t0 + 14_000,
  });
  assert.equal(r2.eligibleForVerifiedReward, true);
  assert.equal(r2.state.pendingBuffer.rounds.length, 2);
  assert.equal(verifyBufferIntegrity(r2.state, t0 + 20_000).valid, true);
});

test('batched sync enforces 5-minute cooldown and auto-flushes at 500 XP or 10 minutes', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-batch', 'Kofi', 'google', t0);
  state.lastSyncAtMs = t0;

  state = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: t0 + 60_000,
  }).state;

  // Inside 5-min cooldown -> blocked even for manual_sync or leaderboard_open
  assert.ok(getSyncCooldownRemainingMs(state.lastSyncAtMs, t0 + 120_000) > 0);
  assert.equal(shouldAutoFlushBatch(state, 'manual_sync', t0 + 120_000), false);
  assert.equal(shouldAutoFlushBatch(state, 'leaderboard_open', t0 + 120_000), false);

  // After 5 min cooldown -> manual_sync & leaderboard_open allowed, round_end waits for 500 XP or 10m
  const afterCooldown = t0 + SYNC_COOLDOWN_MS + 1000;
  assert.equal(shouldAutoFlushBatch(state, 'manual_sync', afterCooldown), true);
  assert.equal(shouldAutoFlushBatch(state, 'leaderboard_open', afterCooldown), true);
  assert.equal(shouldAutoFlushBatch(state, 'round_end', afterCooldown), false);

  // At 10 minutes active play -> round_end flushes
  assert.equal(shouldAutoFlushBatch(state, 'round_end', t0 + 60_000 + 10 * 60_000), true);

  // Successful batch sync moves pendingXp into verifiedRewardXp & weeklyRewardXp
  const pendingBefore = state.pendingBuffer.pendingXp;
  const synced = applySuccessfulBatchSync(state, afterCooldown);
  assert.equal(synced.verifiedRewardXp, pendingBefore);
  assert.equal(synced.weeklyRewardXp, pendingBefore);
  assert.equal(synced.pendingBuffer.pendingXp, 0);
  assert.equal(synced.roundsPlayed, 1);
});

test('tamper detection catches modified local XP or batch cap violations and resets delta', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-cheat', 'Cheater', 'anonymous', t0);
  state = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: t0 + 10_000,
  }).state;

  // Manual tamper on verifiedRewardXp without matching hash
  const tampered = { ...state, verifiedRewardXp: 999999 };
  const check = verifyBufferIntegrity(tampered, t0 + 10_000);
  assert.equal(check.valid, false);
  assert.match(check.suspiciousReason || '', /Integrity hash mismatch/);

  const flagged = resetUnverifiedDeltaAndFlag(tampered, check.suspiciousReason || 'Tampered');
  assert.equal(flagged.suspiciousActivity, true);
  assert.equal(flagged.pendingBuffer.pendingXp, 0);
  assert.equal(flagged.pendingBuffer.rounds.length, 0);

  // Subsequent rounds blocked once flagged
  const blocked = recordVerifiedOnlineRound(flagged, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: true,
    nowMs: t0 + 25_000,
  });
  assert.equal(blocked.eligibleForVerifiedReward, false);
  assert.equal(blocked.blockedReason, 'suspicious_flagged');
});

test('batch cap (1,500 XP) and 24-hour cap (15,000 XP) prevent over-accumulation', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-cap', 'Grinder', 'google', t0);
  state.pendingBuffer.pendingXp = MAX_XP_PER_BATCH;

  const batchBlocked = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: t0 + 10_000,
  });
  assert.equal(batchBlocked.blockedReason, 'batch_cap_reached');

  state = createDefaultVerifiedRewardState('uid-cap2', 'Grinder2', 'google', t0);
  state.dailyVerifiedXp = MAX_XP_PER_24H;
  const dailyBlocked = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: t0 + 10_000,
  });
  assert.equal(dailyBlocked.blockedReason, 'daily_cap_reached');
});

test('single-doc leaderboard 30-minute cache TTL and top 25 ranking merge', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  const weekKey = getUtcWeekKey(t0);
  const cache = {
    weekKey,
    updatedAtMs: t0,
    fetchedAtMs: t0,
    prizePoolLabel: 'Weekly #1 Champion: ₦5,000 / ₦10,000 Pool',
    topEntries: [],
  };
  assert.equal(isLeaderboardCacheFresh(cache, t0 + LEADERBOARD_CACHE_TTL_MS - 1000), true);
  assert.equal(isLeaderboardCacheFresh(cache, t0 + LEADERBOARD_CACHE_TTL_MS + 1000), false);

  const merged = mergePlayerIntoLeaderboardTop(
    [
      {
        uid: 'u1',
        name: 'Top1',
        weeklyRewardXp: 900,
        verifiedRewardXp: 900,
        puzzlesSolved: 10,
        triviaCorrect: 12,
        streak: 4,
        weekKey,
      },
    ],
    {
      uid: 'u2',
      name: 'Challenger',
      weeklyRewardXp: 1200,
      verifiedRewardXp: 1200,
      puzzlesSolved: 15,
      triviaCorrect: 20,
      streak: 7,
      weekKey,
    },
    weekKey
  );
  assert.equal(merged[0].uid, 'u2');
  assert.equal(merged[1].uid, 'u1');
});

test('600,000 Verified XP milestone claim validation & pre-filled WhatsApp / Email URLs', () => {
  const underBalance = validateRewardClaimInput(
    { fullName: 'Adaeze Obi', bankName: 'GTBank', accountNumber: '0123456789' },
    REWARD_MILESTONE_XP - 1,
    false
  );
  assert.equal(underBalance.valid, false);

  const badAccount = validateRewardClaimInput(
    { fullName: 'Adaeze Obi', bankName: 'GTBank', accountNumber: '12345' },
    REWARD_MILESTONE_XP,
    false
  );
  assert.equal(badAccount.valid, false);

  const suspiciousUser = validateRewardClaimInput(
    { fullName: 'Adaeze Obi', bankName: 'GTBank', accountNumber: '0123456789' },
    REWARD_MILESTONE_XP + 5000,
    true
  );
  assert.equal(suspiciousUser.valid, false);

  const validClaim = validateRewardClaimInput(
    { fullName: 'Adaeze Obi', bankName: 'Access Bank', accountNumber: '0123456789' },
    REWARD_MILESTONE_XP,
    false
  );
  assert.equal(validClaim.valid, true);

  const waUrl = buildWhatsAppClaimUrl({
    claimId: 'claim_123',
    claimCode: 'WV-261126-ABCDEF',
    uid: 'uid-ada',
    fullName: 'Adaeze Obi',
    bankName: 'Access Bank',
    accountNumber: '0123456789',
    verifiedXpAtClaim: REWARD_MILESTONE_XP,
    roundsPlayed: 16000,
  });
  assert.ok(waUrl.startsWith(`https://wa.me/${CLAIM_WHATSAPP_NUMBER}?text=`));
  assert.match(decodeURIComponent(waUrl), /WV-261126-ABCDEF/);

  const mailUrl = buildEmailClaimUrl({
    claimId: 'claim_123',
    claimCode: 'WV-261126-ABCDEF',
    uid: 'uid-ada',
    fullName: 'Adaeze Obi',
    bankName: 'Access Bank',
    accountNumber: '0123456789',
    verifiedXpAtClaim: REWARD_MILESTONE_XP,
    roundsPlayed: 16000,
  });
  assert.ok(mailUrl.startsWith(`mailto:${CLAIM_EMAIL_ADDRESS}?`));
  assert.match(decodeURIComponent(mailUrl), /claim_123/);
});

test('applySuccessfulBatchSync aligns dailyWindowStartMs and batch totals on initial remote doc creation', () => {
  const t0 = Date.UTC(2026, 10, 26, 10, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-new', 'Nova', 'anonymous', t0);
  // Simulate 5 minutes passing before completing a round and syncing for the first time
  const roundTime = t0 + 5 * 60_000;
  const roundRes = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: roundTime,
  });
  assert.equal(roundRes.eligibleForVerifiedReward, true);
  state = roundRes.state;

  const syncTime = roundTime + 90_000;
  const created = applySuccessfulBatchSync(state, syncTime, true);
  assert.equal(created.dailyWindowStartMs, syncTime);
  assert.equal(created.verifiedRewardXp, roundRes.xpQueued);
  assert.equal(created.weeklyRewardXp, roundRes.xpQueued);
  assert.equal(created.dailyVerifiedXp, roundRes.xpQueued);
  assert.equal(created.roundsPlayed, 1);
});

test('buildUserSyncState produces integer xp/dailyXp/weeklyXp capped at 1500 per sync and aligned with remote xp', () => {
  const t0 = Date.UTC(2026, 10, 26, 10, 0, 0);
  let state = createDefaultVerifiedRewardState('uid-sync', 'Tunde', 'anonymous', t0);
  const roundRes = recordVerifiedOnlineRound(state, {
    isOnline: true,
    isSignedIn: true,
    mode: 'puzzle',
    won: true,
    nowMs: t0 + 10_000,
  });
  state = roundRes.state;

  // 1. Initial remote create
  const createSync = buildUserSyncState({
    localState: state,
    remoteData: null,
    nowMs: t0 + 15_000,
  });
  assert.equal(createSync.isRemoteCreate, true);
  assert.equal(createSync.xp, roundRes.xpQueued);
  assert.equal(createSync.dailyXp, roundRes.xpQueued);
  assert.equal(createSync.weeklyXp, roundRes.xpQueued);
  assert.ok(Number.isInteger(createSync.xp));
  assert.ok(createSync.xp <= MAX_XP_PER_BATCH);

  // 2. Subsequent update against existing remote doc with xp=400
  const nextRound = recordVerifiedOnlineRound(createSync.nextState, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: true,
    nowMs: t0 + SYNC_COOLDOWN_MS + 30_000,
  });
  const updateSync = buildUserSyncState({
    localState: nextRound.state,
    remoteData: {
      xp: 400.7,
      dailyXp: 120,
      weeklyXp: 400,
      weekKey: getUtcWeekKey(t0),
      dailyWindowStartMs: t0,
    },
    nowMs: t0 + SYNC_COOLDOWN_MS + 35_000,
  });
  assert.equal(updateSync.isRemoteCreate, false);
  assert.equal(updateSync.xp, 400 + nextRound.xpQueued);
  assert.equal(updateSync.dailyXp, 120 + nextRound.xpQueued);
  assert.equal(updateSync.weeklyXp, 400 + nextRound.xpQueued);
  assert.ok(Number.isInteger(updateSync.xp));
  assert.ok(updateSync.deltaXp <= MAX_XP_PER_BATCH);

  // 3. Extract snapshot handles stale daily window rollover
  const rolled = extractRemoteUserXpSnapshot(
    { xp: 500, dailyXp: 300, weeklyXp: 500, dailyWindowStartMs: t0 },
    t0 + 25 * 60 * 60 * 1000
  );
  assert.equal(rolled.xp, 500);
  assert.equal(rolled.dailyXp, 0);
});

test('reconcileVerifiedStateUid binds authenticated uid while preserving hash integrity and isolating distinct accounts', () => {
  const t0 = Date.UTC(2026, 10, 26, 12, 0, 0);
  const anon = createDefaultVerifiedRewardState(null, 'Player', 'anonymous', t0);
  const bound = reconcileVerifiedStateUid(anon, 'uid-guest-1', 'Tolu_W', 'anonymous');
  assert.equal(bound.uid, 'uid-guest-1');
  assert.equal(bound.pendingBuffer.uid, 'uid-guest-1');
  assert.equal(bound.displayName, 'Tolu_W');
  assert.equal(verifyBufferIntegrity(bound, t0 + 10_000).valid, true);

  // Earning XP under uid-guest-1 and switching to uid-user-2 resets state cleanly for uid-user-2
  const withRound = recordVerifiedOnlineRound(bound, {
    isOnline: true,
    isSignedIn: true,
    mode: 'trivia',
    won: true,
    nowMs: t0 + 10_000,
  }).state;
  assert.ok(withRound.pendingBuffer.pendingXp > 0);

  const switched = reconcileVerifiedStateUid(withRound, 'uid-user-2', 'RealUser', 'email');
  assert.equal(switched.uid, 'uid-user-2');
  assert.equal(switched.pendingBuffer.pendingXp, 0);
  assert.equal(switched.verifiedRewardXp, 0);
  assert.equal(verifyBufferIntegrity(switched, t0 + 20_000).valid, true);
});
