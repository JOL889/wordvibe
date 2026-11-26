import React, { useEffect, useState } from 'react';
import { Camera, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import {
  BUILTIN_AVATARS,
  hashPasswordLocal,
  normalizeUsername,
  sanitizeAvatarDataUrl,
  validateRegistrationInput,
  type BuiltInAvatarId,
  type LocalUserAccount,
} from '../game/userAccountLogic';
import { resizeImageFileToThumbnail } from '../services/accountStorageService';
import { UserAvatar } from './UserAvatar';

interface ProfileAuthModalProps {
  open: boolean;
  mode: 'signup' | 'edit';
  existingAccount: LocalUserAccount | null;
  onSaveAccount: (account: LocalUserAccount) => Promise<void> | void;
  onClose?: () => void;
}

export const ProfileAuthModal: React.FC<ProfileAuthModalProps> = ({
  open,
  mode,
  existingAccount,
  onSaveAccount,
  onClose,
}) => {
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarType, setAvatarType] = useState<'builtin' | 'photo'>('builtin');
  const [builtinAvatarId, setBuiltinAvatarId] = useState<BuiltInAvatarId>('crown');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<'realName' | 'username' | 'email' | 'password', string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existingAccount) {
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
      setEmail('');
      setPassword('');
      setAvatarType('builtin');
      setBuiltinAvatarId('crown');
      setAvatarDataUrl(undefined);
    }
    setErrors({});
    setPhotoError(null);
    setShowPassword(false);
  }, [existingAccount, mode, open]);

  if (!open) return null;

  const isEditing = mode === 'edit' && Boolean(existingAccount);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await onSaveAccount(nextAccount);
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
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-2 wv-border wv-card shadow-2xl animate-modal-pop">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b wv-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
              {isEditing ? 'Offline Player Profile' : 'Welcome to WordVibe'}
            </p>
            <h2 id="profile-auth-title" className="mt-0.5 font-display text-xl sm:text-2xl font-bold wv-text">
              {isEditing ? 'Edit Your Profile' : 'Create Your Player Profile'}
            </h2>
            <p className="mt-0.5 text-xs wv-text-muted">
              Saved 100% locally on your device so you stay logged in offline.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Avatar Selection */}
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
                  <p className="text-sm font-bold wv-text">Profile Picture</p>
                  <p className="text-xs wv-text-muted">
                    Pick a device photo (auto-resized) or choose an avatar below.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <label
                  htmlFor="profile-photo-input"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl wv-accent-btn px-3 py-2 text-xs font-bold cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Gallery</span>
                </label>
                {avatarType === 'photo' && avatarDataUrl && (
                  <button
                    type="button"
                    data-testid="clear-profile-photo-btn"
                    onClick={() => {
                      setAvatarType('builtin');
                      setAvatarDataUrl(undefined);
                    }}
                    className="text-[11px] font-semibold wv-text-muted hover:underline cursor-pointer"
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
              <p role="alert" className="text-xs font-semibold wv-accent-text">
                {photoError}
              </p>
            )}

            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Built-in avatars">
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
                    className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      selected ? 'wv-accent-pill border-2' : 'wv-border wv-card wv-text hover:opacity-90'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">
                      {opt.glyph}
                    </span>
                    <span className="mt-1 truncate max-w-full text-[10px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real Name */}
          <div className="space-y-1">
            <label htmlFor="profile-real-name" className="flex items-center gap-1.5 text-xs font-bold wv-text">
              <User className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
              <span>Real Name</span>
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
              className="w-full min-h-11 rounded-xl border wv-border wv-card-muted px-3 py-2 text-sm font-medium wv-text focus:outline-none"
            />
            {errors.realName && (
              <p role="alert" className="text-xs font-semibold wv-accent-text">
                {errors.realName}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="profile-username" className="flex items-center gap-1.5 text-xs font-bold wv-text">
              <ShieldCheck className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
              <span>Username (shown on Leaderboard)</span>
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
              className="w-full min-h-11 rounded-xl border wv-border wv-card-muted px-3 py-2 text-sm font-medium wv-text focus:outline-none"
            />
            {errors.username && (
              <p role="alert" className="text-xs font-semibold wv-accent-text">
                {errors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="profile-email" className="flex items-center gap-1.5 text-xs font-bold wv-text">
              <Mail className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
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
              className="w-full min-h-11 rounded-xl border wv-border wv-card-muted px-3 py-2 text-sm font-medium wv-text focus:outline-none"
            />
            {errors.email && (
              <p role="alert" className="text-xs font-semibold wv-accent-text">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="profile-password" className="flex items-center gap-1.5 text-xs font-bold wv-text">
              <Lock className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
              <span>
                {isEditing ? 'New Password (optional — leave blank to keep)' : 'Password'}
              </span>
            </label>
            <div className="relative flex items-center">
              <input
                id="profile-password"
                data-testid="profile-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isEditing ? 'new-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Leave blank to keep existing password' : 'At least 6 characters'}
                className="w-full min-h-11 rounded-xl border wv-border wv-card-muted pl-3 pr-11 py-2 text-sm font-medium wv-text focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg wv-text-muted hover:opacity-80 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className="text-xs font-semibold wv-accent-text">
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isEditing && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 flex-1 rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-sm font-bold wv-text cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              data-testid="profile-submit-btn"
              disabled={submitting}
              className="inline-flex min-h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl wv-accent-btn px-5 py-2.5 text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Save Profile & Play'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
