import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidPuzzleCluesBundlePayload,
  isValidWordTriviaPayload,
  maskTargetWordIfLeaked,
  pickClueForRow,
  sanitizePuzzleCluesBundle,
} from './wordTriviaLogic.ts';
import { REWARD_PLACEMENTS } from '../services/rewardedAdService.ts';

test('maskTargetWordIfLeaked strips verbatim target words and simple inflections', () => {
  const masked = maskTargetWordIfLeaked(
    'This royal CROWN sits atop monarchs and crowns of ancient kingdoms.',
    'CROWN'
  );
  assert.equal(masked.toLowerCase().includes('crown'), false);
  assert.ok(masked.includes('_____'));
});

test('isValidWordTriviaPayload validates structured Gemini JSON shape', () => {
  assert.equal(
    isValidWordTriviaPayload({
      riddle:
        'A celestial arc named by Ptolemy and a gilded symbol placed upon sovereign brows alike bear this five-letter title.',
      lateralClue: 'Think of both dental anatomy and royal coronation regalia.',
      domain: 'History & Astronomy',
      answerFormatNote: '5-letter singular noun',
    }),
    true
  );

  assert.equal(
    isValidWordTriviaPayload({
      riddle: 'Solar star at center.',
      lateralClue: 'Orbits.',
      domain: 'Astronomy',
      answerFormatNote: 'Noun',
    }),
    true
  );

  assert.equal(
    isValidWordTriviaPayload({
      riddle: 'Short',
      lateralClue: 'Hint',
      domain: 'History',
      answerFormatNote: 'Noun',
    }),
    false
  );
});

test('sanitizePuzzleCluesBundle builds full 7-row bundle, masks leaks, and resolves per-row clues cleanly', () => {
  const raw = {
    riddle: 'This royal CROWN rests upon sovereigns and dental arches alike.',
    lateralClue: 'Think about coronation ceremonies and crowns.',
    domain: 'History & Anatomy',
    answerFormatNote: '5-letter noun',
    rowClues: [
      {
        rowNumber: 1,
        clue: 'Constellation Corona Borealis takes its Latin title from this CROWN emblem.',
        lateralNudge: 'Look skyward toward northern constellations.',
      },
      {
        rowNumber: 3,
        clue: 'In dentistry, the visible porcelain cap above the gumline shares this regal name.',
        lateralNudge: 'Dental restoration term.',
      },
    ],
  };

  assert.equal(isValidPuzzleCluesBundlePayload(raw), true);

  const bundle = sanitizePuzzleCluesBundle(raw, 'CROWN', 'General Vocabulary', 7);
  assert.equal(bundle.rowClues.length, 7);
  assert.equal(bundle.riddle.toLowerCase().includes('crown'), false);
  assert.equal(bundle.rowClues[0].clue.toLowerCase().includes('crown'), false);

  const row3 = pickClueForRow(bundle, 3);
  assert.match(row3.riddle, /dentistry/i);
  assert.equal(row3.lateralClue, 'Dental restoration term.');

  const row5Fallback = pickClueForRow(bundle, 5);
  assert.equal(row5Fallback.riddle, bundle.riddle);
});

test('puzzle_word_trivia placement is registered in AdMob reward configuration without hard trivia copy', () => {
  const meta = REWARD_PLACEMENTS.puzzle_word_trivia;
  assert.equal(meta.placement, 'puzzle_word_trivia');
  assert.equal(meta.durationSeconds, 5);
  assert.ok(meta.title.includes('Word Trivia'));
  assert.equal(/hard\s+trivia|hard\s+word\s+trivia/i.test(meta.title), false);
  assert.equal(/hard\s+trivia|hard\s+word\s+trivia/i.test(meta.description), false);
  assert.equal(/hard\s+trivia|hard\s+word\s+trivia/i.test(meta.rewardLabel), false);
  assert.match(meta.description, /horizontal line/i);
});
