import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildXpLeaderboard,
  getPlayerLeaderboardSummary,
  getWeekElapsedProgress,
} from './leaderboardLogic';

test('buildXpLeaderboard orders players descending by XP and assigns ranks 1..N', () => {
  const weekly = buildXpLeaderboard({
    playerId: 'u-1',
    playerName: 'Tester',
    playerWeeklyXp: 1950,
    playerTotalXp: 4000,
    playerPuzzlesSolved: 15,
    playerTriviaCorrect: 30,
    playerStreak: 6,
    scope: 'weekly',
  });

  assert.equal(weekly.length, 64);
  for (let i = 0; i < weekly.length - 1; i++) {
    assert.equal(weekly[i].rank, i + 1);
    assert.ok(weekly[i].weeklyXp >= weekly[i + 1].weeklyXp);
  }
  const me = weekly.find((e) => e.isCurrentUser);
  assert.ok(me);
  assert.equal(me.name, 'Tester');
  assert.equal(me.weeklyXp, 1950);
  assert.ok(!weekly.some((e) => e.isActiveThisWeek === false));
});

test('getPlayerLeaderboardSummary calculates rank, rival above, XP gap, and merges remote entries', () => {
  const summary = getPlayerLeaderboardSummary({
    playerId: 'local-me',
    playerName: 'Champion',
    playerWeeklyXp: 2500,
    playerTotalXp: 50000,
    playerPuzzlesSolved: 40,
    playerTriviaCorrect: 90,
    playerStreak: 12,
    scope: 'all_time',
    remoteEntries: [
      {
        id: 'user:guest-99',
        name: 'GlobalAce',
        weeklyXp: 5100,
        totalXp: 60000,
        puzzlesSolved: 80,
        triviaCorrect: 150,
        streak: 25,
      },
    ],
  });

  assert.equal(summary.rank, 2);
  assert.equal(summary.topEntryName, 'GlobalAce');
  assert.equal(summary.nextRivalName, 'GlobalAce');
  assert.equal(summary.xpToOvertake, 10001);
  assert.equal(summary.activeThisWeekCount, 65);
});

test('weekly leaderboard scales contender XP from Monday through Sunday and excludes non-current-week players', () => {
  const mondayMs = Date.UTC(2026, 10, 23, 2, 0, 0); // Mon Nov 23 2026
  const thursdayMs = Date.UTC(2026, 10, 26, 12, 0, 0); // Thu Nov 26 2026
  const sundayMs = Date.UTC(2026, 10, 29, 22, 0, 0); // Sun Nov 29 2026

  assert.ok(getWeekElapsedProgress(mondayMs) < getWeekElapsedProgress(thursdayMs));
  assert.ok(getWeekElapsedProgress(thursdayMs) < getWeekElapsedProgress(sundayMs));

  const monSummary = getPlayerLeaderboardSummary({
    playerId: 'me',
    playerName: 'MidPlayer',
    playerWeeklyXp: 600,
    playerTotalXp: 600,
    playerPuzzlesSolved: 4,
    playerTriviaCorrect: 10,
    playerStreak: 3,
    scope: 'weekly',
    nowMs: mondayMs,
    remoteEntries: [
      {
        id: 'old-week-user',
        name: 'StaleWeekUser',
        weeklyXp: 9999,
        totalXp: 9999,
        puzzlesSolved: 20,
        triviaCorrect: 30,
        streak: 5,
        weekKey: '2026-11-16',
      },
    ],
  });

  const sunSummary = getPlayerLeaderboardSummary({
    playerId: 'me',
    playerName: 'MidPlayer',
    playerWeeklyXp: 600,
    playerTotalXp: 600,
    playerPuzzlesSolved: 4,
    playerTriviaCorrect: 10,
    playerStreak: 3,
    scope: 'weekly',
    nowMs: sundayMs,
  });

  assert.equal(monSummary.activeThisWeekCount, 64);
  assert.ok(!monSummary.entries.some((e) => e.id === 'old-week-user'));
  assert.ok(sunSummary.topEntryXp > monSummary.topEntryXp);
  assert.ok(sunSummary.rank > monSummary.rank);
});
