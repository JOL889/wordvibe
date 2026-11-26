import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  BUILTIN_AVATARS,
  hashPasswordLocal,
  normalizeUsername,
  sanitizeAvatarDataUrl,
  validateRegistrationInput,
  validateSignInInput,
  type BuiltInAvatarId,
  type LocalUserAccount,
} from '../game/userAccountLogic';
import { resizeImageFileToThumbnail } from '../services/accountStorageService';
import { useHorizontalSwitch } from '../hooks/useHorizontalSwitch';
import { UserAvatar } from './UserAvatar';

export type ProfileAuthMode = 'signin' | 'signup' | 'edit';
const AUTH_TAB_MODES: readonly ('signin' | 'signup')[] = ['signin', 'signup'];
const AVATAR_IDS: readonly BuiltInAvatarId[] = BUILTIN_AVATARS.map((a) => a.id);

interface ProfileAuthModalProps {
  open: boolean;
  mode: ProfileAuthMode;
  existingAccount: LocalUserAccount | null;
  authError?: string | null;
  authBusy?: boolean;
  onSaveAccount: (account: LocalUserAccount, passwordPlain: string) => Promise<void> | void;
  onSignInWithEmail?: (email: string, password: string) => Promise<string | null> | string | null;
  onContinueWithGoogle?: () => Promise<string | null> | string | null;
  onContinueAsGuest?: () => Promise<void> | void;
  onClose?: () => void;
}

export const ProfileAuthModal: React.FC<ProfileAuthModalProps> = ({
  open,
  mode,
  existingAccount,
  authError = null,
  authBusy = false,
  onSaveAccount,
  onSignInWithEmail,
  onContinueWithGoogle,
  onContinueAsGuest,
  onClose,
}) => {
  const [activeFlow, setActiveFlow] = useState<ProfileAuthMode>(mode);
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarType, setAvatarType] = useState<'builtin' | 'photo'>('builtin');
  const [builtinAvatarId, setBuiltinAvatarId] = useState<BuiltInAvatarId>('crown');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<'realName' | 'username' | 'email' | 'password', string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const authModeSwitch = useHorizontalSwitch<'signin' | 'signup'>({
    items: AUTH_TAB_MODES,
    activeItem: activeFlow === 'signup' ? 'signup' : 'signin',
    onChange: (nextMode) => {
      setActiveFlow(nextMode);
      setErrors({});
      setFormError(null);
    },
    disabled: !open || activeFlow === 'edit',
  });

  const avatarSwitch = useHorizontalSwitch<BuiltInAvatarId>({
    items: AVATAR_IDS,
    activeItem: builtinAvatarId,
    onChange: (nextId) => {
      setBuiltinAvatarId(nextId);
      setAvatarType('builtin');
    },
    disabled: !open || activeFlow === 'signin',
  });

  useEffect(() => {
    if (!open) return;
    setActiveFlow(mode);
    if (mode === 'edit' && existingAccount) {
      setRealName(existingAccount.realName || '');
      setUsername(existingAccount.username || '');
      setEmail(existingAccount.email || '');
      setPassword('');
      setAvatarType(existingAccount.avatarType || 'builtin');
      setBuiltinAvatarId(existingAccount.builtinAvatarId || 'crown');
      setAvatarDataUrl(sanitizeAvatarDataUrl(existingAccount.avatarDataUrl));
    } else {
      setRealName('');
      setUsername('');
      setEmail(existingAccount?.email || '');
      setPassword('');
      setAvatarType('builtin');
      setBuiltinAvatarId('crown');
      setAvatarDataUrl(undefined);
    }
    setErrors({});
    setFormError(null);
    setPhotoError(null);
    setShowPassword(false);
  }, [existingAccount, mode, open]);

  if (!open) return null;

  const isEditing = activeFlow === 'edit' && Boolean(existingAccount);
  const isSignIn = activeFlow === 'signin';
  const busy = submitting || authBusy;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      const thumb = await resizeImageFileToThumbnail(file, 128);
      setAvatarDataUrl(thumb);
      setAvatarType('photo');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to load photo.');
    }
  };

  const handleGoogleClick = async () => {
    if (!onContinueWithGoogle) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const err = await onContinueWithGoogle();
      if (err) setFormError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isSignIn) {
      const validation = validateSignInInput({ email, password });
      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }
      setErrors({});
      if (!onSignInWithEmail) return;
      setSubmitting(true);
      try {
        const err = await onSignInWithEmail(validation.normalized.email, password);
        if (err) setFormError(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const validation = validateRegistrationInput({
      realName,
      username,
      email,
      password,
      isEditing,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const now = Date.now();
      let passwordHash = existingAccount?.passwordHash || '';
      let passwordSalt = existingAccount?.passwordSalt || '';

      if (!isEditing || password.length > 0) {
        const hashed = await hashPasswordLocal(password);
        passwordHash = hashed.hash;
        passwordSalt = hashed.salt;
      }

      const cleanThumb = sanitizeAvatarDataUrl(avatarDataUrl);
      const nextAccount: LocalUserAccount = {
        id: existingAccount?.id || `user:${validation.normalized.username.toLowerCase()}`,
        realName: validation.normalized.realName,
        username: validation.normalized.username,
        email: validation.normalized.email,
        passwordHash,
        passwordSalt,
        avatarType: avatarType === 'photo' && cleanThumb ? 'photo' : 'builtin',
        builtinAvatarId,
        avatarDataUrl: cleanThumb,
        createdAt: existingAccount?.createdAt || now,
        updatedAt: now,
      };

      await onSaveAccount(nextAccount, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="profile-auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-auth-title"
      onClick={(e) => {
        if (isEditing && onClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-2 wv-border wv-card shadow-2xl animate-modal-pop">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b wv-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
              {isEditing ? 'Player Profile' : 'WordVibe'}
            </p>
            <h2
              id="profile-auth-title"
              className="mt-0.5 font-display text-2xl sm:text-3xl font-bold wv-text leading-tight"
            >
              {isEditing
                ? 'Edit Your Profile'
                : isSignIn
                ? 'Welcome Back'
                : 'Sign Up & Sync'}
            </h2>
            <p className="mt-1 text-sm wv-text-muted">
              {isEditing
                ? 'Update your photo, name, or password anytime.'
                : 'Save your streaks, scores, and rewards to your email.'}
            </p>
          </div>
          {isEditing && onClose && (
            <button
              type="button"
              data-testid="close-profile-modal-btn"
              onClick={onClose}
              aria-label="Close profile editor"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!isEditing && (
            <>
              {/* Segmented Sign In / Create Account Switcher */}
              <div
                {...authModeSwitch.containerProps}
                role="tablist"
                aria-label="Account mode"
                className="grid grid-cols-2 rounded-xl border wv-border wv-card-muted p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSignIn}
                  data-testid="auth-tab-signin"
                  onClick={() => {
                    setActiveFlow('signin');
                    setErrors({});
                    setFormError(null);
                  }}
                  className={`min-h-11 rounded-lg text-base font-bold transition-colors cursor-pointer ${
                    isSignIn ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFlow === 'signup'}
                  data-testid="auth-tab-signup"
                  onClick={() => {
                    setActiveFlow('signup');
                    setErrors({});
                    setFormError(null);
                  }}
                  className={`min-h-11 rounded-lg text-base font-bold transition-colors cursor-pointer ${
                    activeFlow === 'signup' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {onContinueWithGoogle && (
                <>
                  <button
                    type="button"
                    data-testid="auth-google-btn"
                    disabled={busy}
                    onClick={() => void handleGoogleClick()}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 wv-border wv-card-muted px-4 py-2.5 text-base font-bold wv-text hover:opacity-90 disabled:opacity-55 cursor-pointer"
                  >
                    <Sparkles className="h-5 w-5 wv-accent-text" aria-hidden="true" />
                    <span>Continue with Google</span>
                  </button>

                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider wv-text-muted">
                    <span className="h-px flex-1 bg-[var(--wv-border)]" />
                    <span>or use email</span>
                    <span className="h-px flex-1 bg-[var(--wv-border)]" />
                  </div>
                </>
              )}
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Selection (Create Account / Edit Profile) */}
            {!isSignIn && (
              <div className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      avatarType={avatarType}
                      builtinAvatarId={builtinAvatarId}
                      avatarDataUrl={avatarDataUrl}
                      alt={realName || username || 'Profile preview'}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="text-base font-bold wv-text">Profile Picture</p>
                      <p className="text-sm wv-text-muted">Upload a photo or pick an icon</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <label
                      htmlFor="profile-photo-input"
                      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl wv-accent-btn px-3.5 py-2 text-sm font-bold cursor-pointer"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      <span>Photo</span>
                    </label>
                    {avatarType === 'photo' && avatarDataUrl && (
                      <button
                        type="button"
                        data-testid="clear-profile-photo-btn"
                        onClick={() => {
                          setAvatarType('builtin');
                          setAvatarDataUrl(undefined);
                        }}
                        className="text-xs font-semibold wv-text-muted hover:underline cursor-pointer"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  <input
                    id="profile-photo-input"
                    data-testid="profile-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </div>

                {photoError && (
                  <p role="alert" className="text-sm font-semibold wv-accent-text">
                    {photoError}
                  </p>
                )}

                <div
                  {...avatarSwitch.containerProps}
                  className="grid grid-cols-4 gap-2"
                  role="group"
                  aria-label="Built-in avatars"
                >
                  {BUILTIN_AVATARS.map((opt) => {
                    const selected = avatarType === 'builtin' && builtinAvatarId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`avatar-option-${opt.id}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setBuiltinAvatarId(opt.id);
                          setAvatarType('builtin');
                        }}
                        className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          selected
                            ? 'wv-accent-pill border-2'
                            : 'wv-border wv-card wv-text hover:opacity-90'
                        }`}
                      >
                        <span className="text-lg leading-none" aria-hidden="true">
                          {opt.glyph}
                        </span>
                        <span className="mt-1 truncate max-w-full text-xs">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real Name + Username (Create / Edit only) */}
            {!isSignIn && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-real-name"
                    className="flex items-center gap-1.5 text-sm font-bold wv-text"
                  >
                    <User className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                    <span>Full Name</span>
                  </label>
                  <input
                    id="profile-real-name"
                    data-testid="profile-realname-input"
                    type="text"
                    autoComplete="name"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder="e.g. Amara Okafor"
                    maxLength={48}
                    className="w-full min-h-12 rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-base font-medium wv-text focus:outline-none"
                  />
                  {errors.realName && (
                    <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {errors.realName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-username"
                    className="flex items-center gap-1.5 text-sm font-bold wv-text"
                  >
                    <ShieldCheck className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                    <span>Username</span>
                  </label>
                  <input
                    id="profile-username"
                    data-testid="profile-username-input"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.replace(/^@+/, '').replace(/\s+/g, '_').slice(0, 24)
                      )
                    }
                    onBlur={() => setUsername((prev) => normalizeUsername(prev))}
                    placeholder="e.g. Amara_Word"
                    maxLength={24}
                    className="w-full min-h-12 rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-base font-medium wv-text focus:outline-none"
                  />
                  {errors.username && (
                    <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {errors.username}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-email"
                className="flex items-center gap-1.5 text-sm font-bold wv-text"
              >
                <Mail className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>Email Address</span>
              </label>
              <input
                id="profile-email"
                data-testid="profile-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={96}
                className="w-full min-h-12 rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-base font-medium wv-text focus:outline-none"
              />
              {errors.email && (
                <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-password"
                className="flex items-center gap-1.5 text-sm font-bold wv-text"
              >
                <Lock className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>
                  {isEditing ? 'New Password (optional)' : 'Password'}
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="profile-password"
                  data-testid="profile-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isEditing ? 'Leave blank to keep current password' : 'At least 6 characters'
                  }
                  className="w-full min-h-12 rounded-xl border wv-border wv-card-muted pl-3.5 pr-12 py-2.5 text-base font-medium wv-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg wv-text-muted hover:opacity-80 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {errors.password}
                </p>
              )}
            </div>

            {(formError || authError) && (
              <p
                data-testid="auth-form-error"
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-300"
              >
                {formError || authError}
              </p>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              {isEditing && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-12 flex-1 rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-base font-bold wv-text cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                data-testid="profile-submit-btn"
                disabled={busy}
                className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl wv-accent-btn px-5 py-3 text-base font-bold cursor-pointer disabled:opacity-60"
              >
                {isSignIn ? (
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Check className="h-5 w-5" aria-hidden="true" />
                )}
                <span>
                  {busy
                    ? 'Please wait...'
                    : isEditing
                    ? 'Save Changes'
                    : isSignIn
                    ? 'Sign In & Play'
                    : 'Create Account & Play'}
                </span>
              </button>
            </div>
          </form>

          {!isEditing && onContinueAsGuest && (
            <div className="pt-1 text-center">
              <button
                type="button"
                data-testid="auth-guest-continue-btn"
                disabled={busy}
                onClick={() => void onContinueAsGuest()}
                className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold wv-text-muted underline underline-offset-4 hover:opacity-80 cursor-pointer"
              >
                Continue as Guest
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
