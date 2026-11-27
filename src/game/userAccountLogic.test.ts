import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrosswordBoard } from './crosswordLogic';
import {
  buildInviteFriendsPayload,
  buildLeaderboardSharePayload,
  buildPuzzleSharePayload,
  getBuiltinAvatarOption,
  hashPasswordLocal,
  normalizeEmailKey,
  normalizeUsername,
  sanitizeAvatarDataUrl,
  validateRegistrationInput,
  validateSignInInput,
  verifyPasswordLocal,
} from './userAccountLogic';

test('validateRegistrationInput validates Real Name, Username, Email, and Password rules', () => {
  const bad = validateRegistrationInput({
    realName: 'A',
    username: 'a',
    email: 'invalid-email',
    password: '123',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.realName);
  assert.ok(bad.errors.username);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.password);

  const ok = validateRegistrationInput({
    realName: '  Amara   Okafor ',
    username: '@Amara Word',
    email: 'AMARA@Example.com ',
    password: 'secretPassword1',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.normalized, {
    realName: 'Amara Okafor',
    username: 'Amara_Word',
    email: 'amara@example.com',
  });

  // In edit mode, blank password keeps existing hash without failing validation
  const editOk = validateRegistrationInput({
    realName: 'Amara Okafor',
    username: 'Amara_Word',
    email: 'amara@example.com',
    password: '',
    isEditing: true,
  });
  assert.equal(editOk.valid, true);
});

test('normalizeUsername and validateSignInInput normalize inputs cleanly', () => {
  assert.equal(normalizeUsername('  @@word spark  '), 'word_spark');
  assert.equal(normalizeEmailKey('  PLAYER@Example.COM '), 'player@example.com');

  const badSignIn = validateSignInInput({ email: 'bad', password: '123' });
  assert.equal(badSignIn.valid, false);
  assert.ok(badSignIn.errors.email);
  assert.ok(badSignIn.errors.password);

  const okSignIn = validateSignInInput({ email: '  PLAYER@Example.COM ', password: 'secretPassword1' });
  assert.equal(okSignIn.valid, true);
  assert.equal(okSignIn.normalized.email, 'player@example.com');
});

test('hashPasswordLocal produces salted SHA-256 hash verified by verifyPasswordLocal', async () => {
  const { hash, salt } = await hashPasswordLocal('MySecurePass99!');
  assert.equal(hash.length, 64);
  assert.equal(salt.length, 32);
  assert.equal(await verifyPasswordLocal('MySecurePass99!', salt, hash), true);
  assert.equal(await verifyPasswordLocal('WrongPass99!', salt, hash), false);
});

test('sanitizeAvatarDataUrl only accepts raster data URIs and rejects SVG or JS', () => {
  const validJpg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
  assert.equal(sanitizeAvatarDataUrl(validJpg), validJpg);
  assert.equal(sanitizeAvatarDataUrl('data:image/svg+xml;base64,PHN2Zz4='), undefined);
  assert.equal(sanitizeAvatarDataUrl('javascript:alert(1)'), undefined);
  assert.equal(getBuiltinAvatarOption('owl').id, 'owl');
  assert.equal(getBuiltinAvatarOption('nonexistent').id, 'crown');
});

test('social share and invite payload builders include rank, XP, active players, and wordvibe.pages.dev share URL', async () => {
  const {
    buildFaithSharePayload,
    buildLandingAppSharePayload,
    buildTriviaSharePayload,
    resolveShareAppUrl,
  } = await import('./userAccountLogic');
  const { buildSocialShareTargets, formatShareClipboardMessage } = await import(
    './shareServiceLogic'
  );
  const board = createCrosswordBoard({ length: 5, level: 1, categoryId: 'general-classic' });
  const appUrl = resolveShareAppUrl();

  assert.equal(appUrl, 'https://wordvibe.pages.dev');

  const puzzlePayload = buildPuzzleSharePayload({
    username: 'Amara_Word',
    board,
    weeklyXp: 1420,
    rank: 8,
    totalActivePlayers: 64,
    streak: 5,
    appUrl,
  });
  assert.ok(puzzlePayload.text.includes('@Amara_Word'));
  assert.ok(puzzlePayload.text.includes('Rank #8 of 64 active players this week'));
  assert.ok(puzzlePayload.text.includes('1,420 Weekly XP'));
  assert.ok(puzzlePayload.text.includes('Rows '));
  assert.ok(puzzlePayload.text.includes('Cols '));
  assert.equal(puzzlePayload.url, 'https://wordvibe.pages.dev');
  assert.ok(formatShareClipboardMessage(puzzlePayload).includes(`\nhttps://wordvibe.pages.dev`));

  const lbPayload = buildLeaderboardSharePayload({
    username: 'Amara_Word',
    weeklyXp: 1420,
    rank: 8,
    totalActivePlayers: 64,
    gradeLabel: 'B · Gold',
    streak: 5,
    appUrl,
  });
  assert.ok(lbPayload.title.includes('#8'));
  assert.ok(lbPayload.text.includes('Rank #8 of 64 active players this week'));
  assert.equal(lbPayload.url, 'https://wordvibe.pages.dev');

  const invitePayload = buildInviteFriendsPayload({
    username: 'Amara_Word',
    weeklyXp: 1420,
    rank: 8,
    totalActivePlayers: 64,
    streak: 5,
    appUrl,
  });
  assert.ok(invitePayload.text.includes('@Amara_Word'));
  assert.ok(invitePayload.text.includes('Rank #8 of 64 active players this week'));
  assert.ok(invitePayload.text.includes('5-day streak'));
  assert.equal(invitePayload.url, 'https://wordvibe.pages.dev');

  const triviaPayload = buildTriviaSharePayload({
    username: 'Amara_Word',
    streak: 7,
    bestStreak: 12,
    weeklyXp: 1420,
    rank: 8,
    totalActivePlayers: 64,
    categoryName: 'Science & Tech',
    appUrl,
  });
  assert.ok(triviaPayload.text.includes('7-question streak'));
  assert.equal(triviaPayload.url, 'https://wordvibe.pages.dev');

  const faithPayload = buildFaithSharePayload({
    username: 'Amara_Word',
    traditionName: 'Christianity',
    sacredTextLabel: 'Bible',
    correctCount: 4,
    answeredCount: 5,
    appUrl,
  });
  assert.ok(faithPayload.text.includes('Christianity'));
  assert.equal(faithPayload.url, 'https://wordvibe.pages.dev');

  const targets = buildSocialShareTargets(invitePayload);
  const platformIds = targets.map((t) => t.id);
  assert.deepEqual(platformIds, [
    'whatsapp',
    'x',
    'facebook',
    'telegram',
    'linkedin',
    'reddit',
    'sms',
    'email',
  ]);
  for (const target of targets) {
    assert.ok(
      target.href.includes(encodeURIComponent('https://wordvibe.pages.dev')),
      `Expected ${target.id} href to encode https://wordvibe.pages.dev`
    );
  }

  const landingPayload = buildLandingAppSharePayload();
  assert.equal(landingPayload.url, 'https://wordvibe.pages.dev');
  assert.ok(landingPayload.text.includes('Wordvibe'));
});
