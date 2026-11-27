import { Capacitor } from '@capacitor/core';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  inMemoryPersistence,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  buildEmailClaimUrl,
  buildUserSyncState,
  buildWhatsAppClaimUrl,
  type ClaimConfirmationReceipt,
  createDefaultVerifiedRewardState,
  createEmptyPendingBuffer,
  extractRemoteUserXpSnapshot,
  type FirebaseAuthType,
  generateClaimCode,
  getSyncCooldownRemainingMs,
  isLeaderboardCacheFresh,
  mergePlayerIntoLeaderboardTop,
  recomputeStateIntegrityHash,
  type RemoteLeaderboardEntry,
  resetUnverifiedDeltaAndFlag,
  REWARD_MILESTONE_XP,
  type RewardClaimInput,
  sanitizeLeaderboardDisplayName,
  validateRewardClaimInput,
  type VerifiedRewardLocalState,
  verifyBufferIntegrity,
  WEEKLY_PRIZE_POOL_LABEL,
  type WeeklyLeaderboardCache,
} from '../game/verifiedRewardsLogic';
import {
  ensureAuthPersistenceWithFallback,
  executeGoogleSignInFlow,
  type AuthPersistenceMode,
} from '../game/googleAuthFlowLogic';
import { isNativeAndroidRuntime } from '../game/platformGateLogic';
import { getUtcWeekKey } from '../game/weeklyLogic';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';

const VERIFIED_REWARDS_KEY = 'wordvibe_verified_rewards_v1';
const LEADERBOARD_CACHE_KEY = 'wordvibe_weekly_leaderboard_cache_v1';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resolveFirebaseAuthType(user: User | null): FirebaseAuthType {
  if (!user || user.isAnonymous) return 'anonymous';
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'email';
  return 'anonymous';
}

export function loadVerifiedRewardState(
  uid: string | null = null,
  displayName = 'Player'
): VerifiedRewardLocalState {
  const fallback = createDefaultVerifiedRewardState(uid, displayName);
  if (typeof window === 'undefined') return fallback;
  const parsed = safeJsonParse<Partial<VerifiedRewardLocalState>>(
    window.localStorage.getItem(VERIFIED_REWARDS_KEY)
  );
  if (!parsed || typeof parsed !== 'object') return fallback;

  const weekKey = typeof parsed.weekKey === 'string' && parsed.weekKey.length === 10
    ? parsed.weekKey
    : getUtcWeekKey();

  const merged: VerifiedRewardLocalState = {
    ...fallback,
    ...parsed,
    uid: typeof parsed.uid === 'string' ? parsed.uid : uid,
    displayName: sanitizeLeaderboardDisplayName(parsed.displayName || displayName),
    authType:
      parsed.authType === 'google' || parsed.authType === 'email' || parsed.authType === 'anonymous'
        ? parsed.authType
        : 'anonymous',
    verifiedRewardXp:
      typeof parsed.verifiedRewardXp === 'number' && Number.isFinite(parsed.verifiedRewardXp)
        ? parsed.verifiedRewardXp
        : 0,
    weeklyRewardXp:
      typeof parsed.weeklyRewardXp === 'number' && Number.isFinite(parsed.weeklyRewardXp)
        ? parsed.weeklyRewardXp
        : 0,
    weekKey,
    roundsPlayed: typeof parsed.roundsPlayed === 'number' ? parsed.roundsPlayed : 0,
    puzzlesSolved: typeof parsed.puzzlesSolved === 'number' ? parsed.puzzlesSolved : 0,
    triviaCorrect: typeof parsed.triviaCorrect === 'number' ? parsed.triviaCorrect : 0,
    streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
    dailyVerifiedXp: typeof parsed.dailyVerifiedXp === 'number' ? parsed.dailyVerifiedXp : 0,
    dailyWindowStartMs:
      typeof parsed.dailyWindowStartMs === 'number' ? parsed.dailyWindowStartMs : Date.now(),
    lastSyncAtMs: typeof parsed.lastSyncAtMs === 'number' ? parsed.lastSyncAtMs : 0,
    suspiciousActivity: Boolean(parsed.suspiciousActivity),
    suspiciousReason: typeof parsed.suspiciousReason === 'string' ? parsed.suspiciousReason : null,
    accountCreatedAtMs:
      typeof parsed.accountCreatedAtMs === 'number' ? parsed.accountCreatedAtMs : Date.now(),
    lastClaimId: typeof parsed.lastClaimId === 'string' ? parsed.lastClaimId : null,
    lastClaimCode: typeof parsed.lastClaimCode === 'string' ? parsed.lastClaimCode : null,
    integrityHash: typeof parsed.integrityHash === 'string' ? parsed.integrityHash : fallback.integrityHash,
    pendingBuffer:
      parsed.pendingBuffer && typeof parsed.pendingBuffer === 'object'
        ? {
            ...createEmptyPendingBuffer(parsed.uid || uid, weekKey),
            ...parsed.pendingBuffer,
            rounds: Array.isArray(parsed.pendingBuffer.rounds) ? parsed.pendingBuffer.rounds : [],
          }
        : createEmptyPendingBuffer(parsed.uid || uid, weekKey),
  };

  // Verify local integrity immediately on load so tampered localStorage values never display or persist
  const expectedHash = recomputeStateIntegrityHash(merged);
  const hashMatches =
    merged.integrityHash === expectedHash && merged.pendingBuffer.integrityHash === expectedHash;
  const integrity = verifyBufferIntegrity(merged, Date.now());
  if (!integrity.valid) {
    const sanitized = resetUnverifiedDeltaAndFlag(
      {
        ...merged,
        verifiedRewardXp: hashMatches ? merged.verifiedRewardXp : 0,
        weeklyRewardXp: hashMatches ? merged.weeklyRewardXp : 0,
        dailyVerifiedXp: hashMatches ? merged.dailyVerifiedXp : 0,
      },
      integrity.suspiciousReason || 'Local storage tamper detected'
    );
    saveVerifiedRewardState(sanitized);
    return sanitized;
  }

  return merged;
}

export function saveVerifiedRewardState(state: VerifiedRewardLocalState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VERIFIED_REWARDS_KEY, JSON.stringify(state));
}

export function loadWeeklyLeaderboardCache(): WeeklyLeaderboardCache | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeJsonParse<WeeklyLeaderboardCache>(
    window.localStorage.getItem(LEADERBOARD_CACHE_KEY)
  );
  if (!parsed || !Array.isArray(parsed.topEntries)) return null;
  return parsed;
}

export function saveWeeklyLeaderboardCache(cache: WeeklyLeaderboardCache): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(cache));
}

export function subscribeFirebaseAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export interface AuthActionResult {
  user: User | null;
  error?: string;
  providerDisabled?: boolean;
  domainUnauthorized?: boolean;
  redirectPending?: boolean;
}

export async function ensureAuthPersistence(): Promise<AuthPersistenceMode> {
  return ensureAuthPersistenceWithFallback(
    () => setPersistence(auth, browserLocalPersistence),
    () => setPersistence(auth, inMemoryPersistence)
  );
}

// Web OAuth Client ID (client_type: 3) from android/app/google-services.json for project mindspark-c417d
const DEFAULT_ANDROID_GOOGLE_WEB_CLIENT_ID =
  '1001699672232-tf73muliufu5itjn900qri6bk21v2c08.apps.googleusercontent.com';

function resolveAndroidGoogleWebClientId(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const fromEnv = env?.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
  return fromEnv || DEFAULT_ANDROID_GOOGLE_WEB_CLIENT_ID;
}

let socialLoginInitPromise: Promise<void> | null = null;

async function ensureNativeSocialLoginInitialized(): Promise<typeof import('@capgo/capacitor-social-login').SocialLogin> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!socialLoginInitPromise) {
    socialLoginInitPromise = SocialLogin.initialize({
      google: {
        webClientId: resolveAndroidGoogleWebClientId(),
        mode: 'online',
        skipAuthOnlyAuthorizationAfterSignIn: true,
      },
    }).catch((err) => {
      socialLoginInitPromise = null;
      throw err;
    });
  }
  await socialLoginInitPromise;
  return SocialLogin;
}

interface CapacitorPluginsBridge {
  FirebaseAuthentication?: {
    signInWithGoogle?: () => Promise<{
      credential?: { idToken?: string | null };
      user?: { idToken?: string | null };
    }>;
  };
  GoogleAuth?: {
    initialize?: (opts?: Record<string, unknown>) => Promise<void>;
    signIn?: () => Promise<{
      authentication?: { idToken?: string | null };
      idToken?: string | null;
    }>;
  };
}

function getCapacitorPlugins(): CapacitorPluginsBridge {
  if (typeof window === 'undefined') return {};
  const win = window as unknown as { Capacitor?: { Plugins?: CapacitorPluginsBridge } };
  return win.Capacitor?.Plugins || {};
}

async function fetchNativeCapacitorGoogleIdToken(): Promise<string> {
  const plugins = getCapacitorPlugins();

  // Primary native Android flow: @capgo/capacitor-social-login (Android Credential Manager)
  if (Capacitor.isPluginAvailable('SocialLogin') || isNativeAndroidRuntime(Capacitor)) {
    const SocialLogin = await ensureNativeSocialLoginInitialized();
    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
        style: 'standard',
        filterByAuthorizedAccounts: false,
      },
    });
    const result = response?.result;
    if (result && 'idToken' in result && result.idToken) {
      return result.idToken;
    }
  }

  // Secondary legacy native bridge fallbacks if registered
  if (
    Capacitor.isPluginAvailable('FirebaseAuthentication') &&
    typeof plugins.FirebaseAuthentication?.signInWithGoogle === 'function'
  ) {
    const result = await plugins.FirebaseAuthentication.signInWithGoogle();
    const idToken = result?.credential?.idToken || result?.user?.idToken;
    if (idToken) return idToken;
  }
  if (
    Capacitor.isPluginAvailable('GoogleAuth') &&
    typeof plugins.GoogleAuth?.signIn === 'function'
  ) {
    if (typeof plugins.GoogleAuth.initialize === 'function') {
      await plugins.GoogleAuth.initialize();
    }
    const result = await plugins.GoogleAuth.signIn();
    const idToken = result?.authentication?.idToken || result?.idToken;
    if (idToken) return idToken;
  }
  throw new Error('Native Google Sign-In did not return an ID token.');
}

function formatFriendlyAuthError(error: unknown, fallbackMessage: string): {
  error: string;
  providerDisabled?: boolean;
  domainUnauthorized?: boolean;
} {
  const code = (error as { code?: string })?.code || '';
  const rawMessage = error instanceof Error ? error.message : '';

  if (
    code === 'USER_CANCELLED' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return {
      error:
        code === 'USER_CANCELLED'
          ? 'Google sign-in was cancelled.'
          : 'Sign-in window closed before completion.',
    };
  }
  if (
    code === 'auth/unauthorized-domain' ||
    rawMessage.includes('auth/unauthorized-domain')
  ) {
    return {
      domainUnauthorized: true,
      error:
        'Google sign-in is paused on this preview domain — playing smoothly in Guest / Local Preview mode.',
    };
  }
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return {
      providerDisabled: true,
      error: 'Online provider sign-in is unavailable here — continuing in Local Practice mode.',
    };
  }
  if (code === 'auth/popup-blocked') {
    return { error: 'Pop-ups are blocked — retrying Google sign-in via redirect or use email.' };
  }
  if (code === 'auth/missing-initial-state') {
    return { error: 'Browser storage blocked redirect state — tap Continue with Google again.' };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return { error: 'Incorrect email or password.' };
  }
  if (code === 'auth/email-already-in-use') {
    return { error: 'That email is already registered — switch to Sign In.' };
  }
  if (code === 'auth/weak-password') {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (code === 'auth/network-request-failed') {
    return { error: 'You are offline — your progress continues saving locally.' };
  }
  return { error: fallbackMessage };
}

export async function ensureAnonymousSession(): Promise<AuthActionResult> {
  await ensureAuthPersistence();
  if (auth.currentUser) {
    return { user: auth.currentUser };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { user: null, error: 'Offline mode — playing with local Practice XP.' };
  }
  try {
    const cred = await signInAnonymously(auth);
    return { user: cred.user };
  } catch (error) {
    const formatted = formatFriendlyAuthError(error, 'Unable to start guest online session.');
    return { user: null, ...formatted };
  }
}

export async function consumeGoogleRedirectResult(): Promise<User | null> {
  if (typeof window === 'undefined' || isNativeAndroidRuntime(Capacitor)) {
    return null;
  }
  try {
    await ensureAuthPersistence();
    const res = await getRedirectResult(auth);
    return res?.user || null;
  } catch {
    return null;
  }
}

export async function signInOrLinkGoogle(): Promise<AuthActionResult> {
  const flowResult = await executeGoogleSignInFlow<User>({
    isNativePlatform: isNativeAndroidRuntime(Capacitor),
    getCurrentUser: () => auth.currentUser,
    ensurePersistence: ensureAuthPersistence,
    signInWithPopup: async () => {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    },
    linkWithPopup: async (currentUser) => {
      const linked = await linkWithPopup(currentUser, googleProvider);
      return linked.user;
    },
    signInWithRedirect: async () => {
      await signInWithRedirect(auth, googleProvider);
    },
    linkWithRedirect: async (currentUser) => {
      await linkWithRedirect(currentUser, googleProvider);
    },
    signInWithNativeGoogle: async () => {
      const idToken = await fetchNativeCapacitorGoogleIdToken();
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);
      return res.user;
    },
    linkWithNativeGoogle: async (currentUser) => {
      const idToken = await fetchNativeCapacitorGoogleIdToken();
      const credential = GoogleAuthProvider.credential(idToken);
      const linked = await linkWithCredential(currentUser, credential);
      return linked.user;
    },
  });

  if (flowResult.user) {
    return { user: flowResult.user };
  }
  if (flowResult.redirectPending) {
    return { user: null, redirectPending: true };
  }
  if (flowResult.cancelled) {
    return {
      user: null,
      error: flowResult.errorMessage || 'Google sign-in was cancelled.',
    };
  }
  const formatted = formatFriendlyAuthError(
    { code: flowResult.errorCode, message: flowResult.errorMessage },
    flowResult.errorMessage || 'Google sign-in could not be completed.'
  );
  return { user: null, ...formatted };
}

export async function signInOrLinkEmail(
  email: string,
  password: string,
  isCreate: boolean
): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail || password.length < 6) {
    return { user: null, error: 'Enter a valid email and at least 6 characters for password.' };
  }
  await ensureAuthPersistence();
  try {
    if (isCreate && auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const cred = EmailAuthProvider.credential(cleanEmail, password);
        const linked = await linkWithCredential(auth.currentUser, cred);
        return { user: linked.user };
      } catch (linkErr) {
        const code = (linkErr as { code?: string })?.code || '';
        if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
          const signedIn = await signInWithEmailAndPassword(auth, cleanEmail, password);
          return { user: signedIn.user };
        }
        throw linkErr;
      }
    }
    const res = isCreate
      ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
      : await signInWithEmailAndPassword(auth, cleanEmail, password);
    return { user: res.user };
  } catch (error) {
    const formatted = formatFriendlyAuthError(error, 'Email sign-in failed — check your details.');
    return { user: null, ...formatted };
  }
}

export async function updateFirebaseDisplayName(displayName: string): Promise<void> {
  if (!auth.currentUser) return;
  const clean = sanitizeLeaderboardDisplayName(displayName);
  if (!clean) return;
  try {
    await updateProfile(auth.currentUser, { displayName: clean });
  } catch {
    // Non-fatal: Firestore displayName still updates on next sync
  }
}

export async function signOutFirebaseSession(): Promise<void> {
  if (isNativeAndroidRuntime(Capacitor) && Capacitor.isPluginAvailable('SocialLogin')) {
    try {
      const SocialLogin = await ensureNativeSocialLoginInitialized();
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // Non-fatal: continue signing out Firebase Auth session
    }
  }
  await signOut(auth);
}

function timestampToMs(val: unknown, fallbackMs: number): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return fallbackMs;
}

export async function loadOrHydrateRemoteUserProfile(
  uid: string,
  localState: VerifiedRewardLocalState,
  displayName: string,
  authType: FirebaseAuthType
): Promise<{ state: VerifiedRewardLocalState; remoteExists: boolean }> {
  const userPath = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      const cleanLocal =
        localState.uid === uid
          ? {
              ...localState,
              displayName: sanitizeLeaderboardDisplayName(displayName || localState.displayName),
              authType,
            }
          : createDefaultVerifiedRewardState(uid, displayName, authType);
      return { state: cleanLocal, remoteExists: false };
    }

    const data = snap.data() as Record<string, unknown>;
    const nowMs = Date.now();
    const lastSyncAtMs = timestampToMs(data.lastSyncAt, 0);
    const remoteSnap = extractRemoteUserXpSnapshot(
      data,
      nowMs,
      lastSyncAtMs > 0 ? lastSyncAtMs : nowMs
    );
    const currentWeekKey = remoteSnap.weekKey;

    // Keep legitimate pending rounds only if local UID matches and passes integrity verification
    let pendingBuffer = createEmptyPendingBuffer(uid, currentWeekKey);
    let tamperDetectedReason: string | null = null;

    if (localState.uid === uid && localState.pendingBuffer.pendingXp > 0) {
      const check = verifyBufferIntegrity(localState, nowMs);
      if (check.valid && localState.verifiedRewardXp === remoteSnap.xp) {
        pendingBuffer = {
          ...localState.pendingBuffer,
          weekKey: currentWeekKey,
        };
      } else if (!check.valid) {
        tamperDetectedReason = check.suspiciousReason || 'Local XP state diverged from server';
      }
    }

    const hydrated: VerifiedRewardLocalState = {
      uid,
      displayName: sanitizeLeaderboardDisplayName(
        displayName || (typeof data.displayName === 'string' ? data.displayName : 'Player')
      ),
      authType,
      verifiedRewardXp: remoteSnap.xp,
      weeklyRewardXp: remoteSnap.weeklyXp,
      weekKey: currentWeekKey,
      roundsPlayed:
        remoteSnap.roundsPlayed > 0 || localState.uid !== uid
          ? remoteSnap.roundsPlayed
          : localState.roundsPlayed,
      puzzlesSolved:
        remoteSnap.puzzlesSolved > 0 || localState.uid !== uid
          ? remoteSnap.puzzlesSolved
          : localState.puzzlesSolved,
      triviaCorrect:
        remoteSnap.triviaCorrect > 0 || localState.uid !== uid
          ? remoteSnap.triviaCorrect
          : localState.triviaCorrect,
      streak:
        remoteSnap.streak > 0 || localState.uid !== uid
          ? remoteSnap.streak
          : localState.streak,
      dailyVerifiedXp: remoteSnap.dailyXp,
      dailyWindowStartMs: remoteSnap.dailyWindowStartMs,
      lastSyncAtMs,
      suspiciousActivity: Boolean(data.suspiciousActivity) || Boolean(tamperDetectedReason),
      suspiciousReason:
        tamperDetectedReason ||
        (typeof data.suspiciousReason === 'string' ? data.suspiciousReason : null),
      accountCreatedAtMs: timestampToMs(data.accountCreatedAt, nowMs),
      lastClaimId: typeof data.lastClaimId === 'string' ? data.lastClaimId : null,
      lastClaimCode: localState.lastClaimCode,
      integrityHash: '',
      pendingBuffer,
    };

    const nextHash = recomputeStateIntegrityHash(hydrated);
    hydrated.integrityHash = nextHash;
    hydrated.pendingBuffer.integrityHash = nextHash;

    return { state: hydrated, remoteExists: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export interface BatchSyncOutcome {
  state: VerifiedRewardLocalState;
  synced: boolean;
  flaggedTamper: boolean;
  cooldownRemainingMs: number;
  message: string;
}

export async function flushVerifiedBatchToFirestore(
  state: VerifiedRewardLocalState,
  nowMs: number = Date.now()
): Promise<BatchSyncOutcome> {
  if (!auth.currentUser || !state.uid || auth.currentUser.uid !== state.uid) {
    return {
      state,
      synced: false,
      flaggedTamper: false,
      cooldownRemainingMs: 0,
      message: 'Sign in online to sync Verified XP.',
    };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      state,
      synced: false,
      flaggedTamper: false,
      cooldownRemainingMs: 0,
      message: 'Offline — online XP stays safely buffered until reconnected.',
    };
  }

  const uid = state.uid;
  const userPath = `users/${uid}`;

  // Anti-cheat & tamper verification before flushing
  const integrity = verifyBufferIntegrity(state, nowMs);
  if (!integrity.valid) {
    const flagged = resetUnverifiedDeltaAndFlag(
      state,
      integrity.suspiciousReason || 'Integrity check failed'
    );
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const remoteData = snap.data() as Record<string, unknown>;
        const remoteSnap = extractRemoteUserXpSnapshot(
          remoteData,
          nowMs,
          timestampToMs(remoteData.lastSyncAt, nowMs)
        );
        await updateDoc(doc(db, 'users', uid), {
          xp: remoteSnap.xp,
          dailyXp: remoteSnap.dailyXp,
          weeklyXp: remoteSnap.weeklyXp,
          suspiciousActivity: true,
          suspiciousReason: flagged.suspiciousReason || 'Tamper detected',
          lastSyncAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
    return {
      state: flagged,
      synced: false,
      flaggedTamper: true,
      cooldownRemainingMs: 0,
      message: `Security check flagged: ${flagged.suspiciousReason}. Unverified XP reset.`,
    };
  }

  const cooldownLeft = getSyncCooldownRemainingMs(state.lastSyncAtMs, nowMs);
  if (cooldownLeft > 0) {
    const mins = Math.ceil(cooldownLeft / 60_000);
    return {
      state,
      synced: false,
      flaggedTamper: false,
      cooldownRemainingMs: cooldownLeft,
      message: `Recently synced — try again in ${mins}m.`,
    };
  }

  const pendingDeltaXp = state.pendingBuffer.pendingXp;
  const pendingDeltaRounds = state.pendingBuffer.rounds.length;
  if (pendingDeltaXp <= 0 && pendingDeltaRounds <= 0 && state.lastSyncAtMs > 0) {
    return {
      state,
      synced: false,
      flaggedTamper: false,
      cooldownRemainingMs: 0,
      message: 'Verified XP is already up to date.',
    };
  }

  const currentWeekKey = getUtcWeekKey(nowMs);

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const remoteData = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    const remoteLastSyncMs = remoteData ? timestampToMs(remoteData.lastSyncAt, nowMs) : nowMs;
    const syncPlan = buildUserSyncState({
      localState: state,
      remoteData,
      remoteLastSyncMs,
      nowMs,
    });
    const { nextState, isRemoteCreate, xp, dailyXp, weeklyXp, deltaXp, deltaRounds } = syncPlan;
    const cleanName = sanitizeLeaderboardDisplayName(nextState.displayName);

    if (isRemoteCreate) {
      await setDoc(userRef, {
        uid,
        displayName: cleanName,
        authType: nextState.authType,
        xp,
        dailyXp,
        weeklyXp,
        weekKey: currentWeekKey,
        roundsPlayed: Math.max(0, Math.floor(nextState.roundsPlayed)),
        puzzlesSolved: Math.max(0, Math.floor(nextState.puzzlesSolved)),
        triviaCorrect: Math.max(0, Math.floor(nextState.triviaCorrect)),
        streak: Math.max(0, Math.floor(nextState.streak)),
        dailyWindowStartMs: Math.floor(nextState.dailyWindowStartMs),
        lastSyncAt: serverTimestamp(),
        accountCreatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: cleanName,
        authType: nextState.authType,
        xp,
        dailyXp,
        weeklyXp,
        weekKey: currentWeekKey,
        roundsPlayed: Math.max(0, Math.floor(nextState.roundsPlayed)),
        puzzlesSolved: Math.max(0, Math.floor(nextState.puzzlesSolved)),
        triviaCorrect: Math.max(0, Math.floor(nextState.triviaCorrect)),
        streak: Math.max(0, Math.floor(nextState.streak)),
        dailyWindowStartMs: Math.floor(nextState.dailyWindowStartMs),
        lastSyncAt: serverTimestamp(),
      });
    }

    saveVerifiedRewardState(nextState);

    // Refresh local leaderboard summary cache without touching denied collection paths
    updateLocalLeaderboardSummaryCache({
      uid,
      name: cleanName,
      weeklyRewardXp: nextState.weeklyRewardXp,
      verifiedRewardXp: nextState.verifiedRewardXp,
      puzzlesSolved: nextState.puzzlesSolved,
      triviaCorrect: nextState.triviaCorrect,
      streak: nextState.streak,
      weekKey: currentWeekKey,
    });

    return {
      state: nextState,
      synced: true,
      flaggedTamper: false,
      cooldownRemainingMs: 0,
      message:
        deltaXp > 0
          ? `Synced +${deltaXp} Verified Online XP (${deltaRounds} round${deltaRounds === 1 ? '' : 's'})!`
          : 'Verified profile synced!',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

function updateLocalLeaderboardSummaryCache(playerEntry: RemoteLeaderboardEntry): WeeklyLeaderboardCache {
  const nowMs = Date.now();
  const existingCache = loadWeeklyLeaderboardCache();
  const existingTop: RemoteLeaderboardEntry[] =
    existingCache && existingCache.weekKey === playerEntry.weekKey
      ? existingCache.topEntries
      : [];

  const nextTop =
    playerEntry.weeklyRewardXp > 0
      ? mergePlayerIntoLeaderboardTop(existingTop, playerEntry, playerEntry.weekKey)
      : existingTop;

  const updatedCache: WeeklyLeaderboardCache = {
    weekKey: playerEntry.weekKey,
    updatedAtMs: nowMs,
    fetchedAtMs: nowMs,
    prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
    topEntries: nextTop,
  };
  saveWeeklyLeaderboardCache(updatedCache);
  return updatedCache;
}

export async function fetchWeeklyLeaderboardSingleDoc(
  forceRefresh = false
): Promise<{
  cache: WeeklyLeaderboardCache;
  fromCache: boolean;
  readsUsed: number;
}> {
  const nowMs = Date.now();
  const currentWeekKey = getUtcWeekKey(nowMs);
  const existingCache = loadWeeklyLeaderboardCache();

  if (!forceRefresh && isLeaderboardCacheFresh(existingCache, nowMs) && existingCache) {
    return { cache: existingCache, fromCache: true, readsUsed: 0 };
  }

  if (!auth.currentUser || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const fallback: WeeklyLeaderboardCache = existingCache || {
      weekKey: currentWeekKey,
      updatedAtMs: nowMs,
      fetchedAtMs: nowMs,
      prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
      topEntries: [],
    };
    return { cache: fallback, fromCache: true, readsUsed: 0 };
  }

  const uid = auth.currentUser.uid;
  const userPath = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      const freshEmpty: WeeklyLeaderboardCache = {
        weekKey: currentWeekKey,
        updatedAtMs: nowMs,
        fetchedAtMs: nowMs,
        prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
        topEntries:
          existingCache && existingCache.weekKey === currentWeekKey
            ? existingCache.topEntries
            : [],
      };
      saveWeeklyLeaderboardCache(freshEmpty);
      return { cache: freshEmpty, fromCache: false, readsUsed: 1 };
    }

    const data = snap.data() as Record<string, unknown>;
    const lastSyncAtMs = timestampToMs(data.lastSyncAt, nowMs);
    const remoteSnap = extractRemoteUserXpSnapshot(data, nowMs, lastSyncAtMs);
    const displayName = sanitizeLeaderboardDisplayName(
      typeof data.displayName === 'string'
        ? data.displayName
        : auth.currentUser.displayName || 'Player'
    );

    const freshCache = updateLocalLeaderboardSummaryCache({
      uid,
      name: displayName,
      weeklyRewardXp: remoteSnap.weeklyXp,
      verifiedRewardXp: remoteSnap.xp,
      puzzlesSolved: remoteSnap.puzzlesSolved,
      triviaCorrect: remoteSnap.triviaCorrect,
      streak: remoteSnap.streak,
      weekKey: currentWeekKey,
    });
    return { cache: freshCache, fromCache: false, readsUsed: 1 };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function submitVerifiedRewardClaim(params: {
  state: VerifiedRewardLocalState;
  input: RewardClaimInput;
}): Promise<{
  state: VerifiedRewardLocalState;
  receipt: ClaimConfirmationReceipt;
}> {
  const { state, input } = params;
  if (!auth.currentUser || !state.uid || auth.currentUser.uid !== state.uid) {
    throw new Error('Sign in with Firebase Auth before submitting a reward claim.');
  }

  const validation = validateRewardClaimInput(
    input,
    state.verifiedRewardXp,
    state.suspiciousActivity
  );
  if (!validation.valid || !validation.sanitized) {
    throw new Error(validation.error || 'Invalid reward claim details.');
  }

  const nowMs = Date.now();
  const uid = state.uid;
  const claimId = `claim_${uid.slice(0, 12)}_${nowMs}`;
  const claimCode = generateClaimCode(uid, nowMs);
  const clean = validation.sanitized;

  const userRef = doc(db, 'users', uid);
  const claimRef = doc(db, 'rewardClaims', claimId);
  const batch = writeBatch(db);

  batch.set(claimRef, {
    claimId,
    uid,
    fullName: clean.fullName,
    bankName: clean.bankName,
    accountNumber: clean.accountNumber,
    verifiedXpAtClaim: state.verifiedRewardXp,
    roundsPlayed: Math.max(1, state.roundsPlayed),
    accountCreatedAt: Timestamp.fromMillis(state.accountCreatedAtMs || nowMs),
    claimCode,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  batch.update(userRef, {
    verifiedRewardXp: state.verifiedRewardXp - REWARD_MILESTONE_XP,
    lastClaimId: claimId,
    lastSyncAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rewardClaims/${claimId}`);
  }

  const nextState: VerifiedRewardLocalState = {
    ...state,
    verifiedRewardXp: state.verifiedRewardXp - REWARD_MILESTONE_XP,
    lastClaimId: claimId,
    lastClaimCode: claimCode,
    lastSyncAtMs: nowMs,
  };
  const hash = recomputeStateIntegrityHash(nextState);
  nextState.integrityHash = hash;
  nextState.pendingBuffer = {
    ...nextState.pendingBuffer,
    integrityHash: hash,
  };
  saveVerifiedRewardState(nextState);

  const linkParams = {
    claimId,
    claimCode,
    uid,
    fullName: clean.fullName,
    bankName: clean.bankName,
    accountNumber: clean.accountNumber,
    verifiedXpAtClaim: state.verifiedRewardXp,
    roundsPlayed: Math.max(1, state.roundsPlayed),
  };

  return {
    state: nextState,
    receipt: {
      claimId,
      claimCode,
      fullName: clean.fullName,
      bankName: clean.bankName,
      accountNumber: clean.accountNumber,
      verifiedXpAtClaim: state.verifiedRewardXp,
      roundsPlayed: Math.max(1, state.roundsPlayed),
      createdAtIso: new Date(nowMs).toISOString(),
      whatsappUrl: buildWhatsAppClaimUrl(linkParams),
      emailUrl: buildEmailClaimUrl(linkParams),
    },
  };
}
