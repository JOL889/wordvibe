import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureAuthPersistenceWithFallback,
  executeGoogleSignInFlow,
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
    signInWithNativeGoogle: async () => sampleUser,
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.deepEqual(noRedirectCalls, ['signInWithPopup']);
  assert.equal(closedRes.redirectPending, undefined);
  assert.equal(closedRes.errorCode, 'auth/popup-closed-by-user');
});

test('Capacitor native Android links anonymous user and falls back to native sign-in on credential-already-in-use without touching popup/redirect', async () => {
  const webCalls: string[] = [];
  const nativeLinkCalls: string[] = [];

  // Case 1: Anonymous user links cleanly via native Google credential
  const linkRes = await executeGoogleSignInFlow({
    isNativePlatform: true,
    getCurrentUser: () => anonUser,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => {
      webCalls.push('popup');
      return sampleUser;
    },
    linkWithPopup: async () => {
      webCalls.push('linkPopup');
      return sampleUser;
    },
    signInWithRedirect: async () => {
      webCalls.push('redirect');
    },
    linkWithRedirect: async () => {
      webCalls.push('linkRedirect');
    },
    signInWithNativeGoogle: async () => {
      nativeLinkCalls.push('nativeSignIn');
      return sampleUser;
    },
    linkWithNativeGoogle: async () => {
      nativeLinkCalls.push('nativeLink');
      return sampleUser;
    },
  });

  assert.deepEqual(webCalls, []);
  assert.deepEqual(nativeLinkCalls, ['nativeLink']);
  assert.equal(linkRes.user?.uid, 'google-uid-1');

  // Case 2: Existing Google account (credential-already-in-use) falls back to nativeSignIn
  const existingCalls: string[] = [];
  const existingRes = await executeGoogleSignInFlow({
    isNativePlatform: true,
    getCurrentUser: () => anonUser,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => sampleUser,
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {},
    linkWithRedirect: async () => {},
    signInWithNativeGoogle: async () => {
      existingCalls.push('nativeSignIn');
      return sampleUser;
    },
    linkWithNativeGoogle: async () => {
      existingCalls.push('nativeLink');
      const err = new Error('Credential already in use') as Error & { code: string };
      err.code = 'auth/credential-already-in-use';
      throw err;
    },
  });

  assert.deepEqual(existingCalls, ['nativeLink', 'nativeSignIn']);
  assert.equal(existingRes.user?.uid, 'google-uid-1');

  // Case 3: User cancellation returns clean cancelled result without popup/redirect
  const cancelRes = await executeGoogleSignInFlow({
    isNativePlatform: true,
    getCurrentUser: () => null,
    ensurePersistence: async () => 'local',
    signInWithPopup: async () => sampleUser,
    linkWithPopup: async () => sampleUser,
    signInWithRedirect: async () => {},
    linkWithRedirect: async () => {},
    signInWithNativeGoogle: async () => {
      const err = new Error('User cancelled Google login') as Error & { code: string };
      err.code = 'USER_CANCELLED';
      throw err;
    },
    linkWithNativeGoogle: async () => sampleUser,
  });

  assert.equal(cancelRes.user, null);
  assert.equal(cancelRes.cancelled, true);
  assert.equal(cancelRes.errorCode, 'USER_CANCELLED');
  assert.equal(cancelRes.errorMessage, 'Google sign-in was cancelled.');
});
