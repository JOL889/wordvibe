import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORDVIBE_APK_DOWNLOAD_URL,
  WORDVIBE_APK_FILENAME,
  WORDVIBE_APK_RELEASES_URL,
  WORDVIBE_WEB_SHARE_URL,
  isBlockedGameUrlOnWeb,
  isNativeAndroidRuntime,
  isTermsPath,
  resolveAppEntryExperience,
} from './platformGateLogic';

test('WORDVIBE_APK_DOWNLOAD_URL points directly to latest WordVibe-release.apk asset and share URL uses wordvibe.pages.dev', () => {
  assert.equal(WORDVIBE_APK_FILENAME, 'WordVibe-release.apk');
  assert.equal(
    WORDVIBE_APK_DOWNLOAD_URL,
    'https://github.com/JOL889/wordvibe/releases/latest/download/WordVibe-release.apk'
  );
  assert.equal(WORDVIBE_APK_RELEASES_URL, 'https://github.com/JOL889/wordvibe/releases/latest');
  assert.equal(WORDVIBE_WEB_SHARE_URL, 'https://wordvibe.pages.dev');
});

test('native Capacitor runtime and Android WebView indicators always enter playable WordVibe game', () => {
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: true, pathname: '/', search: '' }),
    'game'
  );
  assert.equal(
    resolveAppEntryExperience({ isNativePlatform: true, pathname: '/puzzle', search: '?tab=trivia' }),
    'game'
  );
  assert.equal(isNativeAndroidRuntime({ isNativePlatform: () => true }, null), true);
  assert.equal(isNativeAndroidRuntime({ getPlatform: () => 'android' }, null), true);
  assert.equal(
    isNativeAndroidRuntime(
      { isNativePlatform: () => false },
      { Capacitor: { getPlatform: () => 'android' } }
    ),
    true
  );
  assert.equal(
    isNativeAndroidRuntime({ isNativePlatform: () => false }, { androidBridge: {} }),
    true
  );
  assert.equal(isNativeAndroidRuntime({ isNativePlatform: () => false }, null), false);
  assert.equal(isNativeAndroidRuntime(null, null), false);
});

test('regular web browser is gated to install_landing and blocks direct game routes', () => {
  const blockedUrls = [
    { pathname: '/', search: '' },
    { pathname: '/', search: '?tab=puzzle' },
    { pathname: '/', search: '?autostart=1' },
    { pathname: '/', search: '?tab=trivia' },
    { pathname: '/', search: '?tab=faith' },
    { pathname: '/', search: '?category=animals' },
    { pathname: '/index.html', search: '' },
    { pathname: '/puzzle', search: '' },
    { pathname: '/trivia', search: '' },
    { pathname: '/faith', search: '' },
    { pathname: '/home', search: '' },
    { pathname: '/play', search: '' },
    { pathname: '/daily', search: '' },
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
  assert.equal(isBlockedGameUrlOnWeb('/daily', ''), true);
  assert.equal(isBlockedGameUrlOnWeb('/index.html', ''), true);
  assert.equal(isBlockedGameUrlOnWeb('/', '?tab=puzzle'), true);
  assert.equal(isBlockedGameUrlOnWeb('/', '?autostart=1'), true);
  assert.equal(isBlockedGameUrlOnWeb('/privacy', ''), false);
  assert.equal(isBlockedGameUrlOnWeb('/terms', ''), false);
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
