import type { ReligionId } from './faithStudyLogic';
import type { ChallengePace } from './playerProfileLogic';
import type { TriviaDifficulty } from './triviaLogic';

export type ThemeMode = 'dark' | 'light' | 'amoled' | 'colorblind';
export type AccentColor = 'emerald' | 'gold' | 'blue' | 'violet';
export type AnimationIntensity = 'full' | 'subtle' | 'reduced';
export type DifficultyTier = 'casual' | 'balanced' | 'mastermind';
export type StartingTab = 'home' | 'puzzle' | 'trivia' | 'faith';
export type SoundMode = 'on' | 'mute' | 'off';

export type FiveDifficultyLevel =
  | 'novice'
  | 'beginner'
  | 'intermediate'
  | 'expert'
  | 'legendary';

export type SessionPlayMode = 'level_climb' | 'sprint';

export const FIVE_LEVEL_ORDER: FiveDifficultyLevel[] = [
  'novice',
  'beginner',
  'intermediate',
  'expert',
  'legendary',
];

export const FIVE_LEVEL_META: Record<
  FiveDifficultyLevel,
  { id: FiveDifficultyLevel; label: string; shortLabel: string; badge: string }
> = {
  novice: { id: 'novice', label: 'Level 1', shortLabel: 'Lv 1', badge: 'Level 1' },
  beginner: { id: 'beginner', label: 'Level 2', shortLabel: 'Lv 2', badge: 'Level 2' },
  intermediate: {
    id: 'intermediate',
    label: 'Level 3',
    shortLabel: 'Lv 3',
    badge: 'Level 3',
  },
  expert: { id: 'expert', label: 'Level 4', shortLabel: 'Lv 4', badge: 'Level 4' },
  legendary: { id: 'legendary', label: 'Level 5+', shortLabel: 'Lv 5+', badge: 'Level 5+' },
};

const LEGACY_LEVEL_NUMBER_MAP: Record<FiveDifficultyLevel, number> = {
  novice: 1,
  beginner: 2,
  intermediate: 3,
  expert: 4,
  legendary: 5,
};

export function normalizeLevelNumber(val: unknown, fallback = 1): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.max(1, Math.floor(val));
  }
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed in LEGACY_LEVEL_NUMBER_MAP) {
      return LEGACY_LEVEL_NUMBER_MAP[trimmed as FiveDifficultyLevel];
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }
  }
  return Math.max(1, Math.floor(fallback));
}

export function getNextLevelNumber(levelNumber: number): number {
  return normalizeLevelNumber(levelNumber) + 1;
}

export function formatLevelLabel(levelNumber: number): string {
  return `Level ${normalizeLevelNumber(levelNumber)}`;
}

export function levelNumberToDifficultyBand(levelNumber: number): FiveDifficultyLevel {
  const n = normalizeLevelNumber(levelNumber);
  if (n <= 1) return 'novice';
  if (n === 2) return 'beginner';
  if (n === 3) return 'intermediate';
  if (n === 4) return 'expert';
  return 'legendary';
}

export function getNextFiveLevel(level: FiveDifficultyLevel): FiveDifficultyLevel | null {
  const idx = FIVE_LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx >= FIVE_LEVEL_ORDER.length - 1) return null;
  return FIVE_LEVEL_ORDER[idx + 1];
}

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
  // Audio, Haptics & Sensors
  soundMode: SoundMode;
  bgMusicEnabled: boolean;
  soundEnabled: boolean;
  victoryFanfareEnabled: boolean;
  hapticsEnabled: boolean;
  sensorsEnabled: boolean;
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
  soundMode: 'on',
  bgMusicEnabled: true,
  soundEnabled: true,
  victoryFanfareEnabled: true,
  hapticsEnabled: true,
  sensorsEnabled: true,
  cloudSyncEnabled: false,
  tutorialCompleted: false,
};

export interface LegacyAppPreferences {
  soundEnabled?: boolean;
  darkMode?: boolean;
  highContrast?: boolean;
}

export function migrateLegacyPreferences(
  legacy: LegacyAppPreferences | null | undefined
): Partial<AppSettings> {
  if (!legacy || typeof legacy !== 'object') return {};
  const out: Partial<AppSettings> = {};
  if (typeof legacy.soundEnabled === 'boolean') {
    out.soundEnabled = legacy.soundEnabled;
    out.soundMode = legacy.soundEnabled ? 'on' : 'off';
  }
  if (legacy.highContrast === true) {
    out.themeMode = 'colorblind';
  } else if (legacy.darkMode === true) {
    out.themeMode = 'dark';
  } else if (legacy.darkMode === false) {
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

const DARK_META_COLORS: Record<AccentColor, string> = {
  emerald: '#061A14',
  gold: '#1A1306',
  blue: '#07152B',
  violet: '#150B26',
};

const LIGHT_META_COLORS: Record<AccentColor, string> = {
  emerald: '#ECF8F2',
  gold: '#FDF8EC',
  blue: '#EEF5FD',
  violet: '#F5EFFC',
};

export function resolveDocumentThemeState(
  settings: Pick<AppSettings, 'themeMode' | 'accentColor' | 'animationIntensity'>
): DocumentThemeState {
  const isDarkClass =
    settings.themeMode === 'dark' ||
    settings.themeMode === 'amoled' ||
    settings.themeMode === 'colorblind';
  const metaThemeColor =
    settings.themeMode === 'amoled'
      ? '#000000'
      : isDarkClass
      ? DARK_META_COLORS[settings.accentColor] || '#061A14'
      : LIGHT_META_COLORS[settings.accentColor] || '#ECF8F2';

  return {
    isDarkClass,
    dataTheme: settings.themeMode,
    dataAccent: settings.accentColor,
    dataAnim: settings.animationIntensity,
    metaThemeColor,
  };
}
