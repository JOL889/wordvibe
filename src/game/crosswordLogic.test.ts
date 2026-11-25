import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCrosswordKey,
  applyUnlimitedCrosswordHint,
  createCrosswordBoard,
  CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD,
  CROSSWORD_LEVEL_CLIMB_TOTAL,
  getCrosswordProgressSummary,
  unlockCrosswordLineClue,
} from './crosswordLogic';
import { FIVE_LEVEL_ORDER, getNextFiveLevel } from './settingsLogic';
import { drawZeroRepeatTriviaQuestion, TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD, TRIVIA_LEVEL_CLIMB_TOTAL } from './triviaLogic';
import { drawZeroRepeatFaithQuestion } from './faithStudyLogic';
import { buildCompletedWordSquare, hasDistinctRowsAndCols, validateWordSquare } from './wordSquareLogic';
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
    }
  }
});

test('unlimited ad hints and consonant/vowel + meaning clues work cleanly without revealing the answer word', () => {
  let board = createCrosswordBoard({
    length: 5,
    level: 'legendary',
    forcedTarget: 'CLOUD',
  });

  // Unlock ad clue on row/col containing CLOUD
  const rowIdx = board.solution.rows.indexOf('CLOUD');
  const colIdx = board.solution.cols.indexOf('CLOUD');
  const slotType = rowIdx !== -1 ? 'row' : 'col';
  const idx = rowIdx !== -1 ? rowIdx : colIdx;
  const clueRes = unlockCrosswordLineClue(board, slotType, idx, 'Nature');
  board = clueRes.board;
  assert.match(clueRes.clueText, /3 consonants, 2 vowels — /i);
  assert.equal(clueRes.clueText.toUpperCase().includes('CLOUD'), false, 'Clue must never leak the answer');

  // Unlimited hints can be applied repeatedly across cells
  for (let i = 0; i < 10; i++) {
    const hinted = applyUnlimitedCrosswordHint(board, 0, 0);
    assert.ok(hinted);
    board = hinted.board;
  }
  assert.equal(board.hintsUsed, 10);
});

test('5 difficulty tiers and Level Climb 8/10 progression constants match specification', () => {
  assert.deepEqual(FIVE_LEVEL_ORDER, ['novice', 'beginner', 'intermediate', 'expert', 'legendary']);
  assert.equal(getNextFiveLevel('novice'), 'beginner');
  assert.equal(getNextFiveLevel('beginner'), 'intermediate');
  assert.equal(getNextFiveLevel('intermediate'), 'expert');
  assert.equal(getNextFiveLevel('expert'), 'legendary');
  assert.equal(getNextFiveLevel('legendary'), null);
  assert.equal(CROSSWORD_LEVEL_CLIMB_TOTAL, 10);
  assert.equal(CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD, 8);
  assert.equal(TRIVIA_LEVEL_CLIMB_TOTAL, 10);
  assert.equal(TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD, 8);
});

test('zero-repeat trivia & faith draws produce zero repeats across draws even on fresh calls', () => {
  clearZeroRepeatDeckForTest();
  const seenTrivia = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const q = drawZeroRepeatTriviaQuestion({ categoryId: 'general-knowledge', level: 'novice' });
    assert.equal(seenTrivia.has(q.question), false, `Repeated trivia question: ${q.question}`);
    seenTrivia.add(q.question);
  }

  const seenFaith = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const fq = drawZeroRepeatFaithQuestion({ religion: 'christianity', level: 'beginner' });
    assert.equal(seenFaith.has(fq.question), false, `Repeated faith question: ${fq.question}`);
    seenFaith.add(fq.question);
  }
});
