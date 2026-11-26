import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySuccessfulBatchSync,
  buildEmailClaimUrl,
  buildWhatsAppClaimUrl,
  calculateVerifiedRoundXp,
  CLAIM_EMAIL_ADDRESS,
  CLAIM_WHATSAPP_NUMBER,
  createDefaultVerifiedRewardState,
  getSyncCooldownRemainingMs,
  isLeaderboardCacheFresh,
  LEADERBOARD_CACHE_TTL_MS,
  MAX_XP_PER_24H,
  MAX_XP_PER_BATCH,
  mergePlayerIntoLeaderboardTop,
  recordVerifiedOnlineRound,
  resetUnverifiedDeltaAndFlag,
  REWARD_MILESTONE_XP,
  shouldAutoFlushBatch,
  STANDARD_ROUND_XP_MAX,
  STANDARD_ROUND_XP_MIN,
  SYNC_COOLDOWN_MS,
  validateRewardClaimInput,
  verifyBufferIntegrity,
} from './verifiedRewardsLogic';
import { getUtcWeekKey } from './weeklyLogic';

test('calculateVerifiedRoundXp stays strictly between 25 and 40 XP', () => {
  const low = calculateVerifiedRoundXp({ mode: 'faith', won: false });
  const mid = calculateVerifiedRoundXp({ mode: 'trivia', won: true, accuracyRatio: 0.6, difficultyWeight: 0.5 });
  const high = calculateVerifiedRoundXp({ mode: 'puzzle', won: true, accuracyRatio: 1, difficultyWeight: 1 });
  assert.equal(low, STANDARD_ROUND_XP_MIN);
  assert.ok(mid >= STANDARD_ROUND_XP_MIN && mid <= STANDARD_ROUND_XP_MAX);
  assert.ok(high >= STANDARD_ROUND_XP_MIN && high <= STANDARD_ROUND_XP_MAX);
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
  assert.ok(r1.xpQueued >= 25 && r1.xpQueued <= 40);
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
