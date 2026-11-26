import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { BottomNav, type AppTab } from './components/BottomNav';
import {
  CategoryExplorerModal,
  type CategoryFilterTab,
} from './components/CategoryExplorerModal';
import { ConfettiBurst } from './components/ConfettiBurst';
import { EditorialGuideAndAdSlot } from './components/EditorialGuideAndAdSlot';
import { FaithStudyView } from './components/FaithStudyView';
import { FloatingReward, type FloatingRewardItem } from './components/FloatingReward';
import { Header } from './components/Header';
import { HowToPlayModal, type HelpSectionTab } from './components/HowToPlayModal';
import { ModeControls } from './components/ModeControls';
import { OfflineBanner } from './components/OfflineBanner';
import { PersonalizationModal } from './components/PersonalizationModal';
import { ProfileAuthModal } from './components/ProfileAuthModal';
import { PuzzleGrid, type SelectedDictionaryWord } from './components/PuzzleGrid';
import { RewardedAdModal } from './components/RewardedAdModal';
import { RewardedDock } from './components/RewardedDock';
import { SettingsModal } from './components/SettingsModal';
import { StreakHomeView } from './components/StreakHomeView';
import { SummaryModal } from './components/SummaryModal';
import { TriviaView } from './components/TriviaView';
import { WeeklyRankModal, WeeklyRolloverModal } from './components/WeeklyRankModal';
import { WordTriviaHintPanel } from './components/WordTriviaHintPanel';
import { WordTriviaRowModal } from './components/WordTriviaRowModal';
import { getCategoryById, PREMIUM_UNLOCK_PLAYS, type PuzzleCategory } from './data/categories';
import type { WordLength } from './data/words';
import {
  advanceCrosswordLevelClimb,
  applyCrosswordKey,
  applyUnlimitedCrosswordHint,
  createCrosswordBoard,
  createCrosswordClimbState,
  getCrosswordRoundTimeLimitSeconds,
  getFirstEditableCell,
  isCleanCrosswordPass,
  unlockCrosswordLineClue,
  type CrosswordBoardState,
  type CrosswordLevelClimbState,
  type CrosswordSlotType,
} from './game/crosswordLogic';
import {
  resolveDailyEntertainmentSpotlight,
  type DailyEntertainmentSpotlight,
} from './game/entertainmentLogic';
import {
  getFaithTradition,
  pickFaithPuzzleWord,
  type ReligionId,
} from './game/faithStudyLogic';
import {
  createDefaultPlayerProfile,
  guessLocationFromTimezone,
  pickFallbackPersonalizedPuzzle,
  recordPuzzleStudySignal,
  recordTriviaStudySignal,
  summarizePlayerProfile,
  type PlayerProfileState,
} from './game/playerProfileLogic';
import {
  applyStreakRecovery,
  canRecoverStreak,
  consumeCategoryPlay,
  formatCountdown,
  getCategoryRemainingPlays,
  getDailyPuzzleNumber,
  getHomeChallenges,
  getLocalDateKey,
  getTimeUntilMidnightMs,
  getWeekStreakDays,
  grantCategoryPlays,
  isCategoryAccessible,
  rollProbabilityWordLength,
  updateStatsOnCompletion,
  type CursorDirection,
  type HomeChallenge,
  type StatsData,
  type TypingDirection,
} from './game/puzzleLogic';
import {
  difficultyTierToPace,
  formatLevelLabel,
  levelNumberToDifficultyBand,
  normalizeLevelNumber,
  resolveDocumentThemeState,
  type AppSettings,
  type SessionPlayMode,
  type SoundMode,
} from './game/settingsLogic';
import {
  createTriviaClimbState,
  TRIVIA_BONUS_UNLOCK_HOURS,
  type TriviaClimbProgress,
  type TriviaQuestion,
} from './game/triviaLogic';
import { gatherUserEnvironmentDetails } from './game/userResearchLogic';
import {
  applyWeeklyActivityEvent,
  computeWeeklyGrade,
  formatWeeklyResetCountdown,
  getNextMondayUtcMs,
  reconcileWeeklyRollover,
  type AchievementDefinition,
  type WeeklyActivityState,
  type WeeklyEventInput,
} from './game/weeklyLogic';
import { getPlayerLeaderboardSummary } from './game/leaderboardLogic';
import {
  buildInviteFriendsPayload,
  buildLeaderboardSharePayload,
  buildPuzzleSharePayload,
  type LocalUserAccount,
} from './game/userAccountLogic';
import { buildCuratedWordFunFact } from './game/wordTriviaLogic';
import {
  hydrateLocalUserAccountFromIdb,
  loadLocalUserAccount,
  saveLocalUserAccount,
  shareOrCopyMessage,
} from './services/accountStorageService';
import {
  attachDeviceSensorListeners,
  triggerHapticPulse,
} from './services/deviceSensorService';
import { rewardedAdService, type RewardPlacement } from './services/rewardedAdService';
import { soundService } from './services/soundService';
import {
  loadAppSettings,
  loadCategoryProgress,
  loadCrosswordLevelClimb,
  loadFaithStudyProgress,
  loadModeConfig,
  loadPlayerProfile,
  loadSavedCrosswordBoard,
  loadStats,
  loadTriviaLevelClimb,
  loadTriviaState,
  loadWeeklyProgress,
  recordUsedCategoryWord,
  saveAppSettings,
  saveCategoryProgress,
  saveCrosswordBoard,
  saveCrosswordLevelClimb,
  saveFaithStudyProgress,
  saveModeConfig,
  savePlayerProfile,
  saveStats,
  saveTriviaLevelClimb,
  saveTriviaState,
  saveWeeklyProgress,
  type CategoryProgressState,
  type FaithStudyProgress,
  type ModeConfigState,
  type PersistentTriviaState,
} from './services/storageService';

interface PersonalizedMeta {
  isPersonalized: boolean;
  clue?: string;
  reason?: string;
  culturalNote?: string;
  funFact?: string;
  faithReligion?: ReligionId;
}

export default function App() {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const [modeConfig, setModeConfig] = useState<ModeConfigState>(() => loadModeConfig());

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t === 'trivia') return 'trivia';
      if (t === 'faith') return 'faith';
      if (t === 'home') return 'home';
      if (params.get('autostart') === '1' || t === 'puzzle') {
        return 'puzzle';
      }
    }
    return appSettings.defaultTab;
  });

  const [dateKey, setDateKey] = useState<string>(() => getLocalDateKey());

  const [initialBoot] = useState(() => {
    const bootDate = getLocalDateKey();
    const bootStats = loadStats();
    const bootCfg = loadModeConfig();
    const env = gatherUserEnvironmentDetails();
    const loadedProfile = loadPlayerProfile();
    const autoLoc = !loadedProfile.locationOptOut
      ? loadedProfile.location || guessLocationFromTimezone(env.timezone)
      : loadedProfile.location;
    const bootProfile: PlayerProfileState = {
      ...loadedProfile,
      environmentSnapshot: env,
      locationEnabled: !loadedProfile.locationOptOut,
      location: autoLoc,
    };
    const progress = loadCategoryProgress();
    const savedBoard = loadSavedCrosswordBoard();
    const cat = getCategoryById(savedBoard?.categoryId || progress.activeCategoryId);
    const accessibleCat = isCategoryAccessible(cat, progress.playsRemaining)
      ? cat
      : getCategoryById('general-classic');

    const board: CrosswordBoardState =
      savedBoard && savedBoard.solution?.rows?.length === savedBoard.length
        ? savedBoard
        : createCrosswordBoard({
            length: 5,
            level: bootCfg.puzzleLevelNumber,
            categoryId: accessibleCat.id,
          });

    const nextProgress = recordUsedCategoryWord(
      {
        ...progress,
        activeCategoryId: board.categoryId,
      },
      bootDate,
      board.categoryId,
      board.length,
      board.solution.target
    );

    return {
      progress: nextProgress,
      board,
      profile: bootProfile,
      stats: bootStats,
      climb: loadCrosswordLevelClimb(bootCfg.puzzleLevelNumber),
      triviaClimb: loadTriviaLevelClimb(bootCfg.triviaLevelNumber),
    };
  });

  const [categoryProgress, setCategoryProgress] = useState<CategoryProgressState>(
    initialBoot.progress
  );
  const [crosswordBoard, setCrosswordBoard] = useState<CrosswordBoardState>(initialBoot.board);
  const [crosswordClimb, setCrosswordClimb] = useState<CrosswordLevelClimbState>(
    initialBoot.climb
  );
  const [triviaClimb, setTriviaClimb] = useState<TriviaClimbProgress>(initialBoot.triviaClimb);
  const [autoLengthMode, setAutoLengthMode] = useState<boolean>(false);
  const [personalizedMeta, setPersonalizedMeta] = useState<PersonalizedMeta | null>(null);

  const initialCell = useMemo(() => getFirstEditableCell(initialBoot.board), [initialBoot.board]);
  const [activeRow, setActiveRow] = useState<number>(initialCell.row);
  const [activeCol, setActiveCol] = useState<number>(initialCell.col);
  const [typingDirection, setTypingDirection] = useState<TypingDirection>('across');
  const [shakeLine, setShakeLine] = useState<{ type: 'row' | 'col'; index: number } | null>(null);
  const [showWinBurst, setShowWinBurst] = useState<boolean>(false);

  const [stats, setStats] = useState<StatsData>(initialBoot.stats);
  const [faithProgress, setFaithProgress] = useState<FaithStudyProgress>(() =>
    loadFaithStudyProgress(appSettings.defaultReligion)
  );
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyActivityState>(() =>
    loadWeeklyProgress()
  );
  const [triviaState, setTriviaState] = useState<PersistentTriviaState>(() => loadTriviaState());
  const [weeklyCountdown, setWeeklyCountdown] = useState<string>(() =>
    formatWeeklyResetCountdown(getNextMondayUtcMs() - Date.now())
  );
  const [weeklyRankOpen, setWeeklyRankOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileState>(initialBoot.profile);
  const [achievementBanner, setAchievementBanner] = useState<AchievementDefinition | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [floatingRewards, setFloatingRewards] = useState<FloatingRewardItem[]>([]);
  const [lastPuzzleXpEarned, setLastPuzzleXpEarned] = useState(0);
  const [puzzleDoubleXpClaimed, setPuzzleDoubleXpClaimed] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [selectedDictWord, setSelectedDictWord] = useState<SelectedDictionaryWord | null>(null);
  const [puzzleTimeLeftSec, setPuzzleTimeLeftSec] = useState<number>(() =>
    getCrosswordRoundTimeLimitSeconds(
      initialBoot.board.length,
      modeConfig.puzzleLevelNumber,
      initialBoot.climb.roundIndex
    )
  );
  const [puzzleTimedOut, setPuzzleTimedOut] = useState<boolean>(false);
  const [leaderboardPlayerId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'user:local';
    const existing = window.localStorage.getItem('wordvibe_leaderboard_player_id_v1');
    if (existing) return existing;
    const generated = `user:${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem('wordvibe_leaderboard_player_id_v1', generated);
    return generated;
  });
  const [userAccount, setUserAccount] = useState<LocalUserAccount | null>(() =>
    loadLocalUserAccount()
  );
  const [profileModalMode, setProfileModalMode] = useState<'signup' | 'edit'>(() =>
    loadLocalUserAccount() ? 'edit' : 'signup'
  );
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    return loadLocalUserAccount() === null;
  });

  const [cluePanelOpen, setCluePanelOpen] = useState<boolean>(
    () => Object.keys(initialBoot.board.unlockedClues).length > 0
  );
  const [clueSlotModalOpen, setClueSlotModalOpen] = useState(false);
  const [pendingClueSlot, setPendingClueSlot] = useState<{
    slotType: CrosswordSlotType;
    index: number;
  } | null>(null);
  const pendingClueSlotRef = useRef<{ slotType: CrosswordSlotType; index: number } | null>(null);
  const cluePanelRef = useRef<HTMLElement | null>(null);

  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdown(getTimeUntilMidnightMs())
  );
  const [toast, setToast] = useState<string | null>(null);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<HelpSectionTab>('rules');
  const [categoryExplorerOpen, setCategoryExplorerOpen] = useState(false);
  const [categoryExplorerInitialTab, setCategoryExplorerInitialTab] =
    useState<CategoryFilterTab>('All');
  const [spotlight, setSpotlight] = useState<DailyEntertainmentSpotlight>(() =>
    resolveDailyEntertainmentSpotlight(getLocalDateKey())
  );
  const [activeAdPlacement, setActiveAdPlacement] = useState<RewardPlacement | null>(null);
  const [pendingCategoryForAd, setPendingCategoryForAd] = useState<PuzzleCategory | null>(null);
  const adRewardCallbackRef = useRef<(() => void) | null>(null);
  const achievementTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const summaryTimerRef = useRef<number | null>(null);
  const rewardIdRef = useRef<number>(1);
  const puzzleTimeLeftRef = useRef<number>(puzzleTimeLeftSec);
  puzzleTimeLeftRef.current = puzzleTimeLeftSec;
  const cursorRef = useRef<{ row: number; col: number }>({
    row: initialCell.row,
    col: initialCell.col,
  });

  useEffect(() => {
    cursorRef.current = { row: activeRow, col: activeCol };
  }, [activeRow, activeCol]);

  const activeCategory = useMemo(
    () => getCategoryById(categoryProgress.activeCategoryId),
    [categoryProgress.activeCategoryId]
  );
  const boardCategory = useMemo(
    () => getCategoryById(crosswordBoard.categoryId),
    [crosswordBoard.categoryId]
  );

  const categoryPlaysRemaining = useMemo(
    () => getCategoryRemainingPlays(activeCategory, categoryProgress.playsRemaining),
    [activeCategory, categoryProgress.playsRemaining]
  );

  const showToast = useCallback((msg: string, durationMs = 2400) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, durationMs);
  }, []);

  const triggerConfetti = useCallback(() => {
    if (confettiTimerRef.current) {
      window.clearTimeout(confettiTimerRef.current);
    }
    setConfettiActive(true);
    confettiTimerRef.current = window.setTimeout(() => {
      setConfettiActive(false);
      confettiTimerRef.current = null;
    }, 1800);
  }, []);

  const pushFloatingReward = useCallback(
    (label: string, tone: FloatingRewardItem['tone'] = 'xp') => {
      const id = rewardIdRef.current++;
      setFloatingRewards((prev) => [...prev.slice(-3), { id, label, tone }]);
      window.setTimeout(() => {
        setFloatingRewards((prev) => prev.filter((item) => item.id !== id));
      }, 1750);
    },
    []
  );

  const activeSoundMode: SoundMode =
    appSettings.soundMode || (appSettings.soundEnabled ? 'on' : 'off');
  const effectiveHapticsEnabled =
    activeSoundMode === 'off'
      ? false
      : activeSoundMode === 'mute'
      ? true
      : appSettings.hapticsEnabled;

  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const next: AppSettings = { ...prev, ...patch };
      if (patch.soundMode !== undefined && patch.soundEnabled === undefined) {
        next.soundEnabled = patch.soundMode === 'on';
      } else if (patch.soundEnabled !== undefined && patch.soundMode === undefined) {
        next.soundMode = patch.soundEnabled ? 'on' : 'off';
      }
      return next;
    });
    if (patch.autoDetectLocation !== undefined) {
      setPlayerProfile((prev) => ({
        ...prev,
        locationOptOut: !patch.autoDetectLocation,
        locationEnabled: patch.autoDetectLocation ? true : prev.locationEnabled,
      }));
    }
    if (patch.difficultyTier !== undefined) {
      const mappedPace = difficultyTierToPace(patch.difficultyTier);
      setPlayerProfile((prev) => ({ ...prev, challengePace: mappedPace }));
    }
    if (patch.defaultReligion !== undefined) {
      setFaithProgress((prev) => ({ ...prev, activeReligion: patch.defaultReligion! }));
    }
  }, []);

  // Global tap feedback across every interactive icon/button + pause looping audio when tab hidden
  useEffect(() => {
    return soundService.attachGlobalTapFeedback();
  }, []);

  // Sync theme, accent, animation intensity, 3-state soundMode, background loop, fanfare & haptics immediately
  useEffect(() => {
    const themeState = resolveDocumentThemeState(appSettings);
    document.documentElement.classList.toggle('dark', themeState.isDarkClass);
    document.documentElement.dataset.theme = themeState.dataTheme;
    document.documentElement.dataset.accent = themeState.dataAccent;
    document.documentElement.dataset.anim = themeState.dataAnim;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeState.metaThemeColor);
    }
    const mode: SoundMode = appSettings.soundMode || (appSettings.soundEnabled ? 'on' : 'off');
    soundService.setSoundMode(mode);
    soundService.setBgMusicEnabled(appSettings.bgMusicEnabled);
    soundService.setVictoryFanfareEnabled(appSettings.victoryFanfareEnabled);
    soundService.setHapticsEnabled(appSettings.hapticsEnabled);
    saveAppSettings(appSettings);
  }, [appSettings]);

  // Sync body state attribute
  useEffect(() => {
    document.body.dataset.state = crosswordBoard.status;
  }, [crosswordBoard.status]);

  // Persist states cleanly to localStorage
  useEffect(() => {
    saveModeConfig(modeConfig);
  }, [modeConfig]);

  useEffect(() => {
    saveCrosswordBoard(crosswordBoard);
  }, [crosswordBoard]);

  useEffect(() => {
    saveCrosswordLevelClimb(crosswordClimb);
  }, [crosswordClimb]);

  useEffect(() => {
    saveTriviaLevelClimb(triviaClimb);
  }, [triviaClimb]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  useEffect(() => {
    saveCategoryProgress(categoryProgress);
  }, [categoryProgress]);

  useEffect(() => {
    saveWeeklyProgress(weeklyProgress);
  }, [weeklyProgress]);

  useEffect(() => {
    saveFaithStudyProgress(faithProgress);
  }, [faithProgress]);

  useEffect(() => {
    saveTriviaState(triviaState);
  }, [triviaState]);

  useEffect(() => {
    savePlayerProfile(playerProfile);
  }, [playerProfile]);

  // 100% offline regional resolution using timezone + optional device geolocation (zero /api calls)
  useEffect(() => {
    if (!appSettings.autoDetectLocation || playerProfile.locationOptOut) return;
    if (playerProfile.location && playerProfile.location.source === 'gps') return;

    const tz =
      playerProfile.environmentSnapshot?.timezone ||
      (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');

    const applyTimezoneRegion = (source: 'gps' | 'timezone' = 'timezone') => {
      const resolved = {
        ...guessLocationFromTimezone(tz),
        source,
        updatedAt: Date.now(),
      };
      setPlayerProfile((prev) =>
        prev.locationOptOut
          ? prev
          : {
              ...prev,
              locationEnabled: true,
              location: prev.location?.source === 'manual' ? prev.location : resolved,
            }
      );
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          () => applyTimezoneRegion('gps'),
          () => applyTimezoneRegion('timezone'),
          { timeout: 2200, maximumAge: 600_000 }
        );
      } catch {
        applyTimezoneRegion('timezone');
      }
    } else {
      applyTimezoneRegion('timezone');
    }
  }, [
    appSettings.autoDetectLocation,
    playerProfile.environmentSnapshot?.timezone,
    playerProfile.location,
    playerProfile.locationOptOut,
  ]);

  // Preload AdMob rewarded ad on mount
  useEffect(() => {
    rewardedAdService.setCallbacks({
      onAdFailedToLoad: (reason) => {
        showToast(reason, 2800);
      },
    });
    void rewardedAdService.preloadRewardedAd();
  }, [showToast]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (summaryTimerRef.current) window.clearTimeout(summaryTimerRef.current);
      if (achievementTimerRef.current) window.clearTimeout(achievementTimerRef.current);
      if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
    };
  }, []);

  // Offline calendar entertainment spotlight + countdown timers
  useEffect(() => {
    setSpotlight(resolveDailyEntertainmentSpotlight(dateKey));
  }, [dateKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const nowMs = now.getTime();
      setCountdown(formatCountdown(getTimeUntilMidnightMs(now)));
      setWeeklyCountdown(formatWeeklyResetCountdown(getNextMondayUtcMs(nowMs) - nowMs));
      setWeeklyProgress((prev) => {
        const res = reconcileWeeklyRollover(prev, nowMs);
        return res.rolledOver ? res.state : prev;
      });
      const latestKey = getLocalDateKey(now);
      if (latestKey !== dateKey) {
        setDateKey(latestKey);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [dateKey]);

  // Hydrate offline user profile from IndexedDB if localStorage was cleared
  useEffect(() => {
    let active = true;
    void hydrateLocalUserAccountFromIdb().then((hydrated) => {
      if (!active || !hydrated) return;
      setUserAccount(hydrated);
      setProfileModalMode('edit');
      setProfileModalOpen(false);
      setPlayerProfile((prev) =>
        prev.displayName === hydrated.username
          ? prev
          : { ...prev, displayName: hydrated.username }
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const roundTimeTotalSec = useMemo(
    () =>
      getCrosswordRoundTimeLimitSeconds(
        crosswordBoard.length,
        modeConfig.puzzleLevelNumber,
        crosswordClimb.roundIndex
      ),
    [crosswordBoard.length, crosswordClimb.roundIndex, modeConfig.puzzleLevelNumber]
  );

  const isPuzzleTimerPaused =
    activeTab !== 'puzzle' ||
    modeConfig.puzzleSessionMode !== 'level_climb' ||
    crosswordBoard.status !== 'playing' ||
    puzzleTimedOut ||
    Boolean(activeAdPlacement) ||
    clueSlotModalOpen ||
    summaryOpen ||
    helpOpen ||
    categoryExplorerOpen ||
    weeklyRankOpen ||
    personalizationOpen ||
    settingsOpen ||
    profileModalOpen;

  useEffect(() => {
    if (isPuzzleTimerPaused) return;
    const id = window.setInterval(() => {
      const current = puzzleTimeLeftRef.current;
      if (current <= 1) {
        puzzleTimeLeftRef.current = 0;
        setPuzzleTimeLeftSec(0);
        setPuzzleTimedOut(true);
        soundService.playInvalidShake();
        setCrosswordClimb((prev) => advanceCrosswordLevelClimb(prev, false));
        showToast("Time's up! Level Climb reset to Puzzle 1/5.", 3400);
        return;
      }
      const nextVal = current - 1;
      puzzleTimeLeftRef.current = nextVal;
      setPuzzleTimeLeftSec(nextVal);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPuzzleTimerPaused, showToast]);

  const puzzleNumber = useMemo(() => getDailyPuzzleNumber(dateKey), [dateKey]);
  const isStreakRecoverable = useMemo(
    () => canRecoverStreak(stats, dateKey),
    [stats, dateKey]
  );

  const recordWeeklyEvent = useCallback((event: WeeklyEventInput): number => {
    let earnedNow = 0;
    setWeeklyProgress((prev) => {
      const res = applyWeeklyActivityEvent(prev, event);
      earnedNow = res.xpEarned;
      if (res.newlyUnlocked.length > 0) {
        const latestAch = res.newlyUnlocked[res.newlyUnlocked.length - 1];
        setAchievementBanner(latestAch);
        soundService.playAchievementChime();
        if (achievementTimerRef.current) window.clearTimeout(achievementTimerRef.current);
        achievementTimerRef.current = window.setTimeout(() => {
          setAchievementBanner(null);
          achievementTimerRef.current = null;
        }, 4200);
      }
      return res.state;
    });
    return earnedNow;
  }, []);

  const promptUnlockCategory = useCallback((category: PuzzleCategory) => {
    setPendingCategoryForAd(category);
    setSummaryOpen(false);
    setActiveAdPlacement('unlock_category');
  }, []);

  const activateNewBoard = useCallback(
    (params: {
      nextLength: WordLength;
      nextLevelNumber: number;
      nextCategory: PuzzleCategory;
      forcedTarget?: string;
      meta?: PersonalizedMeta | null;
      overrideRoundIndex?: number;
    }): boolean => {
      const {
        nextLength,
        nextLevelNumber,
        nextCategory,
        forcedTarget,
        meta = null,
        overrideRoundIndex,
      } = params;
      if (!forcedTarget && !isCategoryAccessible(nextCategory, categoryProgress.playsRemaining)) {
        promptUnlockCategory(nextCategory);
        return false;
      }

      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
      }

      const safeLv = normalizeLevelNumber(nextLevelNumber, 1);
      const freshBoard = createCrosswordBoard({
        length: nextLength,
        level: safeLv,
        categoryId: nextCategory.id,
        forcedTarget,
      });

      const firstCell = getFirstEditableCell(freshBoard);
      cursorRef.current = firstCell;
      setActiveRow(firstCell.row);
      setActiveCol(firstCell.col);
      setTypingDirection('across');
      setShakeLine(null);
      setShowWinBurst(false);
      setSummaryOpen(false);
      setLastPuzzleXpEarned(0);
      setPuzzleDoubleXpClaimed(false);
      setCluePanelOpen(false);
      setClueSlotModalOpen(false);
      setPendingClueSlot(null);
      pendingClueSlotRef.current = null;
      setSelectedDictWord(null);
      setPuzzleTimedOut(false);
      const nextLimit = getCrosswordRoundTimeLimitSeconds(
        freshBoard.length,
        safeLv,
        overrideRoundIndex ?? crosswordClimb.roundIndex
      );
      puzzleTimeLeftRef.current = nextLimit;
      setPuzzleTimeLeftSec(nextLimit);
      setPersonalizedMeta(meta);
      setCrosswordBoard(freshBoard);

      setCategoryProgress((prev) =>
        recordUsedCategoryWord(
          {
            ...prev,
            activeCategoryId: nextCategory.id,
            playsRemaining: forcedTarget
              ? prev.playsRemaining
              : consumeCategoryPlay(nextCategory, prev.playsRemaining),
            exploredCategories: prev.exploredCategories.includes(nextCategory.id)
              ? prev.exploredCategories
              : [...prev.exploredCategories, nextCategory.id],
          },
          dateKey,
          nextCategory.id,
          freshBoard.length,
          freshBoard.solution.target
        )
      );

      return true;
    },
    [categoryProgress.playsRemaining, crosswordClimb.roundIndex, dateKey, promptUnlockCategory]
  );

  const dealNextSessionBoard = useCallback(
    (overrideLength?: WordLength, overrideLevelNumber?: number) => {
      const useClimbNext =
        modeConfig.puzzleSessionMode === 'level_climb' && crosswordClimb.stageComplete;
      let targetLevelNumber = overrideLevelNumber ?? modeConfig.puzzleLevelNumber;
      let nextRoundIndex = crosswordClimb.roundIndex;

      if (useClimbNext) {
        const promoted = crosswordClimb.promotedToLevelNumber;
        targetLevelNumber = promoted || crosswordClimb.levelNumber;
        nextRoundIndex = 0;
        if (promoted) {
          setModeConfig((prev) => ({
            ...prev,
            puzzleLevelNumber: promoted,
            highestUnlockedPuzzleLevel: Math.max(prev.highestUnlockedPuzzleLevel, promoted),
            puzzleLevel: levelNumberToDifficultyBand(promoted),
          }));
        }
        setCrosswordClimb(createCrosswordClimbState(targetLevelNumber));
      }

      const nextLen: WordLength =
        overrideLength ||
        (autoLengthMode
          ? rollProbabilityWordLength({ previousLength: crosswordBoard.length })
          : crosswordBoard.length);

      activateNewBoard({
        nextLength: nextLen,
        nextLevelNumber: targetLevelNumber,
        nextCategory: activeCategory,
        overrideRoundIndex: nextRoundIndex,
      });
    },
    [
      activateNewBoard,
      activeCategory,
      autoLengthMode,
      crosswordBoard.length,
      crosswordClimb.levelNumber,
      crosswordClimb.promotedToLevelNumber,
      crosswordClimb.roundIndex,
      crosswordClimb.stageComplete,
      modeConfig.puzzleLevelNumber,
      modeConfig.puzzleSessionMode,
    ]
  );

  const handleRetryTimedRound = useCallback(() => {
    const freshClimb = createCrosswordClimbState(modeConfig.puzzleLevelNumber);
    setCrosswordClimb(freshClimb);
    activateNewBoard({
      nextLength: crosswordBoard.length,
      nextLevelNumber: modeConfig.puzzleLevelNumber,
      nextCategory: activeCategory,
      overrideRoundIndex: 0,
    });
    showToast('Timer reset · Puzzle 1/5 ready!', 2200);
  }, [activateNewBoard, activeCategory, crosswordBoard.length, modeConfig.puzzleLevelNumber, showToast]);

  const handleChangePuzzleSessionMode = useCallback(
    (nextMode: SessionPlayMode) => {
      if (nextMode === modeConfig.puzzleSessionMode) return;
      setModeConfig((prev) => ({ ...prev, puzzleSessionMode: nextMode }));
      if (nextMode === 'level_climb') {
        setCrosswordClimb(createCrosswordClimbState(modeConfig.puzzleLevelNumber));
        setPuzzleTimedOut(false);
        const limit = getCrosswordRoundTimeLimitSeconds(
          crosswordBoard.length,
          modeConfig.puzzleLevelNumber,
          0
        );
        puzzleTimeLeftRef.current = limit;
        setPuzzleTimeLeftSec(limit);
      }
      showToast(
        nextMode === 'level_climb'
          ? 'Level Climb active · Beat 5 shrinking-timer boards to advance!'
          : 'Endless Sprint active · Continuous zero-repeat crosswords!'
      );
    },
    [crosswordBoard.length, modeConfig.puzzleLevelNumber, modeConfig.puzzleSessionMode, showToast]
  );

  const handleChangePuzzleLevelNumber = useCallback(
    (nextLevelNumber: number) => {
      const requested = normalizeLevelNumber(nextLevelNumber, 1);
      const safeLevel = Math.min(modeConfig.highestUnlockedPuzzleLevel, Math.max(1, requested));
      if (requested > modeConfig.highestUnlockedPuzzleLevel) {
        showToast('Win 5 timed puzzles in a row to unlock the next level!');
        return;
      }
      setModeConfig((prev) => ({
        ...prev,
        puzzleLevelNumber: safeLevel,
        puzzleLevel: levelNumberToDifficultyBand(safeLevel),
      }));
      setCrosswordClimb(createCrosswordClimbState(safeLevel));
      const ok = activateNewBoard({
        nextLength: crosswordBoard.length,
        nextLevelNumber: safeLevel,
        nextCategory: activeCategory,
        overrideRoundIndex: 0,
      });
      if (ok) {
        showToast(`Difficulty: ${formatLevelLabel(safeLevel)}`);
      }
    },
    [
      activateNewBoard,
      activeCategory,
      crosswordBoard.length,
      modeConfig.highestUnlockedPuzzleLevel,
      showToast,
    ]
  );

  const handleChangeBoardLength = useCallback(
    (nextLength: WordLength) => {
      setAutoLengthMode(false);
      activateNewBoard({
        nextLength,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: activeCategory,
      });
    },
    [activateNewBoard, activeCategory, modeConfig.puzzleLevelNumber]
  );

  const handleToggleAutoLength = useCallback(() => {
    const nextAuto = !autoLengthMode;
    setAutoLengthMode(nextAuto);
    if (nextAuto) {
      const rolled = rollProbabilityWordLength({ previousLength: crosswordBoard.length });
      activateNewBoard({
        nextLength: rolled,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: activeCategory,
      });
      showToast(`Auto grid · ${rolled}×${rolled}`, 2200);
    }
  }, [
    activateNewBoard,
    activeCategory,
    autoLengthMode,
    crosswordBoard.length,
    modeConfig.puzzleLevelNumber,
    showToast,
  ]);

  const handleSelectCategory = useCallback(
    (category: PuzzleCategory) => {
      const remaining = getCategoryRemainingPlays(category, categoryProgress.playsRemaining);
      if (category.isPremium && remaining <= 0) {
        setActiveTab('puzzle');
        window.scrollTo({ top: 0, behavior: 'instant' });
        promptUnlockCategory(category);
        return;
      }
      const switched = activateNewBoard({
        nextLength: crosswordBoard.length,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: category,
      });
      if (switched) {
        setCategoryExplorerOpen(false);
        setActiveTab('puzzle');
        window.scrollTo({ top: 0, behavior: 'instant' });
        showToast(`Topic: ${category.name}`);
      }
    },
    [
      activateNewBoard,
      categoryProgress.playsRemaining,
      crosswordBoard.length,
      modeConfig.puzzleLevelNumber,
      promptUnlockCategory,
      showToast,
    ]
  );

  const recordBoardVictory = useCallback(
    (wonBoard: CrosswordBoardState) => {
      soundService.playWinFanfare();
      triggerConfetti();
      setShowWinBurst(true);
      window.setTimeout(() => setShowWinBurst(false), 1200);

      const statMode = modeConfig.puzzleSessionMode === 'sprint' ? 'sprint' : 'daily';
      setStats((prev) =>
        updateStatsOnCompletion(prev, {
          mode: statMode,
          won: true,
          attemptsUsed: Math.max(1, wonBoard.wrongChecks + 1),
          todayKey: dateKey,
          length: wonBoard.length,
        })
      );
      setPlayerProfile((prev) =>
        recordPuzzleStudySignal(prev, {
          categoryId: wonBoard.categoryId,
          won: true,
          guessesUsed: Math.max(1, wonBoard.wrongChecks + 1),
          length: wonBoard.length,
        })
      );
      const xpDelta = recordWeeklyEvent({
        type: 'puzzle_completed',
        won: true,
        mode: statMode,
        attemptsUsed: Math.max(1, wonBoard.wrongChecks + 1),
        wordLength: wonBoard.length,
        categoryId: wonBoard.categoryId,
      });
      const earned = xpDelta || 120;
      setLastPuzzleXpEarned(earned);
      setPuzzleDoubleXpClaimed(false);
      pushFloatingReward(`+${earned} XP`, 'xp');

      setCategoryProgress((prev) => ({
        ...prev,
        solvedByCategory: {
          ...prev.solvedByCategory,
          [wonBoard.categoryId]: (prev.solvedByCategory[wonBoard.categoryId] || 0) + 1,
        },
      }));

      if (modeConfig.puzzleSessionMode === 'level_climb') {
        const cleanPass = !puzzleTimedOut && isCleanCrosswordPass(wonBoard);
        setCrosswordClimb((prev) => {
          const next = advanceCrosswordLevelClimb(prev, cleanPass);
          if (next.stageComplete && next.promotedToLevelNumber) {
            const promotedNum = next.promotedToLevelNumber;
            setModeConfig((cfg) => ({
              ...cfg,
              puzzleLevelNumber: promotedNum,
              highestUnlockedPuzzleLevel: Math.max(cfg.highestUnlockedPuzzleLevel, promotedNum),
              puzzleLevel: levelNumberToDifficultyBand(promotedNum),
            }));
            showToast(`Level Up! Promoted to ${formatLevelLabel(promotedNum)}!`, 3600);
          }
          return next;
        });
      }

      if (summaryTimerRef.current) window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = window.setTimeout(() => {
        setSummaryOpen(true);
      }, 650);
    },
    [
      dateKey,
      modeConfig.puzzleSessionMode,
      pushFloatingReward,
      puzzleTimedOut,
      recordWeeklyEvent,
      showToast,
      triggerConfetti,
    ]
  );

  const triggerLineShake = useCallback(
    (type: 'row' | 'col', index: number) => {
      setShakeLine({ type, index });
      soundService.playInvalidShake();
      triggerHapticPulse([18, 25, 18], effectiveHapticsEnabled);
      window.setTimeout(() => {
        setShakeLine((prev) => (prev?.type === type && prev.index === index ? null : prev));
      }, 420);
    },
    [effectiveHapticsEnabled]
  );

  const handleSelectCell = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (crosswordBoard.status !== 'playing') return;
      const L = crosswordBoard.length;
      if (rowIdx < 0 || rowIdx >= L || colIdx < 0 || colIdx >= L) return;

      const isSameCell = cursorRef.current.row === rowIdx && cursorRef.current.col === colIdx;
      if (isSameCell) {
        setTypingDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else if (crosswordBoard.solvedRows[rowIdx] && !crosswordBoard.solvedCols[colIdx]) {
        setTypingDirection('down');
      } else if (crosswordBoard.solvedCols[colIdx] && !crosswordBoard.solvedRows[rowIdx]) {
        setTypingDirection('across');
      }

      cursorRef.current = { row: rowIdx, col: colIdx };
      setActiveRow(rowIdx);
      setActiveCol(colIdx);
      triggerHapticPulse(8, effectiveHapticsEnabled);
    },
    [
      crosswordBoard.length,
      crosswordBoard.solvedCols,
      crosswordBoard.solvedRows,
      crosswordBoard.status,
      effectiveHapticsEnabled,
    ]
  );

  const handleMoveCursor = useCallback(
    (dir: CursorDirection) => {
      if (crosswordBoard.status !== 'playing') return;
      const L = crosswordBoard.length;
      let { row, col } = cursorRef.current;
      if (dir === 'left') col = Math.max(0, col - 1);
      else if (dir === 'right') col = Math.min(L - 1, col + 1);
      else if (dir === 'up') row = Math.max(0, row - 1);
      else if (dir === 'down') row = Math.min(L - 1, row + 1);
      cursorRef.current = { row, col };
      setActiveRow(row);
      setActiveCol(col);
    },
    [crosswordBoard.length, crosswordBoard.status]
  );

  const handleCrosswordKey = useCallback(
    (key: string) => {
      if (crosswordBoard.status !== 'playing') return;
      if (modeConfig.puzzleSessionMode === 'level_climb' && puzzleTimedOut) return;
      if (
        activeAdPlacement ||
        clueSlotModalOpen ||
        summaryOpen ||
        helpOpen ||
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen ||
        profileModalOpen
      ) {
        return;
      }

      const { row, col } = cursorRef.current;
      const result = applyCrosswordKey(crosswordBoard, row, col, typingDirection, key);

      cursorRef.current = { row: result.nextRow, col: result.nextCol };
      setActiveRow(result.nextRow);
      setActiveCol(result.nextCol);
      if (result.nextDir !== typingDirection) {
        setTypingDirection(result.nextDir);
      }

      if (result.outcome === 'noop') return;

      if (result.outcome === 'typed') {
        soundService.playKeyTap();
        triggerHapticPulse(8, effectiveHapticsEnabled);
        setCrosswordBoard(result.board);
        return;
      }

      if (result.outcome === 'erased') {
        soundService.playBackspace();
        setCrosswordBoard(result.board);
        return;
      }

      if (result.outcome === 'line_incomplete') {
        triggerLineShake(
          typingDirection === 'down' ? 'col' : 'row',
          typingDirection === 'down' ? col : row
        );
        showToast(
          `Fill all ${crosswordBoard.length} letters in ${
            typingDirection === 'down' ? `Col ${col + 1} Down` : `Row ${row + 1} Across`
          }`
        );
        return;
      }

      if (result.outcome === 'not_in_dictionary' || result.outcome === 'wrong_word') {
        setCrosswordBoard(result.board);
        triggerLineShake(
          typingDirection === 'down' ? 'col' : 'row',
          typingDirection === 'down' ? col : row
        );
        showToast(
          result.outcome === 'not_in_dictionary'
            ? 'Word not in dictionary — check letter feedback'
            : 'Different intersecting word needed — check colors!'
        );
        return;
      }

      if (result.outcome === 'line_solved') {
        setCrosswordBoard(result.board);
        soundService.playTileFlip(2, true);
        triggerHapticPulse([12, 20, 12], effectiveHapticsEnabled);
        showToast(`${result.solvedLineLabel} (${result.solvedWord}) solved!`, 2200);
        return;
      }

      if (result.outcome === 'board_won') {
        setCrosswordBoard(result.board);
        recordBoardVictory(result.board);
      }
    },
    [
      activeAdPlacement,
      categoryExplorerOpen,
      clueSlotModalOpen,
      crosswordBoard,
      effectiveHapticsEnabled,
      helpOpen,
      modeConfig.puzzleSessionMode,
      personalizationOpen,
      puzzleTimedOut,
      recordBoardVictory,
      settingsOpen,
      showToast,
      summaryOpen,
      triggerLineShake,
      typingDirection,
      weeklyRankOpen,
    ]
  );

  // Global physical keyboard listener (skips deviceKeyboard input to avoid duplicate events)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const targetEl = e.target as HTMLElement | null;
      if (e.key === 'Escape') {
        setSummaryOpen(false);
        setHelpOpen(false);
        setCategoryExplorerOpen(false);
        setWeeklyRankOpen(false);
        setPersonalizationOpen(false);
        setSettingsOpen(false);
        setClueSlotModalOpen(false);
        if (profileModalMode === 'edit') {
          setProfileModalOpen(false);
        }
        return;
      }
      if (targetEl?.dataset?.deviceKeyboard === 'true') {
        return;
      }
      if (
        targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.isContentEditable)
      ) {
        return;
      }
      if (activeTab !== 'puzzle') return;
      if (
        activeAdPlacement ||
        clueSlotModalOpen ||
        summaryOpen ||
        helpOpen ||
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen ||
        profileModalOpen
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (targetEl?.tagName === 'BUTTON') return;
        e.preventDefault();
        handleCrosswordKey('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleCrosswordKey('BACKSPACE');
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        if (crosswordBoard.status !== 'playing') return;
        e.preventDefault();
        const dirMap: Record<string, CursorDirection> = {
          ArrowLeft: 'left',
          ArrowRight: 'right',
          ArrowUp: 'up',
          ArrowDown: 'down',
        };
        handleMoveCursor(dirMap[e.key]);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleCrosswordKey(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeAdPlacement,
    activeTab,
    categoryExplorerOpen,
    clueSlotModalOpen,
    crosswordBoard.status,
    handleCrosswordKey,
    handleMoveCursor,
    helpOpen,
    personalizationOpen,
    profileModalMode,
    profileModalOpen,
    settingsOpen,
    summaryOpen,
    weeklyRankOpen,
  ]);

  // Shake-to-Refresh + Gyroscope 3D Tilt Device Sensor Listener
  const onShakeCallbackRef = useRef<() => void>(() => {});
  onShakeCallbackRef.current = () => {
    triggerHapticPulse([20, 35, 20], effectiveHapticsEnabled);
    soundService.playTapPop();
    if (activeTab === 'puzzle') {
      dealNextSessionBoard();
      showToast('Shook! Fresh crossword dealt');
    } else if (activeTab === 'trivia' || activeTab === 'faith') {
      setRefreshSignal((s) => s + 1);
      showToast('Shook! Fresh question loaded');
    } else {
      showToast('Shake inside Puzzle, Trivia, or Faith to refresh!');
    }
  };

  useEffect(() => {
    return attachDeviceSensorListeners({
      enabled: appSettings.sensorsEnabled,
      onShake: () => onShakeCallbackRef.current(),
    });
  }, [appSettings.sensorsEnabled]);

  const effectivePlayerName =
    userAccount?.username || playerProfile.displayName || 'You';

  const getShareAppUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'https://wordvibe.app';
    const base = window.location.origin;
    if (userAccount?.username) {
      return `${base}/?ref=${encodeURIComponent(userAccount.username)}`;
    }
    return base;
  }, [userAccount?.username]);

  const handleRewardEarned = useCallback(
    (placement: RewardPlacement) => {
      setActiveAdPlacement(null);
      soundService.playHintChime();

      if (placement === 'unlock_category') {
        const targetCat = pendingCategoryForAd || activeCategory;
        setPendingCategoryForAd(null);
        setCategoryExplorerOpen(false);
        const granted = grantCategoryPlays(
          categoryProgress.playsRemaining,
          targetCat.id,
          PREMIUM_UNLOCK_PLAYS
        );
        const freshBoard = createCrosswordBoard({
          length: crosswordBoard.length,
          level: modeConfig.puzzleLevelNumber,
          categoryId: targetCat.id,
        });
        const firstCell = getFirstEditableCell(freshBoard);
        cursorRef.current = firstCell;
        setActiveRow(firstCell.row);
        setActiveCol(firstCell.col);
        setSelectedDictWord(null);
        setPuzzleTimedOut(false);
        const freshLimit = getCrosswordRoundTimeLimitSeconds(
          freshBoard.length,
          modeConfig.puzzleLevelNumber,
          crosswordClimb.roundIndex
        );
        puzzleTimeLeftRef.current = freshLimit;
        setPuzzleTimeLeftSec(freshLimit);
        setCrosswordBoard(freshBoard);

        const afterConsume = consumeCategoryPlay(targetCat, granted);
        setCategoryProgress((prev) =>
          recordUsedCategoryWord(
            {
              ...prev,
              activeCategoryId: targetCat.id,
              playsRemaining: afterConsume,
              exploredCategories: prev.exploredCategories.includes(targetCat.id)
                ? prev.exploredCategories
                : [...prev.exploredCategories, targetCat.id],
            },
            dateKey,
            targetCat.id,
            freshBoard.length,
            freshBoard.solution.target
          )
        );
        showToast(`${targetCat.name} unlocked! ${PREMIUM_UNLOCK_PLAYS} plays ready.`, 3200);
        return;
      }

      if (placement === 'hint') {
        const hintRes = applyUnlimitedCrosswordHint(
          crosswordBoard,
          cursorRef.current.row,
          cursorRef.current.col
        );
        if (!hintRes) {
          showToast('All tiles on this board are already revealed!');
          return;
        }
        setCrosswordBoard(hintRes.board);
        if (hintRes.board.status === 'won') {
          recordBoardVictory(hintRes.board);
        } else {
          showToast(
            `Hint revealed "${hintRes.letter}" at Row ${hintRes.revealedRow + 1}, Col ${
              hintRes.revealedCol + 1
            }!`,
            3200
          );
        }
        return;
      }

      if (placement === 'puzzle_clue' || placement === 'puzzle_word_trivia') {
        const chosen = pendingClueSlotRef.current || {
          slotType: typingDirection === 'down' ? ('col' as const) : ('row' as const),
          index: typingDirection === 'down' ? activeCol : activeRow,
        };
        pendingClueSlotRef.current = null;
        setPendingClueSlot(null);

        const res = unlockCrosswordLineClue(
          crosswordBoard,
          chosen.slotType,
          chosen.index,
          boardCategory.name
        );
        setCrosswordBoard(res.board);
        setCluePanelOpen(true);
        window.requestAnimationFrame(() => {
          cluePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        showToast('Dictionary meaning clue unlocked!', 3000);
        return;
      }

      if (placement === 'save_streak') {
        setStats((prev) => applyStreakRecovery(prev, dateKey));
        showToast('Daily streak restored!', 3000);
        return;
      }

      if (placement === 'unlock_trivia_24h') {
        const expiresAt = Date.now() + TRIVIA_BONUS_UNLOCK_HOURS * 60 * 60 * 1000;
        setTriviaState((prev) => ({
          ...prev,
          selectedCategoryId: 'mastermind-vault',
          bonusUnlockUntil: {
            ...prev.bonusUnlockUntil,
            'mastermind-vault': expiresAt,
          },
        }));
        showToast('Mastermind Vault unlocked for 24 hours!', 3200);
        return;
      }

      if (adRewardCallbackRef.current) {
        const cb = adRewardCallbackRef.current;
        adRewardCallbackRef.current = null;
        cb();
        return;
      }

      if (placement === 'double_xp' && lastPuzzleXpEarned > 0 && !puzzleDoubleXpClaimed) {
        setPuzzleDoubleXpClaimed(true);
        recordWeeklyEvent({ type: 'double_xp_boost', bonusXp: lastPuzzleXpEarned });
        showToast(`2x Boost! +${lastPuzzleXpEarned} bonus Weekly XP added.`, 3200);
      }
    },
    [
      activeCategory,
      activeCol,
      activeRow,
      boardCategory.name,
      categoryProgress.playsRemaining,
      crosswordBoard,
      crosswordClimb.roundIndex,
      dateKey,
      lastPuzzleXpEarned,
      modeConfig.puzzleLevelNumber,
      pendingCategoryForAd,
      puzzleDoubleXpClaimed,
      recordBoardVictory,
      recordWeeklyEvent,
      showToast,
      typingDirection,
    ]
  );

  const isCategoryLockedForNext = activeCategory.isPremium && categoryPlaysRemaining <= 0;

  const weekDays = useMemo(
    () => getWeekStreakDays(dateKey, stats.dailyWinDates),
    [dateKey, stats.dailyWinDates]
  );

  const homeChallenges = useMemo(
    () =>
      getHomeChallenges({
        todayKey: dateKey,
        stats,
        exploredCategoriesCount: categoryProgress.exploredCategories.length,
      }),
    [categoryProgress.exploredCategories.length, dateKey, stats]
  );

  const handleSelectChallenge = useCallback(
    (challenge: HomeChallenge) => {
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (challenge.openCategories) {
        setCategoryExplorerInitialTab('All');
        setCategoryExplorerOpen(true);
        return;
      }
      setAutoLengthMode(false);
      setModeConfig((prev) => ({
        ...prev,
        puzzleSessionMode: challenge.targetMode === 'sprint' ? 'sprint' : 'level_climb',
      }));
      activateNewBoard({
        nextLength: challenge.targetLength,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: activeCategory,
      });
    },
    [activateNewBoard, activeCategory, modeConfig.puzzleLevelNumber]
  );

  const handlePlayEntertainmentCategory = useCallback(
    (categoryId: string) => {
      const cat = getCategoryById(categoryId);
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      const remaining = getCategoryRemainingPlays(cat, categoryProgress.playsRemaining);
      if (cat.isPremium && remaining <= 0) {
        promptUnlockCategory(cat);
        return;
      }
      const ok = activateNewBoard({
        nextLength: crosswordBoard.length,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: cat,
      });
      if (ok) {
        showToast(`Topic: ${cat.name}`);
      }
    },
    [
      activateNewBoard,
      categoryProgress.playsRemaining,
      crosswordBoard.length,
      modeConfig.puzzleLevelNumber,
      promptUnlockCategory,
      showToast,
    ]
  );

  const openHelpModal = useCallback((tab: HelpSectionTab = 'rules') => {
    setHelpTab(tab);
    setHelpOpen(true);
  }, []);

  const handleNavigateHeaderSection = useCallback(
    (section: 'streak' | 'rules' | 'faq') => {
      if (section === 'streak') {
        setActiveTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      openHelpModal(section === 'faq' ? 'faq' : 'rules');
    },
    [openHelpModal]
  );

  const weeklyGradeInfo = useMemo(
    () =>
      computeWeeklyGrade(
        weeklyProgress.weeklyXp,
        weeklyProgress.unlockedAchievements.length
      ),
    [weeklyProgress.unlockedAchievements.length, weeklyProgress.weeklyXp]
  );

  const leaderboardSummary = useMemo(
    () =>
      getPlayerLeaderboardSummary({
        playerId: userAccount?.id || leaderboardPlayerId,
        playerName: effectivePlayerName,
        playerWeeklyXp: weeklyProgress.weeklyXp,
        playerTotalXp: Math.max(weeklyProgress.totalXp ?? 0, weeklyProgress.weeklyXp),
        playerPuzzlesSolved: weeklyProgress.puzzlesSolved,
        playerTriviaCorrect: weeklyProgress.triviaCorrect,
        playerStreak: stats.currentStreak,
        scope: 'weekly',
        weekKey: weeklyProgress.weekKey,
      }),
    [
      effectivePlayerName,
      leaderboardPlayerId,
      stats.currentStreak,
      userAccount?.id,
      weeklyProgress.puzzlesSolved,
      weeklyProgress.totalXp,
      weeklyProgress.triviaCorrect,
      weeklyProgress.weekKey,
      weeklyProgress.weeklyXp,
    ]
  );

  const handleSharePuzzleProgress = useCallback(
    async (suppressToast = false) => {
      const payload = buildPuzzleSharePayload({
        username: userAccount?.username || playerProfile.displayName,
        board: crosswordBoard,
        weeklyXp: weeklyProgress.weeklyXp,
        rank: leaderboardSummary.rank,
        totalActivePlayers: leaderboardSummary.activeThisWeekCount,
        streak: stats.currentStreak,
        appUrl: getShareAppUrl(),
      });
      const status = await shareOrCopyMessage(payload);
      if (!suppressToast) {
        if (status === 'shared') showToast('Progress shared!');
        else if (status === 'copied') showToast('Message copied to clipboard!');
        else if (status === 'failed') showToast('Unable to access clipboard');
      }
      return status;
    },
    [
      crosswordBoard,
      getShareAppUrl,
      leaderboardSummary.activeThisWeekCount,
      leaderboardSummary.rank,
      playerProfile.displayName,
      showToast,
      stats.currentStreak,
      userAccount?.username,
      weeklyProgress.weeklyXp,
    ]
  );

  const handleShareLeaderboardProgress = useCallback(
    async (rank: number, activeCount: number, gradeLabel: string, suppressToast = true) => {
      const payload = buildLeaderboardSharePayload({
        username: userAccount?.username || playerProfile.displayName,
        weeklyXp: weeklyProgress.weeklyXp,
        rank,
        totalActivePlayers: activeCount,
        gradeLabel,
        streak: stats.currentStreak,
        appUrl: getShareAppUrl(),
      });
      const status = await shareOrCopyMessage(payload);
      if (!suppressToast) {
        if (status === 'shared') showToast('Weekly rank shared!');
        else if (status === 'copied') showToast('Message copied to clipboard!');
        else if (status === 'failed') showToast('Unable to access clipboard');
      }
      return status;
    },
    [
      getShareAppUrl,
      playerProfile.displayName,
      showToast,
      stats.currentStreak,
      userAccount?.username,
      weeklyProgress.weeklyXp,
    ]
  );

  const handleInviteFriends = useCallback(
    async (rank?: number, activeCount?: number, suppressToast = false) => {
      const payload = buildInviteFriendsPayload({
        username: userAccount?.username || playerProfile.displayName,
        weeklyXp: weeklyProgress.weeklyXp,
        rank: rank ?? leaderboardSummary.rank,
        totalActivePlayers: activeCount ?? leaderboardSummary.activeThisWeekCount,
        appUrl: getShareAppUrl(),
      });
      const status = await shareOrCopyMessage(payload);
      if (!suppressToast) {
        if (status === 'shared') showToast('Invite sent!');
        else if (status === 'copied') showToast('Invite message copied to clipboard!');
        else if (status === 'failed') showToast('Unable to access clipboard');
      }
      return status;
    },
    [
      getShareAppUrl,
      leaderboardSummary.activeThisWeekCount,
      leaderboardSummary.rank,
      playerProfile.displayName,
      showToast,
      userAccount?.username,
      weeklyProgress.weeklyXp,
    ]
  );

  const featuredTopics = useMemo(() => {
    const ids = [
      spotlight.heroCategoryId,
      ...spotlight.featuredCategoryIds,
      'daily-news-pop',
      'music-charts',
      'history-heritage',
    ];
    return Array.from(new Set(ids))
      .map((id) => getCategoryById(id))
      .slice(0, 3);
  }, [spotlight.featuredCategoryIds, spotlight.heroCategoryId]);

  const handleRequestAdPlacement = useCallback(
    (placement: RewardPlacement, onGranted: () => void) => {
      adRewardCallbackRef.current = onGranted;
      setActiveAdPlacement(placement);
    },
    []
  );

  const handleTriviaAnswerRecorded = useCallback(
    (params: {
      correct: boolean;
      difficulty: TriviaQuestion['difficulty'];
      streakAfter: number;
      xpAwarded: number;
      categoryId: string;
      questionText: string;
    }) => {
      setPlayerProfile((prev) =>
        recordTriviaStudySignal(prev, {
          categoryId: params.categoryId,
          correct: params.correct,
        })
      );
      setTriviaState((prev) => ({
        ...prev,
        streak: params.streakAfter,
        bestStreak: Math.max(prev.bestStreak, params.streakAfter),
        recentQuestions: params.questionText
          ? [...prev.recentQuestions, params.questionText].slice(-500)
          : prev.recentQuestions,
      }));
      recordWeeklyEvent({
        type: 'trivia_answered',
        correct: params.correct,
        difficulty: params.difficulty,
        streakAfter: params.streakAfter,
        xpAwarded: params.xpAwarded,
        categoryId: `trivia:${params.categoryId}`,
      });
    },
    [recordWeeklyEvent]
  );

  const handleTriviaRoundCompleted = useCallback(
    (params: {
      correctCount: number;
      totalCount: number;
      roundXpEarned: number;
      categoryId: string;
    }) => {
      if (params.correctCount >= 5) {
        triggerConfetti();
        pushFloatingReward(`+${params.roundXpEarned || 120} XP`, 'xp');
      }
      recordWeeklyEvent({
        type: 'trivia_round_completed',
        correctCount: params.correctCount,
        totalCount: params.totalCount,
        categoryId: `trivia:${params.categoryId}`,
      });
    },
    [pushFloatingReward, recordWeeklyEvent, triggerConfetti]
  );

  const handleTriviaDoubleXpClaimed = useCallback(
    (bonusXp: number) => {
      recordWeeklyEvent({ type: 'double_xp_boost', bonusXp });
      pushFloatingReward(`+${bonusXp} XP`, 'xp');
      showToast(`2x Weekly XP Boost! +${bonusXp} XP credited.`, 3000);
    },
    [pushFloatingReward, recordWeeklyEvent, showToast]
  );

  const handleChangeFaithReligion = useCallback((religion: ReligionId) => {
    setFaithProgress((prev) => ({ ...prev, activeReligion: religion }));
    setAppSettings((prev) => ({ ...prev, defaultReligion: religion }));
  }, []);

  const handlePlayFaithPuzzle = useCallback(
    (religion: ReligionId) => {
      const tradition = getFaithTradition(religion);
      const faithWord = pickFaithPuzzleWord(religion, 5, dateKey, [
        crosswordBoard.solution.target,
      ]);
      activateNewBoard({
        nextLength: 5,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: getCategoryById('general-classic'),
        forcedTarget: faithWord.word,
        meta: {
          isPersonalized: true,
          clue: faithWord.clue,
          reason: `Faith Study · ${tradition.name} (${tradition.sacredTextLabel})`,
          funFact: faithWord.funFact,
          faithReligion: religion,
        },
      });
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      showToast(`${tradition.name} crossword ready!`, 2400);
    },
    [
      activateNewBoard,
      crosswordBoard.solution.target,
      dateKey,
      modeConfig.puzzleLevelNumber,
      showToast,
    ]
  );

  const handleFaithAnswerRecorded = useCallback(
    (correct: boolean, religion: ReligionId) => {
      setPlayerProfile((prev) =>
        recordTriviaStudySignal(prev, {
          categoryId: 'faith-study',
          correct,
        })
      );
      if (correct) {
        setFaithProgress((prev) => ({
          ...prev,
          faithTriviaCorrect: prev.faithTriviaCorrect + 1,
        }));
      }
      recordWeeklyEvent({
        type: 'trivia_answered',
        correct,
        difficulty: 'intermediate',
        streakAfter: correct ? 1 : 0,
        xpAwarded: correct ? 35 : 5,
        categoryId: `faith:${religion}`,
      });
    },
    [recordWeeklyEvent]
  );

  const handlePlayPersonalizedPuzzle = useCallback(
    (explicitLength?: WordLength) => {
      const insights = summarizePlayerProfile(playerProfile);
      const targetLength: WordLength =
        explicitLength ||
        (autoLengthMode
          ? rollProbabilityWordLength({ previousLength: crosswordBoard.length })
          : insights.favoriteLength || 5);
      const activeLoc =
        !playerProfile.locationOptOut && playerProfile.locationEnabled
          ? playerProfile.location
          : null;

      const puzzleData = pickFallbackPersonalizedPuzzle({
        length: targetLength,
        interests: playerProfile.selectedInterests,
        location: activeLoc,
        excludeWords: [crosswordBoard.solution.target],
      });

      activateNewBoard({
        nextLength: puzzleData.length,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: activeCategory,
        forcedTarget: puzzleData.target,
        meta: {
          isPersonalized: true,
          clue: puzzleData.clue,
          reason: puzzleData.trendReason,
          culturalNote: puzzleData.culturalNote,
        },
      });
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      showToast(puzzleData.trendReason, 3000);
    },
    [
      activateNewBoard,
      activeCategory,
      autoLengthMode,
      crosswordBoard.length,
      crosswordBoard.solution.target,
      modeConfig.puzzleLevelNumber,
      playerProfile,
      showToast,
    ]
  );

  const solveFunFact = useMemo(() => {
    if (crosswordBoard.status !== 'won') return undefined;
    return (
      personalizedMeta?.funFact ||
      buildCuratedWordFunFact(crosswordBoard.solution.target, boardCategory.name)
    );
  }, [
    boardCategory.name,
    crosswordBoard.solution.target,
    crosswordBoard.status,
    personalizedMeta?.funFact,
  ]);

  const isActivelyTyping = useMemo(
    () =>
      crosswordBoard.status === 'playing' &&
      crosswordBoard.userGrid.some((row, r) =>
        row.some((ch, c) => Boolean(ch) && !crosswordBoard.lockedCells[r][c])
      ),
    [crosswordBoard.lockedCells, crosswordBoard.status, crosswordBoard.userGrid]
  );

  return (
    <div
      id="top"
      className="min-h-[100dvh] flex flex-col wv-app-shell"
    >
      <Header
        soundMode={activeSoundMode}
        weeklyGradeId={weeklyGradeInfo.current.id}
        weeklyXp={weeklyProgress.weeklyXp}
        leaderboardRank={leaderboardSummary.rank}
        bonusCoins={weeklyProgress.bonusCoins}
        userAccount={userAccount}
        onToggleSound={() => {
          const nextMode: SoundMode =
            activeSoundMode === 'on' ? 'mute' : activeSoundMode === 'mute' ? 'off' : 'on';
          handleUpdateSettings({ soundMode: nextMode, soundEnabled: nextMode === 'on' });
          showToast(
            nextMode === 'on'
              ? 'Sound & Music On'
              : nextMode === 'mute'
              ? 'Muted — Vibrate Only'
              : 'Sound & Vibration Off'
          );
        }}
        onOpenStats={() => setSummaryOpen(true)}
        onOpenWeeklyRank={() => setWeeklyRankOpen(true)}
        onOpenHelp={() => openHelpModal('rules')}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenProfile={() => {
          setProfileModalMode(userAccount ? 'edit' : 'signup');
          setProfileModalOpen(true);
        }}
        onNavigateSection={handleNavigateHeaderSection}
      />

      <ConfettiBurst
        trigger={confettiActive}
        animationIntensity={appSettings.animationIntensity}
      />
      <FloatingReward
        items={floatingRewards}
        animationIntensity={appSettings.animationIntensity}
      />

      {/* Achievement Unlock Notification Banner */}
      {achievementBanner && (
        <div
          data-testid="achievement-toast"
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 z-50 flex max-w-xs items-center gap-3 rounded-xl border wv-border wv-card p-3 shadow-xl animate-toast-up"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg wv-accent-btn">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold wv-accent-text">
              Achievement Unlocked!
            </p>
            <p className="truncate text-xs font-semibold wv-text">
              {achievementBanner.title}
            </p>
            <p className="font-mono-tabular text-xs wv-text-muted">
              +{achievementBanner.xpReward} XP · +{achievementBanner.coinReward} Coins
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center pb-[72px]">
        {activeTab === 'home' ? (
          <StreakHomeView
            stats={stats}
            dateKey={dateKey}
            activeReligion={faithProgress.activeReligion}
            puzzleNumber={puzzleNumber}
            countdown={countdown}
            weekDays={weekDays}
            challenges={homeChallenges}
            activeCategoryName={activeCategory.name}
            spotlight={spotlight}
            playsRemaining={categoryProgress.playsRemaining}
            canSaveStreak={isStreakRecoverable}
            weeklyProgress={weeklyProgress}
            weeklyCountdown={weeklyCountdown}
            leaderboardRank={leaderboardSummary.rank}
            playerProfile={playerProfile}
            onOpenPersonalize={() => setPersonalizationOpen(true)}
            onPlayPersonalizedPuzzle={() => handlePlayPersonalizedPuzzle()}
            onWatchAdSaveStreak={() => setActiveAdPlacement('save_streak')}
            onStartPuzzle={() => {
              setActiveTab('puzzle');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onStartFaith={() => {
              setActiveTab('faith');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onStartTrivia={() => {
              setActiveTab('trivia');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenWeeklyRank={() => setWeeklyRankOpen(true)}
            onSelectChallenge={handleSelectChallenge}
            onPlayEntertainmentCategory={handlePlayEntertainmentCategory}
            onBrowseEntertainment={() => {
              setCategoryExplorerInitialTab('Entertainment');
              setCategoryExplorerOpen(true);
            }}
            onOpenHelp={openHelpModal}
          />
        ) : activeTab === 'faith' ? (
          <FaithStudyView
            dateKey={dateKey}
            activeReligion={faithProgress.activeReligion}
            showScriptureReferences={appSettings.showScriptureReferences}
            completedToday={faithProgress.completedSessionsByDate[dateKey] || []}
            refreshSignal={refreshSignal}
            onChangeReligion={handleChangeFaithReligion}
            onPlayFaithPuzzle={handlePlayFaithPuzzle}
            onFaithAnswerRecorded={handleFaithAnswerRecorded}
          />
        ) : activeTab === 'trivia' ? (
          <TriviaView
            selectedCategoryId={triviaState.selectedCategoryId}
            sessionMode={modeConfig.triviaSessionMode}
            levelNumber={modeConfig.triviaLevelNumber}
            maxUnlockedLevel={modeConfig.highestUnlockedTriviaLevel}
            climbState={triviaClimb}
            streak={triviaState.streak}
            bestStreak={triviaState.bestStreak}
            bonusUnlockUntil={triviaState.bonusUnlockUntil}
            recentQuestions={triviaState.recentQuestions}
            playerProfile={playerProfile}
            refreshSignal={refreshSignal}
            isPaused={
              Boolean(activeAdPlacement) ||
              helpOpen ||
              categoryExplorerOpen ||
              weeklyRankOpen ||
              personalizationOpen ||
              settingsOpen ||
              profileModalOpen
            }
            onOpenPersonalize={() => setPersonalizationOpen(true)}
            onSelectCategory={(catId) =>
              setTriviaState((prev) => ({ ...prev, selectedCategoryId: catId }))
            }
            onChangeSessionMode={(nextMode) => {
              setModeConfig((prev) => ({ ...prev, triviaSessionMode: nextMode }));
              if (nextMode === 'level_climb') {
                setTriviaClimb(createTriviaClimbState(modeConfig.triviaLevelNumber));
              }
            }}
            onChangeLevelNumber={(nextLevel) => {
              const requested = normalizeLevelNumber(nextLevel, 1);
              if (requested > modeConfig.highestUnlockedTriviaLevel) {
                showToast('Win 5 timed trivia questions in a row to unlock the next level!');
                return;
              }
              const safeLv = Math.min(modeConfig.highestUnlockedTriviaLevel, Math.max(1, requested));
              setModeConfig((prev) => ({
                ...prev,
                triviaLevelNumber: safeLv,
                triviaLevel: levelNumberToDifficultyBand(safeLv),
              }));
              setTriviaClimb(createTriviaClimbState(safeLv));
              showToast(`Trivia: ${formatLevelLabel(safeLv)}`);
            }}
            onUpdateClimbState={setTriviaClimb}
            onPromoteLevelNumber={(promoted) => {
              const safeLv = normalizeLevelNumber(promoted, 1);
              setModeConfig((prev) => ({
                ...prev,
                triviaLevelNumber: safeLv,
                highestUnlockedTriviaLevel: Math.max(prev.highestUnlockedTriviaLevel, safeLv),
                triviaLevel: levelNumberToDifficultyBand(safeLv),
              }));
              showToast(`Promoted to ${formatLevelLabel(safeLv)}!`, 3200);
            }}
            onUnlockBonusCategory={() => setActiveAdPlacement('unlock_trivia_24h')}
            onRequestAdPlacement={handleRequestAdPlacement}
            onAnswerRecorded={handleTriviaAnswerRecorded}
            onRoundCompleted={handleTriviaRoundCompleted}
            onDoubleXpClaimed={handleTriviaDoubleXpClaimed}
          />
        ) : (
          <div key="puzzle-stage" className="w-full flex flex-col items-center animate-stage-enter">
            <ModeControls
              sessionMode={modeConfig.puzzleSessionMode}
              levelNumber={modeConfig.puzzleLevelNumber}
              maxUnlockedLevel={modeConfig.highestUnlockedPuzzleLevel}
              climbState={crosswordClimb}
              roundTimeLeftSec={
                modeConfig.puzzleSessionMode === 'level_climb' && crosswordBoard.status === 'playing'
                  ? puzzleTimeLeftSec
                  : null
              }
              roundTimeTotalSec={
                modeConfig.puzzleSessionMode === 'level_climb' && crosswordBoard.status === 'playing'
                  ? roundTimeTotalSec
                  : null
              }
              length={crosswordBoard.length}
              autoLengthMode={autoLengthMode}
              activeCategory={activeCategory}
              categoryPlaysRemaining={categoryPlaysRemaining}
              currentStreak={stats.currentStreak}
              sprintSolved={stats.sprintSolved}
              isPersonalizedRound={personalizedMeta?.isPersonalized}
              personalizedClue={personalizedMeta?.clue}
              personalizedReason={personalizedMeta?.reason}
              onPlayPersonalizedPuzzle={() =>
                handlePlayPersonalizedPuzzle(autoLengthMode ? undefined : crosswordBoard.length)
              }
              onChangeSessionMode={handleChangePuzzleSessionMode}
              onChangeLevelNumber={handleChangePuzzleLevelNumber}
              onChangeLength={handleChangeBoardLength}
              onToggleAutoLength={handleToggleAutoLength}
              onOpenCategories={() => {
                setCategoryExplorerInitialTab('All');
                setCategoryExplorerOpen(true);
              }}
            />

            <PuzzleGrid
              board={crosswordBoard}
              activeRow={activeRow}
              activeCol={activeCol}
              typingDirection={typingDirection}
              shakeLine={shakeLine}
              showWinBurst={showWinBurst}
              boardAnimKey={crosswordBoard.boardId}
              solveFunFact={solveFunFact}
              selectedDictWord={selectedDictWord}
              puzzleTimedOut={modeConfig.puzzleSessionMode === 'level_climb' && puzzleTimedOut}
              featuredTopics={featuredTopics}
              categoryPlaysRemainingMap={categoryProgress.playsRemaining}
              onChangeDirection={(dir) => {
                setTypingDirection(dir);
                triggerHapticPulse(8, effectiveHapticsEnabled);
              }}
              onSelectCell={handleSelectCell}
              onSelectDictWord={setSelectedDictWord}
              onRetryTimedRound={handleRetryTimedRound}
              onSelectFeaturedTopic={handleSelectCategory}
              onOpenTopicsExplorer={() => {
                setCategoryExplorerInitialTab('All');
                setCategoryExplorerOpen(true);
              }}
              onKey={handleCrosswordKey}
              onMoveCursor={handleMoveCursor}
              onTriggerHint={() => setActiveAdPlacement('hint')}
              onTriggerWordClue={() => setClueSlotModalOpen(true)}
              onTriggerSkipBoard={() => {
                dealNextSessionBoard();
                showToast('Fresh crossword board dealt!');
              }}
            />

            {crosswordBoard.status === 'playing' &&
              Object.keys(crosswordBoard.unlockedClues).length > 0 && (
                <WordTriviaHintPanel
                  panelRef={cluePanelRef}
                  unlockedClues={crosswordBoard.unlockedClues}
                  wordLength={crosswordBoard.length}
                  categoryName={boardCategory.name}
                  isOpen={cluePanelOpen}
                  onToggleOpen={() => setCluePanelOpen((prev) => !prev)}
                  onRequestAnotherLine={() => setClueSlotModalOpen(true)}
                />
              )}

            <RewardedDock
              sessionMode={modeConfig.puzzleSessionMode}
              board={crosswordBoard}
              cluePanelOpen={cluePanelOpen}
              canSaveStreak={isStreakRecoverable}
              previousLostStreak={stats.previousLostStreak}
              isCategoryLockedForNext={isCategoryLockedForNext}
              onToggleCluePanel={() => setCluePanelOpen((prev) => !prev)}
              onWatchAdSaveStreak={() => setActiveAdPlacement('save_streak')}
              onWatchAdUnlockCategory={() => promptUnlockCategory(activeCategory)}
              onNewBoard={() => dealNextSessionBoard()}
              onShareResult={() => void handleSharePuzzleProgress()}
              onInviteFriends={() => void handleInviteFriends()}
              onOpenSummary={() => setSummaryOpen(true)}
            />

            <EditorialGuideAndAdSlot
              isActivelyTyping={isActivelyTyping}
              onOpenHelp={openHelpModal}
            />
          </div>
        )}
      </main>

      {/* Non-blocking Floating Toast Banner */}
      <div
        className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[75] pointer-events-none px-4"
        aria-live="polite"
      >
        {toast && (
          <div
            data-testid="toast-message"
            className="max-w-sm sm:max-w-md truncate rounded-lg wv-accent-btn px-3.5 py-1.5 text-xs font-bold shadow-lg animate-toast-up"
          >
            {toast}
          </div>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />

      <CategoryExplorerModal
        open={categoryExplorerOpen}
        initialTab={categoryExplorerInitialTab}
        activeCategoryId={activeCategory.id}
        playsRemaining={categoryProgress.playsRemaining}
        solvedByCategory={categoryProgress.solvedByCategory}
        exploredCategories={categoryProgress.exploredCategories}
        spotlight={spotlight}
        onClose={() => setCategoryExplorerOpen(false)}
        onSelectCategory={handleSelectCategory}
      />

      <SummaryModal
        open={summaryOpen}
        sessionMode={modeConfig.puzzleSessionMode}
        board={crosswordBoard}
        climbState={crosswordClimb}
        categoryName={personalizedMeta?.isPersonalized ? 'For You Pick' : boardCategory.name}
        isPremiumCategory={!personalizedMeta?.isPersonalized && activeCategory.isPremium}
        categoryPlaysRemaining={categoryPlaysRemaining}
        countdown={countdown}
        stats={stats}
        canSaveStreak={isStreakRecoverable}
        canDoubleXp={!puzzleDoubleXpClaimed && rewardedAdService.canShowOptionalPrompt()}
        lastPuzzleXpEarned={lastPuzzleXpEarned}
        weeklyRank={leaderboardSummary.rank}
        activeWeeklyPlayersCount={leaderboardSummary.activeThisWeekCount}
        weeklyXp={weeklyProgress.weeklyXp}
        personalizedReason={personalizedMeta?.reason}
        personalizedCulturalNote={personalizedMeta?.culturalNote}
        funFact={solveFunFact}
        onClose={() => setSummaryOpen(false)}
        onShare={() => handleSharePuzzleProgress(true)}
        onInviteFriends={() => handleInviteFriends(undefined, undefined, true)}
        onWatchAdSaveStreak={() => {
          setSummaryOpen(false);
          setActiveAdPlacement('save_streak');
        }}
        onWatchAdDoubleXp={() => {
          setSummaryOpen(false);
          setActiveAdPlacement('double_xp');
        }}
        onWatchAdUnlockCategory={() => promptUnlockCategory(activeCategory)}
        onNextBoard={() => {
          if (personalizedMeta?.faithReligion) {
            handlePlayFaithPuzzle(personalizedMeta.faithReligion);
          } else if (personalizedMeta?.isPersonalized) {
            handlePlayPersonalizedPuzzle(crosswordBoard.length);
          } else {
            dealNextSessionBoard();
          }
        }}
      />

      <PersonalizationModal
        open={personalizationOpen}
        profile={playerProfile}
        stats={stats}
        localHeadlines={[]}
        onClose={() => setPersonalizationOpen(false)}
        onUpdateProfile={(next) => {
          setPlayerProfile(next);
          if (next.locationOptOut === appSettings.autoDetectLocation) {
            setAppSettings((prev) => ({
              ...prev,
              autoDetectLocation: !next.locationOptOut,
            }));
          }
        }}
        onResetStudyStats={() => {
          const fresh = createDefaultPlayerProfile();
          setPlayerProfile((prev) => ({
            ...fresh,
            locationEnabled: prev.locationEnabled,
            locationOptOut: prev.locationOptOut,
            location: prev.location,
            displayName: prev.displayName,
            focusField: prev.focusField,
            environmentSnapshot: prev.environmentSnapshot,
            selectedInterests: prev.selectedInterests,
            challengePace: prev.challengePace,
          }));
          showToast('Learned profile stats reset.');
        }}
      />

      <SettingsModal
        open={settingsOpen}
        settings={appSettings}
        playerProfile={playerProfile}
        userAccount={userAccount}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onOpenPersonalize={() => {
          setSettingsOpen(false);
          setPersonalizationOpen(true);
        }}
        onOpenEditProfile={() => {
          setProfileModalMode(userAccount ? 'edit' : 'signup');
          setProfileModalOpen(true);
        }}
        onShareApp={() => void handleInviteFriends()}
        onResetTutorial={() => {
          handleUpdateSettings({ tutorialCompleted: false });
          setSettingsOpen(false);
          openHelpModal('rules');
          showToast('Tutorial guide reopened.');
        }}
      />

      <WeeklyRankModal
        open={weeklyRankOpen}
        weeklyProgress={weeklyProgress}
        weeklyCountdown={weeklyCountdown}
        playerId={userAccount?.id || leaderboardPlayerId}
        playerName={effectivePlayerName}
        userAccount={userAccount}
        playerPuzzlesSolved={stats.gamesWon}
        playerTriviaCorrect={weeklyProgress.triviaCorrect}
        playerStreak={stats.currentStreak}
        onUpdatePlayerName={(name) =>
          setPlayerProfile((prev) => ({
            ...prev,
            displayName: name,
          }))
        }
        onOpenEditProfile={() => {
          setWeeklyRankOpen(false);
          setProfileModalMode(userAccount ? 'edit' : 'signup');
          setProfileModalOpen(true);
        }}
        onShareProgress={(rank, activeCount, gradeLabel) =>
          handleShareLeaderboardProgress(rank, activeCount, gradeLabel, true)
        }
        onInviteFriends={(rank, activeCount) => handleInviteFriends(rank, activeCount, true)}
        onClose={() => setWeeklyRankOpen(false)}
      />

      <ProfileAuthModal
        open={profileModalOpen}
        mode={profileModalMode}
        existingAccount={userAccount}
        onSaveAccount={async (acct) => {
          await saveLocalUserAccount(acct);
          setUserAccount(acct);
          setPlayerProfile((prev) => ({
            ...prev,
            displayName: acct.username,
          }));
          setProfileModalOpen(false);
          showToast(
            profileModalMode === 'edit' ? 'Profile updated!' : `Welcome, @${acct.username}!`
          );
        }}
        onClose={() => {
          if (profileModalMode === 'edit') {
            setProfileModalOpen(false);
          }
        }}
      />

      <WeeklyRolloverModal
        summary={weeklyProgress.pendingWeekSummary}
        onDismiss={() =>
          setWeeklyProgress((prev) => ({
            ...prev,
            pendingWeekSummary: null,
          }))
        }
      />

      <HowToPlayModal open={helpOpen} initialTab={helpTab} onClose={() => setHelpOpen(false)} />

      <WordTriviaRowModal
        open={clueSlotModalOpen}
        board={crosswordBoard}
        activeRow={activeRow}
        activeCol={activeCol}
        typingDirection={typingDirection}
        onCancel={() => {
          setClueSlotModalOpen(false);
          setPendingClueSlot(null);
          pendingClueSlotRef.current = null;
        }}
        onConfirmSlot={(slotType, index) => {
          setClueSlotModalOpen(false);
          const slot = { slotType, index };
          pendingClueSlotRef.current = slot;
          setPendingClueSlot(slot);

          if (slotType === 'row') {
            setTypingDirection('across');
            const openC = crosswordBoard.lockedCells[index].findIndex((locked) => !locked);
            const nextC = openC >= 0 ? openC : 0;
            cursorRef.current = { row: index, col: nextC };
            setActiveRow(index);
            setActiveCol(nextC);
          } else {
            setTypingDirection('down');
            const openR = crosswordBoard.lockedCells.findIndex((rowArr) => !rowArr[index]);
            const nextR = openR >= 0 ? openR : 0;
            cursorRef.current = { row: nextR, col: index };
            setActiveRow(nextR);
            setActiveCol(index);
          }

          setActiveAdPlacement('puzzle_clue');
        }}
      />

      <RewardedAdModal
        placement={activeAdPlacement}
        contextLabel={
          (activeAdPlacement === 'puzzle_clue' || activeAdPlacement === 'puzzle_word_trivia') &&
          pendingClueSlot
            ? pendingClueSlot.slotType === 'row'
              ? `Row ${pendingClueSlot.index + 1} Across`
              : `Col ${pendingClueSlot.index + 1} Down`
            : pendingCategoryForAd?.name || activeCategory.name
        }
        onCancel={() => {
          setActiveAdPlacement(null);
          setPendingCategoryForAd(null);
          setPendingClueSlot(null);
          pendingClueSlotRef.current = null;
          adRewardCallbackRef.current = null;
        }}
        onRewardEarned={handleRewardEarned}
      />

      <OfflineBanner />
    </div>
  );
}
