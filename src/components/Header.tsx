import React from 'react';
import {
  BarChart3,
  Settings,
  Trophy,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { SoundMode } from '../game/settingsLogic';
import type { LocalUserAccount } from '../game/userAccountLogic';
import type { WeeklyGradeId } from '../game/weeklyLogic';
import { PWAInstallButton } from './PWAInstallButton';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  soundMode: SoundMode;
  weeklyGradeId: WeeklyGradeId;
  weeklyXp: number;
  leaderboardRank?: number;
  userAccount?: LocalUserAccount | null;
  onToggleSound: () => void;
  onOpenStats: () => void;
  onOpenWeeklyRank: () => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onNavigateHome?: () => void;
  showXp?: boolean;
}

const SOUND_MODE_LABEL: Record<SoundMode, string> = {
  on: 'Sound On (tap to Mute/Vibrate)',
  mute: 'Mute — Vibrate Only (tap to turn Off)',
  off: 'Sound Off (tap to turn On)',
};

const SOUND_SHORT_LABEL: Record<SoundMode, string> = {
  on: 'On',
  mute: 'Mute',
  off: 'Off',
};

export const Header: React.FC<HeaderProps> = ({
  soundMode,
  weeklyGradeId,
  weeklyXp,
  leaderboardRank,
  userAccount,
  onToggleSound,
  onOpenStats,
  onOpenWeeklyRank,
  onOpenSettings,
  onOpenProfile,
  onNavigateHome,
  showXp = true,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b wv-border wv-card backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1 sm:gap-1.5 px-2.5 py-2 sm:py-2.5 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            if (onNavigateHome) {
              e.preventDefault();
              onNavigateHome();
            }
          }}
          className="font-display text-lg sm:text-2xl font-black tracking-tight wv-text whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border-2 wv-tile-wooden font-display text-base sm:text-lg font-black shadow-xs"
          >
            W
          </span>
          <span className="font-black">Wordvibe</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <PWAInstallButton compact />

          <button
            type="button"
            data-testid="header-weekly-rank-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenWeeklyRank();
            }}
            aria-label={
              showXp
                ? `${weeklyXp} XP. Open leaderboard and rewards.`
                : `Rank ${weeklyGradeId}. Open leaderboard and rewards.`
            }
            title="Leaderboard & Rewards"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border wv-border wv-card-muted px-2.5 sm:px-3 text-sm font-bold wv-text transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Trophy className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
            <span data-testid="header-rank-value" className="font-mono-tabular">
              {showXp ? (
                `${weeklyXp.toLocaleString()} XP`
              ) : leaderboardRank ? (
                <>
                  <span className="hidden sm:inline">#{leaderboardRank} · </span>
                  <span>Rank {weeklyGradeId}</span>
                </>
              ) : (
                `Rank ${weeklyGradeId}`
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenStats();
            }}
            aria-label="View statistics and streaks"
            title="Statistics"
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted transition-colors hover:opacity-80 cursor-pointer"
          >
            <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-testid="header-sound-btn"
            data-sound-mode={soundMode}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={SOUND_MODE_LABEL[soundMode]}
            title={SOUND_MODE_LABEL[soundMode]}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border wv-border wv-card-muted px-2 text-xs font-bold wv-text transition-colors hover:opacity-85 cursor-pointer"
          >
            {soundMode === 'on' ? (
              <Volume2 className="h-4 w-4 wv-accent-text" aria-hidden="true" />
            ) : soundMode === 'mute' ? (
              <Vibrate className="h-4 w-4 wv-accent-text" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4 wv-text-muted opacity-70" aria-hidden="true" />
            )}
            <span className="hidden sm:inline font-mono-tabular">{SOUND_SHORT_LABEL[soundMode]}</span>
          </button>

          <button
            type="button"
            data-testid="open-settings-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            aria-label="Open Wordvibe settings"
            title="Settings & Themes"
            className="inline-flex h-10 w-9 sm:w-10 items-center justify-center rounded-xl wv-text transition-transform active:scale-90 hover:opacity-80 cursor-pointer"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>

          {onOpenProfile && (
            <button
              type="button"
              data-testid="header-profile-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenProfile();
              }}
              aria-label={
                userAccount
                  ? `Open profile for ${userAccount.realName || userAccount.username}`
                  : 'Sign in or view profile'
              }
              title={
                userAccount
                  ? `${userAccount.realName || userAccount.username} · View Profile`
                  : 'Sign In / Profile'
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--wv-accent)] wv-card-muted p-0.5 lg:pr-3 text-sm font-bold wv-text shadow-sm ring-2 ring-[var(--wv-accent)]/30 transition-transform active:scale-95 hover:opacity-95 cursor-pointer"
            >
              <UserAvatar
                avatarType={userAccount?.avatarType}
                builtinAvatarId={userAccount?.builtinAvatarId}
                avatarDataUrl={userAccount?.avatarDataUrl}
                alt={userAccount?.realName || userAccount?.username || 'Profile'}
                size="sm"
                className="border-0"
              />
              {userAccount && (
                <span className="hidden lg:inline max-w-[100px] truncate font-bold">
                  @{userAccount.username}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
