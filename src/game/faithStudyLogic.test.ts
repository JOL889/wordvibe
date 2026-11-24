import test from 'node:test';
import assert from 'node:assert/strict';
import { VALID_WORDS } from '../data/words';
import {
  FAITH_TRADITIONS,
  RELIGION_IDS,
  getDailyFaithPassage,
  getFaithTriviaQuestions,
  pickFaithPuzzleWord,
} from './faithStudyLogic';

test('all 6 faith traditions have valid passages, dictionary-verified words, and 5-question trivia rounds', () => {
  assert.equal(RELIGION_IDS.length, 6);

  for (const id of RELIGION_IDS) {
    const profile = FAITH_TRADITIONS[id];
    assert.ok(profile.passages.length >= 3, `${id} should have >=3 daily passages`);
    assert.ok(profile.words.length >= 8, `${id} should have >=8 puzzle words`);
    assert.ok(profile.trivia.length >= 5, `${id} should have >=5 trivia questions`);

    for (const entry of profile.words) {
      assert.equal(entry.word.length, entry.length);
      assert.ok(
        VALID_WORDS[entry.length].has(entry.word),
        `Faith word ${entry.word} (${entry.length}L) in ${id} must exist in VALID_WORDS`
      );
      assert.ok(entry.clue.length >= 12);
      assert.ok(entry.funFact.length >= 12);
    }

    const passageA = getDailyFaithPassage(id, '2026-11-24');
    const passageB = getDailyFaithPassage(id, '2026-11-24');
    assert.equal(passageA.id, passageB.id);

    const puzzle5 = pickFaithPuzzleWord(id, 5, '2026-11-24');
    assert.equal(puzzle5.length, 5);
    assert.ok(VALID_WORDS[5].has(puzzle5.word));

    const round = getFaithTriviaQuestions(id, 5);
    assert.equal(round.length, 5);
    for (const q of round) {
      assert.equal(q.options.length, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3);
      assert.ok(q.funFact && q.funFact.length > 10);
    }
  }
});
