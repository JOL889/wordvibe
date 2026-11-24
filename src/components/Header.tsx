import React from 'react';
import { BarChart3, Coins, Crown, HelpCircle, Settings, Volume2, VolumeX } from 'lucide-react';
import type { WeeklyGradeId } from '../game/weeklyLogic';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  soundEnabled: boolean;
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

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
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
    <header className="w-full border-b border-stone-200/75 dark:border-zinc-800/80 bg-[#F7F5F0]/90 dark:bg-[#111315]/90 backdrop-blur-sm amoled-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-1.5 px-2.5 py-2 sm:py-2.5 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            if (onNavigateSection) {
              e.preventDefault();
              onNavigateSection('streak');
            }
          }}
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>WordVibe</span>
        </a>

        <nav
          aria-label="Puzzle guides"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          <a
            href="#how-to-play"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('rules');
              }
            }}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
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
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
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
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
            className="inline-flex h-10 items-center gap-1 sm:gap-1.5 rounded-xl border border-stone-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors hover:border-emerald-700/40 dark:hover:border-emerald-500/40 whitespace-nowrap cursor-pointer"
          >
            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="font-mono-tabular sm:hidden">
              {weeklyGradeId}·{weeklyXp}
            </span>
            <span className="font-mono-tabular hidden sm:inline">
              Rank {weeklyGradeId} · {weeklyXp} XP
            </span>
            <span className="inline-flex items-center gap-0.5 border-l border-stone-200 dark:border-zinc-700 pl-1.5 font-mono-tabular text-amber-600 dark:text-amber-400">
              <Coins className="h-3 w-3 shrink-0" aria-hidden="true" />
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
            className="inline-flex h-10 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-stone-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
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
            className="inline-flex h-10 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-stone-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
          >
            <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-pressed={soundEnabled}
            title={soundEnabled ? 'Sound on' : 'Sound muted'}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-stone-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <VolumeX className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid="open-settings-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            aria-label="Open WordVibe settings"
            title="Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 transition-transform active:scale-90 hover:bg-stone-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
          >
            <Settings className="h-[19px] w-[19px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
