import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Compass,
  MapPin,
  Music,
  Palette,
  RotateCcw,
  Share2,
  Shield,
  Sliders,
  Smartphone,
  Sparkles,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  getSensorSupportStatus,
  requestMotionSensorPermission,
} from '../services/deviceSensorService';
import { FAITH_TRADITIONS, RELIGION_IDS } from '../game/faithStudyLogic';
import { formatLocationLabel, type PlayerProfileState } from '../game/playerProfileLogic';
import type {
  AccentColor,
  AnimationIntensity,
  AppSettings,
  DifficultyTier,
  SoundMode,
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
  { id: 'dark', label: 'Dark Mode', sub: 'Deep integrated tint' },
  { id: 'light', label: 'Light Mode', sub: 'Clean tinted paper' },
  { id: 'amoled', label: 'AMOLED Black', sub: 'True #000 OLED' },
  { id: 'colorblind', label: 'Colorblind Safe', sub: 'High-contrast' },
];

const ACCENT_OPTIONS: Array<{ id: AccentColor; label: string; hex: string }> = [
  { id: 'emerald', label: 'Emerald', hex: '#10B981' },
  { id: 'gold', label: 'Royal Gold', hex: '#D97706' },
  { id: 'blue', label: 'Ocean Blue', hex: '#2563EB' },
  { id: 'violet', label: 'Violet', hex: '#7C3AED' },
];

const ANIMATION_OPTIONS: Array<{ id: AnimationIntensity; label: string }> = [
  { id: 'full', label: 'Motion Tilt' },
  { id: 'subtle', label: 'Gentle Tilt' },
  { id: 'reduced', label: 'Still Mode' },
];

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyTier; label: string }> = [
  { id: 'casual', label: 'Balanced' },
  { id: 'balanced', label: 'Brisk' },
  { id: 'mastermind', label: 'Mastermind' },
];

const STARTING_TABS: Array<{ id: StartingTab; label: string }> = [
  { id: 'home', label: 'Streak' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'faith', label: 'Faith' },
  { id: 'trivia', label: 'AI Trivia' },
];

const SOUND_MODES: Array<{
  id: SoundMode;
  label: string;
  sub: string;
  Icon: typeof Volume2;
}> = [
  { id: 'on', label: 'On', sub: 'Sound + Loop', Icon: Volume2 },
  { id: 'mute', label: 'Mute', sub: 'Vibrate Only', Icon: Vibrate },
  { id: 'off', label: 'Off', sub: 'Total Silence', Icon: VolumeX },
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
    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:opacity-95 cursor-pointer"
  >
    <div className="min-w-0">
      <div className="text-sm sm:text-base font-semibold wv-text">{label}</div>
      {description && <div className="text-xs wv-text-muted">{description}</div>}
    </div>
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'wv-accent-btn' : 'bg-black/20 dark:bg-white/20'
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
  const [sensorPermFeedback, setSensorPermFeedback] = useState<string | null>(null);

  if (!open) return null;

  const sensorStatus = getSensorSupportStatus();
  const activeSoundMode: SoundMode = settings.soundMode ?? (settings.soundEnabled ? 'on' : 'off');

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
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-2 wv-border wv-card shadow-2xl animate-modal-pop amoled-surface">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b wv-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 wv-accent-text" aria-hidden="true" />
            <div>
              <h2
                id="settings-modal-title"
                className="font-display text-xl font-bold wv-text"
              >
                WordVibe Settings
              </h2>
              <p className="text-xs wv-text-muted">
                Crossword, Brain Trivia &amp; Faith Study
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-settings-btn"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {/* 1. General */}
          <section className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>General</span>
            </h3>

            <ToggleRow
              testId="setting-auto-location"
              label="Auto-Detect Location"
              description="Tailor trivia & trends via offline timezone or GPS"
              checked={settings.autoDetectLocation}
              onToggle={() =>
                onUpdateSettings({ autoDetectLocation: !settings.autoDetectLocation })
              }
            />

            <div className="flex items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold wv-text">
                  <MapPin className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
                  <span className="truncate">{locationSummary}</span>
                </div>
                <p className="text-xs wv-text-muted">Manual city &amp; country selector</p>
              </div>
              <button
                type="button"
                data-testid="setting-edit-city-btn"
                onClick={() => {
                  onClose();
                  onOpenPersonalize();
                }}
                className="min-h-10 shrink-0 rounded-xl border wv-border wv-card-muted px-3 py-1.5 text-xs sm:text-sm font-semibold wv-text hover:opacity-90 cursor-pointer"
              >
                Edit City
              </button>
            </div>

            <div className="px-1 pt-1">
              <span className="text-xs sm:text-sm font-semibold wv-text-muted">
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
                      className={`min-h-11 rounded-xl border px-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'wv-border wv-card wv-text-muted hover:opacity-90'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-1 pt-1">
              <span className="text-xs sm:text-sm font-semibold wv-text-muted">
                Challenge Pace
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
                      className={`min-h-11 rounded-xl border px-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'wv-border wv-card wv-text-muted hover:opacity-90'
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
          <section className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Faith &amp; Study</span>
            </h3>

            <div className="px-1">
              <span className="text-xs sm:text-sm font-semibold wv-text-muted">
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
                      className={`flex min-h-12 items-center gap-1.5 rounded-xl border px-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'wv-border wv-card wv-text hover:opacity-90'
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
              label="Mix Faith Words into Crossword Sprints"
              description="Blend inspiring words from your tradition into Endless Sprint"
              checked={settings.mixFaithWordsInDaily}
              onToggle={() =>
                onUpdateSettings({ mixFaithWordsInDaily: !settings.mixFaithWordsInDaily })
              }
            />
          </section>

          {/* 3. Theme & Visuals */}
          <section className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-3 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Integrated Theme &amp; Color</span>
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
                        : 'wv-border wv-card wv-text hover:opacity-90'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{opt.label}</span>
                    <span className="text-xs opacity-75">{opt.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-1">
              <span className="text-xs sm:text-sm font-semibold wv-text-muted">
                App Color (Integrates Every Surface)
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
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-pill border-2'
                          : 'wv-border wv-card wv-text-muted hover:opacity-90'
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: acc.hex }}
                        aria-hidden="true"
                      />
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-1">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold wv-text-muted">
                <Sparkles className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                <span>Phone Motion Tilt</span>
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
                      className={`min-h-11 rounded-xl border px-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'wv-border wv-card wv-text-muted hover:opacity-90'
                      }`}
                    >
                      {anim.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. Audio, Haptics & Phone Sensors */}
          <section className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-2 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 pb-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sound Mode, Music Loop &amp; Motion</span>
            </h3>

            {/* 3-State Sound Mode Selector */}
            <div className="px-1 pb-1">
              <span className="text-xs sm:text-sm font-semibold wv-text-muted">
                Icon Tap &amp; Audio Mode
              </span>
              <div
                role="group"
                aria-label="Sound feedback mode"
                className="mt-1.5 grid grid-cols-3 gap-1.5"
              >
                {SOUND_MODES.map(({ id, label, sub, Icon }) => {
                  const active = activeSoundMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`setting-sound-mode-${id}`}
                      aria-pressed={active}
                      onClick={() =>
                        onUpdateSettings({
                          soundMode: id,
                          soundEnabled: id === 'on',
                        })
                      }
                      className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors cursor-pointer ${
                        active
                          ? 'wv-accent-btn border-transparent'
                          : 'wv-border wv-card wv-text hover:opacity-90'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{label}</span>
                      </span>
                      <span className="text-xs opacity-80">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              testId="setting-bg-music"
              label="Looping Background Game Music"
              description="Plays a calm game melody continuously on loop while Sound is On"
              checked={settings.bgMusicEnabled}
              onToggle={() => onUpdateSettings({ bgMusicEnabled: !settings.bgMusicEnabled })}
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
              label="Vibration on Taps (when Sound is On)"
              description="Mute mode always vibrates gently; Off mode disables all vibration"
              checked={settings.hapticsEnabled}
              onToggle={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
            />

            <ToggleRow
              testId="setting-sensors"
              label="Phone Tilt Follow & Shake"
              description="Subtly follows your real phone tilt with zero idle drift"
              checked={settings.sensorsEnabled}
              onToggle={() => onUpdateSettings({ sensorsEnabled: !settings.sensorsEnabled })}
            />

            <div className="flex items-center gap-2 px-3 py-1 text-xs wv-text-muted">
              <Music className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
              <span>
                On = Tap sound + looping music · Mute = Vibrate only · Off = Totally silent
              </span>
            </div>

            {settings.sensorsEnabled && sensorStatus.needsPermissionPrompt && (
              <div className="px-2 pt-1">
                <button
                  type="button"
                  data-testid="request-motion-permission-btn"
                  onClick={() => {
                    void requestMotionSensorPermission().then((ok) => {
                      setSensorPermFeedback(
                        ok
                          ? 'Motion sensors enabled!'
                          : 'Motion permission was denied in browser settings.'
                      );
                    });
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border wv-border wv-card px-3 py-1.5 text-xs sm:text-sm font-bold wv-accent-text cursor-pointer"
                >
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Enable iOS Motion Access</span>
                </button>
                {sensorPermFeedback && (
                  <p className="mt-1 text-xs font-medium wv-text-muted">{sensorPermFeedback}</p>
                )}
              </div>
            )}
          </section>

          {/* 5. Account & Data */}
          <section className="rounded-2xl border wv-border wv-card-muted p-3.5 space-y-2.5 amoled-surface">
            <h3 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Account &amp; Data</span>
            </h3>

            <div className="flex items-center justify-between gap-2 rounded-xl border wv-border wv-card px-3 py-2.5 text-xs sm:text-sm">
              <div>
                <p className="font-bold wv-text">
                  {playerProfile.displayName?.trim() || 'Guest WordVibe Player'}
                </p>
                <p className="wv-text-muted">
                  Local study &amp; streak progress saved offline on device
                </p>
              </div>
              <Bell className="h-4 w-4 wv-text-muted shrink-0" aria-hidden="true" />
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
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border wv-border wv-card px-3 text-xs sm:text-sm font-semibold wv-text hover:opacity-90 cursor-pointer"
              >
                <Share2 className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>Share WordVibe</span>
              </button>
              <button
                type="button"
                data-testid="setting-reset-tutorial-btn"
                onClick={onResetTutorial}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border wv-border wv-card px-3 text-xs sm:text-sm font-semibold wv-text hover:opacity-90 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>Reset Tutorial</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAboutExpanded((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-xs sm:text-sm font-semibold wv-text-muted hover:opacity-90 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                <span>About WordVibe &amp; Privacy Policy</span>
              </span>
              {aboutExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {aboutExpanded && (
              <p className="rounded-xl border wv-border wv-card p-3 text-xs leading-relaxed wv-text-muted">
                WordVibe runs offline using your on-device zero-repeat question vault, streaks,
                coins, Faith Study progress, and integrated theme preferences. Optional city
                selection stays strictly on your device.
              </p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t wv-border px-5 py-3 flex justify-end">
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
