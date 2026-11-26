import test from 'node:test';
import assert from 'node:assert/strict';
import {
  XP_COSTS,
  canAffordXp,
  formatNotEnoughXpMessage,
  getDynamicRatingAfterSpend,
  getSpendableXpBalance,
  spendPlayerXp,
} from './xpEconomyLogic';
import { createFreshWeeklyState, getUtcWeekKey } from './weeklyLogic';
import {
  consumeCategoryPlay,
  getCategoryRemainingPlays,
  isCategoryAccessible,
} from './puzzleLogic';
import { isTriviaCategoryUnlocked } from './triviaLogic';
import type { PuzzleCategory } from '../data/categories';

const SAMPLE_PREMIUM_CATEGORY: PuzzleCategory = {
  id: 'bible-wisdom',
  name: 'Bible Wisdom',
  group: 'Mystery & Lore',
  tagline: 'Scripture words',
  isPremium: true,
  popularityScore: 90,
  words4: ['AMEN'],
  words5: ['GRACE'],
  words6: ['PRAYER'],
};

const SAMPLE_FREE_CATEGORY: PuzzleCategory = {
  id: 'general-classic',
  name: 'Classic Mix',
  group: 'Entertainment',
  tagline: 'Everyday words',
  isPremium: false,
  popularityScore: 100,
  words4: ['WORD'],
  words5: ['SPARK'],
  words6: ['PUZZLE'],
};

test('XP_COSTS match exact requested currency prices', () => {
  assert.equal(XP_COSTS.PUZZLE_CLUE, 300);
  assert.equal(XP_COSTS.PUZZLE_HINT, 300);
  assert.equal(XP_COSTS.PUZZLE_CATEGORY_UNLOCK, 300);
  assert.equal(XP_COSTS.TRIVIA_SOLVE, 500);
  assert.equal(XP_COSTS.TRIVIA_MASTERMIND_UNLOCK, 200);
});

test('canAffordXp and formatNotEnoughXpMessage enforce exact thresholds', () => {
  assert.equal(canAffordXp(0, 300), false);
  assert.equal(canAffordXp(299, 300), false);
  assert.equal(canAffordXp(300, 300), true);
  assert.equal(canAffordXp(550, 500), true);
  assert.equal(formatNotEnoughXpMessage(300), 'Not enough XP — need 300 XP');
  assert.equal(formatNotEnoughXpMessage(500), 'Not enough XP — need 500 XP');
});

test('spendPlayerXp deducts XP from weeklyXp and totalXp dynamically and updates rating tier', () => {
  const weekKey = getUtcWeekKey(Date.now());
  const baseState = {
    ...createFreshWeeklyState(weekKey),
    weeklyXp: 1600,
    totalXp: 2400,
  };

  assert.equal(getSpendableXpBalance(baseState), 1600);
  const initialRating = getDynamicRatingAfterSpend(baseState);
  assert.equal(initialRating.current.id, 'A');

  const spend1 = spendPlayerXp(baseState, XP_COSTS.PUZZLE_CLUE);
  assert.equal(spend1.success, true);
  assert.equal(spend1.spent, 300);
  assert.equal(spend1.remainingXp, 1300);
  assert.equal(spend1.state.weeklyXp, 1300);
  assert.equal(spend1.state.totalXp, 2100);
  assert.equal(getDynamicRatingAfterSpend(spend1.state).current.id, 'B');

  const spend2 = spendPlayerXp(spend1.state, XP_COSTS.TRIVIA_SOLVE);
  assert.equal(spend2.success, true);
  assert.equal(spend2.remainingXp, 800);
  assert.equal(getDynamicRatingAfterSpend(spend2.state).current.id, 'B');

  const spend3 = spendPlayerXp(spend2.state, XP_COSTS.TRIVIA_MASTERMIND_UNLOCK);
  assert.equal(spend3.success, true);
  assert.equal(spend3.remainingXp, 600);
  assert.equal(getDynamicRatingAfterSpend(spend3.state).current.id, 'C');
});

test('spendPlayerXp prevents negative XP balances and returns error message', () => {
  const weekKey = getUtcWeekKey(Date.now());
  const lowState = {
    ...createFreshWeeklyState(weekKey),
    weeklyXp: 250,
    totalXp: 250,
  };

  const failPuzzle = spendPlayerXp(lowState, XP_COSTS.PUZZLE_HINT);
  assert.equal(failPuzzle.success, false);
  assert.equal(failPuzzle.spent, 0);
  assert.equal(failPuzzle.remainingXp, 250);
  assert.equal(failPuzzle.state.weeklyXp, 250);
  assert.equal(failPuzzle.errorMessage, 'Not enough XP — need 300 XP');

  const exactMastermind = spendPlayerXp(lowState, XP_COSTS.TRIVIA_MASTERMIND_UNLOCK);
  assert.equal(exactMastermind.success, true);
  assert.equal(exactMastermind.remainingXp, 50);

  const failSolve = spendPlayerXp(exactMastermind.state, XP_COSTS.TRIVIA_SOLVE);
  assert.equal(failSolve.success, false);
  assert.equal(failSolve.remainingXp, 50);
  assert.equal(failSolve.errorMessage, 'Not enough XP — need 500 XP');
});

test('Puzzle permanent category unlock grants unlimited access while preserving legacy play counts', () => {
  const playsRemaining: Record<string, number> = { 'bible-wisdom': 0 };
  assert.equal(isCategoryAccessible(SAMPLE_FREE_CATEGORY, playsRemaining), true);
  assert.equal(isCategoryAccessible(SAMPLE_PREMIUM_CATEGORY, playsRemaining), false);
  assert.equal(getCategoryRemainingPlays(SAMPLE_PREMIUM_CATEGORY, playsRemaining), 0);

  const permanent = ['bible-wisdom'];
  assert.equal(isCategoryAccessible(SAMPLE_PREMIUM_CATEGORY, playsRemaining, permanent), true);
  assert.equal(getCategoryRemainingPlays(SAMPLE_PREMIUM_CATEGORY, playsRemaining, permanent), Infinity);

  const afterConsume = consumeCategoryPlay(SAMPLE_PREMIUM_CATEGORY, { 'bible-wisdom': 3 }, permanent);
  assert.equal(afterConsume['bible-wisdom'], 3);
});

test('Trivia Mastermind permanent unlock bypasses 24h ad expiry lock', () => {
  const emptyExpiry: Record<string, number> = {};
  const nowMs = Date.now();
  assert.equal(isTriviaCategoryUnlocked('general-knowledge', emptyExpiry, nowMs, false), true);
  assert.equal(isTriviaCategoryUnlocked('mastermind-vault', emptyExpiry, nowMs, false), false);
  assert.equal(isTriviaCategoryUnlocked('mastermind-vault', emptyExpiry, nowMs, true), true);
});
