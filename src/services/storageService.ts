import type { WordLength } from '../data/words';
import {
  BASE_ATTEMPTS,
  buildSmartHintClueText,
  canPlaceHintBox,
  createEmptyDrafts,
  DEFAULT_STATS,
  pickDefaultSmartHintBoxes,
  type GameMode,
  type GridBoxHint,
  type HintClueWordCount,
  type HintUserContext,
  type PuzzleStatus,
  type StatsData,
} from '../game/puzzleLogic';
import {
  createDefaultPlayerProfile,
  type PlayerProfileState,
} from '../game/playerProfileLogic';
import type { PuzzleCluesBundle, PuzzleWordTrivia } from '../game/wordTriviaLogic';
import {
  DEFAULT_APP_SETTINGS,
  levelNumberToDifficultyBand,
  migrateLegacyPreferences,
  normalizeLevelNumber,
  type AppSettings,
  type FiveDifficultyLevel,
  type SessionPlayMode,
  type SoundMode,
} from '../game/settingsLogic';
import type { CrosswordBoardState, CrosswordLevelClimbState } from '../game/crosswordLogic';
import { isReligionId, type ReligionId } from '../game/faithStudyLogic';

export interface PuzzleRoundState {
  mode: GameMode;
  dateKey: string;
  length: WordLength;
  categoryId: string;
  target: string;
  guesses: string[];
  rowGuesses: (string | null)[];
  rowDrafts: string[][];
  status: PuzzleStatus;
  maxAttempts: number;
  hintsUsed: number;
  revealedPositions: number[];
  gridHintBoxes?: GridBoxHint[];
  defaultHintText?: string;
  defaultHintWordCount?: HintClueWordCount;
  eliminatedLetters: string[];
  fiftyFiftyUsed?: boolean;
  progressiveNudge?: string;
  faithReligion?: ReligionId;
  extraAttemptGranted: boolean;
  statsRecorded: boolean;
  playCharged?: boolean;
  isPersonalized?: boolean;
  personalizedClue?: string;
  personalizedReason?: string;
  personalizedCulturalNote?: string;
  personalizedFunFact?: string;
  personalizedLocationLabel?: string;
  wordTriviaUnlocked?: boolean;
  wordTriviaRow?: number;
  unlockedTriviaRows?: number[];
  wordTrivia?: PuzzleWordTrivia | null;
  wordTriviaBundle?: PuzzleCluesBundle | null;
}

export interface CategoryProgressState {
  activeCategoryId: string;
  playsRemaining: Record<string, number>;
  solvedByCategory: Record<string, number>;
  exploredCategories: string[];
  /** dateKey -> categoryId -> wordLength -> array of words already served today */
  usedWordsByDate: Record<string, Record<string, Record<number, string[]>>>;
}

export interface AppPreferences {
  soundEnabled: boolean;
  darkMode: boolean;
  highContrast: boolean;
}

const STATS_KEY = 'lexicon_daily_stats_v1';
const PREFS_KEY = 'lexicon_daily_prefs_v1';
const CATEGORY_PROGRESS_KEY = 'lexicon_category_progress_v1';
const DAILY_ROUND_PREFIX = 'lexicon_daily_round_v1';
const SPRINT_ROUND_KEY = 'lexicon_sprint_round_v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeRound(parsed: Partial<PuzzleRoundState> | null): PuzzleRoundState | null {
  if (!parsed || !parsed.target || !parsed.length) return null;
  const maxAttempts = parsed.maxAttempts || BASE_ATTEMPTS;
  const length = parsed.length;
  const legacyGuesses = Array.isArray(parsed.guesses) ? parsed.guesses : [];

  const rowGuesses: (string | null)[] = Array.isArray(parsed.rowGuesses)
    ? [...parsed.rowGuesses]
    : Array.from({ length: maxAttempts }, (_, idx) => legacyGuesses[idx] ?? null);

  while (rowGuesses.length < maxAttempts) {
    rowGuesses.push(null);
  }

  const emptyDrafts = createEmptyDrafts(maxAttempts, length);
  const rowDrafts = Array.isArray(parsed.rowDrafts)
    ? emptyDrafts.map((emptyRow, rIdx) => {
        const savedRow = parsed.rowDrafts?.[rIdx];
        if (!Array.isArray(savedRow)) return emptyRow;
        return emptyRow.map((_, cIdx) => (typeof savedRow[cIdx] === 'string' ? savedRow[cIdx] : ''));
      })
    : emptyDrafts;

  const guesses = rowGuesses.filter((g): g is string => typeof g === 'string' && g.length === length);

  const gridHintBoxes: GridBoxHint[] = [];
  if (Array.isArray(parsed.gridHintBoxes)) {
    for (const item of parsed.gridHintBoxes) {
      if (
        item &&
        typeof item.row === 'number' &&
        typeof item.col === 'number' &&
        typeof item.letter === 'string' &&
        item.row >= 0 &&
        item.row < maxAttempts &&
        item.col >= 0 &&
        item.col < length &&
        canPlaceHintBox(gridHintBoxes, item.row, item.col)
      ) {
        gridHintBoxes.push({
          row: item.row,
          col: item.col,
          letter: item.letter.toUpperCase(),
          source: item.source === 'rewarded' ? 'rewarded' : 'default',
        });
      }
    }
  }
  if (gridHintBoxes.length === 0) {
    gridHintBoxes.push(...pickDefaultSmartHintBoxes({ target: parsed.target, maxAttempts }));
  }
  const fallbackClue = buildSmartHintClueText({ hint: gridHintBoxes[0] });
  const hasLegacyPromptText =
    typeof parsed.defaultHintText === 'string' &&
    /default hint|smart hint/i.test(parsed.defaultHintText);

  return {
    mode: parsed.mode || 'daily',
    dateKey: parsed.dateKey || '',
    length,
    categoryId: parsed.categoryId || 'general-classic',
    target: parsed.target,
    guesses,
    rowGuesses,
    rowDrafts,
    status: parsed.status || 'playing',
    maxAttempts,
    hintsUsed: parsed.hintsUsed || 0,
    revealedPositions: Array.isArray(parsed.revealedPositions)
      ? parsed.revealedPositions
      : Array.from(new Set(gridHintBoxes.map((h) => h.col))),
    gridHintBoxes,
    defaultHintText:
      typeof parsed.defaultHintText === 'string' &&
      parsed.defaultHintText.trim().length > 0 &&
      !hasLegacyPromptText
        ? parsed.defaultHintText
        : fallbackClue.text,
    defaultHintWordCount:
      parsed.defaultHintWordCount === 4 ||
      parsed.defaultHintWordCount === 5 ||
      parsed.defaultHintWordCount === 6
        ? parsed.defaultHintWordCount
        : fallbackClue.wordCount,
    eliminatedLetters: Array.isArray(parsed.eliminatedLetters) ? parsed.eliminatedLetters : [],
    fiftyFiftyUsed: Boolean(parsed.fiftyFiftyUsed),
    progressiveNudge: typeof parsed.progressiveNudge === 'string' ? parsed.progressiveNudge : undefined,
    faithReligion: isReligionId(parsed.faithReligion) ? parsed.faithReligion : undefined,
    extraAttemptGranted: Boolean(parsed.extraAttemptGranted),
    statsRecorded: Boolean(parsed.statsRecorded),
    playCharged: Boolean(parsed.playCharged),
    isPersonalized: Boolean(parsed.isPersonalized),
    personalizedClue: typeof parsed.personalizedClue === 'string' ? parsed.personalizedClue : undefined,
    personalizedReason:
      typeof parsed.personalizedReason === 'string' ? parsed.personalizedReason : undefined,
    personalizedCulturalNote:
      typeof parsed.personalizedCulturalNote === 'string'
        ? parsed.personalizedCulturalNote
        : undefined,
    personalizedFunFact:
      typeof parsed.personalizedFunFact === 'string' ? parsed.personalizedFunFact : undefined,
    personalizedLocationLabel:
      typeof parsed.personalizedLocationLabel === 'string'
        ? parsed.personalizedLocationLabel
        : undefined,
    wordTriviaUnlocked: Boolean(parsed.wordTriviaUnlocked),
    wordTriviaRow:
      typeof parsed.wordTriviaRow === 'number' && Number.isInteger(parsed.wordTriviaRow)
        ? parsed.wordTriviaRow
        : undefined,
    unlockedTriviaRows: Array.isArray(parsed.unlockedTriviaRows)
      ? parsed.unlockedTriviaRows.filter(
          (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1
        )
      : typeof parsed.wordTriviaRow === 'number' && Number.isInteger(parsed.wordTriviaRow)
      ? [parsed.wordTriviaRow]
      : [],
    wordTrivia:
      parsed.wordTrivia && typeof parsed.wordTrivia === 'object'
        ? (parsed.wordTrivia as PuzzleWordTrivia)
        : null,
    wordTriviaBundle:
      parsed.wordTriviaBundle && typeof parsed.wordTriviaBundle === 'object'
        ? (parsed.wordTriviaBundle as PuzzleCluesBundle)
        : null,
  };
}

export function loadStats(): StatsData {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  const parsed = safeParse<Partial<StatsData>>(window.localStorage.getItem(STATS_KEY), {});
  return {
    ...DEFAULT_STATS,
    ...parsed,
    guessDistribution: {
      ...DEFAULT_STATS.guessDistribution,
      ...(parsed.guessDistribution || {}),
    },
    dailyWinDates: Array.isArray(parsed.dailyWinDates) ? parsed.dailyWinDates : [],
    dailySolvedLengthsByDate: parsed.dailySolvedLengthsByDate || {},
    sprintSolvedByDate: parsed.sprintSolvedByDate || {},
  };
}

export function saveStats(stats: StatsData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function loadPreferences(): AppPreferences {
  const defaults: AppPreferences = {
    soundEnabled: true,
    darkMode: true,
    highContrast: false,
  };
  if (typeof window === 'undefined') return defaults;
  return {
    ...defaults,
    ...safeParse<Partial<AppPreferences>>(window.localStorage.getItem(PREFS_KEY), {}),
  };
}

export function savePreferences(prefs: AppPreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const SETTINGS_KEY = 'wordvibe_app_settings_v1';
const FAITH_PROGRESS_KEY = 'wordvibe_faith_progress_v1';

export interface FaithStudyProgress {
  activeReligion: ReligionId;
  completedSessionsByDate: Record<string, ReligionId[]>;
  totalSessionsCompleted: number;
  faithTriviaCorrect: number;
}

function normalizeSoundMode(val: unknown, fallbackSoundEnabled?: boolean): SoundMode {
  if (val === 'on' || val === 'mute' || val === 'off') return val;
  if (fallbackSoundEnabled === false) return 'off';
  return 'on';
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
  const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
  if (rawSettings) {
    const parsed = safeParse<Partial<AppSettings>>(rawSettings, {});
    const resolvedSoundMode = normalizeSoundMode(parsed.soundMode, parsed.soundEnabled);
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      soundMode: resolvedSoundMode,
      soundEnabled: resolvedSoundMode === 'on',
      bgMusicEnabled:
        typeof parsed.bgMusicEnabled === 'boolean'
          ? parsed.bgMusicEnabled
          : DEFAULT_APP_SETTINGS.bgMusicEnabled,
      defaultReligion: isReligionId(parsed.defaultReligion)
        ? parsed.defaultReligion
        : DEFAULT_APP_SETTINGS.defaultReligion,
    };
  }
  const rawLegacy = window.localStorage.getItem(PREFS_KEY);
  if (rawLegacy) {
    const legacy = safeParse<Partial<AppPreferences>>(rawLegacy, {});
    return {
      ...DEFAULT_APP_SETTINGS,
      ...migrateLegacyPreferences(legacy),
    };
  }
  return DEFAULT_APP_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadFaithStudyProgress(defaultReligion: ReligionId = 'christianity'): FaithStudyProgress {
  const defaults: FaithStudyProgress = {
    activeReligion: defaultReligion,
    completedSessionsByDate: {},
    totalSessionsCompleted: 0,
    faithTriviaCorrect: 0,
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<FaithStudyProgress>>(
    window.localStorage.getItem(FAITH_PROGRESS_KEY),
    {}
  );
  return {
    activeReligion: isReligionId(parsed.activeReligion) ? parsed.activeReligion : defaultReligion,
    completedSessionsByDate:
      parsed.completedSessionsByDate && typeof parsed.completedSessionsByDate === 'object'
        ? parsed.completedSessionsByDate
        : {},
    totalSessionsCompleted: typeof parsed.totalSessionsCompleted === 'number' ? parsed.totalSessionsCompleted : 0,
    faithTriviaCorrect: typeof parsed.faithTriviaCorrect === 'number' ? parsed.faithTriviaCorrect : 0,
  };
}

export function saveFaithStudyProgress(progress: FaithStudyProgress): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAITH_PROGRESS_KEY, JSON.stringify(progress));
}

export function loadCategoryProgress(): CategoryProgressState {
  const defaults: CategoryProgressState = {
    activeCategoryId: 'general-classic',
    playsRemaining: {},
    solvedByCategory: {},
    exploredCategories: ['general-classic'],
    usedWordsByDate: {},
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<CategoryProgressState>>(
    window.localStorage.getItem(CATEGORY_PROGRESS_KEY),
    {}
  );
  return {
    activeCategoryId: parsed.activeCategoryId || 'general-classic',
    playsRemaining: parsed.playsRemaining || {},
    solvedByCategory: parsed.solvedByCategory || {},
    exploredCategories:
      Array.isArray(parsed.exploredCategories) && parsed.exploredCategories.length > 0
        ? parsed.exploredCategories
        : ['general-classic'],
    usedWordsByDate: parsed.usedWordsByDate && typeof parsed.usedWordsByDate === 'object'
      ? parsed.usedWordsByDate
      : {},
  };
}

export function getUsedCategoryWordsForDay(
  progress: CategoryProgressState,
  dateKey: string,
  categoryId: string,
  length: WordLength
): string[] {
  const list = progress.usedWordsByDate?.[dateKey]?.[categoryId]?.[length];
  return Array.isArray(list) ? list : [];
}

export function recordUsedCategoryWord(
  progress: CategoryProgressState,
  dateKey: string,
  categoryId: string,
  length: WordLength,
  word: string
): CategoryProgressState {
  const upper = word.trim().toUpperCase();
  if (!upper) return progress;
  const dayMap = progress.usedWordsByDate?.[dateKey] || {};
  const catMap = dayMap[categoryId] || {};
  const existing = Array.isArray(catMap[length]) ? catMap[length] : [];
  if (existing.includes(upper)) return progress;

  // Keep only the 7 most recent date buckets so localStorage stays compact
  const allDates = Object.keys({ ...progress.usedWordsByDate, [dateKey]: true }).sort();
  const recentDates = new Set(allDates.slice(-7));
  const nextUsedWordsByDate: Record<string, Record<string, Record<number, string[]>>> = {};
  for (const d of recentDates) {
    if (d !== dateKey && progress.usedWordsByDate?.[d]) {
      nextUsedWordsByDate[d] = progress.usedWordsByDate[d];
    }
  }
  nextUsedWordsByDate[dateKey] = {
    ...dayMap,
    [categoryId]: {
      ...catMap,
      [length]: [...existing, upper],
    },
  };

  return {
    ...progress,
    usedWordsByDate: nextUsedWordsByDate,
  };
}

export function saveCategoryProgress(state: CategoryProgressState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CATEGORY_PROGRESS_KEY, JSON.stringify(state));
}

export function getDailyRoundStorageKey(
  dateKey: string,
  length: WordLength,
  categoryId = 'general-classic'
): string {
  return categoryId === 'general-classic'
    ? `${DAILY_ROUND_PREFIX}_${dateKey}_${length}`
    : `${DAILY_ROUND_PREFIX}_${dateKey}_${categoryId}_${length}`;
}

export function getSprintRoundStorageKey(
  length: WordLength,
  categoryId = 'general-classic'
): string {
  return categoryId === 'general-classic'
    ? `${SPRINT_ROUND_KEY}_${length}`
    : `${SPRINT_ROUND_KEY}_${categoryId}_${length}`;
}

export function loadDailyRound(
  dateKey: string,
  length: WordLength,
  categoryId = 'general-classic'
): PuzzleRoundState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getDailyRoundStorageKey(dateKey, length, categoryId));
  const parsed = normalizeRound(safeParse<Partial<PuzzleRoundState> | null>(raw, null));
  if (
    !parsed ||
    parsed.dateKey !== dateKey ||
    parsed.length !== length ||
    parsed.categoryId !== categoryId
  ) {
    return null;
  }
  return parsed;
}

export function saveDailyRound(round: PuzzleRoundState): void {
  if (typeof window === 'undefined' || round.mode !== 'daily') return;
  window.localStorage.setItem(
    getDailyRoundStorageKey(round.dateKey, round.length, round.categoryId),
    JSON.stringify(round)
  );
}

export function loadSprintRound(
  length: WordLength,
  categoryId = 'general-classic'
): PuzzleRoundState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getSprintRoundStorageKey(length, categoryId));
  const parsed = normalizeRound(safeParse<Partial<PuzzleRoundState> | null>(raw, null));
  if (!parsed || parsed.mode !== 'sprint' || parsed.length !== length || parsed.categoryId !== categoryId) {
    return null;
  }
  return parsed;
}

export function saveSprintRound(round: PuzzleRoundState): void {
  if (typeof window === 'undefined' || round.mode !== 'sprint') return;
  window.localStorage.setItem(
    getSprintRoundStorageKey(round.length, round.categoryId),
    JSON.stringify(round)
  );
}

export function createFreshRound(params: {
  mode: GameMode;
  dateKey: string;
  length: WordLength;
  categoryId?: string;
  target: string;
  playCharged?: boolean;
  isPersonalized?: boolean;
  personalizedClue?: string;
  personalizedReason?: string;
  personalizedCulturalNote?: string;
  personalizedFunFact?: string;
  personalizedLocationLabel?: string;
  faithReligion?: ReligionId;
  previousHintWordCount?: HintClueWordCount | null;
  userContext?: HintUserContext;
}): PuzzleRoundState {
  const upperTarget = params.target.toUpperCase();
  const defaultBoxes = pickDefaultSmartHintBoxes({
    target: upperTarget,
    maxAttempts: BASE_ATTEMPTS,
  });
  const clueMeta = buildSmartHintClueText({
    hint: defaultBoxes[0],
    previousClueWords: params.previousHintWordCount,
    userContext: params.userContext,
  });

  return {
    mode: params.mode,
    dateKey: params.dateKey,
    length: params.length,
    categoryId: params.categoryId || 'general-classic',
    target: upperTarget,
    guesses: [],
    rowGuesses: new Array<string | null>(BASE_ATTEMPTS).fill(null),
    rowDrafts: createEmptyDrafts(BASE_ATTEMPTS, params.length),
    status: 'playing',
    maxAttempts: BASE_ATTEMPTS,
    hintsUsed: 0,
    revealedPositions: Array.from(new Set(defaultBoxes.map((b) => b.col))),
    gridHintBoxes: defaultBoxes,
    defaultHintText: clueMeta.text,
    defaultHintWordCount: clueMeta.wordCount,
    eliminatedLetters: [],
    faithReligion: params.faithReligion,
    extraAttemptGranted: false,
    statsRecorded: false,
    playCharged: Boolean(params.playCharged),
    isPersonalized: Boolean(params.isPersonalized),
    personalizedClue: params.personalizedClue,
    personalizedReason: params.personalizedReason,
    personalizedCulturalNote: params.personalizedCulturalNote,
    personalizedFunFact: params.personalizedFunFact,
    personalizedLocationLabel: params.personalizedLocationLabel,
  };
}

import {
  createFreshWeeklyState,
  reconcileWeeklyRollover,
  type WeeklyActivityState,
} from '../game/weeklyLogic';

const WEEKLY_PROGRESS_KEY = 'lexicon_weekly_progress_v1';
const TRIVIA_STATE_KEY = 'lexicon_ai_trivia_state_v1';

export interface PersistentTriviaState {
  selectedCategoryId: string;
  streak: number;
  bestStreak: number;
  freeHintLastDateKey: string;
  bonusUnlockUntil: Record<string, number>;
  recentQuestions: string[];
}

export function loadWeeklyProgress(nowMs: number = Date.now()): WeeklyActivityState {
  const fresh = createFreshWeeklyState();
  if (typeof window === 'undefined') return fresh;
  const parsed = safeParse<Partial<WeeklyActivityState>>(
    window.localStorage.getItem(WEEKLY_PROGRESS_KEY),
    {}
  );
  const mergedWeeklyXp = typeof parsed.weeklyXp === 'number' ? parsed.weeklyXp : 0;
  const merged: WeeklyActivityState = {
    ...fresh,
    ...parsed,
    weeklyXp: mergedWeeklyXp,
    totalXp:
      typeof parsed.totalXp === 'number'
        ? Math.max(parsed.totalXp, mergedWeeklyXp)
        : mergedWeeklyXp,
    activeUtcDates: Array.isArray(parsed.activeUtcDates) ? parsed.activeUtcDates : [],
    categoriesPlayedThisWeek: Array.isArray(parsed.categoriesPlayedThisWeek)
      ? parsed.categoriesPlayedThisWeek
      : [],
    unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
      ? parsed.unlockedAchievements
      : [],
    pendingWeekSummary: parsed.pendingWeekSummary ?? null,
  };
  const { state, rolledOver } = reconcileWeeklyRollover(merged, nowMs);
  if (rolledOver) {
    saveWeeklyProgress(state);
  }
  return state;
}

export function saveWeeklyProgress(state: WeeklyActivityState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WEEKLY_PROGRESS_KEY, JSON.stringify(state));
}

export function loadTriviaState(): PersistentTriviaState {
  const defaults: PersistentTriviaState = {
    selectedCategoryId: 'general-knowledge',
    streak: 0,
    bestStreak: 0,
    freeHintLastDateKey: '',
    bonusUnlockUntil: {},
    recentQuestions: [],
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<PersistentTriviaState>>(
    window.localStorage.getItem(TRIVIA_STATE_KEY),
    {}
  );
  return {
    ...defaults,
    ...parsed,
    bonusUnlockUntil:
      parsed.bonusUnlockUntil && typeof parsed.bonusUnlockUntil === 'object'
        ? parsed.bonusUnlockUntil
        : {},
    recentQuestions: Array.isArray(parsed.recentQuestions) ? parsed.recentQuestions.slice(-500) : [],
  };
}

export function saveTriviaState(state: PersistentTriviaState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    TRIVIA_STATE_KEY,
    JSON.stringify({
      ...state,
      recentQuestions: state.recentQuestions.slice(-500),
    })
  );
}

const PLAYER_PROFILE_KEY = 'lexicon_player_profile_v1';

export function loadPlayerProfile(): PlayerProfileState {
  const defaults = createDefaultPlayerProfile();
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<PlayerProfileState>>(
    window.localStorage.getItem(PLAYER_PROFILE_KEY),
    {}
  );
  return {
    ...defaults,
    ...parsed,
    selectedInterests:
      Array.isArray(parsed.selectedInterests) && parsed.selectedInterests.length > 0
        ? parsed.selectedInterests
        : defaults.selectedInterests,
    boardLengthCounts: {
      ...defaults.boardLengthCounts,
      ...(parsed.boardLengthCounts || {}),
    },
    categoryAffinity:
      parsed.categoryAffinity && typeof parsed.categoryAffinity === 'object'
        ? parsed.categoryAffinity
        : {},
    triviaCategoryStats:
      parsed.triviaCategoryStats && typeof parsed.triviaCategoryStats === 'object'
        ? parsed.triviaCategoryStats
        : {},
    activeHoursCount: {
      ...defaults.activeHoursCount,
      ...(parsed.activeHoursCount || {}),
    },
  };
}

export function savePlayerProfile(profile: PlayerProfileState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

export interface ModeConfigState {
  puzzleLevelNumber: number;
  triviaLevelNumber: number;
  faithLevelNumber: number;
  highestUnlockedPuzzleLevel: number;
  highestUnlockedTriviaLevel: number;
  puzzleLevel: FiveDifficultyLevel;
  triviaLevel: FiveDifficultyLevel;
  faithLevel: FiveDifficultyLevel;
  puzzleSessionMode: SessionPlayMode;
  triviaSessionMode: SessionPlayMode;
}

export interface TriviaLevelClimbState {
  levelNumber: number;
  currentLevel: FiveDifficultyLevel;
  questionIndex: number; // 0..4
  correctCount: number; // 5 out of 5 promotes
  stageComplete: boolean;
  promotedToLevelNumber: number | null;
  promotedToLevel: FiveDifficultyLevel | null;
}

const MODE_CONFIG_KEY = 'wordvibe_mode_config_v1';
const CROSSWORD_BOARD_KEY = 'wordvibe_crossword_board_v1';
const CROSSWORD_CLIMB_KEY = 'wordvibe_crossword_climb_v1';
const TRIVIA_CLIMB_KEY = 'wordvibe_trivia_climb_v1';

export function loadModeConfig(): ModeConfigState {
  const defaults: ModeConfigState = {
    puzzleLevelNumber: 1,
    triviaLevelNumber: 1,
    faithLevelNumber: 1,
    highestUnlockedPuzzleLevel: 1,
    highestUnlockedTriviaLevel: 1,
    puzzleLevel: 'novice',
    triviaLevel: 'novice',
    faithLevel: 'novice',
    puzzleSessionMode: 'level_climb',
    triviaSessionMode: 'level_climb',
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<ModeConfigState>>(window.localStorage.getItem(MODE_CONFIG_KEY), {});
  const rawPuzzleLv = normalizeLevelNumber(parsed.puzzleLevelNumber ?? parsed.puzzleLevel, 1);
  const rawTriviaLv = normalizeLevelNumber(parsed.triviaLevelNumber ?? parsed.triviaLevel, 1);
  const highestUnlockedPuzzleLevel = Math.max(
    1,
    normalizeLevelNumber(parsed.highestUnlockedPuzzleLevel, 1)
  );
  const highestUnlockedTriviaLevel = Math.max(
    1,
    normalizeLevelNumber(parsed.highestUnlockedTriviaLevel, 1)
  );
  const puzzleLevelNumber = Math.min(rawPuzzleLv, highestUnlockedPuzzleLevel);
  const triviaLevelNumber = Math.min(rawTriviaLv, highestUnlockedTriviaLevel);
  const faithLevelNumber = normalizeLevelNumber(parsed.faithLevelNumber ?? parsed.faithLevel, 1);
  return {
    puzzleLevelNumber,
    triviaLevelNumber,
    faithLevelNumber,
    highestUnlockedPuzzleLevel,
    highestUnlockedTriviaLevel,
    puzzleLevel: levelNumberToDifficultyBand(puzzleLevelNumber),
    triviaLevel: levelNumberToDifficultyBand(triviaLevelNumber),
    faithLevel: levelNumberToDifficultyBand(faithLevelNumber),
    puzzleSessionMode: parsed.puzzleSessionMode === 'sprint' ? 'sprint' : 'level_climb',
    triviaSessionMode: parsed.triviaSessionMode === 'sprint' ? 'sprint' : 'level_climb',
  };
}

export function saveModeConfig(cfg: ModeConfigState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODE_CONFIG_KEY, JSON.stringify(cfg));
}

export function loadSavedCrosswordBoard(): CrosswordBoardState | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeParse<CrosswordBoardState | null>(
    window.localStorage.getItem(CROSSWORD_BOARD_KEY),
    null
  );
  if (
    !parsed ||
    !parsed.solution ||
    !Array.isArray(parsed.userGrid) ||
    !Array.isArray(parsed.solvedRows) ||
    !Array.isArray(parsed.solvedCols) ||
    parsed.userGrid.length !== parsed.length
  ) {
    return null;
  }
  const levelNumber = normalizeLevelNumber(parsed.levelNumber ?? parsed.level, 1);
  return {
    ...parsed,
    levelNumber,
    level: levelNumberToDifficultyBand(levelNumber),
  };
}

export function saveCrosswordBoard(board: CrosswordBoardState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CROSSWORD_BOARD_KEY, JSON.stringify(board));
}

export function loadCrosswordLevelClimb(defaultLevel: FiveDifficultyLevel | number = 1): CrosswordLevelClimbState {
  const defaultNum = normalizeLevelNumber(defaultLevel, 1);
  const defaults: CrosswordLevelClimbState = {
    levelNumber: defaultNum,
    currentLevel: levelNumberToDifficultyBand(defaultNum),
    roundIndex: 0,
    roundPassedCount: 0,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<CrosswordLevelClimbState>>(
    window.localStorage.getItem(CROSSWORD_CLIMB_KEY),
    {}
  );
  const levelNumber = normalizeLevelNumber(parsed.levelNumber ?? parsed.currentLevel, defaultNum);
  const promotedToLevelNumber =
    parsed.promotedToLevelNumber != null
      ? normalizeLevelNumber(parsed.promotedToLevelNumber)
      : parsed.promotedToLevel
      ? normalizeLevelNumber(parsed.promotedToLevel)
      : null;
  return {
    levelNumber,
    currentLevel: levelNumberToDifficultyBand(levelNumber),
    roundIndex: typeof parsed.roundIndex === 'number' ? Math.max(0, Math.min(4, parsed.roundIndex)) : 0,
    roundPassedCount:
      typeof parsed.roundPassedCount === 'number'
        ? Math.max(0, Math.min(5, parsed.roundPassedCount))
        : 0,
    stageComplete: Boolean(parsed.stageComplete),
    promotedToLevelNumber,
    promotedToLevel: promotedToLevelNumber ? levelNumberToDifficultyBand(promotedToLevelNumber) : null,
  };
}

export function saveCrosswordLevelClimb(state: CrosswordLevelClimbState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CROSSWORD_CLIMB_KEY, JSON.stringify(state));
}

export function loadTriviaLevelClimb(defaultLevel: FiveDifficultyLevel | number = 1): TriviaLevelClimbState {
  const defaultNum = normalizeLevelNumber(defaultLevel, 1);
  const defaults: TriviaLevelClimbState = {
    levelNumber: defaultNum,
    currentLevel: levelNumberToDifficultyBand(defaultNum),
    questionIndex: 0,
    correctCount: 0,
    stageComplete: false,
    promotedToLevelNumber: null,
    promotedToLevel: null,
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<Partial<TriviaLevelClimbState>>(
    window.localStorage.getItem(TRIVIA_CLIMB_KEY),
    {}
  );
  const levelNumber = normalizeLevelNumber(parsed.levelNumber ?? parsed.currentLevel, defaultNum);
  const promotedToLevelNumber =
    parsed.promotedToLevelNumber != null
      ? normalizeLevelNumber(parsed.promotedToLevelNumber)
      : parsed.promotedToLevel
      ? normalizeLevelNumber(parsed.promotedToLevel)
      : null;
  return {
    levelNumber,
    currentLevel: levelNumberToDifficultyBand(levelNumber),
    questionIndex: typeof parsed.questionIndex === 'number' ? Math.max(0, Math.min(4, parsed.questionIndex)) : 0,
    correctCount:
      typeof parsed.correctCount === 'number' ? Math.max(0, Math.min(5, parsed.correctCount)) : 0,
    stageComplete: Boolean(parsed.stageComplete),
    promotedToLevelNumber,
    promotedToLevel: promotedToLevelNumber ? levelNumberToDifficultyBand(promotedToLevelNumber) : null,
  };
}

export function saveTriviaLevelClimb(state: TriviaLevelClimbState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TRIVIA_CLIMB_KEY, JSON.stringify(state));
}

