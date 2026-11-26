import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  MapPin,
  Music,
  Palette,
  RotateCcw,
  Share2,
  Sliders,
  Smartphone,
  Sparkles,
  Timer,
  User,
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
import type { LocalUserAccount } from '../game/userAccountLogic';
import { ReligionIcon } from './ReligionIcons';
import { UserAvatar } from './UserAvatar';

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  playerProfile: PlayerProfileState;
  userAccount?: LocalUserAccount | null;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenPersonalize: () => void;
  onOpenEditProfile?: () => void;
  onShareApp: () => void;
  onResetTutorial: () => void;
}

type SettingsSectionId =
  | 'account'
  | 'gameplay'
  | 'audio_appearance'
  | 'notifications'
  | 'about';

const INITIAL_COLLAPSED_STATE: Record<SettingsSectionId, boolean> = {
  account: false,
  gameplay: false,
  audio_appearance: false,
  notifications: false,
  about: false,
};

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
  { id: 'on', label: 'On', sub: 'Sound SFX', Icon: Volume2 },
  { id: 'mute', label: 'Mute', sub: 'Vibrate Only', Icon: Vibrate },
  { id: 'off', label: 'Off', sub: 'Silent SFX', Icon: VolumeX },
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

interface AccordionSectionProps {
  id: SettingsSectionId;
  title: string;
  subtitle: string;
  Icon: typeof User;
  isOpen: boolean;
  onToggle: (id: SettingsSectionId) => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  id,
  title,
  subtitle,
  Icon,
  isOpen,
  onToggle,
  children,
}) => (
  <section
    data-testid={`settings-accordion-${id}`}
    className="rounded-2xl border wv-border wv-card-muted overflow-hidden amoled-surface"
  >
    <button
      type="button"
      data-testid={`settings-accordion-btn-${id}`}
      aria-expanded={isOpen}
      aria-controls={`settings-panel-${id}`}
      onClick={() => onToggle(id)}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:opacity-90 cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border wv-border wv-card wv-accent-text">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-bold wv-text truncate">{title}</div>
          <div className="text-xs wv-text-muted truncate">{subtitle}</div>
        </div>
      </div>
      <span className="shrink-0 wv-text-muted">
        {isOpen ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
    </button>

    {isOpen && (
      <div
        id={`settings-panel-${id}`}
        data-testid={`settings-panel-${id}`}
        className="border-t wv-border px-3.5 py-3 space-y-2.5 animate-stage-enter"
      >
        {children}
      </div>
    )}
  </section>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  playerProfile,
  userAccount = null,
  onClose,
  onUpdateSettings,
  onOpenPersonalize,
  onOpenEditProfile,
  onShareApp,
  onResetTutorial,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<SettingsSectionId, boolean>>(
    INITIAL_COLLAPSED_STATE
  );
  const [sensorPermFeedback, setSensorPermFeedback] = useState<string | null>(null);

  // Ensure every parent dropdown starts collapsed whenever Settings opens
  useEffect(() => {
    if (open) {
      setExpandedSections({ ...INITIAL_COLLAPSED_STATE });
    }
  }, [open]);

  if (!open) return null;

  const toggleSection = (id: SettingsSectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sensorStatus = getSensorSupportStatus();
  const activeSoundMode: SoundMode = settings.soundMode ?? (settings.soundEnabled ? 'on' : 'off');

  const locationSummary =
    playerProfile.locationEnabled && !playerProfile.locationOptOut
      ? formatLocationLabel(playerProfile.location)
      : 'Global Mode (Location off)';

  const profileSubtitle = userAccount
    ? `@${userAccount.username}`
    : playerProfile.displayName?.trim() || 'Guest Player';

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
                Tap any category to expand options
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

        {/* 5 Collapsible Parent Dropdowns (All Collapsed by Default) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-2.5">
          {/* 1. Account & Sync */}
          <AccordionSection
            id="account"
            title="Account & Sync"
            subtitle={`${profileSubtitle} · ${settings.cloudSyncEnabled ? 'Cloud Sync On' : 'Local Storage'}`}
            Icon={User}
            isOpen={expandedSections.account}
            onToggle={toggleSection}
          >
            <div className="flex items-center justify-between gap-2.5 rounded-xl border wv-border wv-card px-3 py-2.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  avatarType={userAccount?.avatarType}
                  builtinAvatarId={userAccount?.builtinAvatarId}
                  avatarDataUrl={userAccount?.avatarDataUrl}
                  alt={userAccount?.username || playerProfile.displayName || 'Player'}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-bold wv-text">
                    {userAccount
                      ? `${userAccount.realName} (@${userAccount.username})`
                      : playerProfile.displayName?.trim() || 'Guest WordVibe Player'}
                  </p>
                  <p className="truncate text-xs wv-text-muted">
                    {userAccount?.email || 'Local study & streak progress saved on device'}
                  </p>
                </div>
              </div>
              {onOpenEditProfile && (
                <button
                  type="button"
                  data-testid="settings-edit-profile-btn"
                  onClick={() => {
                    onClose();
                    onOpenEditProfile();
                  }}
                  className="min-h-10 shrink-0 rounded-xl wv-accent-btn px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  {userAccount ? 'Edit Profile' : 'Sign Up'}
                </button>
              )}
            </div>

            <ToggleRow
              testId="setting-cloud-sync"
              label="Cloud Backup Preference"
              description="Keep verified progress synced alongside local cache"
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
          </AccordionSection>

          {/* 2. Gameplay & Timers */}
          <AccordionSection
            id="gameplay"
            title="Gameplay & Timers"
            subtitle={`15s Trivia · ${FAITH_TRADITIONS[settings.defaultReligion]?.name || 'Faith'} · Controls`}
            Icon={Timer}
            isOpen={expandedSections.gameplay}
            onToggle={toggleSection}
          >
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

            <div className="px-1 pt-1">
              <span className="text-sm font-semibold wv-text-muted">
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

            <ToggleRow
              testId="setting-sensors"
              label="Phone Tilt Follow & Shake"
              description="Subtly follows your real phone tilt with zero idle drift"
              checked={settings.sensorsEnabled}
              onToggle={() => onUpdateSettings({ sensorsEnabled: !settings.sensorsEnabled })}
            />

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
          </AccordionSection>

          {/* 3. Audio & Appearance */}
          <AccordionSection
            id="audio_appearance"
            title="Audio & Appearance"
            subtitle={`Sound ${activeSoundMode.toUpperCase()} · ${THEME_OPTIONS.find((t) => t.id === settings.themeMode)?.label || 'Theme'}`}
            Icon={Palette}
            isOpen={expandedSections.audio_appearance}
            onToggle={toggleSection}
          >
            <div data-testid="settings-sound-music-section" className="space-y-2">
              <ToggleRow
                testId="setting-sound-sfx-toggle"
                label="Sound"
                description="All in-game SFX: taps, tile flips, error shakes, chimes & alerts"
                checked={activeSoundMode === 'on'}
                onToggle={() => {
                  const nextMode: SoundMode = activeSoundMode === 'on' ? 'off' : 'on';
                  onUpdateSettings({
                    soundMode: nextMode,
                    soundEnabled: nextMode === 'on',
                  });
                }}
              />

              <ToggleRow
                testId="setting-bg-music"
                label="Music"
                description="Cozy parlor piano loop (pauses during ads & background)"
                checked={settings.bgMusicEnabled}
                onToggle={() => onUpdateSettings({ bgMusicEnabled: !settings.bgMusicEnabled })}
              />

              <div className="px-1 pt-1 pb-1">
                <span className="text-xs sm:text-sm font-semibold wv-text-muted">
                  Tap &amp; Vibration Profile
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
                description="Mute mode vibrates gently; Off mode disables tap SFX & vibration"
                checked={settings.hapticsEnabled}
                onToggle={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              />

              <div className="flex items-center gap-2 px-3 py-1 text-xs wv-text-muted">
                <Music className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
                <span>Sound &amp; Music are independent — toggle either anytime.</span>
              </div>
            </div>

            <div className="border-t wv-border pt-3 space-y-2.5">
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
            </div>
          </AccordionSection>

          {/* 4. Notifications */}
          <AccordionSection
            id="notifications"
            title="Notifications"
            subtitle={`${settings.dailyReminder ? 'Reminders On' : 'Reminders Off'} · ${locationSummary}`}
            Icon={Bell}
            isOpen={expandedSections.notifications}
            onToggle={toggleSection}
          >
            <ToggleRow
              testId="setting-daily-reminder"
              label="Daily Streak Reminder"
              description="Friendly evening check-in nudge"
              checked={settings.dailyReminder}
              onToggle={() => onUpdateSettings({ dailyReminder: !settings.dailyReminder })}
            />

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
          </AccordionSection>

          {/* 5. About & Help */}
          <AccordionSection
            id="about"
            title="About & Help"
            subtitle="Offline play, rules & privacy guide"
            Icon={Info}
            isOpen={expandedSections.about}
            onToggle={toggleSection}
          >
            <p className="rounded-xl border wv-border wv-card p-3.5 text-sm leading-relaxed wv-text-muted">
              WordVibe works offline using on-device puzzles, trivia, streaks, Faith Study
              progress, and theme preferences. Your optional city choice stays strictly on your
              device.
            </p>
            <button
              type="button"
              data-testid="setting-open-help-btn"
              onClick={onResetTutorial}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border wv-border wv-card px-3 text-xs sm:text-sm font-semibold wv-text hover:opacity-90 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 wv-accent-text" aria-hidden="true" />
              <span>How to Play &amp; Scoring Guide</span>
            </button>
          </AccordionSection>
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
