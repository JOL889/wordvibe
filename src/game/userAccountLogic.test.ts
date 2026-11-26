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

test('social share and invite payload builders include rank, XP, active players, and URL', () => {
  const board = createCrosswordBoard({ length: 5, level: 1, categoryId: 'general-classic' });
  const appUrl = 'https://wordvibe.example.com/?ref=Amara_Word';

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
  assert.equal(puzzlePayload.url, appUrl);

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

  const invitePayload = buildInviteFriendsPayload({
    username: 'Amara_Word',
    weeklyXp: 1420,
    rank: 8,
    totalActivePlayers: 64,
    appUrl,
  });
  assert.ok(invitePayload.text.includes('@Amara_Word'));
  assert.ok(invitePayload.text.includes('Rank #8 of 64 active players this week'));
  assert.equal(invitePayload.url, appUrl);
});
