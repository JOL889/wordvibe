import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Compass,
  MapPin,
  Palette,
  RotateCcw,
  Share2,
  Shield,
  Sliders,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { FAITH_TRADITIONS, RELIGION_IDS } from '../game/faithStudyLogic';
import { formatLocationLabel, type PlayerProfileState } from '../game/playerProfileLogic';
import type {
  AccentColor,
  AnimationIntensity,
  AppSettings,
  DifficultyTier,
  StartingTab,
  ThemeMode,
} from '../game/settingsLogic';
import { ReligionIcon } from './ReligionIcons';

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  playerProfile: PlayerProfileState;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenPersonalize: () => void;
  onShareApp: () => void;
  onResetTutorial: () => void;
}

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; sub: string }> = [
  { id: 'dark', label: 'Dark Mode', sub: 'Default slate ink' },
  { id: 'light', label: 'Light Mode', sub: 'Warm paper ink' },
  { id: 'amoled', label: 'AMOLED Black', sub: 'True #000 OLED' },
  { id: 'colorblind', label: 'Colorblind Safe', sub: 'High-contrast' },
];

const ACCENT_OPTIONS: Array<{ id: AccentColor; label: string; dotClass: string }> = [
  { id: 'emerald', label: 'Emerald', dotClass: 'bg-emerald-500' },
  { id: 'gold', label: 'Royal Gold', dotClass: 'bg-amber-500' },
  { id: 'blue', label: 'Ocean Blue', dotClass: 'bg-sky-400' },
  { id: 'violet', label: 'Violet', dotClass: 'bg-violet-400' },
];

const ANIMATION_OPTIONS: Array<{ id: AnimationIntensity; label: string }> = [
  { id: 'full', label: 'Full Fun' },
  { id: 'subtle', label: 'Subtle' },
  { id: 'reduced', label: 'Reduced Motion' },
];

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyTier; label: string }> = [
  { id: 'casual', label: 'Fun & Casual' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'mastermind', label: 'Mastermind' },
];

const STARTING_TABS: Array<{ id: StartingTab; label: string }> = [
  { id: 'home', label: 'Streak' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'faith', label: 'Faith' },
  { id: 'trivia', label: 'AI Trivia' },
];

interface ToggleRowProps {
  testId?: string;
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  testId,
  label,
  description,
  checked,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    data-testid={testId}
    onClick={onToggle}
    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-100/80 dark:hover:bg-zinc-800/60 cursor-pointer"
  >
    <div className="min-w-0">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
      {description && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>
      )}
    </div>
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'wv-accent-btn' : 'bg-stone-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-1'
        }`}
      />
    </span>
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  playerProfile,
  onClose,
  onUpdateSettings,
  onOpenPersonalize,
  onShareApp,
  onResetTutorial,
}) => {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  if (!open) return null;

  const locationSummary =
    playerProfile.locationEnabled && !playerProfile.locationOptOut
      ? formatLocationLabel(playerProfile.location)
      : 'Global Mode (Location off)';

  return (
    <div
      data-testid="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 shadow-2xl animate-modal-pop amoled-surface">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 wv-accent-text" aria-hidden="true" />
            <div>
              <h2
                id="settings-modal-title"
                className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                WordVibe Settings
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Daily Puzzle, AI Trivia &amp; Faith Study
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-settings-btn"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {/* 1. General */}
          <section className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>General</span>
            </h3>

            <ToggleRow
              testId="setting-auto-location"
              label="Auto-Detect Location"
              description="Tailor trivia & trends via GPS or IP fallback"
              checked={settings.autoDetectLocation}
              onToggle={() =>
                onUpdateSettings({ autoDetectLocation: !settings.autoDetectLocation })
              }
            />

            <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200/80 dark:border-zinc-800 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <MapPin className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
                  <span className="truncate">{locationSummary}</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Manual city &amp; country selector
                </p>
              </div>
              <button
                type="button"
                data-testid="setting-edit-city-btn"
                onClick={() => {
                  onClose();
                  onOpenPersonalize();
                }}
                className="min-h-10 shrink-0 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Edit City
              </button>
            </div>

            <div className="px-1 pt-1">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Default Starting Tab
              </span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {STARTING_TABS.map((tab) => {
                  const active = settings.defaultTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      data-setting-start-tab={tab.id}
                      onClick={() => onUpdateSettings({ defaultTab: tab.id })}
                      className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-stone-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-1 pt-1">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Difficulty Tier
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const active = settings.difficultyTier === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-setting-difficulty={opt.id}
                      onClick={() => onUpdateSettings({ difficultyTier: opt.id })}
                      className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-stone-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              testId="setting-daily-reminder"
              label="Daily Streak Reminder"
              description="Friendly evening check-in nudge"
              checked={settings.dailyReminder}
              onToggle={() => onUpdateSettings({ dailyReminder: !settings.dailyReminder })}
            />
          </section>

          {/* 2. Faith & Study */}
          <section className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Faith &amp; Study</span>
            </h3>

            <div className="px-1">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Default Faith Tradition
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {RELIGION_IDS.map((id) => {
                  const item = FAITH_TRADITIONS[id];
                  const active = settings.defaultReligion === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-setting-religion={id}
                      onClick={() => onUpdateSettings({ defaultReligion: id })}
                      className={`flex min-h-12 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'border-stone-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-stone-300'
                      }`}
                    >
                      <ReligionIcon religion={id} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              testId="setting-scripture-refs"
              label="Show Scripture & Verse References"
              description="Display chapter & verse citations in Faith Study"
              checked={settings.showScriptureReferences}
              onToggle={() =>
                onUpdateSettings({ showScriptureReferences: !settings.showScriptureReferences })
              }
            />

            <ToggleRow
              testId="setting-mix-faith"
              label="Mix Faith Words into Daily Puzzles"
              description="Blend inspiring words from your tradition into Practice Sprint"
              checked={settings.mixFaithWordsInDaily}
              onToggle={() =>
                onUpdateSettings({ mixFaithWordsInDaily: !settings.mixFaithWordsInDaily })
              }
            />
          </section>

          {/* 3. Theme & Visuals */}
          <section className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3.5 space-y-3 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Theme &amp; Visuals</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const active = settings.themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`setting-theme-${opt.id}`}
                    onClick={() => onUpdateSettings({ themeMode: opt.id })}
                    className={`flex min-h-12 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'wv-accent-pill border-2'
                        : 'border-stone-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] opacity-75">{opt.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-1">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Accent Color
              </span>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {ACCENT_OPTIONS.map((acc) => {
                  const active = settings.accentColor === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      data-testid={`setting-accent-${acc.id}`}
                      onClick={() => onUpdateSettings({ accentColor: acc.id })}
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'border-zinc-900 dark:border-white bg-stone-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                          : 'border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <span className={`h-3 w-3 shrink-0 rounded-full ${acc.dotClass}`} aria-hidden="true" />
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-1">
              <span className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                <span>Animation Intensity</span>
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {ANIMATION_OPTIONS.map((anim) => {
                  const active = settings.animationIntensity === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      data-testid={`setting-anim-${anim.id}`}
                      onClick={() => onUpdateSettings({ animationIntensity: anim.id })}
                      className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {anim.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. Audio & Haptics */}
          <section className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3.5 space-y-1.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 pb-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Audio &amp; Haptics</span>
            </h3>

            <ToggleRow
              testId="setting-sound"
              label="Sound Effects"
              description="Crisp key taps, tile flips & hint chimes"
              checked={settings.soundEnabled}
              onToggle={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            />
            <ToggleRow
              testId="setting-fanfare"
              label="Victory Fanfare"
              description="Celebration chord on solved words & achievements"
              checked={settings.victoryFanfareEnabled}
              onToggle={() =>
                onUpdateSettings({ victoryFanfareEnabled: !settings.victoryFanfareEnabled })
              }
            />
            <ToggleRow
              testId="setting-haptics"
              label="Vibration &amp; Haptic Feedback"
              description="Subtle tactile taps on Android devices"
              checked={settings.hapticsEnabled}
              onToggle={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
            />
          </section>

          {/* 5. Account & Data */}
          <section className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Account &amp; Data</span>
            </h3>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-stone-100/80 dark:bg-zinc-900 px-3 py-2.5 text-xs">
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  {playerProfile.displayName?.trim() || 'Guest WordVibe Player'}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Local study &amp; streak progress saved on device
                </p>
              </div>
              <Bell className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
            </div>

            <ToggleRow
              testId="setting-cloud-sync"
              label="Cloud Backup Preference"
              description="Keep progress portable alongside local cache"
              checked={settings.cloudSyncEnabled}
              onToggle={() => onUpdateSettings({ cloudSyncEnabled: !settings.cloudSyncEnabled })}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                data-testid="setting-share-app-btn"
                onClick={onShareApp}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Share2 className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>Share WordVibe</span>
              </button>
              <button
                type="button"
                data-testid="setting-reset-tutorial-btn"
                onClick={onResetTutorial}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Reset Tutorial</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAboutExpanded((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                <span>About WordVibe &amp; Privacy Policy</span>
              </span>
              {aboutExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {aboutExpanded && (
              <p className="rounded-xl bg-stone-100/80 dark:bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                WordVibe stores streaks, coins, Faith Study milestones, and theme settings locally
                on your device. Optional city detection is used solely to tailor local trivia and
                never shared with third-party brokers.
              </p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 dark:border-zinc-800 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full sm:w-auto rounded-xl px-6 py-2.5 text-sm font-bold wv-accent-btn cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
