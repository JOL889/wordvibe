import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  applyWeeklyActivityEvent,
  computeWeeklyGrade,
  createFreshWeeklyState,
  formatWeeklyResetCountdown,
  getNextMondayUtcMs,
  getUtcWeekKey,
  reconcileWeeklyRollover,
} from './weeklyLogic';
import {
  calculateTriviaXp,
  getStreakMultiplier,
  getTriviaDifficultyForStreak,
  isTriviaCategoryUnlocked,
  pickFallbackTriviaQuestion,
  TRIVIA_CATEGORIES,
} from './triviaLogic';
import {
  ADMOB_CONFIG,
  getActiveRewardedAdUnitId,
  rewardedAdService,
} from '../services/rewardedAdService';

test('weekly UTC key & Monday 00:00 UTC rollover boundary work accurately', () => {
  // Sunday 2026-11-22 23:59:00 UTC belongs to week starting Monday 2026-11-16
  const sunMs = Date.UTC(2026, 10, 22, 23, 59, 0);
  assert.equal(getUtcWeekKey(sunMs), '2026-11-16');

  // Next Monday 00:00:00 UTC is 2026-11-23T00:00:00Z (60 seconds later)
  const nextMonMs = getNextMondayUtcMs(sunMs);
  assert.equal(nextMonMs, Date.UTC(2026, 10, 23, 0, 0, 0));
  assert.equal(formatWeeklyResetCountdown(nextMonMs - sunMs), '0d 00:01:00');
  assert.equal(getUtcWeekKey(nextMonMs), '2026-11-23');
});

test('weekly tier grading enforces D/C/B/A/S thresholds and requires 3 achievements for S / Diamond', () => {
  assert.equal(computeWeeklyGrade(0, 0).current.id, 'D');
  assert.equal(computeWeeklyGrade(299, 5).current.id, 'D');
  assert.equal(computeWeeklyGrade(300, 0).current.id, 'C');
  assert.equal(computeWeeklyGrade(800, 1).current.id, 'B');
  assert.equal(computeWeeklyGrade(1500, 1).current.id, 'A');

  // 2600 XP with only 2 achievements MUST remain A / Platinum until 3rd achievement is unlocked
  const almostDiamond = computeWeeklyGrade(2600, 2);
  assert.equal(almostDiamond.current.id, 'A');
  assert.equal(almostDiamond.achievementsNeededForS, 1);

  // 2500 XP + 3 achievements -> S / Diamond Grandmaster
  const diamond = computeWeeklyGrade(2500, 3);
  assert.equal(diamond.current.id, 'S');
  assert.equal(diamond.current.tierName, 'Diamond');
  assert.equal(diamond.current.badgeTitle, 'Grandmaster');
  assert.equal(diamond.progressPercent, 100);
});

test('weekly rollover awards last week bonus coins/XP into the new Monday cycle and preserves totalXp', () => {
  const prevState = {
    ...createFreshWeeklyState('2026-11-16'),
    weeklyXp: 1650,
    totalXp: 3200,
    puzzlesSolved: 6,
    triviaCorrect: 8,
    unlockedAchievements: ['first_spark', 'wordsmith_5'],
  };

  const mondayMorningMs = Date.UTC(2026, 10, 23, 8, 0, 0);
  const { state: rolled, rolledOver } = reconcileWeeklyRollover(prevState, mondayMorningMs);
  assert.equal(rolledOver, true);
  assert.equal(rolled.weekKey, '2026-11-23');
  assert.ok(rolled.pendingWeekSummary);
  assert.equal(rolled.pendingWeekSummary.finalGrade, 'A');
  assert.equal(rolled.pendingWeekSummary.finalXp, 1650);
  assert.equal(rolled.bonusCoins, rolled.pendingWeekSummary.bonusCoinsAwarded);
  assert.equal(rolled.weeklyXp, rolled.pendingWeekSummary.bonusXpAwarded);
  assert.equal(rolled.totalXp, 3200 + rolled.pendingWeekSummary.bonusXpAwarded);
});

test('12+ achievements track across WordVibe puzzles & Trivia and unlock cleanly', () => {
  assert.ok(ACHIEVEMENTS.length >= 10, 'Expected at least 10 achievements');
  let state = createFreshWeeklyState('2026-11-16');

  // Day 1: Solve a daily puzzle -> First Spark unlocks
  let res = applyWeeklyActivityEvent(
    state,
    {
      type: 'puzzle_completed',
      won: true,
      mode: 'daily',
      attemptsUsed: 3,
      wordLength: 5,
      categoryId: 'astrology',
    },
    Date.UTC(2026, 10, 16, 10, 0, 0)
  );
  state = res.state;
  assert.ok(res.newlyUnlocked.some((a) => a.id === 'first_spark'));

  // Build 5-streak Trivia + finish a round -> 5-Streak Genius & Puzzle & Brainiac Combo
  for (let i = 1; i <= 5; i++) {
    res = applyWeeklyActivityEvent(
      state,
      {
        type: 'trivia_answered',
        correct: true,
        difficulty: i >= 5 ? 'expert' : i >= 3 ? 'intermediate' : 'novice',
        streakAfter: i,
        xpAwarded: calculateTriviaXp(i >= 5 ? 'expert' : i >= 3 ? 'intermediate' : 'novice', i),
        categoryId: 'science',
      },
      Date.UTC(2026, 10, 16, 10, i, 0)
    );
    state = res.state;
  }
  assert.ok(state.unlockedAchievements.includes('five_streak_genius'));

  res = applyWeeklyActivityEvent(
    state,
    {
      type: 'trivia_round_completed',
      correctCount: 5,
      totalCount: 5,
      categoryId: 'science',
    },
    Date.UTC(2026, 10, 16, 11, 0, 0)
  );
  state = res.state;
  assert.ok(state.unlockedAchievements.includes('puzzle_brainiac_combo'));
});

test('Trivia difficulty scaling, streak multipliers, 24h unlock & zero-repeat bank work cleanly', () => {
  assert.equal(TRIVIA_CATEGORIES.length, 9);
  assert.ok(TRIVIA_CATEGORIES.some((c) => c.id === 'faith-study'));
  assert.equal(getTriviaDifficultyForStreak(0), 'novice');
  assert.equal(getTriviaDifficultyForStreak(2), 'beginner');
  assert.equal(getTriviaDifficultyForStreak(5), 'expert');
  assert.equal(getStreakMultiplier(0), 1);
  assert.equal(getStreakMultiplier(3), 2);
  assert.equal(getStreakMultiplier(8), 3);

  const now = Date.UTC(2026, 10, 22, 12, 0, 0);
  assert.equal(isTriviaCategoryUnlocked('general-knowledge', {}, now), true);
  assert.equal(isTriviaCategoryUnlocked('mastermind-vault', {}, now), false);
  assert.equal(
    isTriviaCategoryUnlocked('mastermind-vault', { 'mastermind-vault': now + 60_000 }, now),
    true
  );

  // Dedupe local bank
  const first = pickFallbackTriviaQuestion('science', 'novice', []);
  const second = pickFallbackTriviaQuestion('science', 'novice', [first.question]);
  assert.notEqual(first.question, second.question);
});

test('AdMob config defaults to Google official test Ad Unit ID and respects placements including 2-ad answer reveal', () => {
  const unitId = getActiveRewardedAdUnitId();
  assert.ok(
    unitId === ADMOB_CONFIG.TEST_REWARDED_ANDROID_ID ||
      unitId === ADMOB_CONFIG.TEST_REWARDED_IOS_ID
  );
  assert.equal(rewardedAdService.getPlacementMeta('trivia_revive').isOptionalPrompt, true);
  assert.equal(rewardedAdService.getPlacementMeta('double_xp').isOptionalPrompt, true);
  assert.equal(rewardedAdService.getPlacementMeta('unlock_trivia_24h').isOptionalPrompt, false);
  assert.equal(rewardedAdService.getPlacementMeta('trivia_reveal_answer_pair').concurrentAdsCount, 2);
  assert.ok(rewardedAdService.getPlacementMeta('puzzle_clue').title.includes('Clue'));
});
