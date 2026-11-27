import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ADMOB_AD_UNITS,
  ADMOB_ANDROID_APP_ID,
  getAdMobUnitId,
  USE_TEST_ADS,
} from '../config/admob';
import {
  advanceSequentialRevealAd,
  APP_OPEN_COOLDOWN_MS,
  canShowAppOpenAd,
  canShowInterstitialWithCooldown,
  INTERSTITIAL_COOLDOWN_MS,
  shouldTriggerFourSecondLifeline,
  TRIVIA_LOW_TIMER_LIFELINE_SEC,
} from './admobFlowLogic';
import { admobService } from '../services/admobService';

test('AdMob configuration uses exact App ID, test toggle, and all 4 test/live unit pairs', () => {
  assert.equal(USE_TEST_ADS, true);
  assert.equal(ADMOB_ANDROID_APP_ID, 'ca-app-pub-7584471711915098~8594351362');

  assert.equal(ADMOB_AD_UNITS.rewarded.test, 'ca-app-pub-3940256099942544/5224354917');
  assert.equal(ADMOB_AD_UNITS.rewarded.live, 'ca-app-pub-7584471711915098/9549174533');

  assert.equal(ADMOB_AD_UNITS.rewardedInterstitial.test, 'ca-app-pub-3940256099942544/5354046379');
  assert.equal(ADMOB_AD_UNITS.rewardedInterstitial.live, 'ca-app-pub-7584471711915098/1779650679');

  assert.equal(ADMOB_AD_UNITS.interstitial.test, 'ca-app-pub-3940256099942544/1033173712');
  assert.equal(ADMOB_AD_UNITS.interstitial.live, 'ca-app-pub-7584471711915098/9215287564');

  assert.equal(ADMOB_AD_UNITS.appOpen.test, 'ca-app-pub-3940256099942544/9257395921');
  assert.equal(ADMOB_AD_UNITS.appOpen.live, 'ca-app-pub-7584471711915098/7111868404');

  assert.equal(getAdMobUnitId('rewarded'), ADMOB_AD_UNITS.rewarded.test);
  assert.equal(getAdMobUnitId('rewarded', false), ADMOB_AD_UNITS.rewarded.live);
  assert.equal(getAdMobUnitId('rewardedInterstitial', false), ADMOB_AD_UNITS.rewardedInterstitial.live);
  assert.equal(getAdMobUnitId('interstitial', false), ADMOB_AD_UNITS.interstitial.live);
  assert.equal(getAdMobUnitId('appOpen', false), ADMOB_AD_UNITS.appOpen.live);
});

test('Interstitial cooldown prevents back-to-back double firing', () => {
  const t0 = 1_000_000;
  assert.equal(canShowInterstitialWithCooldown(0, t0), true);
  assert.equal(canShowInterstitialWithCooldown(t0, t0 + 1_000), false);
  assert.equal(canShowInterstitialWithCooldown(t0, t0 + INTERSTITIAL_COOLDOWN_MS - 1), false);
  assert.equal(canShowInterstitialWithCooldown(t0, t0 + INTERSTITIAL_COOLDOWN_MS), true);
});

test('App Open ad eligibility suppresses web browsers, active auth flows, active ads, and cooldown windows', () => {
  const now = 2_000_000;
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: false,
      isAdShowing: false,
      isAuthModalOpen: false,
      isAuthBusy: false,
      lastShownAtMs: 0,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: true,
      isAdShowing: false,
      isAuthModalOpen: true,
      isAuthBusy: false,
      lastShownAtMs: 0,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: true,
      isAdShowing: false,
      isAuthModalOpen: false,
      isAuthBusy: true,
      lastShownAtMs: 0,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: true,
      isAdShowing: true,
      isAuthModalOpen: false,
      isAuthBusy: false,
      lastShownAtMs: 0,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: true,
      isAdShowing: false,
      isAuthModalOpen: false,
      isAuthBusy: false,
      lastShownAtMs: now - APP_OPEN_COOLDOWN_MS + 1000,
      nowMs: now,
    }),
    false
  );
  assert.equal(
    canShowAppOpenAd({
      isNativePlatform: true,
      isAdShowing: false,
      isAuthModalOpen: false,
      isAuthBusy: false,
      lastShownAtMs: now - APP_OPEN_COOLDOWN_MS,
      nowMs: now,
    }),
    true
  );
});

test('4-second Rewarded Interstitial lifeline triggers only once per unanswered level_climb question at 4s', () => {
  assert.equal(TRIVIA_LOW_TIMER_LIFELINE_SEC, 4);
  assert.equal(
    shouldTriggerFourSecondLifeline({
      sessionMode: 'level_climb',
      timeLeftSec: 5,
      isAnswered: false,
      isTimedOut: false,
      isStageComplete: false,
      alreadyOfferedForQuestion: false,
      isPaused: false,
    }),
    false
  );
  assert.equal(
    shouldTriggerFourSecondLifeline({
      sessionMode: 'level_climb',
      timeLeftSec: 4,
      isAnswered: false,
      isTimedOut: false,
      isStageComplete: false,
      alreadyOfferedForQuestion: false,
      isPaused: false,
    }),
    true
  );
  assert.equal(
    shouldTriggerFourSecondLifeline({
      sessionMode: 'level_climb',
      timeLeftSec: 4,
      isAnswered: false,
      isTimedOut: false,
      isStageComplete: false,
      alreadyOfferedForQuestion: true,
      isPaused: false,
    }),
    false
  );
  assert.equal(
    shouldTriggerFourSecondLifeline({
      sessionMode: 'sprint',
      timeLeftSec: 4,
      isAnswered: false,
      isTimedOut: false,
      isStageComplete: false,
      alreadyOfferedForQuestion: false,
      isPaused: false,
    }),
    false
  );
  assert.equal(
    shouldTriggerFourSecondLifeline({
      sessionMode: 'level_climb',
      timeLeftSec: 4,
      isAnswered: false,
      isTimedOut: false,
      isStageComplete: false,
      alreadyOfferedForQuestion: false,
      isPaused: true,
    }),
    false
  );
});

test('Endless Sprint 2-ad reveal requires both sequential ads (1/2 -> 2/2) before revealing answer', () => {
  const step1 = advanceSequentialRevealAd(0, 2);
  assert.deepEqual(step1, { completedAds: 1, requiredAds: 2, revealed: false });

  const step2 = advanceSequentialRevealAd(step1.completedAds, 2);
  assert.deepEqual(step2, { completedAds: 2, requiredAds: 2, revealed: true });
});

test('admobService safely no-ops in non-native environments', async () => {
  assert.equal(admobService.isNativeRuntime(), false);
  await admobService.initialize();
  await admobService.preloadAll();
  const rewardedRes = await admobService.showRewarded('hint');
  assert.deepEqual(rewardedRes, { shown: false, rewarded: false, reason: 'web_noop' });
  const riRes = await admobService.showRewardedInterstitial('trivia_low_timer_lifeline');
  assert.deepEqual(riRes, { shown: false, rewarded: false, reason: 'web_noop' });
  const interRes = await admobService.showInterstitial('share_or_invite');
  assert.deepEqual(interRes, { shown: false, reason: 'web_noop' });
  const appOpenShown = await admobService.showAppOpenIfEligible('launch');
  assert.equal(appOpenShown, false);
});

test('configure-android-admob script injects APPLICATION_ID into strings.xml and AndroidManifest.xml idempotently', async () => {
  const { configureAndroidAdMobFiles } = await import('../../scripts/configure-android-admob.mjs');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wordvibe-admob-test-'));

  try {
    fs.copyFileSync(
      path.join(process.cwd(), 'capacitor.config.ts'),
      path.join(tmpRoot, 'capacitor.config.ts')
    );
    const valuesDir = path.join(tmpRoot, 'android', 'app', 'src', 'main', 'res', 'values');
    const manifestDir = path.join(tmpRoot, 'android', 'app', 'src', 'main');
    fs.mkdirSync(valuesDir, { recursive: true });

    const stringsPath = path.join(valuesDir, 'strings.xml');
    const manifestPath = path.join(manifestDir, 'AndroidManifest.xml');

    fs.writeFileSync(
      stringsPath,
      `<?xml version='1.0' encoding='utf-8'?>\n<resources>\n    <string name="app_name">Wordvibe</string>\n</resources>\n`,
      'utf8'
    );
    fs.writeFileSync(
      manifestPath,
      `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application android:label="@string/app_name">\n    </application>\n</manifest>\n`,
      'utf8'
    );

    const first = configureAndroidAdMobFiles(tmpRoot);
    assert.equal(first.configured, true);
    assert.equal(first.appId, 'ca-app-pub-7584471711915098~8594351362');

    const stringsAfterFirst = fs.readFileSync(stringsPath, 'utf8');
    const manifestAfterFirst = fs.readFileSync(manifestPath, 'utf8');
    assert.match(stringsAfterFirst, /<string name="admob_app_id">ca-app-pub-7584471711915098~8594351362<\/string>/);
    assert.match(manifestAfterFirst, /android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"/);
    assert.match(manifestAfterFirst, /android:value="@string\/admob_app_id"/);

    // Running sync a second time must remain idempotent with zero duplicate entries
    configureAndroidAdMobFiles(tmpRoot);
    const stringsAfterSecond = fs.readFileSync(stringsPath, 'utf8');
    const manifestAfterSecond = fs.readFileSync(manifestPath, 'utf8');
    assert.equal(stringsAfterSecond, stringsAfterFirst);
    assert.equal(manifestAfterSecond, manifestAfterFirst);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
