import test from 'node:test';
import assert from 'node:assert/strict';
import { VALID_WORDS } from '../data/words';
import {
  createCrosswordBoard,
  formatActiveWordLetterStats,
  unlockCrosswordLineClue,
} from './crosswordLogic';
import {
  drawZeroRepeatFaithQuestion,
  getFaithTradition,
  pickFaithPuzzleWord,
  RELIGION_IDS,
} from './faithStudyLogic';
import {
  clearModeRetirementForTest,
  getRedemptionQueue,
  getRetiredIds,
  getRetiredIdSet,
  recordModeOutcome,
  selectComebackCandidate,
  shuffleQuestionOptions,
} from './retirementQueueLogic';
import { CURATED_TRIVIA_BANK } from './triviaBank';
import { drawZeroRepeatTriviaQuestion, type TriviaQuestion } from './triviaLogic';
import { validateWordSquare } from './wordSquareLogic';

function resetAllModes() {
  clearModeRetirementForTest('trivia');
  clearModeRetirementForTest('faith');
  clearModeRetirementForTest('puzzle');
}

test('Separate retiredIds and redemptionQueue are maintained per mode', () => {
  resetAllModes();

  recordModeOutcome('trivia', 'tr-1', true);
  recordModeOutcome('faith', 'fa-1', false);
  recordModeOutcome('puzzle', 'puzzle:5:CRANE', true);

  assert.deepEqual(getRetiredIds('trivia'), ['tr-1']);
  assert.deepEqual(getRetiredIds('faith'), []);
  assert.deepEqual(getRetiredIds('puzzle'), ['puzzle:5:CRANE']);

  assert.equal(getRedemptionQueue('trivia').length, 0);
  assert.equal(getRedemptionQueue('faith').length, 1);
  assert.equal(getRedemptionQueue('faith')[0].id, 'fa-1');
  assert.equal(getRedemptionQueue('puzzle').length, 0);

  resetAllModes();
});

test('Smart comeback waits 15-25 rounds, spaces every 8-10 rounds, shuffles options, and handles 2nd & 3rd miss rules', () => {
  resetAllModes();

  const sampleQ: TriviaQuestion = {
    id: 'test-comeback-q1',
    question: 'Which planet has the prominent Great Red Spot storm?',
    options: ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
    correctIndex: 1,
    explanation: 'Jupiter hosts the giant anticyclonic storm.',
    category: 'Science',
    difficulty: 'novice',
  };

  // Miss #1 -> queued with wrongCount=1, itemsPlayedSince=0, minRoundsWait in 15..25
  const fail1 = recordModeOutcome('trivia', sampleQ.id!, false, {
    categoryId: 'science',
    question: sampleQ,
  });
  assert.equal(fail1.retired, false);
  assert.equal(fail1.wrongCount, 1);

  const qAfter1 = getRedemptionQueue('trivia');
  assert.equal(qAfter1.length, 1);
  assert.ok(qAfter1[0].minRoundsWait >= 15 && qAfter1[0].minRoundsWait <= 25);

  // Play 14 more unrelated wins -> still must NOT come back (< 15 rounds)
  for (let i = 0; i < 14; i++) {
    recordModeOutcome('trivia', `filler-${i}`, true);
    assert.equal(selectComebackCandidate('trivia'), null);
  }

  // Play up to 26 total rounds until it becomes eligible (15..25 wait + 8..10 spacing)
  let candidate = selectComebackCandidate('trivia');
  for (let i = 14; i < 28 && !candidate; i++) {
    recordModeOutcome('trivia', `filler-${i}`, true);
    candidate = selectComebackCandidate('trivia');
  }
  assert.ok(candidate, 'Failed item should return after 15-25 rounds wait');
  assert.equal(candidate!.id, sampleQ.id);

  // Shuffled options keep the exact correct answer text synchronized with correctIndex
  const shuffled = shuffleQuestionOptions(sampleQ, 3);
  assert.equal(shuffled.options[shuffled.correctIndex], 'Jupiter');
  assert.deepEqual([...shuffled.options].sort(), [...sampleQ.options].sort());

  // Miss #2 -> stays queued, resets itemsPlayedSince=0, waits >= 30 rounds for final attempt
  const fail2 = recordModeOutcome('trivia', sampleQ.id!, false, {
    categoryId: 'science',
    question: sampleQ,
  });
  assert.equal(fail2.retired, false);
  assert.equal(fail2.wrongCount, 2);
  const qAfter2 = getRedemptionQueue('trivia')[0];
  assert.equal(qAfter2.itemsPlayedSince, 0);
  assert.ok(qAfter2.minRoundsWait >= 30);

  for (let i = 0; i < 29; i++) {
    recordModeOutcome('trivia', `filler-second-${i}`, true);
    assert.equal(selectComebackCandidate('trivia'), null);
  }
  let finalCandidate = selectComebackCandidate('trivia');
  for (let i = 29; i < 42 && !finalCandidate; i++) {
    recordModeOutcome('trivia', `filler-second-${i}`, true);
    finalCandidate = selectComebackCandidate('trivia');
  }
  assert.ok(finalCandidate, '2nd-failed item should return after >= 30 rounds');

  // Miss #3 -> permanently retired & removed from redemptionQueue
  const fail3 = recordModeOutcome('trivia', sampleQ.id!, false);
  assert.equal(fail3.retired, true);
  assert.equal(fail3.wrongCount, 3);
  assert.equal(getRedemptionQueue('trivia').length, 0);
  assert.ok(getRetiredIdSet('trivia').has(sampleQ.id!));

  resetAllModes();
});

test('Trivia Mode displays Redemption flag on comeback whereas Faith Mode presents comeback seamlessly', () => {
  resetAllModes();

  // Seed Trivia comeback candidate and age it beyond max wait (26 rounds)
  const triviaItem = CURATED_TRIVIA_BANK.find((item) => item.categoryId === 'science')!;
  recordModeOutcome('trivia', triviaItem.id, false, {
    categoryId: 'science',
    question: {
      id: triviaItem.id,
      question: triviaItem.question,
      options: triviaItem.options,
      correctIndex: triviaItem.correctIndex,
      explanation: triviaItem.explanation,
      category: triviaItem.categoryLabel,
      difficulty: triviaItem.level,
    },
  });
  for (let i = 0; i < 26; i++) {
    recordModeOutcome('trivia', `tr-age-${i}`, true);
  }
  const drawnTrivia = drawZeroRepeatTriviaQuestion({
    categoryId: 'science',
    levelNumber: 1,
  });
  assert.equal(drawnTrivia.id, triviaItem.id);
  assert.equal(drawnTrivia.isRedemptionRound, true);

  // Answering returning Trivia item right removes it from queue and retires it permanently
  recordModeOutcome('trivia', drawnTrivia.id!, true);
  assert.equal(getRedemptionQueue('trivia').length, 0);
  assert.ok(getRetiredIdSet('trivia').has(triviaItem.id));

  // Seed Faith comeback candidate and age it beyond max wait
  const faithProfile = getFaithTradition('christianity');
  const faithQ = faithProfile.trivia[0];
  const faithId = faithQ.id || 'faith-inline:christianity:0';
  recordModeOutcome('faith', faithId, false, {
    religion: 'christianity',
    question: faithQ,
  });
  for (let i = 0; i < 26; i++) {
    recordModeOutcome('faith', `fa-age-${i}`, true);
  }
  const drawnFaith = drawZeroRepeatFaithQuestion({
    religion: 'christianity',
    levelNumber: 1,
  });
  assert.equal(drawnFaith.id, faithId);
  assert.equal(drawnFaith.isRedemptionRound, undefined);

  resetAllModes();
});

test('Puzzle Mode retires solved boards, queues failed/skipped boards seamlessly, and falls back procedurally', () => {
  resetAllModes();

  const board = createCrosswordBoard({ length: 5, levelNumber: 1, categoryId: 'general-classic' });
  assert.ok(validateWordSquare(board.solution.rows, 5));
  assert.ok(board.puzzleItemId.startsWith('puzzle:5:'));

  // Simulate miss/skip on board, age 26 boards, verify seamless return
  recordModeOutcome('puzzle', board.puzzleItemId, false, {
    length: board.length,
    target: board.solution.target,
    rows: board.solution.rows,
  });
  for (let i = 0; i < 26; i++) {
    recordModeOutcome('puzzle', `puzzle:5:FAKE_${i}`, true);
  }
  const returningBoard = createCrosswordBoard({
    length: 5,
    levelNumber: 1,
    categoryId: 'general-classic',
  });
  assert.equal(returningBoard.solution.target, board.solution.target);
  assert.equal(returningBoard.puzzleItemId, board.puzzleItemId);

  // Win retires permanently
  recordModeOutcome('puzzle', returningBoard.puzzleItemId, true);
  assert.ok(getRetiredIdSet('puzzle').has(returningBoard.puzzleItemId));
  assert.equal(getRedemptionQueue('puzzle').length, 0);

  resetAllModes();
});

test('Expanded banks are strictly deduplicated and procedural fallback handles full pool retirement', () => {
  resetAllModes();

  const triviaIds = new Set<string>();
  const triviaTexts = new Set<string>();
  for (const item of CURATED_TRIVIA_BANK) {
    assert.ok(!triviaIds.has(item.id), `Duplicate trivia id: ${item.id}`);
    assert.ok(
      !triviaTexts.has(item.question.trim().toLowerCase()),
      `Duplicate trivia question: ${item.question}`
    );
    triviaIds.add(item.id);
    triviaTexts.add(item.question.trim().toLowerCase());
  }
  assert.ok(CURATED_TRIVIA_BANK.length >= 350, `Expected 350+ trivia items, got ${CURATED_TRIVIA_BANK.length}`);

  for (const rel of RELIGION_IDS) {
    const profile = getFaithTradition(rel);
    assert.ok(profile.trivia.length >= 35, `Expected 35+ trivia for ${rel}, got ${profile.trivia.length}`);
    assert.ok(profile.words.length >= 25, `Expected 25+ words for ${rel}, got ${profile.words.length}`);
    for (const w of profile.words) {
      assert.ok(VALID_WORDS[w.length].has(w.word), `Invalid faith word ${w.word} in ${rel}`);
    }
  }

  // Retire ALL static christianity faith trivia items -> procedural fallback must still emit non-retired unique IDs
  const chrStaticBank = CURATED_TRIVIA_BANK.filter((i) => i.categoryId === 'faith:christianity');
  const chrProfile = getFaithTradition('christianity');
  for (const q of chrStaticBank) recordModeOutcome('faith', q.id, true);
  for (const q of chrProfile.trivia) {
    if (q.id) recordModeOutcome('faith', q.id, true);
  }
  const procFaith = drawZeroRepeatFaithQuestion({ religion: 'christianity', levelNumber: 1 });
  assert.ok(procFaith.id && !getRetiredIdSet('faith').has(procFaith.id));
  assert.ok(procFaith.options.length === 4);

  // Faith puzzle word pool also handles retirements cleanly
  const pw = pickFaithPuzzleWord('christianity', 5, '2026-11-26', [], false);
  assert.ok(VALID_WORDS[pw.length].has(pw.word));

  resetAllModes();
});

test('Top clue letter breakdown stats and ad-locked clue mechanics behave accurately', () => {
  assert.equal(
    formatActiveWordLetterStats('PLANET', 'across'),
    'Across • 6 Letters (2 Vowels, 4 Consonants)'
  );
  assert.equal(
    formatActiveWordLetterStats('LIGHT', 'down'),
    'Down • 5 Letters (1 Vowel, 4 Consonants)'
  );

  const board = createCrosswordBoard({ length: 5, levelNumber: 1, categoryId: 'general-classic' });
  assert.deepEqual(board.unlockedClues, {});
  const unlocked = unlockCrosswordLineClue(board, 'col', 2, 'General Classic');
  assert.ok(unlocked.board.unlockedClues['col-2']);
  assert.equal(unlocked.board.unlockedClues['row-0'], undefined);
});
