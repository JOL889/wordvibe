import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getParlorStepEvents,
  OMITB_PARLOR_PIANO_BARS,
  OMITB_STEP_INTERVAL_MS,
  OMITB_STEPS_PER_BAR,
  ProceduralMusicPlayer,
} from '../services/musicPlayer';

test('OMITB parlor piano progression forms an 8-bar cozy-mystery A-minor chromatic descent loop', () => {
  assert.equal(OMITB_PARLOR_PIANO_BARS.length, 8);
  assert.equal(OMITB_STEPS_PER_BAR, 6);
  assert.ok(OMITB_STEP_INTERVAL_MS >= 220 && OMITB_STEP_INTERVAL_MS <= 320);

  // Chromatic descending bassline across the first 5 bars (A2 -> G#2 -> G2 -> F#2 -> F2)
  const firstFiveBass = OMITB_PARLOR_PIANO_BARS.slice(0, 5).map((b) => b.bassRoot);
  for (let i = 1; i < firstFiveBass.length; i++) {
    assert.ok(
      firstFiveBass[i] < firstFiveBass[i - 1],
      `Expected descending bass at bar ${i + 1}`
    );
  }

  for (const bar of OMITB_PARLOR_PIANO_BARS) {
    assert.equal(bar.chordNotes.length, 3);
    assert.equal(bar.melodySteps.length, 6);
    assert.ok(bar.melodySteps.some((n) => n !== null), `${bar.chordName} should have melody notes`);
  }
});

test('6/8 parlor step scheduler emits pizzicato bass, felt-piano chords, melody, and celesta sparkle', () => {
  const step0 = getParlorStepEvents(0);
  assert.ok(step0.some((e) => e.kind === 'bass'));
  assert.ok(step0.some((e) => e.kind === 'piano_melody'));

  const step1 = getParlorStepEvents(1);
  assert.equal(step1.filter((e) => e.kind === 'piano_chord').length, 2);

  const step4 = getParlorStepEvents(4);
  assert.ok(step4.some((e) => e.kind === 'celesta'));

  // Phrase pass 2 variation checks wrap cleanly
  const wrapStep = getParlorStepEvents(OMITB_PARLOR_PIANO_BARS.length * OMITB_STEPS_PER_BAR);
  assert.deepEqual(
    wrapStep.map((e) => ({ kind: e.kind, freq: e.freq })),
    step0.map((e) => ({ kind: e.kind, freq: e.freq }))
  );
});

test('ProceduralMusicPlayer state machine enforces user-interaction start, ad pause, background pause, and Music toggle', () => {
  const player = new ProceduralMusicPlayer();

  // Before first interaction, music stays paused even when enabled
  assert.equal(player.isEnabled(), true);
  assert.equal(player.shouldPlayNow(), false);

  // After first interaction, allowed to play
  player.unlockOnUserInteraction();
  assert.equal(player.shouldPlayNow(), true);

  // Pauses when a rewarded ad plays
  player.setPausedForAd(true);
  assert.equal(player.shouldPlayNow(), false);
  player.setPausedForAd(false);
  assert.equal(player.shouldPlayNow(), true);

  // Pauses when app goes into background
  player.setPausedForBackground(true);
  assert.equal(player.shouldPlayNow(), false);
  player.setPausedForBackground(false);
  assert.equal(player.shouldPlayNow(), true);

  // Independent Music toggle in Settings
  player.setEnabled(false);
  assert.equal(player.shouldPlayNow(), false);
  player.setEnabled(true);
  assert.equal(player.shouldPlayNow(), true);
});
