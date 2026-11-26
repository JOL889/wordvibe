import React from 'react';
import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  Edit3,
  Flame,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trophy,
  X,
} from 'lucide-react';
import type { StatsData } from '../game/puzzleLogic';
import type { PlayerProfileState } from '../game/playerProfileLogic';
import type { LocalUserAccount } from '../game/userAccountLogic';
import type { WeeklyActivityState } from '../game/weeklyLogic';
import { UserAvatar } from './UserAvatar';

interface ProfileViewModalProps {
  open: boolean;
  userAccount: LocalUserAccount | null;
  playerProfile: PlayerProfileState;
  stats: StatsData;
  weeklyProgress: WeeklyActivityState;
  verifiedXp: number;
  weeklyRank: number;
  gradeLabel: string;
  faithTraditionName: string;
  faithSessionsCount: number;
  firebaseSignedIn: boolean;
  firebaseEmail: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onSyncProgress?: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export const ProfileViewModal: React.FC<ProfileViewModalProps> = ({
  open,
  userAccount,
  playerProfile,
  stats,
  weeklyProgress,
  verifiedXp,
  weeklyRank,
  gradeLabel,
  faithTraditionName,
  faithSessionsCount,
  firebaseSignedIn,
  firebaseEmail,
  isOnline,
  isSyncing,
  onClose,
  onEditProfile,
  onSyncProgress,
  onSignOut,
}) => {
  if (!open) return null;

  const displayName = userAccount?.realName || playerProfile.displayName || 'WordVibe Player';
  const username = userAccount?.username || playerProfile.displayName || 'Player';
  const email = userAccount?.email || firebaseEmail || 'Not linked';
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const locationLabel =
    playerProfile.location?.city ||
    playerProfile.location?.countryName ||
    'Local Device';
  const joinedLabel = userAccount?.createdAt
    ? new Date(userAccount.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Session';

  return (
    <div
      data-testid="profile-view-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-view-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 sm:p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-2 wv-border wv-card shadow-2xl animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b wv-border px-5 py-4">
          <h2 id="profile-view-title" className="font-display text-2xl font-bold wv-text">
            Your Profile
          </h2>
          <button
            type="button"
            data-testid="close-profile-view-btn"
            onClick={onClose}
            aria-label="Close profile view"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Identity Hero */}
          <div className="flex items-center gap-4 rounded-2xl border-2 border-[var(--wv-accent)]/45 wv-card-muted p-4">
            <UserAvatar
              avatarType={userAccount?.avatarType}
              builtinAvatarId={userAccount?.builtinAvatarId}
              avatarDataUrl={userAccount?.avatarDataUrl}
              alt={displayName}
              size="xl"
              className="ring-2 ring-[var(--wv-accent)] border-2 border-white/60"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p
                data-testid="profile-view-realname"
                className="truncate font-display text-2xl font-bold wv-text leading-tight"
              >
                {displayName}
              </p>
              <p
                data-testid="profile-view-username"
                className="truncate text-base font-bold wv-accent-text"
              >
                @{username}
              </p>
              <p
                data-testid="profile-view-email"
                className="flex items-center gap-1.5 truncate text-sm font-medium wv-text-muted"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </p>
            </div>
          </div>

          {/* Sync Status & Rank Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border wv-border wv-card-muted p-3.5">
              <p className="text-xs font-bold uppercase tracking-wide wv-text-muted">
                Verified Online XP
              </p>
              <p
                data-testid="profile-view-verified-xp"
                className="mt-1 font-mono-tabular text-2xl font-black wv-accent-text"
              >
                {verifiedXp.toLocaleString()}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold wv-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
                <span>{firebaseSignedIn ? 'Cloud Synced' : 'Email Saved'}</span>
              </p>
            </div>

            <div className="rounded-xl border wv-border wv-card-muted p-3.5">
              <p className="text-xs font-bold uppercase tracking-wide wv-text-muted">
                Practice XP
              </p>
              <p
                data-testid="profile-view-practice-xp"
                className="mt-1 font-mono-tabular text-2xl font-black wv-text"
              >
                {weeklyProgress.weeklyXp.toLocaleString()}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold wv-text-muted">
                <Trophy className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
                <span>Rank #{weeklyRank} · {gradeLabel}</span>
              </p>
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl border wv-border wv-card p-3.5">
              <Award className="h-6 w-6 shrink-0 wv-accent-text" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono-tabular text-xl font-bold wv-text">{stats.gamesWon}</p>
                <p className="text-sm font-medium wv-text-muted">Puzzles Won ({winRate}%)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border wv-border wv-card p-3.5">
              <Flame className="h-6 w-6 shrink-0 wv-accent-text" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono-tabular text-xl font-bold wv-text">
                  {stats.currentStreak}
                </p>
                <p className="text-sm font-medium wv-text-muted">
                  Streak (Best {stats.bestStreak})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border wv-border wv-card p-3.5">
              <Brain className="h-6 w-6 shrink-0 wv-accent-text" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono-tabular text-xl font-bold wv-text">
                  {weeklyProgress.triviaCorrect}
                </p>
                <p className="text-sm font-medium wv-text-muted">Trivia Correct</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border wv-border wv-card p-3.5">
              <BookOpen className="h-6 w-6 shrink-0 wv-accent-text" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono-tabular text-xl font-bold wv-text">
                  {faithSessionsCount}
                </p>
                <p className="text-sm font-medium wv-text-muted">Faith Studies</p>
              </div>
            </div>
          </div>

          {/* Account Details List */}
          <div className="rounded-xl border wv-border wv-card-muted divide-y divide-[var(--wv-border)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold wv-text-muted">
                <MapPin className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                <span>Region</span>
              </span>
              <span className="font-bold wv-text truncate">{locationLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold wv-text-muted">
                <BookOpen className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                <span>Faith Tradition</span>
              </span>
              <span className="font-bold wv-text truncate">{faithTraditionName}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold wv-text-muted">
                <Calendar className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                <span>Member Since</span>
              </span>
              <span className="font-bold wv-text">{joinedLabel}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t wv-border px-5 py-4 space-y-2.5 bg-[var(--wv-surface)]">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="profile-view-edit-btn"
              onClick={onEditProfile}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-2.5 text-base font-bold cursor-pointer"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              <span>{userAccount ? 'Edit Profile' : 'Sign In / Sign Up'}</span>
            </button>
            <button
              type="button"
              data-testid="profile-view-sync-btn"
              disabled={isSyncing || !isOnline}
              onClick={() => void onSyncProgress?.()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-base font-bold wv-text hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 wv-accent-text ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
          <button
            type="button"
            data-testid="profile-view-signout-btn"
            onClick={() => void onSignOut()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border wv-border wv-card px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:opacity-85 cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
