import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORDVIBE_APK_DOWNLOAD_URL,
  isBlockedGameUrlOnWeb,
  isNativeAndroidRuntime,
  isTermsPath,
  resolveAppEntryExperience,
} from './platformGateLogic';

test('WORDVIBE_APK_DOWNLOAD_URL points to wordvibe latest GitHub release', () => {
  assert.equal(WORDVIBE_APK_DOWNLOAD_URL, 'https://github.com/JOL889/wordvibe/releases/latest');
});

test('native Capacitor runtime always enters playable WordVibe game', () => {
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: true, pathname: '/', search: '' }),
    'game'
  );
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: true, pathname: '/puzzle', search: '?tab=trivia' }),
    'game'
  );
  assert.equal(isNativeAndroidRuntime({ isNativePlatform: () => true }), true);
  assert.equal(isNativeAndroidRuntime({ isNativePlatform: () => false }), false);
  assert.equal(isNativeAndroidRuntime(null), false);
});

test('regular web browser is gated to install_landing and blocks direct game routes', () => {
  const blockedUrls = [
    { pathname: '/', search: '' },
    { pathname: '/', search: '?tab=puzzle' },
    { pathname: '/', search: '?autostart=1' },
    { pathname: '/', search: '?tab=trivia' },
    { pathname: '/', search: '?tab=faith' },
    { pathname: '/puzzle', search: '' },
    { pathname: '/trivia', search: '' },
    { pathname: '/faith', search: '' },
    { pathname: '/home', search: '' },
    { pathname: '/play', search: '' },
  ];

  for (const url of blockedUrls) {
    assert.equal(
      resolveAppEntryExperience({
        isNativePlatform: false,
        pathname: url.pathname,
        search: url.search,
      }),
      'install_landing'
    );
  }

  assert.equal(isBlockedGameUrlOnWeb('/puzzle', ''), true);
  assert.equal(isBlockedGameUrlOnWeb('/', '?tab=puzzle'), true);
  assert.equal(isBlockedGameUrlOnWeb('/', '?autostart=1'), true);
  assert.equal(isBlockedGameUrlOnWeb('/', ''), false);
});

test('regular web browser preserves clean Privacy Policy and Terms routes for search indexing', () => {
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: false, pathname: '/privacy', search: '' }),
    'privacy'
  );
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: false, pathname: '/privacy/', search: '' }),
    'privacy'
  );
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: false, pathname: '/terms', search: '' }),
    'terms'
  );
  assert.equal(isTermsPath('/terms/'), true);
  assert.equal(isTermsPath('/'), false);
});
