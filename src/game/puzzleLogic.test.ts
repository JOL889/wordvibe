import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, CATEGORY_MAP, getCategoryById, PREMIUM_UNLOCK_PLAYS } from '../data/categories';
import { SOLUTION_WORDS, VALID_WORDS } from '../data/words';
import {
  ENTERTAINMENT_TOPIC_SPECS,
  resolveDailyEntertainmentSpotlight,
} from './entertainmentLogic';
import {
  evaluateGuess,
  deriveKeyboardStates,
  getDailyTargetWord,
  getRandomSprintWord,
  pickNextCategoryWord,
  getDailyPuzzleNumber,
  formatCountdown,
  generateSmartHint,
  formatShareText,
  updateStatsOnCompletion,
  canRecoverStreak,
  applyStreakRecovery,
  DEFAULT_STATS,
  createEmptyDrafts,
  computeSelectCellCol,
  applyLetterToDraft,
  applyBackspaceToDraft,
  applyLetterInDirection,
  applyBackspaceInDirection,
  findNextUnsubmittedRow,
  moveCursorDirection,
  isCategoryAccessible,
  getCategoryRemainingPlays,
  grantCategoryPlays,
  consumeCategoryPlay,
  getWeekStreakDays,
  getHomeChallenges,
  canPlaceHintBox,
  MAX_VERTICAL_HINT_BOXES,
  pickDefaultSmartHintBox,
  pickDefaultSmartHintBoxes,
  placeRewardedHintBox,
  rollProbabilityWordLength,
  buildSmartHintClueText,
  MIN_PROBABILITY_WORD_LENGTH,
  getProgressiveGuessNudge,
  type GridBoxHint,
} from './puzzleLogic';
import { buildCompletedWordSquare, validateWordSquare } from './wordSquareLogic';

test('dictionary integrity: all solution words match exact lengths and valid sets', () => {
  for (const len of [4, 5, 6] as const) {
    assert.ok(SOLUTION_WORDS[len].length >= 200, `Expected >=200 solutions for length ${len}`);
    for (const word of SOLUTION_WORDS[len]) {
      assert.equal(word.length, len, `Word ${word} should have length ${len}`);
      assert.match(word, /^[A-Z]+$/);
      assert.ok(VALID_WORDS[len].has(word), `Solution ${word} must be in VALID_WORDS[${len}]`);
    }
  }
});

test('expanded categories integrity: unique ids/names, 20 entertainment topics, valid lengths, and all words in VALID_WORDS', () => {
  assert.equal(CATEGORIES.length, 112, 'Expected 112 curated categories including 12 new Entertainment topics');
  const ids = new Set<string>();
  const names = new Set<string>();
  let premiumCount = 0;
  let entertainmentCount = 0;

  for (const cat of CATEGORIES) {
    assert.ok(!ids.has(cat.id), `Duplicate category id: ${cat.id}`);
    assert.ok(!names.has(cat.name), `Duplicate category name: ${cat.name}`);
    ids.add(cat.id);
    names.add(cat.name);
    if (cat.isPremium) premiumCount++;
    if (cat.group === 'Entertainment') entertainmentCount++;

    for (const [len, list] of [
      [4, cat.words4],
      [5, cat.words5],
      [6, cat.words6],
    ] as const) {
      assert.equal(list.length, 10, `Category ${cat.id} should have exactly 10 words for length ${len}`);
      for (const word of list) {
        assert.equal(word.length, len);
        assert.match(word, /^[A-Z]+$/);
        assert.ok(VALID_WORDS[len].has(word), `Category word ${word} missing from VALID_WORDS[${len}]`);
      }
    }
  }

  assert.equal(entertainmentCount, 20, 'Expected 20 categories inside the Entertainment collection');
  assert.ok(premiumCount > 30 && premiumCount < 90, 'Expected a balanced mix of premium and free categories');
  assert.equal(getCategoryById('astrology').isPremium, true);
  assert.equal(getCategoryById('awards-red-carpet').isPremium, true);
  assert.equal(getCategoryById('general-classic').isPremium, false);
  for (const spec of ENTERTAINMENT_TOPIC_SPECS) {
    assert.ok(CATEGORY_MAP[spec.id], `Missing category entry for entertainment spec ${spec.id}`);
  }
});

test('premium category 5-play unlock and consumption lifecycle', () => {
  const astrology = getCategoryById('astrology');
  const classic = getCategoryById('general-classic');
  let plays: Record<string, number> = {};

  // Free category is always unlimited
  assert.equal(isCategoryAccessible(classic, plays), true);
  assert.equal(getCategoryRemainingPlays(classic, plays), Infinity);
  assert.deepEqual(consumeCategoryPlay(classic, plays), plays);

  // Premium category starts locked at 0 plays
  assert.equal(isCategoryAccessible(astrology, plays), false);
  assert.equal(getCategoryRemainingPlays(astrology, plays), 0);

  // Watching rewarded ad grants 5 plays
  plays = grantCategoryPlays(plays, astrology.id);
  assert.equal(isCategoryAccessible(astrology, plays), true);
  assert.equal(getCategoryRemainingPlays(astrology, plays), PREMIUM_UNLOCK_PLAYS);

  // Playing 5 puzzles decrements 5 -> 4 -> 3 -> 2 -> 1 -> 0
  for (let expectedLeft = 4; expectedLeft >= 0; expectedLeft--) {
    plays = consumeCategoryPlay(astrology, plays);
    assert.equal(getCategoryRemainingPlays(astrology, plays), expectedLeft);
  }

  // After 5 plays, category is locked again until another ad is watched
  assert.equal(isCategoryAccessible(astrology, plays), false);
});

test('category-seeded daily and sprint words draw from the chosen category', () => {
  const astrology = getCategoryById('astrology');
  const daily5 = getDailyTargetWord('2026-11-21', 5, 'astrology');
  const sprint6 = getRandomSprintWord(6, [], 'astrology');

  assert.ok(astrology.words5.includes(daily5), `Expected ${daily5} in astrology words5`);
  assert.ok(astrology.words6.includes(sprint6), `Expected ${sprint6} in astrology words6`);
});

test('evaluateGuess handles exact, present, absent, and duplicate letters accurately', () => {
  assert.deepEqual(evaluateGuess('CRANE', 'CRANE'), [
    'correct',
    'correct',
    'correct',
    'correct',
    'correct',
  ]);

  assert.deepEqual(evaluateGuess('SPEED', 'ERASE'), [
    'present',
    'absent',
    'present',
    'present',
    'absent',
  ]);

  assert.deepEqual(evaluateGuess('EERIE', 'CRANE'), [
    'absent',
    'absent',
    'present',
    'absent',
    'correct',
  ]);

  assert.deepEqual(evaluateGuess('LAMP', 'PALM'), ['present', 'correct', 'present', 'present']);
  assert.deepEqual(evaluateGuess('PLANET', 'PLATES'), [
    'correct',
    'correct',
    'correct',
    'absent',
    'correct',
    'present',
  ]);
});

test('deriveKeyboardStates respects priority correct > present > absent', () => {
  const states = deriveKeyboardStates(['SLATE', 'CRANE'], 'CRANE', ['Z']);
  assert.equal(states['C'], 'correct');
  assert.equal(states['A'], 'correct');
  assert.equal(states['E'], 'correct');
  assert.equal(states['S'], 'absent');
  assert.equal(states['Z'], 'absent');
});

test('daily word selection is deterministic per date and length', () => {
  const w5a = getDailyTargetWord('2026-11-21', 5);
  const w5b = getDailyTargetWord('2026-11-21', 5);
  const w5next = getDailyTargetWord('2026-11-22', 5);
  const w4 = getDailyTargetWord('2026-11-21', 4);
  const w6 = getDailyTargetWord('2026-11-21', 6);

  assert.equal(w5a, w5b);
  assert.equal(w4.length, 4);
  assert.equal(w5a.length, 5);
  assert.equal(w6.length, 6);
  assert.notEqual(w5a, w5next);
  assert.ok(getDailyPuzzleNumber('2026-11-21') > 1);
});

test('formatCountdown formats milliseconds into HH:MM:SS', () => {
  assert.equal(formatCountdown(3661000), '01:01:01');
  assert.equal(formatCountdown(0), '00:00:00');
});

test('generateSmartHint reveals an unconfirmed position first', () => {
  const hint = generateSmartHint(['SLATE'], 'CRANE', [], []);
  assert.equal(hint.type, 'reveal_position');
  assert.equal(hint.position, 0);
  assert.equal(hint.letter, 'C');
});

test('formatShareText outputs clean emoji grid, score summary, and non-default category', () => {
  const text = formatShareText({
    mode: 'daily',
    puzzleNumber: 42,
    length: 5,
    guesses: ['SLATE', 'CRANE'],
    target: 'CRANE',
    won: true,
    maxAttempts: 6,
    streak: 5,
    categoryId: 'astrology',
  });
  assert.ok(text.includes('WordVibe Daily #42 · Astrology & Zodiac (5-Letter) 2/6'));
  assert.ok(text.includes('Streak: 5 days'));
  assert.ok(text.includes('🟩🟩🟩🟩🟩'));
});

test('streak updates and streak recovery work accurately', () => {
  let stats = updateStatsOnCompletion(DEFAULT_STATS, {
    mode: 'daily',
    won: true,
    attemptsUsed: 3,
    todayKey: '2026-11-19',
  });
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.bestStreak, 1);

  stats = updateStatsOnCompletion(stats, {
    mode: 'daily',
    won: true,
    attemptsUsed: 4,
    todayKey: '2026-11-20',
  });
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.bestStreak, 2);

  stats = updateStatsOnCompletion(stats, {
    mode: 'daily',
    won: false,
    attemptsUsed: 6,
    todayKey: '2026-11-21',
  });
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.previousLostStreak, 2);
  assert.equal(canRecoverStreak(stats, '2026-11-21'), true);

  stats = applyStreakRecovery(stats, '2026-11-21');
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.previousLostStreak, 0);
  assert.equal(canRecoverStreak(stats, '2026-11-22'), false);
});

test('multi-row selection, any-box entry from any direction, backspace, and arrow navigation work', () => {
  let drafts = createEmptyDrafts(6, 5);
  let col = computeSelectCellCol(drafts[2], 4);
  assert.equal(col, 4);

  let res = applyLetterToDraft(drafts, 2, col, 'E', 5);
  drafts = res.drafts;
  assert.equal(drafts[2][4], 'E');

  for (const [cIdx, ch] of [
    [3, 'N'],
    [2, 'A'],
    [1, 'R'],
    [0, 'C'],
  ] as const) {
    col = computeSelectCellCol(drafts[2], cIdx);
    assert.equal(col, cIdx);
    res = applyLetterToDraft(drafts, 2, col, ch, 5);
    drafts = res.drafts;
  }
  assert.equal(drafts[2].join(''), 'CRANE');

  const editCol = computeSelectCellCol(drafts[2], 1);
  assert.equal(editCol, 1);
  const back = applyBackspaceToDraft(drafts, 2, editCol, 5);
  assert.deepEqual(back.drafts[2], ['C', '', 'A', 'N', 'E']);
  assert.equal(back.nextCol, 1);

  const rowGuesses: (string | null)[] = [null, null, 'CRANE', null, null, null];
  assert.deepEqual(moveCursorDirection(rowGuesses, 1, 2, 'down', 5), { row: 3, col: 2 });
  assert.deepEqual(moveCursorDirection(rowGuesses, 3, 2, 'up', 5), { row: 1, col: 2 });
  assert.deepEqual(moveCursorDirection(rowGuesses, 3, 2, 'left', 5), { row: 3, col: 1 });
  assert.deepEqual(moveCursorDirection(rowGuesses, 3, 2, 'right', 5), { row: 3, col: 3 });

  assert.equal(findNextUnsubmittedRow(rowGuesses, 2), 3);
  const rowGuessesNearEnd: (string | null)[] = [null, 'SLATE', 'CRANE', 'AUDIO', 'PIANO', 'GHOST'];
  // Reaching the bottom stops cleanly without wrapping back to row 0
  assert.equal(findNextUnsubmittedRow(rowGuessesNearEnd, 5), null);
  assert.equal(findNextUnsubmittedRow([null, null, 'CRANE', null, 'AUDIO', null], 3), 5);
  assert.equal(findNextUnsubmittedRow([null, null, 'CRANE', null, 'AUDIO', 'PIANO'], 3), null);
});

test('cursor moves left-to-right and top-to-bottom and stops at the right/bottom without wrapping to start', () => {
  // 1. Starting at col 0 steps 0 -> 1 -> 2 -> 3 -> 4 -> 5 and stops at 5
  let drafts = createEmptyDrafts(6, 5);
  let col = 0;
  for (const [idx, ch] of ['C', 'R', 'A', 'N', 'E'].entries()) {
    const res = applyLetterToDraft(drafts, 0, col, ch, 5);
    drafts = res.drafts;
    col = res.nextCol;
    assert.equal(col, idx + 1);
  }
  assert.equal(drafts[0].join(''), 'CRANE');
  const extra = applyLetterToDraft(drafts, 0, col, 'Z', 5);
  assert.equal(extra.drafts[0].join(''), 'CRANE');
  assert.equal(extra.nextCol, 5);

  // 2. Starting at mid-row box (col 2) moves 2 -> 3 -> 4 -> 5 and STOPS (does not wrap to col 0)
  drafts = createEmptyDrafts(6, 5);
  col = 2;
  const expectedCols = [3, 4, 5, 5, 5];
  ['A', 'R', 'E', 'S', 'T'].forEach((ch, step) => {
    const res = applyLetterToDraft(drafts, 1, col, ch, 5);
    drafts = res.drafts;
    col = res.nextCol;
    assert.equal(col, expectedCols[step]);
  });
  assert.deepEqual(drafts[1], ['', '', 'A', 'R', 'E']);

  // 3. Starting at last box (col 4) fills col 4 and STOPS (does not wrap to col 0 or overwrite col 4)
  drafts = createEmptyDrafts(6, 5);
  col = 4;
  for (const ch of ['E', 'C', 'R']) {
    const res = applyLetterToDraft(drafts, 2, col, ch, 5);
    drafts = res.drafts;
    col = res.nextCol;
    assert.equal(col, 5);
  }
  assert.deepEqual(drafts[2], ['', '', '', '', 'E']);

  // 4. Starting at col 0 overwrites left-to-right box-by-box and stops at col 5
  col = 0;
  for (const [idx, ch] of ['S', 'L', 'A', 'T', 'E'].entries()) {
    const res = applyLetterToDraft(drafts, 2, col, ch, 5);
    drafts = res.drafts;
    col = res.nextCol;
    assert.equal(col, idx + 1);
  }
  assert.equal(drafts[2].join(''), 'SLATE');

  // 5. Vertical arrow movement stops at the last open row at the bottom without wrapping to row 0
  const openTopAndMid: (string | null)[] = [null, 'CRANE', null, null, 'SLATE', 'AUDIO'];
  assert.deepEqual(moveCursorDirection(openTopAndMid, 2, 1, 'down', 5), { row: 3, col: 1 });
  assert.deepEqual(moveCursorDirection(openTopAndMid, 3, 1, 'down', 5), { row: 3, col: 1 });
  assert.deepEqual(moveCursorDirection(openTopAndMid, 0, 1, 'up', 5), { row: 0, col: 1 });
});

test('7-day week streak view and 5 home challenges reflect real player progress', () => {
  // 2026-11-21 is a Saturday -> week is Mon Nov 16 .. Sun Nov 22
  const week = getWeekStreakDays('2026-11-21', ['2026-11-18', '2026-11-21']);
  assert.equal(week.length, 7);
  assert.deepEqual(
    week.map((d) => d.shortLabel),
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  );
  assert.equal(week[0].state, 'missed'); // Mon
  assert.equal(week[2].state, 'completed'); // Wed
  assert.equal(week[5].state, 'completed'); // Sat (today won)
  assert.equal(week[5].isToday, true);
  assert.equal(week[6].state, 'upcoming'); // Sun

  let stats = updateStatsOnCompletion(DEFAULT_STATS, {
    mode: 'daily',
    won: true,
    attemptsUsed: 3,
    todayKey: '2026-11-21',
    length: 5,
  });
  stats = updateStatsOnCompletion(stats, {
    mode: 'sprint',
    won: true,
    attemptsUsed: 4,
    todayKey: '2026-11-21',
    length: 5,
  });
  stats = updateStatsOnCompletion(stats, {
    mode: 'sprint',
    won: true,
    attemptsUsed: 2,
    todayKey: '2026-11-21',
    length: 5,
  });

  const challenges = getHomeChallenges({
    todayKey: '2026-11-21',
    stats,
    exploredCategoriesCount: 3,
  });
  assert.equal(challenges.length, 5);
  assert.equal(challenges[0].completed, true); // Daily 5L
  assert.equal(challenges[1].completed, false); // Daily 4L
  assert.equal(challenges[2].completed, false); // Daily 6L
  assert.equal(challenges[3].current, 2); // Sprint 2/3
  assert.equal(challenges[3].completed, false);
  assert.equal(challenges[4].completed, true); // Topics 3/3
});

test('daily entertainment spotlight shifts by calendar date and reacts to live news headlines', () => {
  const dayA = resolveDailyEntertainmentSpotlight('2026-11-21');
  const dayB = resolveDailyEntertainmentSpotlight('2026-11-24');
  const dayC = resolveDailyEntertainmentSpotlight('2026-03-02');

  assert.equal(dayA.source, 'calendar');
  assert.equal(dayA.featuredCategoryIds.length, 4);
  assert.equal(new Set(dayA.featuredCategoryIds).size, 4);
  assert.equal(dayA.featuredCategoryIds[0], dayA.heroCategoryId);
  assert.notEqual(dayA.eventTitle, dayC.eventTitle);
  assert.notDeepEqual(dayA.featuredCategoryIds, dayB.featuredCategoryIds);

  // Live Oscars / Awards headlines steer the spotlight to Awards & Red Carpet
  const awardsLive = resolveDailyEntertainmentSpotlight('2026-11-21', [
    'Oscars 2026 nominations revealed ahead of the Academy Awards red carpet gala',
    'Grammy winners celebrate historic album victories',
  ]);
  assert.equal(awardsLive.source, 'live');
  assert.equal(awardsLive.heroCategoryId, 'awards-red-carpet');
  assert.ok(awardsLive.matchedHeadline?.includes('Oscars'));

  // Live K-Pop / Tour headlines steer the spotlight to K-Pop & Global Hits
  const kpopLive = resolveDailyEntertainmentSpotlight('2026-11-21', [
    'BTS and Blackpink announce massive global stadium world tour comeback dates',
    'Netflix streaming finale breaks weekly viewing records',
  ]);
  assert.equal(kpopLive.source, 'live');
  assert.equal(kpopLive.heroCategoryId, 'kpop-global-pop');
  assert.ok(kpopLive.featuredCategoryIds.includes('streaming-binge'));
});

test('pickNextCategoryWord returns fresh distinct words on repeated category selections within the same day', () => {
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    const next = pickNextCategoryWord({
      categoryId: 'astrology',
      length: 5,
      dateKey: '2026-11-22',
      usedWordsToday: seen,
      excludeWord: seen[seen.length - 1],
      mode: 'daily',
    });
    assert.ok(!seen.includes(next), `Expected fresh word not in ${seen.join(',')}, got ${next}`);
    assert.ok(getCategoryById('astrology').words5.includes(next));
    seen.push(next);
  }
  assert.equal(new Set(seen).size, 10);

  // An 11th pick cycles cleanly without repeating the immediate prior word
  const cycled = pickNextCategoryWord({
    categoryId: 'astrology',
    length: 5,
    dateKey: '2026-11-22',
    usedWordsToday: seen,
    excludeWord: seen[seen.length - 1],
    mode: 'daily',
  });
  assert.notEqual(cycled, seen[seen.length - 1]);
  assert.ok(getCategoryById('astrology').words5.includes(cycled));
});

test('completed cross-grid produces valid English words horizontally and vertically', () => {
  const sampleTargets: Array<[4 | 5 | 6, string]> = [
    [4, 'STAR'],
    [4, 'MOON'],
    [5, 'ARIES'],
    [5, 'LIBRA'],
    [5, 'CRANE'],
    [6, 'INFORM'],
    [6, 'AGENDA'],
    [6, 'SESAME'],
  ];
  for (const [len, target] of sampleTargets) {
    const sq = buildCompletedWordSquare(target, len);
    assert.ok(sq, `Expected a completed H/V word square for ${target}`);
    assert.equal(sq.rows.length, len);
    assert.equal(sq.cols.length, len);
    assert.ok(validateWordSquare(sq.rows, len), `All rows & cols of ${target} square must be valid English words`);
    assert.ok(
      sq.rows.includes(target) || sq.cols.includes(target),
      `Square for ${target} must contain ${target} horizontally or vertically`
    );
  }
});

test('vertical Down typing moves top-to-bottom box by box and stops at bottom row without wrapping', () => {
  let drafts = createEmptyDrafts(6, 5);
  const rowGuesses: (string | null)[] = ['SLATE', null, null, null, null, null];
  let row = 1;
  const col = 2;

  // Type 6 letters starting at row 1 (open rows: 1, 2, 3, 4, 5 -> 5 open boxes!)
  const expectedNextRows = [2, 3, 4, 5, 6, 6];
  ['W', 'O', 'R', 'D', 'S', 'Z'].forEach((ch, idx) => {
    const res = applyLetterInDirection(drafts, rowGuesses, row, col, ch, 5, 'down');
    drafts = res.drafts;
    row = res.nextRow;
    assert.equal(res.nextCol, col);
    assert.equal(row, expectedNextRows[idx]);
  });

  // Check column 2 top-to-bottom contains W, O, R, D, S in rows 1..5 and row 0/6 did not get overwritten
  assert.equal(drafts[0][2], '');
  assert.equal(drafts[1][2], 'W');
  assert.equal(drafts[2][2], 'O');
  assert.equal(drafts[3][2], 'R');
  assert.equal(drafts[4][2], 'D');
  assert.equal(drafts[5][2], 'S');

  // Backspace from bottom edge deletes (5, 2) and moves cursor back to row 5
  const back = applyBackspaceInDirection(drafts, rowGuesses, row, col, 5, 'down');
  assert.equal(back.nextRow, 5);
  assert.equal(back.nextCol, col);
  assert.equal(back.drafts[5][2], '');
});

test('vertical hints allow up to 4 vertically (max 1 per horizontal row) while staying average and non-giveaway', () => {
  assert.equal(MAX_VERTICAL_HINT_BOXES, 4);

  const fourLetterBoxes = pickDefaultSmartHintBoxes({ target: 'MOON', maxAttempts: 6, roll: 0.45 });
  assert.equal(fourLetterBoxes.length, 2);
  assert.equal(new Set(fourLetterBoxes.map((h) => h.col)).size, 1, '4-letter board echoes 1 unique interior col vertically');
  assert.equal(new Set(fourLetterBoxes.map((h) => h.row)).size, 2, 'Each horizontal row has at most 1 box');

  const defaultBoxes = pickDefaultSmartHintBoxes({ target: 'CRANE', maxAttempts: 6, roll: 0.45 });
  assert.equal(defaultBoxes.length, 2);
  assert.equal(defaultBoxes[0].row, 0);
  assert.equal(defaultBoxes[0].source, 'default');
  assert.equal(new Set(defaultBoxes.map((h) => h.row)).size, 2);
  assert.ok(new Set(defaultBoxes.map((h) => h.col)).size <= 2);

  const singleBox = pickDefaultSmartHintBox({ target: 'CRANE', maxAttempts: 6, roll: 0.45 });
  assert.deepEqual(singleBox, defaultBoxes[0]);

  const verticalColumnHints: GridBoxHint[] = [
    { row: 0, col: 2, letter: 'A', source: 'default' },
  ];
  assert.equal(canPlaceHintBox(verticalColumnHints, 0, 1), false, 'Same horizontal row must be rejected');
  assert.equal(canPlaceHintBox(verticalColumnHints, 1, 2), true, 'Same vertical column is allowed up to 4');
  assert.equal(canPlaceHintBox(verticalColumnHints, 2, 2), true);
  assert.equal(canPlaceHintBox(verticalColumnHints, 3, 2), true);

  const fourVertical: GridBoxHint[] = [
    { row: 0, col: 2, letter: 'A', source: 'default' },
    { row: 1, col: 2, letter: 'A', source: 'rewarded' },
    { row: 2, col: 2, letter: 'A', source: 'rewarded' },
    { row: 3, col: 2, letter: 'A', source: 'rewarded' },
  ];
  assert.equal(canPlaceHintBox(fourVertical, 4, 2), false, 'Vertical limit caps at 4 hints');
  assert.equal(canPlaceHintBox(fourVertical, 4, 3), false, 'Total puzzle hint boxes cap at 4');

  const rewarded = placeRewardedHintBox({
    existingHints: defaultBoxes,
    guesses: [],
    rowGuesses: [null, null, null, null, null, null],
    target: 'CRANE',
    preferredRow: 0, // collides with defaultBoxes[0] on row 0, must move to another open row
    maxAttempts: 6,
  });
  assert.ok(rewarded.hint);
  assert.ok(!defaultBoxes.some((h) => h.row === rewarded.hint!.row), 'Horizontal row stays unique');

  const combined = [...defaultBoxes, rewarded.hint];
  assert.ok(combined.length <= MAX_VERTICAL_HINT_BOXES);
  assert.equal(new Set(combined.map((h) => h.row)).size, combined.length, 'Each horizontal row has at most 1 hinted box');

  // Never spoil the last hidden position (4 of 5 confirmed -> falls back to letter elimination instead of revealing 5th)
  const almostSolved = placeRewardedHintBox({
    existingHints: [
      { row: 0, col: 1, letter: 'R', source: 'default' },
      { row: 1, col: 2, letter: 'A', source: 'rewarded' },
      { row: 2, col: 3, letter: 'N', source: 'rewarded' },
    ],
    guesses: ['CXXXX'],
    rowGuesses: ['CXXXX', null, null, null, null, null],
    target: 'CRANE',
    preferredRow: 3,
    maxAttempts: 6,
  });
  assert.equal(almostSolved.hint, null, 'Must not spoil final unconfirmed target position');
});

test('probability hint setup alternates between 4, 5, and 6 words with user context and never drops below 4', () => {
  assert.equal(MIN_PROBABILITY_WORD_LENGTH, 4);
  for (const prev of [undefined, 4, 5, 6] as const) {
    for (const r of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
      const len = rollProbabilityWordLength({ previousLength: prev, roll: r });
      assert.ok(len >= 4 && len <= 6, `Expected 4..6, got ${len}`);
    }
  }

  // Verify weighted alternation hits 4, 5, and 6 across probability rolls
  assert.equal(rollProbabilityWordLength({ previousLength: 5, roll: 0.1 }), 4);
  assert.equal(rollProbabilityWordLength({ previousLength: 4, roll: 0.5 }), 5);
  assert.equal(rollProbabilityWordLength({ previousLength: 5, roll: 0.9 }), 6);

  const hint: GridBoxHint = { row: 0, col: 2, letter: 'A', source: 'default' };
  const userContext = { cityToken: 'London', timeOfDay: 'Morning' };
  const c4 = buildSmartHintClueText({ hint, previousClueWords: 5, roll: 0.1, userContext });
  const c5 = buildSmartHintClueText({ hint, previousClueWords: 4, roll: 0.45, userContext });
  const c6 = buildSmartHintClueText({ hint, previousClueWords: 5, roll: 0.9, userContext });

  assert.equal(c4.wordCount, 4);
  assert.equal(c4.text, 'Try A at 1-3');
  assert.equal(c4.text.trim().split(/\s+/).length, 4);

  assert.equal(c5.wordCount, 5);
  assert.equal(c5.text, 'Morning clue puts A 1-3');
  assert.equal(c5.text.trim().split(/\s+/).length, 5);

  assert.equal(c6.wordCount, 6);
  assert.equal(c6.text, 'London clue places A at 1-3');
  assert.equal(c6.text.trim().split(/\s+/).length, 6);
  assert.equal(/default hint|smart hint/i.test(`${c4.text} ${c5.text} ${c6.text}`), false);
});

test('progressive smart nudges avoid leaking target word', () => {
  const target = 'CRANE';
  const n1 = getProgressiveGuessNudge({ guess: 'PILOT', target, attemptIndex: 1, categoryName: 'Nature' });
  const n2 = getProgressiveGuessNudge({ guess: 'GHOST', target, attemptIndex: 2, categoryName: 'Nature' });
  const n3 = getProgressiveGuessNudge({ guess: 'STALK', target, attemptIndex: 3, categoryName: 'Nature' });

  for (const nudge of [n1, n2, n3]) {
    assert.ok(nudge.length >= 20);
    assert.equal(nudge.toUpperCase().includes(target), false, 'Nudge must not leak target word');
  }
});



