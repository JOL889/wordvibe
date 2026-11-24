import type { ReligionId } from './faithStudyLogic';
import type { ChallengePace } from './playerProfileLogic';
import type { TriviaDifficulty } from './triviaLogic';

export type ThemeMode = 'dark' | 'light' | 'amoled' | 'colorblind';
export type AccentColor = 'emerald' | 'gold' | 'blue' | 'violet';
export type AnimationIntensity = 'full' | 'subtle' | 'reduced';
export type DifficultyTier = 'casual' | 'balanced' | 'mastermind';
export type StartingTab = 'home' | 'puzzle' | 'trivia' | 'faith';

export interface AppSettings {
  // General
  autoDetectLocation: boolean;
  defaultTab: StartingTab;
  difficultyTier: DifficultyTier;
  dailyReminder: boolean;
  // Faith & Study
  defaultReligion: ReligionId;
  showScriptureReferences: boolean;
  mixFaithWordsInDaily: boolean;
  // Theme & Visuals
  themeMode: ThemeMode;
  accentColor: AccentColor;
  animationIntensity: AnimationIntensity;
  // Audio & Haptics
  soundEnabled: boolean;
  victoryFanfareEnabled: boolean;
  hapticsEnabled: boolean;
  // Account & Data
  cloudSyncEnabled: boolean;
  tutorialCompleted: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoDetectLocation: true,
  defaultTab: 'home',
  difficultyTier: 'casual',
  dailyReminder: true,
  defaultReligion: 'christianity',
  showScriptureReferences: true,
  mixFaithWordsInDaily: false,
  themeMode: 'dark',
  accentColor: 'emerald',
  animationIntensity: 'full',
  soundEnabled: true,
  victoryFanfareEnabled: true,
  hapticsEnabled: true,
  cloudSyncEnabled: false,
  tutorialCompleted: false,
};

export interface LegacyAppPreferences {
  soundEnabled?: boolean;
  darkMode?: boolean;
  highContrast?: boolean;
}

export function migrateLegacyPreferences(legacy: LegacyAppPreferences | null | undefined): Partial<AppSettings> {
  if (!legacy || typeof legacy !== 'object') return {};
  const out: Partial<AppSettings> = {};
  if (typeof legacy.soundEnabled === 'boolean') {
    out.soundEnabled = legacy.soundEnabled;
  }
  if (legacy.highContrast === true) {
    out.themeMode = 'colorblind';
  } else if (legacy.darkMode === true) {
    out.themeMode = 'dark';
  } else if (legacy.darkMode === false) {
    // Only apply legacy light preference if explicitly stored previously
    out.themeMode = 'light';
  }
  return out;
}

export function difficultyTierToPace(tier: DifficultyTier): ChallengePace {
  if (tier === 'casual') return 'relaxed';
  if (tier === 'mastermind') return 'brainiac';
  return 'adaptive';
}

export function paceToDifficultyTier(pace: ChallengePace): DifficultyTier {
  if (pace === 'relaxed') return 'casual';
  if (pace === 'brainiac') return 'mastermind';
  return 'balanced';
}

export function difficultyTierToTriviaLevel(tier: DifficultyTier): TriviaDifficulty {
  if (tier === 'casual') return 'novice';
  if (tier === 'mastermind') return 'legendary';
  return 'intermediate';
}

export interface DocumentThemeState {
  isDarkClass: boolean;
  dataTheme: ThemeMode;
  dataAccent: AccentColor;
  dataAnim: AnimationIntensity;
  metaThemeColor: string;
}

export function resolveDocumentThemeState(settings: Pick<AppSettings, 'themeMode' | 'accentColor' | 'animationIntensity'>): DocumentThemeState {
  const isDarkClass =
    settings.themeMode === 'dark' ||
    settings.themeMode === 'amoled' ||
    settings.themeMode === 'colorblind';
  const metaThemeColor =
    settings.themeMode === 'amoled'
      ? '#000000'
      : isDarkClass
      ? '#111315'
      : '#F7F5F0';

  return {
    isDarkClass,
    dataTheme: settings.themeMode,
    dataAccent: settings.accentColor,
    dataAnim: settings.animationIntensity,
    metaThemeColor,
  };
}
