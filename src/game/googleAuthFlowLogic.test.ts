import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureAuthPersistenceWithFallback,
  executeGoogleSignInFlow,
  NATIVE_ANDROID_GOOGLE_UNAVAILABLE_MESSAGE,
  type MinimalAuthUser,
} from './googleAuthFlowLogic';

const sampleUser: MinimalAuthUser = {
  uid: 'google-uid-1',
  isAnonymous: false,
  email: 'player@example.com',
  displayName: 'Player One',
};

const anonUser: MinimalAuthUser = {
  uid: 'anon-uid-1',
  isAnonymous: true,
};

test('ensureAuthPersistenceWithFallback prefers browserLocalPersistence and falls back to inMemoryPersistence', async () => {
  const modeLocal = await ensureAuthPersistenceWithFallback(
    async () => {},
    async () => {
      throw new Error('should not reach memory');
    }
  );
  assert.equal(modeLocal, 'local');

  const modeMem = await ensureAuthPersistenceWithFallback(
    async () => {
      throw new Error('QuotaExceededError');
    },
    async () => {}
  );
  assert.equal(modeMem, 'memory');

  const modeUnchanged = await ensureAuthPersistenceWithFallback(
    async () => {
      throw new Error('blocked');
    },
    async () => {
      throw new Error('blocked');
    }
  );
  assert.equal(modeUnchanged, 'unchanged');
});

test('web Google sign-in sets persistence first and uses signInWithPopup without calling redirect', async () => {
  const calls: string[] = [];
  const res = await executeGoogleSignInFlow({
    isNativePlatform: false,
    getCurrentUser: () => null,
    ensurePersistence: async () => {
      calls.push('persistence');
      return 'local';
    },
    signInWithPopup: async () => {
      calls.push('signInWithPopup');
      return sampleUser;
    },
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {
      calls.push('signInWithRedirect');
    },
    linkWithRedirect: async () => {
      calls.push('linkWithRedirect');
    },
    hasNativeGooglePlugin: () => false,
    signInWithNativeGoogle: async () => sampleUser,
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.deepEqual(calls, ['persistence', 'signInWithPopup']);
  assert.equal(res.user?.uid, 'google-uid-1');
  assert.equal(res.persistenceMode, 'local');
  assert.equal(res.redirectPending, undefined);
});

test('web Google sign-in falls back to signInWithRedirect ONLY when auth/popup-blocked is thrown', async () => {
  const calls: string[] = [];
  const res = await executeGoogleSignInFlow({
    isNativePlatform: false,
    getCurrentUser: () => null,
    ensurePersistence: async () => 'memory',
    signInWithPopup: async () => {
      calls.push('signInWithPopup');
      const err = new Error('Popup blocked') as Error & { code: string };
      err.code = 'auth/popup-blocked';
      throw err;
    },
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {
      calls.push('signInWithRedirect');
    },
    linkWithRedirect: async () => {},
    hasNativeGooglePlugin: () => false,
    signInWithNativeGoogle: async () => sampleUser,
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.deepEqual(calls, ['signInWithPopup', 'signInWithRedirect']);
  assert.equal(res.user, null);
  assert.equal(res.redirectPending, true);
  assert.equal(res.persistenceMode, 'memory');

  // Other popup errors (e.g., auth/popup-closed-by-user) must NOT fall back to redirect
  const noRedirectCalls: string[] = [];
  const closedRes = await executeGoogleSignInFlow({
    isNativePlatform: false,
    getCurrentUser: () => null,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => {
      noRedirectCalls.push('signInWithPopup');
      const err = new Error('Closed') as Error & { code: string };
      err.code = 'auth/popup-closed-by-user';
      throw err;
    },
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {
      noRedirectCalls.push('signInWithRedirect');
    },
    linkWithRedirect: async () => {},
    hasNativeGooglePlugin: () => false,
    signInWithNativeGoogle: async () => sampleUser,
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.deepEqual(noRedirectCalls, ['signInWithPopup']);
  assert.equal(closedRes.redirectPending, undefined);
  assert.equal(closedRes.errorCode, 'auth/popup-closed-by-user');
});

test('Capacitor native Android never opens firebaseapp.com popup/redirect and uses native Google or graceful fallback', async () => {
  const calls: string[] = [];

  // Case 1: Native plugin absent -> graceful fallback error without touching popup/redirect
  const noPluginRes = await executeGoogleSignInFlow({
    isNativePlatform: true,
    getCurrentUser: () => anonUser,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => {
      calls.push('popup');
      return sampleUser;
    },
    linkWithPopup: async () => {
      calls.push('linkPopup');
      return sampleUser;
    },
    signInWithRedirect: async () => {
      calls.push('redirect');
    },
    linkWithRedirect: async () => {
      calls.push('linkRedirect');
    },
    hasNativeGooglePlugin: () => false,
    signInWithNativeGoogle: async () => sampleUser,
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.deepEqual(calls, []);
  assert.equal(noPluginRes.user, null);
  assert.equal(noPluginRes.nativePluginMissing, true);
  assert.equal(noPluginRes.errorMessage, NATIVE_ANDROID_GOOGLE_UNAVAILABLE_MESSAGE);

  // Case 2: Native Google plugin installed -> links anonymous user cleanly via native credential
  const withPluginCalls: string[] = [];
  const nativeRes = await executeGoogleSignInFlow({
    isNativePlatform: true,
    getCurrentUser: () => anonUser,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => sampleUser,
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {},
    linkWithRedirect: async () => {},
    hasNativeGooglePlugin: () => true,
    signInWithNativeGoogle: async () => {
      withPluginCalls.push('nativeSignIn');
      return sampleUser;
    },
    linkWithNativeGoogle: async () => {
      withPluginCalls.push('nativeLink');
      return sampleUser;
    },
  });

  assert.deepEqual(withPluginCalls, ['nativeLink']);
  assert.equal(nativeRes.user?.uid, 'google-uid-1');
});
