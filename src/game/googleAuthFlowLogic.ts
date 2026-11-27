export type AuthPersistenceMode = 'local' | 'memory' | 'unchanged';

export interface MinimalAuthUser {
  uid: string;
  isAnonymous: boolean;
  email?: string | null;
  displayName?: string | null;
}

export interface GoogleSignInFlowDeps<TUser extends MinimalAuthUser = MinimalAuthUser> {
  isNativePlatform: boolean;
  getCurrentUser: () => TUser | null;
  ensurePersistence: () => Promise<AuthPersistenceMode>;
  signInWithPopup: () => Promise<TUser>;
  linkWithPopup: (currentUser: TUser) => Promise<TUser>;
  signInWithRedirect: () => Promise<void>;
  linkWithRedirect: (currentUser: TUser) => Promise<void>;
  signInWithNativeGoogle: () => Promise<TUser>;
  linkWithNativeGoogle: (currentUser: TUser) => Promise<TUser>;
}

export interface GoogleSignInFlowResult<TUser extends MinimalAuthUser = MinimalAuthUser> {
  user: TUser | null;
  persistenceMode: AuthPersistenceMode;
  redirectPending?: boolean;
  cancelled?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export async function ensureAuthPersistenceWithFallback(
  setBrowserLocal: () => Promise<void>,
  setInMemory: () => Promise<void>
): Promise<AuthPersistenceMode> {
  try {
    await setBrowserLocal();
    return 'local';
  } catch {
    try {
      await setInMemory();
      return 'memory';
    } catch {
      return 'unchanged';
    }
  }
}

function getAuthErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function isNativeCancelError(err: unknown, code: string): boolean {
  if (code === 'USER_CANCELLED' || code === 'auth/cancelled-popup-request') {
    return true;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('user_cancelled') ||
    msg.includes('user cancelled') ||
    msg.includes('canceled by user') ||
    msg.includes('cancelled by user') ||
    msg.includes('getcredentialcancellationexception')
  );
}

export async function executeGoogleSignInFlow<TUser extends MinimalAuthUser = MinimalAuthUser>(
  deps: GoogleSignInFlowDeps<TUser>
): Promise<GoogleSignInFlowResult<TUser>> {
  const persistenceMode = await deps.ensurePersistence();
  const currentUser = deps.getCurrentUser();

  // Capacitor native Android: use native Google Sign-In (Credential Manager + google-services.json)
  // and never navigate the WebView to firebaseapp.com/__/auth/handler
  if (deps.isNativePlatform) {
    try {
      if (currentUser && currentUser.isAnonymous) {
        try {
          const linkedUser = await deps.linkWithNativeGoogle(currentUser);
          return { user: linkedUser, persistenceMode };
        } catch (linkErr) {
          const code = getAuthErrorCode(linkErr);
          if (
            code === 'auth/credential-already-in-use' ||
            code === 'auth/email-already-in-use' ||
            code === 'auth/provider-already-linked'
          ) {
            const signedInUser = await deps.signInWithNativeGoogle();
            return { user: signedInUser, persistenceMode };
          }
          throw linkErr;
        }
      }
      const user = await deps.signInWithNativeGoogle();
      return { user, persistenceMode };
    } catch (err) {
      const code = getAuthErrorCode(err);
      if (isNativeCancelError(err, code)) {
        return {
          user: null,
          persistenceMode,
          cancelled: true,
          errorCode: code || 'USER_CANCELLED',
          errorMessage: 'Google sign-in was cancelled.',
        };
      }
      return {
        user: null,
        persistenceMode,
        errorCode: code || 'auth/native-google-failed',
        errorMessage: err instanceof Error ? err.message : 'Google sign-in could not be completed.',
      };
    }
  }

  // Web (desktop & mobile browsers): use signInWithPopup/linkWithPopup;
  // only fall back to redirect when browser blocks popups (auth/popup-blocked).
  try {
    if (currentUser && currentUser.isAnonymous) {
      try {
        const linked = await deps.linkWithPopup(currentUser);
        return { user: linked, persistenceMode };
      } catch (linkErr) {
        const linkCode = getAuthErrorCode(linkErr);
        if (linkCode === 'auth/credential-already-in-use' || linkCode === 'auth/email-already-in-use') {
          try {
            const signedIn = await deps.signInWithPopup();
            return { user: signedIn, persistenceMode };
          } catch (popupErr) {
            if (getAuthErrorCode(popupErr) === 'auth/popup-blocked') {
              await deps.signInWithRedirect();
              return { user: null, persistenceMode, redirectPending: true };
            }
            throw popupErr;
          }
        }
        if (linkCode === 'auth/popup-blocked') {
          await deps.linkWithRedirect(currentUser);
          return { user: null, persistenceMode, redirectPending: true };
        }
        throw linkErr;
      }
    }

    const signedIn = await deps.signInWithPopup();
    return { user: signedIn, persistenceMode };
  } catch (err) {
    const code = getAuthErrorCode(err);
    if (code === 'auth/popup-blocked') {
      try {
        await deps.signInWithRedirect();
        return { user: null, persistenceMode, redirectPending: true };
      } catch (redirectErr) {
        return {
          user: null,
          persistenceMode,
          errorCode: getAuthErrorCode(redirectErr) || 'auth/redirect-failed',
          errorMessage: redirectErr instanceof Error ? redirectErr.message : 'Unable to redirect to Google sign-in.',
        };
      }
    }
    return {
      user: null,
      persistenceMode,
      errorCode: code,
      errorMessage: err instanceof Error ? err.message : 'Google sign-in could not be completed.',
    };
  }
}
