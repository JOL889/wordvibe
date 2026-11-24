import test from 'node:test';
import assert from 'node:assert/strict';
import { VALID_WORDS } from '../data/words';
import {
  createDefaultPlayerProfile,
  formatLocationLabel,
  guessLocationFromTimezone,
  pickFallbackPersonalizedPuzzle,
  recordPuzzleStudySignal,
  recordTriviaStudySignal,
  summarizePlayerProfile,
} from './playerProfileLogic';
import { pickFallbackTriviaQuestion } from './triviaLogic';

test('guessLocationFromTimezone resolves known and unknown timezones cleanly', () => {
  const london = guessLocationFromTimezone('Europe/London');
  assert.equal(london.city, 'London');
  assert.equal(london.countryCode, 'GB');
  assert.equal(formatLocationLabel(london), 'London, GB');

  const custom = guessLocationFromTimezone('Europe/Amsterdam');
  assert.equal(custom.city, 'Amsterdam');
  assert.equal(custom.countryCode, 'GB');
});

test('player profile study signals adapt insights, difficulty, and preferred board length', () => {
  let profile = createDefaultPlayerProfile();
  profile.locationEnabled = true;
  profile.location = guessLocationFromTimezone('America/Toronto');
  profile.selectedInterests = ['science-tech', 'food-lifestyle'];

  // Play 6-letter boards and answer trivia accurately
  profile = recordPuzzleStudySignal(profile, {
    categoryId: 'ai-future-tech',
    won: true,
    guessesUsed: 3,
    length: 6,
  });
  profile = recordPuzzleStudySignal(profile, {
    categoryId: 'ai-future-tech',
    won: true,
    guessesUsed: 4,
    length: 6,
  });

  for (let i = 0; i < 6; i++) {
    profile = recordTriviaStudySignal(profile, {
      categoryId: 'for-you-local',
      correct: true,
    });
  }

  const insights = summarizePlayerProfile(profile);
  assert.equal(insights.favoriteLength, 6);
  assert.equal(insights.puzzleWinRate, 100);
  assert.equal(insights.avgGuesses, 3.5);
  assert.equal(insights.triviaAccuracy, 100);
  assert.equal(insights.recommendedDifficulty, 'expert');
  assert.ok(insights.promptSummary.includes('Toronto, CA'));
  assert.ok(insights.promptSummary.includes('Science & Tech'));
});

test('pickFallbackPersonalizedPuzzle picks valid dictionary word matching interests and avoids exclusions', () => {
  const loc = guessLocationFromTimezone('Europe/London');
  const first = pickFallbackPersonalizedPuzzle({
    length: 5,
    interests: ['astrology-mystic', 'science-tech'],
    location: loc,
    trendingHeadlines: ['London hosts global technology & space symposium'],
  });

  assert.equal(first.target.length, 5);
  assert.ok(VALID_WORDS[5].has(first.target), `${first.target} must exist in VALID_WORDS[5]`);
  assert.ok(first.clue.length > 10);
  assert.ok(first.trendReason.includes('London, GB'));

  const second = pickFallbackPersonalizedPuzzle({
    length: 5,
    interests: ['astrology-mystic', 'science-tech'],
    location: loc,
    excludeWords: [first.target],
  });
  assert.notEqual(second.target, first.target);
  assert.ok(VALID_WORDS[5].has(second.target));
});

test('pickFallbackTriviaQuestion attaches location & interest personalization reason', () => {
  const q = pickFallbackTriviaQuestion('for-you-local', 'medium', [], {
    locationLabel: 'Lagos, NG',
    interests: ['Music & Pop Culture'],
  });
  assert.ok(q.question.length > 10);
  assert.ok(q.personalizationReason?.includes('Lagos, NG'));
});
