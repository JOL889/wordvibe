import React from 'react';
import {
  BarChart3,
  Coins,
  Crown,
  HelpCircle,
  Settings,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { SoundMode } from '../game/settingsLogic';
import type { WeeklyGradeId } from '../game/weeklyLogic';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  soundMode: SoundMode;
  weeklyGradeId: WeeklyGradeId;
  weeklyXp: number;
  bonusCoins: number;
  onToggleSound: () => void;
  onOpenStats: () => void;
  onOpenWeeklyRank: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onNavigateSection?: (section: 'streak' | 'rules' | 'faq') => void;
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
  bonusCoins,
  onToggleSound,
  onOpenStats,
  onOpenWeeklyRank,
  onOpenHelp,
  onOpenSettings,
  onNavigateSection,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b wv-border wv-card backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1.5 px-3 py-2 sm:py-2.5 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            if (onNavigateSection) {
              e.preventDefault();
              onNavigateSection('streak');
            }
          }}
          className="font-display text-xl sm:text-2xl font-black tracking-tight wv-text whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 wv-tile-wooden font-display text-lg font-black shadow-xs"
          >
            W
          </span>
          <span className="font-black">WordVibe</span>
        </a>

        <nav
          aria-label="Puzzle guides"
          className="hidden md:flex items-center gap-6 text-sm font-semibold wv-text-muted"
        >
          <a
            href="#how-to-play"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('rules');
              }
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Rules
          </a>
          <a
            href="#streak-guide"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('streak');
              }
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Streaks
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('faq');
              }
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton compact />

          <button
            type="button"
            data-testid="header-weekly-rank-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenWeeklyRank();
            }}
            aria-label={`Rank ${weeklyGradeId}, ${weeklyXp} XP, ${bonusCoins} coins. Open weekly grading and achievements.`}
            title="Weekly Rank, XP & Coins"
            className="inline-flex h-10 items-center gap-1 sm:gap-1.5 rounded-xl border wv-border wv-card-muted px-2 sm:px-2.5 text-xs sm:text-sm font-bold wv-text transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Crown className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
            <span className="font-mono-tabular sm:hidden">
              {weeklyGradeId}·{weeklyXp}
            </span>
            <span className="font-mono-tabular hidden sm:inline">
              Rank {weeklyGradeId} · {weeklyXp} XP
            </span>
            <span className="inline-flex items-center gap-0.5 border-l wv-border pl-1.5 font-mono-tabular wv-accent-text">
              <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span data-testid="header-coins-count">{bonusCoins}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHelp();
            }}
            aria-label="How to play WordVibe"
            title="How to play"
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted transition-colors hover:opacity-80 cursor-pointer"
          >
            <HelpCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenStats();
            }}
            aria-label="View statistics and streaks"
            title="Statistics"
            className="inline-flex h-10 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl wv-text-muted transition-colors hover:opacity-80 cursor-pointer"
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
            aria-label="Open WordVibe settings"
            title="Settings & Themes"
            className="inline-flex h-10 w-9 sm:w-10 items-center justify-center rounded-xl wv-text transition-transform active:scale-90 hover:opacity-80 cursor-pointer"
          >
            <Settings className="h-[19px] w-[19px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
