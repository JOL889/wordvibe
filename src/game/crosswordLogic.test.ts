import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCrosswordLevelClimb,
  applyCrosswordKey,
  applyUnlimitedCrosswordHint,
  createCrosswordBoard,
  createCrosswordClimbState,
  CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD,
  CROSSWORD_LEVEL_CLIMB_TOTAL,
  getCrosswordProgressSummary,
  getCrosswordRoundTimeLimitSeconds,
  isCleanCrosswordPass,
  unlockCrosswordLineClue,
} from './crosswordLogic';
import { FIVE_LEVEL_ORDER, getNextFiveLevel } from './settingsLogic';
import {
  advanceTriviaLevelClimb,
  createTriviaClimbState,
  drawZeroRepeatTriviaQuestion,
  getTriviaQuestionTimeLimitSeconds,
  TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD,
  TRIVIA_LEVEL_CLIMB_TOTAL,
} from './triviaLogic';
import { drawZeroRepeatFaithQuestion } from './faithStudyLogic';
import { buildCompletedWordSquare, hasDistinctRowsAndCols, validateWordSquare } from './wordSquareLogic';
import { getWordMeaningClue } from './wordMeanings';
import { clearZeroRepeatDeckForTest } from './zeroRepeatDeck';

test('asymmetric word squares strictly guarantee every row and column word is distinct (no row === col)', () => {
  for (const [len, target] of [
    [4, 'STAR'],
    [4, 'BLUE'],
    [5, 'CRANE'],
    [5, 'LIGHT'],
    [6, 'AGENDA'],
    [6, 'INFORM'],
  ] as const) {
    const sq = buildCompletedWordSquare(target, len);
    assert.ok(sq, `Expected asymmetric square for ${target}`);
    assert.ok(validateWordSquare(sq.rows, len), `Word square for ${target} must pass validateWordSquare`);
    assert.ok(hasDistinctRowsAndCols(sq.rows, len), `Word square rows and cols must all be distinct`);
    for (let i = 0; i < len; i++) {
      assert.notEqual(
        sq.rows[i],
        sq.cols[i],
        `Row ${i} (${sq.rows[i]}) must NOT duplicate Col ${i} (${sq.cols[i]})`
      );
      const meaning = getWordMeaningClue(sq.rows[i]);
      assert.ok(meaning.length >= 12, `Row word ${sq.rows[i]} should have a clear meaning clue`);
      assert.equal(
        meaning.toUpperCase().includes(sq.rows[i]),
        false,
        `Meaning clue for ${sq.rows[i]} must not leak the answer`
      );
    }
  }
});

test('solving 1 horizontal row does NOT complete remaining rows or columns, and supports starting anywhere Across or Down', () => {
  const board0 = createCrosswordBoard({
    length: 4,
    level: 'legendary', // 0 starter anchors so every cell is open for deterministic check
    categoryId: 'general-classic',
    forcedTarget: 'STAR',
  });

  assert.equal(board0.status, 'playing');
  const expectedRow0 = board0.solution.rows[0];
  const expectedCol2 = board0.solution.cols[2];
  assert.notEqual(expectedRow0, expectedCol2);

  // Start typing Across on Row 0 from box 1 -> 2 -> 3, then go back to box 0
  let board = board0;
  let r = 0;
  let c = 1;
  for (const ch of expectedRow0.slice(1)) {
    const res = applyCrosswordKey(board, r, c, 'across', ch);
    board = res.board;
    r = res.nextRow;
    c = res.nextCol;
  }
  // Fill box (0, 0) manually (user clicked box 0)
  const fillFirst = applyCrosswordKey(board, 0, 0, 'across', expectedRow0[0]);
  board = fillFirst.board;

  // Press ENTER on Row 0 -> ONLY Row 0 becomes solved! Remaining 3 rows and 4 cols stay unsolved.
  const submitRow0 = applyCrosswordKey(board, 0, 3, 'across', 'ENTER');
  board = submitRow0.board;

  assert.equal(submitRow0.outcome, 'line_solved');
  assert.equal(board.status, 'playing', 'Completing 1 row must NEVER finish the whole board');
  assert.equal(board.solvedRows[0], true);
  assert.equal(board.solvedRows[1], false);
  assert.equal(board.solvedRows[2], false);
  assert.equal(board.solvedRows[3], false);
  assert.equal(board.solvedCols.some(Boolean), false);

  // Now tap mid-column cell (row 2, col 2) and type Down starting from anywhere on col 2
  const downStep1 = applyCrosswordKey(board, 2, 2, 'down', expectedCol2[2]);
  board = downStep1.board;
  const downStep2 = applyCrosswordKey(board, 3, 2, 'down', expectedCol2[3]);
  board = downStep2.board;
  // Fill remaining cell (1, 2) (since row 0 col 2 was locked by Row 0!)
  const downStep3 = applyCrosswordKey(board, 1, 2, 'down', expectedCol2[1]);
  board = downStep3.board;

  const submitCol2 = applyCrosswordKey(board, 1, 2, 'down', 'ENTER');
  board = submitCol2.board;
  assert.equal(submitCol2.outcome, 'line_solved');
  assert.equal(board.solvedCols[2], true);
  assert.equal(board.status, 'playing');
  const prog = getCrosswordProgressSummary(board);
  assert.equal(prog.solvedWordsCount, 2);
  assert.equal(prog.totalWords, 8);
});

test('board becomes won ONLY after every row and column has been completed individually', () => {
  let board = createCrosswordBoard({
    length: 4,
    level: 'legendary',
    forcedTarget: 'STAR',
  });
  // Solve rows 0..3 individually
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!board.lockedCells[r][c]) {
        board = applyCrosswordKey(board, r, c, 'across', board.solution.rows[r][c]).board;
      }
    }
    const res = applyCrosswordKey(board, r, 0, 'across', 'ENTER');
    board = res.board;
    if (r < 3) {
      assert.equal(board.status, 'playing');
      assert.equal(res.outcome, 'line_solved');
    } else {
      assert.equal(board.status, 'won');
      assert.equal(res.outcome, 'board_won');
      assert.equal(board.solvedRows.every(Boolean), true);
      assert.equal(board.solvedCols.every(Boolean), true);
      assert.equal(isCleanCrosswordPass(board), true);
    }
  }
});

test('direction-agnostic Enter completes a vertical word even when cursor is Across and vice versa', () => {
  let board = createCrosswordBoard({
    length: 4,
    level: 'legendary',
    forcedTarget: 'STAR',
  });
  const col1Word = board.solution.cols[1];
  for (let r = 0; r < 4; r++) {
    board = applyCrosswordKey(board, r, 1, 'across', col1Word[r]).board;
  }
  // Cursor is still on Row 3 Col 1 in 'across' direction while Row 3 is incomplete,
  // yet pressing ENTER must recognize and solve Col 1 Down cleanly!
  const res = applyCrosswordKey(board, 3, 1, 'across', 'ENTER');
  assert.equal(res.outcome, 'line_solved');
  assert.equal(res.solvedWord, col1Word);
  assert.equal(res.board.solvedCols[1], true);

  // Now fill Row 0 while cursor is in 'down' direction on Col 0 (incomplete col 0)
  let board2 = res.board;
  const row0Word = board2.solution.rows[0];
  for (let c = 0; c < 4; c++) {
    if (!board2.lockedCells[0][c]) {
      board2 = applyCrosswordKey(board2, 0, c, 'down', row0Word[c]).board;
    }
  }
  const res2 = applyCrosswordKey(board2, 0, 0, 'down', 'ENTER');
  assert.equal(res2.outcome, 'line_solved');
  assert.equal(res2.solvedWord, row0Word);
  assert.equal(res2.board.solvedRows[0], true);
});

test('accurate dictionary meanings (e.g. CLOUD rain formation) never leak letters, vowels, or consonants', () => {
  const cloudClue = getWordMeaningClue('CLOUD');
  assert.match(cloudClue, /rain/i);
  assert.equal(cloudClue.toUpperCase().includes('CLOUD'), false);

  let board = createCrosswordBoard({
    length: 5,
    level: 5,
    forcedTarget: 'CLOUD',
  });

  // Unlock ad clue on row/col containing CLOUD
  const rowIdx = board.solution.rows.indexOf('CLOUD');
  const colIdx = board.solution.cols.indexOf('CLOUD');
  const slotType = rowIdx !== -1 ? 'row' : 'col';
  const idx = rowIdx !== -1 ? rowIdx : colIdx;
  const clueRes = unlockCrosswordLineClue(board, slotType, idx, 'Nature');
  board = clueRes.board;
  assert.equal(/consonant|vowel|starting with|ending with|starts with|ends with/i.test(clueRes.clueText), false);
  assert.match(clueRes.clueText, /rain/i);
  assert.equal(clueRes.clueText.toUpperCase().includes('CLOUD'), false, 'Clue must never leak the answer');

  // Unlimited hints can be applied repeatedly across cells
  for (let i = 0; i < 10; i++) {
    const hinted = applyUnlimitedCrosswordHint(board, 0, 0);
    assert.ok(hinted);
    board = hinted.board;
  }
  assert.equal(board.hintsUsed, 10);
});

test('5-round shrinking-timer Level Climb promotes Level 1 -> Level 2 -> ... on 5/5 timed wins and resets on miss', () => {
  assert.deepEqual(FIVE_LEVEL_ORDER, ['novice', 'beginner', 'intermediate', 'expert', 'legendary']);
  assert.equal(getNextFiveLevel('novice'), 'beginner');
  assert.equal(getNextFiveLevel('beginner'), 'intermediate');
  assert.equal(getNextFiveLevel('intermediate'), 'expert');
  assert.equal(getNextFiveLevel('expert'), 'legendary');
  assert.equal(getNextFiveLevel('legendary'), null);
  assert.equal(CROSSWORD_LEVEL_CLIMB_TOTAL, 5);
  assert.equal(CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD, 5);
  assert.equal(TRIVIA_LEVEL_CLIMB_TOTAL, 5);
  assert.equal(TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD, 5);

  // Shrinking timers across 5 concurrent puzzles & trivia questions
  for (let i = 0; i < 4; i++) {
    assert.ok(
      getCrosswordRoundTimeLimitSeconds(5, 1, i) > getCrosswordRoundTimeLimitSeconds(5, 1, i + 1),
      `Crossword round ${i} timer must exceed round ${i + 1}`
    );
    assert.ok(
      getTriviaQuestionTimeLimitSeconds(1, i) > getTriviaQuestionTimeLimitSeconds(1, i + 1),
      `Trivia question ${i} timer must exceed question ${i + 1}`
    );
  }

  // Trivia: 5/5 timed wins promotes Level 1 -> Level 2, and continues above Level 5 (Level 7 -> Level 8)
  let tClimb = createTriviaClimbState(1);
  for (let i = 0; i < 5; i++) {
    tClimb = advanceTriviaLevelClimb(tClimb, true);
  }
  assert.equal(tClimb.stageComplete, true);
  assert.equal(tClimb.correctCount, 5);
  assert.equal(tClimb.promotedToLevelNumber, 2);

  let tHigh = createTriviaClimbState(7);
  for (let i = 0; i < 5; i++) {
    tHigh = advanceTriviaLevelClimb(tHigh, true);
  }
  assert.equal(tHigh.stageComplete, true);
  assert.equal(tHigh.promotedToLevelNumber, 8);

  // Trivia: missing Q4 resets climb back to 0/5 at Level 1
  let tFail = createTriviaClimbState(1);
  tFail = advanceTriviaLevelClimb(tFail, true);
  tFail = advanceTriviaLevelClimb(tFail, true);
  tFail = advanceTriviaLevelClimb(tFail, true);
  tFail = advanceTriviaLevelClimb(tFail, false);
  assert.equal(tFail.stageComplete, false);
  assert.equal(tFail.questionIndex, 0);
  assert.equal(tFail.correctCount, 0);
  assert.equal(tFail.promotedToLevelNumber, null);

  // Crossword: 5/5 timed wins promotes Level 6 -> Level 7; timeout resets to 0/5
  let cClimb = createCrosswordClimbState(6);
  for (let i = 0; i < 5; i++) {
    cClimb = advanceCrosswordLevelClimb(cClimb, true);
  }
  assert.equal(cClimb.stageComplete, true);
  assert.equal(cClimb.roundPassedCount, 5);
  assert.equal(cClimb.promotedToLevelNumber, 7);

  let cReset = createCrosswordClimbState(2);
  cReset = advanceCrosswordLevelClimb(cReset, true);
  cReset = advanceCrosswordLevelClimb(cReset, false);
  assert.equal(cReset.roundIndex, 0);
  assert.equal(cReset.roundPassedCount, 0);
  assert.equal(cReset.promotedToLevelNumber, null);
});

test('zero-repeat trivia & faith draws produce zero repeats across 25+ draws even on high numeric levels', () => {
  clearZeroRepeatDeckForTest();
  const seenTrivia = new Set<string>();
  for (let i = 0; i < 25; i++) {
    const q = drawZeroRepeatTriviaQuestion({ categoryId: 'local-trending', levelNumber: 1 + (i % 6) });
    assert.equal(seenTrivia.has(q.question), false, `Repeated trivia question: ${q.question}`);
    seenTrivia.add(q.question);
  }

  const seenGeneral = new Set<string>();
  for (let i = 0; i < 25; i++) {
    const q = drawZeroRepeatTriviaQuestion({ categoryId: 'general-knowledge', levelNumber: 2 });
    assert.equal(seenGeneral.has(q.question), false, `Repeated general trivia: ${q.question}`);
    seenGeneral.add(q.question);
  }

  const seenFaithChr = new Set<string>();
  for (let i = 0; i < 25; i++) {
    const fq = drawZeroRepeatFaithQuestion({ religion: 'christianity', levelNumber: 1 + (i % 5) });
    assert.equal(seenFaithChr.has(fq.question), false, `Repeated faith question: ${fq.question}`);
    seenFaithChr.add(fq.question);
  }

  const seenFaithBud = new Set<string>();
  for (let i = 0; i < 25; i++) {
    const fq = drawZeroRepeatFaithQuestion({ religion: 'buddhism', levelNumber: 3 });
    assert.equal(seenFaithBud.has(fq.question), false, `Repeated buddhism question: ${fq.question}`);
    seenFaithBud.add(fq.question);
  }
});
