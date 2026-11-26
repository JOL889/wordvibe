import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
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
  applySuccessfulBatchSync,
  buildEmailClaimUrl,
  buildWhatsAppClaimUrl,
  type ClaimConfirmationReceipt,
  computeIntegrityHash,
  createDefaultVerifiedRewardState,
  createEmptyPendingBuffer,
  DAY_WINDOW_MS,
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
import { getUtcWeekKey } from '../game/weeklyLogic';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';

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
}

export async function ensureAnonymousSession(): Promise<AuthActionResult> {
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
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      return {
        user: null,
        providerDisabled: true,
        error: 'Enable Anonymous Auth in Firebase Console (or sign in with Google) to earn Verified XP.',
      };
    }
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unable to start Firebase guest session.',
    };
  }
}

export async function signInOrLinkGoogle(): Promise<AuthActionResult> {
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const linked = await linkWithPopup(auth.currentUser, googleProvider);
        return { user: linked.user };
      } catch (linkErr) {
        const code = (linkErr as { code?: string })?.code || '';
        if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
          const signedIn = await signInWithPopup(auth, googleProvider);
          return { user: signedIn.user };
        }
        throw linkErr;
      }
    }
    const res = await signInWithPopup(auth, googleProvider);
    return { user: res.user };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Google sign-in canceled or failed.',
    };
  }
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
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return {
        user: null,
        providerDisabled: true,
        error: 'Enable Email/Password sign-in in Firebase Console Authentication settings.',
      };
    }
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Email authentication failed.',
    };
  }
}

export async function signOutFirebaseSession(): Promise<void> {
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

    const data = snap.data();
    const nowMs = Date.now();
    const currentWeekKey = getUtcWeekKey(nowMs);
    const remoteWeekKey = typeof data.weekKey === 'string' ? data.weekKey : currentWeekKey;
    const remoteWeeklyXp =
      remoteWeekKey === currentWeekKey && typeof data.weeklyRewardXp === 'number'
        ? data.weeklyRewardXp
        : 0;
    const remoteDailyStart =
      typeof data.dailyWindowStartMs === 'number' ? data.dailyWindowStartMs : nowMs;
    const remoteDailyXp =
      nowMs - remoteDailyStart >= DAY_WINDOW_MS
        ? 0
        : typeof data.dailyVerifiedXp === 'number'
        ? data.dailyVerifiedXp
        : 0;

    // Keep legitimate pending rounds only if local UID matches and passes integrity verification
    let pendingBuffer = createEmptyPendingBuffer(uid, currentWeekKey);
    let tamperDetectedReason: string | null = null;

    if (localState.uid === uid && localState.pendingBuffer.pendingXp > 0) {
      const check = verifyBufferIntegrity(localState, nowMs);
      if (check.valid && localState.verifiedRewardXp === (data.verifiedRewardXp || 0)) {
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
      verifiedRewardXp: typeof data.verifiedRewardXp === 'number' ? data.verifiedRewardXp : 0,
      weeklyRewardXp: remoteWeeklyXp,
      weekKey: currentWeekKey,
      roundsPlayed: typeof data.roundsPlayed === 'number' ? data.roundsPlayed : 0,
      puzzlesSolved: typeof data.puzzlesSolved === 'number' ? data.puzzlesSolved : 0,
      triviaCorrect: typeof data.triviaCorrect === 'number' ? data.triviaCorrect : 0,
      streak: typeof data.streak === 'number' ? data.streak : 0,
      dailyVerifiedXp: remoteDailyXp,
      dailyWindowStartMs: nowMs - remoteDailyStart >= DAY_WINDOW_MS ? nowMs : remoteDailyStart,
      lastSyncAtMs: timestampToMs(data.lastSyncAt, 0),
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
        await updateDoc(doc(db, 'users', uid), {
          suspiciousActivity: true,
          suspiciousReason: flagged.suspiciousReason || 'Tamper detected',
          lastBatchXpDelta: 0,
          roundsCompletedInBatch: 0,
          integrityHash: flagged.integrityHash,
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
      message: `Sync cooldown active (${mins}m left to protect daily quota).`,
    };
  }

  const deltaXp = state.pendingBuffer.pendingXp;
  const deltaRounds = state.pendingBuffer.rounds.length;
  if (deltaXp <= 0 && deltaRounds <= 0 && state.lastSyncAtMs > 0) {
    return {
      state,
      synced: false,
      flaggedTamper: false,
      cooldownRemainingMs: 0,
      message: 'Verified XP is already up to date.',
    };
  }

  const currentWeekKey = getUtcWeekKey(nowMs);
  const nextState = applySuccessfulBatchSync(state, nowMs);
  const hashForDoc = computeIntegrityHash({
    uid,
    verifiedRewardXp: nextState.verifiedRewardXp,
    weeklyRewardXp: nextState.weeklyRewardXp,
    roundsPlayed: nextState.roundsPlayed,
    dailyVerifiedXp: nextState.dailyVerifiedXp,
    pendingXp: 0,
    pendingRoundsCount: 0,
    weekKey: currentWeekKey,
  });
  nextState.integrityHash = hashForDoc;
  nextState.pendingBuffer.integrityHash = hashForDoc;

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const cleanName = sanitizeLeaderboardDisplayName(nextState.displayName);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName: cleanName,
        authType: nextState.authType,
        verifiedRewardXp: nextState.verifiedRewardXp,
        weeklyRewardXp: nextState.weeklyRewardXp,
        weekKey: currentWeekKey,
        roundsPlayed: nextState.roundsPlayed,
        puzzlesSolved: nextState.puzzlesSolved,
        triviaCorrect: nextState.triviaCorrect,
        streak: nextState.streak,
        dailyVerifiedXp: nextState.dailyVerifiedXp,
        dailyWindowStartMs: nextState.dailyWindowStartMs,
        lastSyncAt: serverTimestamp(),
        roundsCompletedInBatch: deltaRounds,
        lastBatchXpDelta: deltaXp,
        integrityHash: hashForDoc,
        suspiciousActivity: false,
        accountCreatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: cleanName,
        authType: nextState.authType,
        verifiedRewardXp: nextState.verifiedRewardXp,
        weeklyRewardXp: nextState.weeklyRewardXp,
        weekKey: currentWeekKey,
        roundsPlayed: nextState.roundsPlayed,
        puzzlesSolved: nextState.puzzlesSolved,
        triviaCorrect: nextState.triviaCorrect,
        streak: nextState.streak,
        dailyVerifiedXp: nextState.dailyVerifiedXp,
        dailyWindowStartMs: nextState.dailyWindowStartMs,
        lastSyncAt: serverTimestamp(),
        roundsCompletedInBatch: deltaRounds,
        lastBatchXpDelta: deltaXp,
        integrityHash: hashForDoc,
      });
    }

    // Conditionally refresh shared weekly_current summary if player qualifies for top 25
    await maybeRefreshWeeklyLeaderboardSummary({
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

async function maybeRefreshWeeklyLeaderboardSummary(playerEntry: RemoteLeaderboardEntry): Promise<void> {
  if (playerEntry.weeklyRewardXp <= 0) return;
  const cached = loadWeeklyLeaderboardCache();
  const minQualifyingXp =
    cached &&
    cached.weekKey === playerEntry.weekKey &&
    cached.topEntries.length >= 25
      ? cached.topEntries[cached.topEntries.length - 1].weeklyRewardXp
      : 0;

  if (cached && cached.weekKey === playerEntry.weekKey && playerEntry.weeklyRewardXp < minQualifyingXp) {
    return;
  }

  const boardPath = 'leaderboards/weekly_current';
  try {
    const boardRef = doc(db, 'leaderboards', 'weekly_current');
    const boardSnap = await getDoc(boardRef);
    const existingTop: RemoteLeaderboardEntry[] =
      boardSnap.exists() && Array.isArray(boardSnap.data().topEntries)
        ? (boardSnap.data().topEntries as RemoteLeaderboardEntry[])
        : [];

    const nextTop = mergePlayerIntoLeaderboardTop(existingTop, playerEntry, playerEntry.weekKey);
    const payload = {
      weekKey: playerEntry.weekKey,
      updatedAt: serverTimestamp(),
      prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
      lastUpdatedBy: playerEntry.uid,
      topEntries: nextTop,
    };

    if (!boardSnap.exists()) {
      await setDoc(boardRef, payload);
    } else {
      await updateDoc(boardRef, payload);
    }

    const nowMs = Date.now();
    saveWeeklyLeaderboardCache({
      weekKey: playerEntry.weekKey,
      updatedAtMs: nowMs,
      fetchedAtMs: nowMs,
      prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
      topEntries: nextTop,
    });
  } catch {
    // Non-fatal: individual user sync already succeeded
  }
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

  const boardPath = 'leaderboards/weekly_current';
  try {
    const snap = await getDoc(doc(db, 'leaderboards', 'weekly_current'));
    if (!snap.exists()) {
      const emptyCache: WeeklyLeaderboardCache = {
        weekKey: currentWeekKey,
        updatedAtMs: nowMs,
        fetchedAtMs: nowMs,
        prizePoolLabel: WEEKLY_PRIZE_POOL_LABEL,
        topEntries: [],
      };
      saveWeeklyLeaderboardCache(emptyCache);
      return { cache: emptyCache, fromCache: false, readsUsed: 1 };
    }

    const data = snap.data();
    const boardWeek = typeof data.weekKey === 'string' ? data.weekKey : currentWeekKey;
    const rawEntries = Array.isArray(data.topEntries)
      ? (data.topEntries as RemoteLeaderboardEntry[]).filter(
          (e) => e && typeof e.uid === 'string' && (!e.weekKey || e.weekKey === currentWeekKey)
        )
      : [];

    const freshCache: WeeklyLeaderboardCache = {
      weekKey: boardWeek === currentWeekKey ? boardWeek : currentWeekKey,
      updatedAtMs: timestampToMs(data.updatedAt, nowMs),
      fetchedAtMs: nowMs,
      prizePoolLabel:
        typeof data.prizePoolLabel === 'string' ? data.prizePoolLabel : WEEKLY_PRIZE_POOL_LABEL,
      topEntries: rawEntries.slice(0, 25),
    };
    saveWeeklyLeaderboardCache(freshCache);
    return { cache: freshCache, fromCache: false, readsUsed: 1 };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, boardPath);
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
