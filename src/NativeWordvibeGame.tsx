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
import { ModeControls } from './components/ModeControls';
import { OfflineBanner } from './components/OfflineBanner';
import { PersonalizationModal } from './components/PersonalizationModal';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { ProfileAuthModal, type ProfileAuthMode } from './components/ProfileAuthModal';
import { ProfileViewModal } from './components/ProfileViewModal';
import { PuzzleGrid, type SelectedDictionaryWord } from './components/PuzzleGrid';
import { RewardedAdModal } from './components/RewardedAdModal';
import { RewardedDock } from './components/RewardedDock';
import { SettingsModal, type SettingsOpenRequest } from './components/SettingsModal';
import { StreakHomeView } from './components/StreakHomeView';
import { SummaryModal } from './components/SummaryModal';
import { TriviaView } from './components/TriviaView';
import { WeeklyRankModal, WeeklyRolloverModal } from './components/WeeklyRankModal';
import { WordTriviaHintPanel } from './components/WordTriviaHintPanel';
import { WordTriviaRowModal } from './components/WordTriviaRowModal';
import { getCategoryById, type PuzzleCategory } from './data/categories';
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
  CATEGORY_UNLOCK_REQUIRED_ADS,
  consumeCategoryPlay,
  formatCountdown,
  getCategoryRemainingPlays,
  getCategoryUnlockAdProgress,
  getDailyPuzzleNumber,
  getHomeChallenges,
  getLocalDateKey,
  getTimeUntilMidnightMs,
  getWeekStreakDays,
  isCategoryAccessible,
  recordCategoryUnlockAdWatch,
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
  TRIVIA_QUESTION_TIME_LIMIT_SEC,
  type TriviaClimbProgress,
  type TriviaQuestion,
} from './game/triviaLogic';
import {
  APP_TAB_ORDER,
  isPrivacyPath,
  isSwipeIgnoredTarget,
  resolveSwipeTabChange,
  resolveWheelStepDirection,
  stepHorizontalSelection,
} from './game/navigationLogic';
import { recordModeOutcome } from './game/retirementQueueLogic';
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
  normalizeEmailKey,
  resolveShareAppUrl,
  verifyPasswordLocal,
  type LocalUserAccount,
} from './game/userAccountLogic';
import { buildCuratedWordFunFact } from './game/wordTriviaLogic';
import {
  formatNotEnoughXpMessage,
  getSpendableXpBalance,
  spendPlayerXp,
  XP_COSTS,
} from './game/xpEconomyLogic';
import {
  AUTO_FLUSH_XP_THRESHOLD,
  calculateOfflineWrongXp,
  calculateVerifiedRoundXp,
  reconcileVerifiedStateUid,
  recordVerifiedOnlineRound,
  shouldAutoFlushBatch,
  type ClaimConfirmationReceipt,
  type RewardClaimInput,
  type VerifiedRewardLocalState,
  type VerifiedRoundMode,
  type WeeklyLeaderboardCache,
} from './game/verifiedRewardsLogic';
import type { User } from 'firebase/auth';
import {
  consumeGoogleRedirectResult,
  ensureAnonymousSession,
  fetchWeeklyLeaderboardSingleDoc,
  flushVerifiedBatchToFirestore,
  loadOrHydrateRemoteUserProfile,
  loadVerifiedRewardState,
  loadWeeklyLeaderboardCache,
  resolveFirebaseAuthType,
  saveVerifiedRewardState,
  signInOrLinkEmail,
  signInOrLinkGoogle,
  signOutFirebaseSession,
  submitVerifiedRewardClaim,
  subscribeFirebaseAuth,
  updateFirebaseDisplayName,
} from './services/firebaseSyncService';
import {
  clearActiveLocalUserAccount,
  hydrateLocalUserAccountFromIdb,
  loadEmailProgressBundle,
  loadLocalUserAccount,
  saveEmailProgressBundle,
  saveLocalUserAccount,
  shareOrCopyMessage,
  type EmailProgressBundle,
} from './services/accountStorageService';
import {
  attachDeviceSensorListeners,
  triggerHapticPulse,
} from './services/deviceSensorService';
import { musicPlayer } from './services/musicPlayer';
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

export default function NativeWordvibeGame() {
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

  const [isPrivacyRoute, setIsPrivacyRoute] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isPrivacyPath(window.location.pathname) : false
  );

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
  const [settingsOpenRequest, setSettingsOpenRequest] = useState<SettingsOpenRequest | null>(null);
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
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [verifiedState, setVerifiedState] = useState<VerifiedRewardLocalState>(() =>
    loadVerifiedRewardState(null, loadLocalUserAccount()?.username || initialBoot.profile.displayName || 'Player')
  );
  const [leaderboardCache, setLeaderboardCache] = useState<WeeklyLeaderboardCache | null>(() =>
    loadWeeklyLeaderboardCache()
  );
  const [isSyncingScore, setIsSyncingScore] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [lastClaimReceipt, setLastClaimReceipt] = useState<ClaimConfirmationReceipt | null>(null);
  const verifiedStateRef = useRef(verifiedState);
  verifiedStateRef.current = verifiedState;
  const firebaseUserRef = useRef(firebaseUser);
  firebaseUserRef.current = firebaseUser;
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const playerDisplayNameRef = useRef(
    userAccount?.username || initialBoot.profile.displayName || 'Player'
  );
  playerDisplayNameRef.current =
    userAccount?.username || playerProfile.displayName || 'Player';

  const [profileModalMode, setProfileModalMode] = useState<ProfileAuthMode>(() =>
    loadLocalUserAccount() ? 'edit' : 'signin'
  );
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (isPrivacyPath(window.location.pathname)) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    return loadLocalUserAccount() === null;
  });
  const [profileViewOpen, setProfileViewOpen] = useState<boolean>(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [swipeTransitionDir, setSwipeTransitionDir] = useState<'left' | 'right' | null>(null);
  const swipeTouchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    ignored: boolean;
  } | null>(null);
  const swipePointerStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
    ignored: boolean;
  } | null>(null);
  const lastMainWheelAtRef = useRef<number>(0);
  const suppressMainClickUntilRef = useRef<number>(0);
  const swipeAnimTimerRef = useRef<number | null>(null);

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
  const puzzleTimeoutAdvanceRef = useRef<number | null>(null);
  const autoAdvanceTimeoutBoardRef = useRef<() => void>(() => {});
  const rewardIdRef = useRef<number>(1);
  const resolvedBoardIdsRef = useRef<Set<string>>(new Set());
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

  const categoryProgressRef = useRef(categoryProgress);
  categoryProgressRef.current = categoryProgress;

  const categoryPlaysRemaining = useMemo(
    () => getCategoryRemainingPlays(activeCategory, categoryProgress.playsRemaining),
    [activeCategory, categoryProgress.playsRemaining]
  );

  const activeCategoryUnlockAdsWatched = useMemo(
    () => getCategoryUnlockAdProgress(categoryProgress.unlockAdProgress, activeCategory.id),
    [activeCategory.id, categoryProgress.unlockAdProgress]
  );

  const weeklyProgressRef = useRef(weeklyProgress);
  weeklyProgressRef.current = weeklyProgress;
  const currentSpendableXp = getSpendableXpBalance(weeklyProgress);

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

  // Global tap feedback across every interactive icon/button + independent procedural music lifecycle
  useEffect(() => {
    const detachTaps = soundService.attachGlobalTapFeedback();
    const detachMusic = musicPlayer.attachLifecycleListeners();
    return () => {
      detachTaps();
      detachMusic();
    };
  }, []);

  // Pause procedural background music whenever a rewarded ad preview is active
  useEffect(() => {
    musicPlayer.setPausedForAd(Boolean(activeAdPlacement));
  }, [activeAdPlacement]);

  // Sync theme, accent, animation intensity, independent Sound SFX & Music, fanfare & haptics immediately
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
    soundService.setVictoryFanfareEnabled(appSettings.victoryFanfareEnabled);
    soundService.setHapticsEnabled(appSettings.hapticsEnabled);
    musicPlayer.setEnabled(appSettings.bgMusicEnabled);
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
      if (puzzleTimeoutAdvanceRef.current) window.clearTimeout(puzzleTimeoutAdvanceRef.current);
      if (achievementTimerRef.current) window.clearTimeout(achievementTimerRef.current);
      if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
      if (swipeAnimTimerRef.current) window.clearTimeout(swipeAnimTimerRef.current);
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

  const buildEmailProgressBundle = useCallback(
    (acct: LocalUserAccount): EmailProgressBundle => ({
      email: normalizeEmailKey(acct.email),
      account: acct,
      stats,
      weeklyProgress,
      faithProgress,
      triviaState,
      playerProfile,
      modeConfig,
      categoryProgress,
      appSettings,
      crosswordClimb,
      triviaClimb,
      updatedAt: Date.now(),
    }),
    [
      appSettings,
      categoryProgress,
      crosswordClimb,
      faithProgress,
      modeConfig,
      playerProfile,
      stats,
      triviaClimb,
      triviaState,
      weeklyProgress,
    ]
  );

  const applyEmailProgressBundle = useCallback((bundle: EmailProgressBundle) => {
    setStats(bundle.stats);
    setWeeklyProgress(bundle.weeklyProgress);
    setFaithProgress(bundle.faithProgress);
    setTriviaState(bundle.triviaState);
    setPlayerProfile(bundle.playerProfile);
    setModeConfig(bundle.modeConfig);
    setCategoryProgress(bundle.categoryProgress);
    setAppSettings(bundle.appSettings);
    setCrosswordClimb(bundle.crosswordClimb);
    setTriviaClimb(bundle.triviaClimb);
    setUserAccount(bundle.account);
  }, []);

  // Keep user progress synced to their email vault automatically
  useEffect(() => {
    if (!userAccount?.email) return;
    const timer = window.setTimeout(() => {
      void saveEmailProgressBundle(buildEmailProgressBundle(userAccount));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [buildEmailProgressBundle, userAccount]);

  // Persist verified online reward state cleanly
  useEffect(() => {
    saveVerifiedRewardState(verifiedState);
  }, [verifiedState]);

  // Track navigator.onLine changes so offline play never accumulates Verified Online XP
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performVerifiedFlush = useCallback(async (silent = false): Promise<void> => {
    const onlineNow = typeof navigator !== 'undefined' ? navigator.onLine : isOnlineRef.current;
    if (!onlineNow) {
      const offlineMsg = 'Offline — progress stays saved locally until reconnected.';
      setSyncStatusMessage(offlineMsg);
      if (!silent) showToast(offlineMsg, 2800);
      return;
    }

    setIsSyncingScore(true);
    try {
      let activeUser = firebaseUserRef.current;
      if (!activeUser) {
        const authRes = await ensureAnonymousSession();
        if (!authRes.user) {
          const authMsg = authRes.error || 'Unable to start cloud sync session.';
          setSyncStatusMessage(authMsg);
          if (!silent) showToast(authMsg, 3000);
          return;
        }
        activeUser = authRes.user;
        firebaseUserRef.current = activeUser;
        setFirebaseUser(activeUser);
      }

      const authType = resolveFirebaseAuthType(activeUser);
      let workingState = reconcileVerifiedStateUid(
        verifiedStateRef.current,
        activeUser.uid,
        playerDisplayNameRef.current,
        authType
      );
      if (workingState !== verifiedStateRef.current) {
        try {
          const hydrated = await loadOrHydrateRemoteUserProfile(
            activeUser.uid,
            workingState,
            playerDisplayNameRef.current,
            authType
          );
          workingState = hydrated.state;
        } catch {
          // Proceed with locally reconciled UID if initial fetch is unavailable
        }
        verifiedStateRef.current = workingState;
        setVerifiedState(workingState);
      }

      const outcome = await flushVerifiedBatchToFirestore(workingState);
      verifiedStateRef.current = outcome.state;
      setVerifiedState(outcome.state);
      setSyncStatusMessage(outcome.message);
      if (outcome.synced) {
        const refreshed = await fetchWeeklyLeaderboardSingleDoc(true);
        setLeaderboardCache(refreshed.cache);
        if (!silent) showToast(outcome.message, 2800);
      } else if (outcome.flaggedTamper) {
        showToast(outcome.message, 3600);
      } else if (!silent) {
        showToast(outcome.message, 2600);
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Unable to sync progress.';
      const isPermDenied = rawMsg.includes('Missing or insufficient permissions');
      const friendlyMsg = isPermDenied
        ? 'Cloud sync paused — verify your signed-in session.'
        : rawMsg;
      setSyncStatusMessage(friendlyMsg);
      if (!silent) {
        showToast(
          isPermDenied
            ? 'Sync paused — check your signed-in session.'
            : 'Sync paused — please try again shortly.',
          3200
        );
      }
    } finally {
      setIsSyncingScore(false);
    }
  }, [showToast]);

  // Subscribe to Firebase Auth, bind UID immediately, and hydrate remote user profile + leaderboard cache
  useEffect(() => {
    let active = true;

    void consumeGoogleRedirectResult().then(async (redirectUser) => {
      if (!active || !redirectUser || redirectUser.isAnonymous) return;
      const googleEmail = normalizeEmailKey(redirectUser.email || '');
      if (!googleEmail) return;
      const existingBundle = await loadEmailProgressBundle(googleEmail);
      if (!active) return;
      if (existingBundle) {
        applyEmailProgressBundle(existingBundle);
        await saveLocalUserAccount(existingBundle.account);
      } else {
        const display = redirectUser.displayName || googleEmail.split('@')[0] || 'Player';
        const handle = display.replace(/[^a-zA-Z0-9._]/g, '_').slice(0, 24) || 'Player';
        const now = Date.now();
        const acct: LocalUserAccount = {
          id: `user:${handle.toLowerCase()}`,
          realName: display,
          username: handle,
          email: googleEmail,
          passwordHash: '',
          passwordSalt: '',
          avatarType: 'builtin',
          builtinAvatarId: 'crown',
          createdAt: now,
          updatedAt: now,
        };
        await saveLocalUserAccount(acct);
        setUserAccount(acct);
        setPlayerProfile((prev) => ({ ...prev, displayName: acct.username }));
        setVerifiedState((prev) => ({ ...prev, displayName: acct.username }));
        await saveEmailProgressBundle(buildEmailProgressBundle(acct));
      }
      setProfileModalOpen(false);
    });

    const unsub = subscribeFirebaseAuth((user) => {
      if (!active) return;
      firebaseUserRef.current = user;
      setFirebaseUser(user);

      if (!user) {
        return;
      }

      const authType = resolveFirebaseAuthType(user);
      const displayName =
        playerDisplayNameRef.current ||
        user.displayName ||
        'Player';

      // Bind UID immediately so rounds completed before getDoc resolves still accumulate Verified XP
      const boundState = reconcileVerifiedStateUid(
        verifiedStateRef.current,
        user.uid,
        displayName,
        authType
      );
      if (boundState !== verifiedStateRef.current) {
        verifiedStateRef.current = boundState;
        setVerifiedState(boundState);
      }

      void loadOrHydrateRemoteUserProfile(
        user.uid,
        boundState,
        displayName,
        authType
      )
        .then(({ state }) => {
          if (!active) return;
          verifiedStateRef.current = state;
          setVerifiedState(state);
          return fetchWeeklyLeaderboardSingleDoc(false);
        })
        .then((res) => {
          if (!active || !res) return;
          setLeaderboardCache(res.cache);
        })
        .catch(() => {
          // Keep boundState UID active even if remote fetch was temporarily blocked
        });
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Automatically start a guest Firebase session for returning users when online and auth modal is dismissed
  useEffect(() => {
    if (!isOnline || profileModalOpen || firebaseUser) return;
    void ensureAnonymousSession().catch(() => {});
  }, [firebaseUser, isOnline, profileModalOpen]);

  // Flush buffered online XP on tab background/session finish if 5-min cooldown allows
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (shouldAutoFlushBatch(verifiedStateRef.current, 'session_exit')) {
          void performVerifiedFlush(true);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [performVerifiedFlush]);

  const queueVerifiedOnlineRound = useCallback(
    (params: {
      mode: VerifiedRoundMode;
      won: boolean;
      sessionMode?: SessionPlayMode;
      timeRemainingSec?: number;
      timeTotalSec?: number;
      accuracyRatio?: number;
      difficultyWeight?: number;
      streak?: number;
    }) => {
      if (params.mode === 'faith' || !params.won) {
        return;
      }
      const onlineNow =
        typeof navigator !== 'undefined' ? navigator.onLine : isOnlineRef.current;
      const signedInNow = Boolean(firebaseUserRef.current);
      const res = recordVerifiedOnlineRound(verifiedStateRef.current, {
        isOnline: onlineNow,
        isSignedIn: signedInNow,
        mode: params.mode,
        won: params.won,
        sessionMode: params.sessionMode,
        timeRemainingSec: params.timeRemainingSec,
        timeTotalSec: params.timeTotalSec,
        accuracyRatio: params.accuracyRatio,
        difficultyWeight: params.difficultyWeight,
        streak: params.streak,
      });
      if (res.eligibleForVerifiedReward) {
        verifiedStateRef.current = res.state;
        setVerifiedState(res.state);
        if (shouldAutoFlushBatch(res.state, 'round_end')) {
          void performVerifiedFlush(true);
        }
      } else if (res.state !== verifiedStateRef.current) {
        verifiedStateRef.current = res.state;
        setVerifiedState(res.state);
      }
    },
    [performVerifiedFlush]
  );

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
    categoryExplorerOpen ||
    weeklyRankOpen ||
    personalizationOpen ||
    settingsOpen ||
    profileModalOpen ||
    profileViewOpen;

  const recordPuzzleBoardOutcome = useCallback(
    (board: CrosswordBoardState, won: boolean) => {
      if (!board?.boardId || resolvedBoardIdsRef.current.has(board.boardId)) {
        return;
      }
      resolvedBoardIdsRef.current.add(board.boardId);
      const mode = board.trackerMode === 'faith' ? 'faith' : 'puzzle';
      const itemId =
        board.puzzleItemId || `puzzle:${board.length}:${board.solution.target}`;
      recordModeOutcome(mode, itemId, won, {
        length: board.length,
        target: board.solution.target,
        rows: board.solution.rows,
        categoryId: board.categoryId,
      });
    },
    []
  );

  useEffect(() => {
    if (isPuzzleTimerPaused) return;
    const id = window.setInterval(() => {
      const current = puzzleTimeLeftRef.current;
      if (current <= 1) {
        puzzleTimeLeftRef.current = 0;
        setPuzzleTimeLeftSec(0);
        setPuzzleTimedOut(true);
        soundService.playInvalidShake();
        // Do NOT auto-complete/auto-answer the board and award 0 XP
        recordPuzzleBoardOutcome(crosswordBoard, false);
        setCrosswordClimb((prev) => advanceCrosswordLevelClimb(prev, false));
        showToast("Time's up! Unanswered · 0 XP — Advancing...", 2600);
        if (puzzleTimeoutAdvanceRef.current) {
          window.clearTimeout(puzzleTimeoutAdvanceRef.current);
        }
        puzzleTimeoutAdvanceRef.current = window.setTimeout(() => {
          puzzleTimeoutAdvanceRef.current = null;
          autoAdvanceTimeoutBoardRef.current();
        }, 1200);
        return;
      }
      const nextVal = current - 1;
      puzzleTimeLeftRef.current = nextVal;
      setPuzzleTimeLeftSec(nextVal);
    }, 1000);
    return () => window.clearInterval(id);
  }, [crosswordBoard, isPuzzleTimerPaused, recordPuzzleBoardOutcome, showToast]);

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
      trackerMode?: 'puzzle' | 'faith';
      faithReligion?: ReligionId;
    }): boolean => {
      const {
        nextLength,
        nextLevelNumber,
        nextCategory,
        forcedTarget,
        meta = null,
        overrideRoundIndex,
        trackerMode,
        faithReligion,
      } = params;
      if (
        !forcedTarget &&
        !isCategoryAccessible(nextCategory, categoryProgressRef.current.playsRemaining)
      ) {
        promptUnlockCategory(nextCategory);
        return false;
      }

      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
      }
      if (puzzleTimeoutAdvanceRef.current) {
        window.clearTimeout(puzzleTimeoutAdvanceRef.current);
        puzzleTimeoutAdvanceRef.current = null;
      }

      const safeLv = normalizeLevelNumber(nextLevelNumber, 1);
      const freshBoard = createCrosswordBoard({
        length: nextLength,
        level: safeLv,
        categoryId: nextCategory.id,
        forcedTarget,
        trackerMode,
        faithReligion,
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

      setCategoryProgress((prev) => {
        const nextState = recordUsedCategoryWord(
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
        );
        categoryProgressRef.current = nextState;
        return nextState;
      });

      return true;
    },
    [crosswordClimb.roundIndex, dateKey, promptUnlockCategory]
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
      const remaining = getCategoryRemainingPlays(
        category,
        categoryProgressRef.current.playsRemaining
      );
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
      crosswordBoard.length,
      modeConfig.puzzleLevelNumber,
      promptUnlockCategory,
      showToast,
    ]
  );

  const trySpendXp = useCallback(
    (cost: number): boolean => {
      const result = spendPlayerXp(weeklyProgressRef.current, cost);
      if (!result.success) {
        showToast(result.errorMessage || formatNotEnoughXpMessage(cost), 2600);
        return false;
      }
      weeklyProgressRef.current = result.state;
      setWeeklyProgress(result.state);
      pushFloatingReward(`-${cost} XP`, 'xp');
      return true;
    },
    [pushFloatingReward, showToast]
  );

  const recordBoardVictory = useCallback(
    (wonBoard: CrosswordBoardState) => {
      recordPuzzleBoardOutcome(wonBoard, true);
      soundService.playWinFanfare();
      triggerConfetti();
      setShowWinBurst(true);
      window.setTimeout(() => setShowWinBurst(false), 1200);

      const isFaithBoard = wonBoard.trackerMode === 'faith';
      const onlineNow =
        typeof navigator !== 'undefined' ? navigator.onLine : isOnlineRef.current;
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

      const accRatio = Math.max(0.25, 1 - wonBoard.wrongChecks * 0.15);
      const diffWeight = Math.min(1, modeConfig.puzzleLevelNumber / 20);

      let earned = 0;
      if (isFaithBoard) {
        // Faith Mode Online awards 0 online XP and never syncs to online leaderboard;
        // Offline Faith progress remains local Practice XP only.
        if (!onlineNow) {
          const offlineFaithXp = modeConfig.puzzleSessionMode === 'sprint' ? 10 : 25;
          earned = offlineFaithXp;
          recordWeeklyEvent({
            type: 'puzzle_completed',
            won: true,
            mode: statMode,
            attemptsUsed: Math.max(1, wonBoard.wrongChecks + 1),
            wordLength: wonBoard.length,
            categoryId: wonBoard.categoryId,
            isOnline: false,
            xpAwardedOverride: offlineFaithXp,
          });
          pushFloatingReward(`+${offlineFaithXp} Offline XP`, 'xp');
        } else {
          pushFloatingReward('Practice · 0 Online XP', 'xp');
        }
      } else {
        earned = calculateVerifiedRoundXp({
          mode: 'puzzle',
          won: true,
          sessionMode: modeConfig.puzzleSessionMode,
          timeRemainingSec: puzzleTimeLeftRef.current,
          timeTotalSec: roundTimeTotalSec,
          accuracyRatio: accRatio,
          difficultyWeight: diffWeight,
        });
        recordWeeklyEvent({
          type: 'puzzle_completed',
          won: true,
          mode: statMode,
          attemptsUsed: Math.max(1, wonBoard.wrongChecks + 1),
          wordLength: wonBoard.length,
          categoryId: wonBoard.categoryId,
          isOnline: onlineNow,
          xpAwardedOverride: earned,
        });
        queueVerifiedOnlineRound({
          mode: 'puzzle',
          won: true,
          sessionMode: modeConfig.puzzleSessionMode,
          timeRemainingSec: puzzleTimeLeftRef.current,
          timeTotalSec: roundTimeTotalSec,
          accuracyRatio: accRatio,
          difficultyWeight: diffWeight,
          streak: stats.currentStreak + 1,
        });
        pushFloatingReward(`+${earned} XP`, 'xp');
      }

      setLastPuzzleXpEarned(earned);
      setPuzzleDoubleXpClaimed(false);

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
      modeConfig.puzzleLevelNumber,
      modeConfig.puzzleSessionMode,
      pushFloatingReward,
      puzzleTimedOut,
      queueVerifiedOnlineRound,
      recordPuzzleBoardOutcome,
      recordWeeklyEvent,
      roundTimeTotalSec,
      showToast,
      stats.currentStreak,
      triggerConfetti,
    ]
  );

  const handleSpendXpForPuzzleHint = useCallback(() => {
    if (crosswordBoard.status !== 'playing') return;
    const hintRes = applyUnlimitedCrosswordHint(
      crosswordBoard,
      cursorRef.current.row,
      cursorRef.current.col
    );
    if (!hintRes) {
      showToast('All tiles on this board are already revealed!');
      return;
    }
    if (!trySpendXp(XP_COSTS.PUZZLE_HINT)) return;
    soundService.playHintChime();
    setCrosswordBoard(hintRes.board);
    if (hintRes.board.status === 'won') {
      recordBoardVictory(hintRes.board);
    } else {
      showToast(
        `Hint revealed "${hintRes.letter}" at Row ${hintRes.revealedRow + 1}, Col ${
          hintRes.revealedCol + 1
        }! (-${XP_COSTS.PUZZLE_HINT} XP)`,
        3200
      );
    }
  }, [crosswordBoard, recordBoardVictory, showToast, trySpendXp]);

  const handleSpendXpForPuzzleClue = useCallback(
    (slotType: CrosswordSlotType, index: number) => {
      if (crosswordBoard.status !== 'playing') return;
      const clueKey = `${slotType}-${index}`;
      if (crosswordBoard.unlockedClues[clueKey]) {
        setCluePanelOpen(true);
        return;
      }
      if (!trySpendXp(XP_COSTS.PUZZLE_CLUE)) return;
      soundService.playHintChime();
      const res = unlockCrosswordLineClue(
        crosswordBoard,
        slotType,
        index,
        boardCategory.name
      );
      setCrosswordBoard(res.board);
      setCluePanelOpen(true);
      showToast(`Clue unlocked (-${XP_COSTS.PUZZLE_CLUE} XP)!`, 2800);
    },
    [boardCategory.name, crosswordBoard, showToast, trySpendXp]
  );

  const handleSpendXpUnlockMastermind = useCallback((): boolean => {
    if (triviaState.mastermindUnlocked) {
      setTriviaState((prev) => ({ ...prev, selectedCategoryId: 'mastermind-vault' }));
      return true;
    }
    if (!trySpendXp(XP_COSTS.TRIVIA_MASTERMIND_UNLOCK)) return false;
    soundService.playHintChime();
    setTriviaState((prev) => ({
      ...prev,
      mastermindUnlocked: true,
      selectedCategoryId: 'mastermind-vault',
    }));
    showToast(
      `Mastermind Vault unlocked forever! (-${XP_COSTS.TRIVIA_MASTERMIND_UNLOCK} XP)`,
      3200
    );
    return true;
  }, [showToast, triviaState.mastermindUnlocked, trySpendXp]);

  const handleSpendXpTriviaSolve = useCallback((): boolean => {
    if (!trySpendXp(XP_COSTS.TRIVIA_SOLVE)) return false;
    showToast(`Question solved (-${XP_COSTS.TRIVIA_SOLVE} XP)`, 2400);
    return true;
  }, [showToast, trySpendXp]);

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
    (rowIdx: number, colIdx: number, explicitDirection?: TypingDirection) => {
      if (crosswordBoard.status !== 'playing') return;
      const L = crosswordBoard.length;
      if (rowIdx < 0 || rowIdx >= L || colIdx < 0 || colIdx >= L) return;

      if (explicitDirection) {
        setTypingDirection(explicitDirection);
      } else {
        const isSameCell = cursorRef.current.row === rowIdx && cursorRef.current.col === colIdx;
        if (isSameCell) {
          setTypingDirection((prev) => (prev === 'across' ? 'down' : 'across'));
        } else if (crosswordBoard.solvedRows[rowIdx] && !crosswordBoard.solvedCols[colIdx]) {
          setTypingDirection('down');
        } else if (crosswordBoard.solvedCols[colIdx] && !crosswordBoard.solvedRows[rowIdx]) {
          setTypingDirection('across');
        }
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
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen ||
        profileModalOpen ||
        profileViewOpen
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
      modeConfig.puzzleSessionMode,
      personalizationOpen,
      puzzleTimedOut,
      recordBoardVictory,
      settingsOpen,
      showToast,
      summaryOpen,
      triggerLineShake,
      typingDirection,
      profileModalOpen,
      profileViewOpen,
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
        setCategoryExplorerOpen(false);
        setWeeklyRankOpen(false);
        setPersonalizationOpen(false);
        setSettingsOpen(false);
        setClueSlotModalOpen(false);
        setProfileViewOpen(false);
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
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen ||
        profileModalOpen ||
        profileViewOpen
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
    personalizationOpen,
    profileModalMode,
    profileModalOpen,
    profileViewOpen,
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
      if (crosswordBoard.status === 'playing') {
        recordPuzzleBoardOutcome(crosswordBoard, false);
      }
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
    return resolveShareAppUrl();
  }, []);

  const handleRewardEarned = useCallback(
    (placement: RewardPlacement) => {
      soundService.playHintChime();

      if (placement === 'unlock_category') {
        const targetCat = pendingCategoryForAd || activeCategory;
        const latestProgress = categoryProgressRef.current;
        const res = recordCategoryUnlockAdWatch({
          unlockAdProgress: latestProgress.unlockAdProgress,
          playsRemaining: latestProgress.playsRemaining,
          categoryId: targetCat.id,
        });

        if (!res.unlocked) {
          const updatedProgress: CategoryProgressState = {
            ...latestProgress,
            unlockAdProgress: res.unlockAdProgress,
            playsRemaining: res.playsRemaining,
          };
          categoryProgressRef.current = updatedProgress;
          setCategoryProgress(updatedProgress);
          const remainingAds = res.requiredAds - res.adsWatched;
          showToast(
            `Ad ${res.adsWatched}/${res.requiredAds} watched! Watch ${remainingAds} more for 5 plays.`,
            2800
          );
          return;
        }

        setActiveAdPlacement(null);
        setPendingCategoryForAd(null);
        setCategoryExplorerOpen(false);
        setSummaryOpen(false);
        setActiveTab('puzzle');
        window.scrollTo({ top: 0, behavior: 'instant' });

        const freshBoard = createCrosswordBoard({
          length: crosswordBoard.length,
          level: modeConfig.puzzleLevelNumber,
          categoryId: targetCat.id,
        });
        const firstCell = getFirstEditableCell(freshBoard);
        cursorRef.current = firstCell;
        setActiveRow(firstCell.row);
        setActiveCol(firstCell.col);
        setTypingDirection('across');
        setShakeLine(null);
        setShowWinBurst(false);
        setPersonalizedMeta(null);
        setCluePanelOpen(false);
        setClueSlotModalOpen(false);
        setPendingClueSlot(null);
        pendingClueSlotRef.current = null;
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

        const afterConsume = consumeCategoryPlay(targetCat, res.playsRemaining);
        setCategoryProgress((prev) => {
          const nextState = recordUsedCategoryWord(
            {
              ...prev,
              activeCategoryId: targetCat.id,
              unlockAdProgress: res.unlockAdProgress,
              playsRemaining: afterConsume,
              exploredCategories: prev.exploredCategories.includes(targetCat.id)
                ? prev.exploredCategories
                : [...prev.exploredCategories, targetCat.id],
            },
            dateKey,
            targetCat.id,
            freshBoard.length,
            freshBoard.solution.target
          );
          categoryProgressRef.current = nextState;
          return nextState;
        });
        showToast(`${targetCat.name} unlocked! 5 plays granted!`, 3400);
        return;
      }

      setActiveAdPlacement(null);

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
      const remaining = getCategoryRemainingPlays(cat, categoryProgressRef.current.playsRemaining);
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
      crosswordBoard.length,
      modeConfig.puzzleLevelNumber,
      promptUnlockCategory,
      showToast,
    ]
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
        playerId: verifiedState.uid || userAccount?.id || leaderboardPlayerId,
        playerName: effectivePlayerName,
        playerWeeklyXp: firebaseUser ? verifiedState.weeklyRewardXp : 0,
        playerTotalXp: firebaseUser ? verifiedState.verifiedRewardXp : 0,
        playerPuzzlesSolved: verifiedState.puzzlesSolved,
        playerTriviaCorrect: verifiedState.triviaCorrect,
        playerStreak: stats.currentStreak,
        scope: 'weekly',
        weekKey: verifiedState.weekKey || weeklyProgress.weekKey,
        remoteEntries: (leaderboardCache?.topEntries || []).map((entry) => ({
          id: entry.uid,
          name: entry.name,
          weeklyXp: entry.weeklyRewardXp,
          totalXp: entry.verifiedRewardXp,
          puzzlesSolved: entry.puzzlesSolved,
          triviaCorrect: entry.triviaCorrect,
          streak: entry.streak,
          weekKey: entry.weekKey,
          isActiveThisWeek: entry.weeklyRewardXp > 0,
        })),
      }),
    [
      effectivePlayerName,
      firebaseUser,
      leaderboardCache?.topEntries,
      leaderboardPlayerId,
      stats.currentStreak,
      userAccount?.id,
      verifiedState.puzzlesSolved,
      verifiedState.triviaCorrect,
      verifiedState.uid,
      verifiedState.verifiedRewardXp,
      verifiedState.weekKey,
      verifiedState.weeklyRewardXp,
      weeklyProgress.weekKey,
    ]
  );

  const handleOpenWeeklyRankModal = useCallback(() => {
    setWeeklyRankOpen(true);
    if (
      verifiedStateRef.current.pendingBuffer.pendingXp >= AUTO_FLUSH_XP_THRESHOLD &&
      shouldAutoFlushBatch(verifiedStateRef.current, 'leaderboard_open')
    ) {
      void performVerifiedFlush(true);
    } else if (firebaseUserRef.current && isOnlineRef.current) {
      void fetchWeeklyLeaderboardSingleDoc(false)
        .then((res) => {
          setLeaderboardCache(res.cache);
        })
        .catch((err) => {
          const rawMsg = err instanceof Error ? err.message : '';
          if (rawMsg.includes('Missing or insufficient permissions')) {
            setSyncStatusMessage(
              'Unable to read cloud profile — verify your signed-in session.'
            );
          }
        });
    }
  }, [performVerifiedFlush]);

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
        streak: stats.currentStreak,
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
      stats.currentStreak,
      userAccount?.username,
      weeklyProgress.weeklyXp,
    ]
  );

  const featuredTopics = useMemo(() => {
    const ids = [
      spotlight.heroCategoryId,
      ...spotlight.featuredCategoryIds,
      'awards-red-carpet',
      'kpop-global-pop',
      'sports-spectacle',
      'astrology',
    ];
    const seen = new Set<string>();
    const out: PuzzleCategory[] = [];
    for (const id of ids) {
      const cat = getCategoryById(id);
      if (!seen.has(cat.id)) {
        seen.add(cat.id);
        out.push(cat);
      }
      if (out.length >= 6) break;
    }
    return out;
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
      timedOut?: boolean;
      difficulty: TriviaQuestion['difficulty'];
      streakAfter: number;
      xpAwarded: number;
      baseXp?: number;
      timeRemainingSec?: number;
      sessionMode?: SessionPlayMode;
      categoryId: string;
      questionText: string;
    }) => {
      const onlineNow =
        typeof navigator !== 'undefined' ? navigator.onLine : isOnlineRef.current;
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
        timedOut: params.timedOut,
        isOnline: onlineNow,
        difficulty: params.difficulty,
        streakAfter: params.streakAfter,
        xpAwarded: params.xpAwarded,
        baseXp: params.baseXp,
        categoryId: `trivia:${params.categoryId}`,
      });
      if (params.correct && !params.timedOut) {
        queueVerifiedOnlineRound({
          mode: 'trivia',
          won: true,
          sessionMode: params.sessionMode ?? modeConfig.triviaSessionMode,
          timeRemainingSec: params.timeRemainingSec,
          timeTotalSec: TRIVIA_QUESTION_TIME_LIMIT_SEC,
          accuracyRatio: 0.85,
          difficultyWeight:
            params.difficulty === 'hard' ? 0.9 : params.difficulty === 'intermediate' ? 0.55 : 0.25,
          streak: params.streakAfter,
        });
      }
    },
    [modeConfig.triviaSessionMode, queueVerifiedOnlineRound, recordWeeklyEvent]
  );

  const handleTriviaRoundCompleted = useCallback(
    (params: {
      correctCount: number;
      totalCount: number;
      roundXpEarned: number;
      categoryId: string;
    }) => {
      if (params.correctCount >= 5 && params.roundXpEarned > 0) {
        triggerConfetti();
        pushFloatingReward(`+${params.roundXpEarned} XP`, 'xp');
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
      const faithWord = pickFaithPuzzleWord(
        religion,
        5,
        dateKey,
        [crosswordBoard.solution.target],
        true
      );
      activateNewBoard({
        nextLength: 5,
        nextLevelNumber: modeConfig.puzzleLevelNumber,
        nextCategory: getCategoryById('general-classic'),
        forcedTarget: faithWord.word,
        trackerMode: 'faith',
        faithReligion: religion,
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
      const onlineNow =
        typeof navigator !== 'undefined' ? navigator.onLine : isOnlineRef.current;
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
      // Online Faith mode awards 0 online XP and never syncs to Firestore/leaderboard;
      // Offline Faith mode records local Practice XP only (including 40% on wrong answers).
      if (!onlineNow) {
        const offlineBase = 35;
        recordWeeklyEvent({
          type: 'trivia_answered',
          correct,
          isOnline: false,
          difficulty: 'intermediate',
          streakAfter: correct ? 1 : 0,
          xpAwarded: correct ? offlineBase : calculateOfflineWrongXp(offlineBase),
          baseXp: offlineBase,
          categoryId: `faith:${religion}`,
        });
      }
    },
    [recordWeeklyEvent]
  );

  autoAdvanceTimeoutBoardRef.current = () => {
    if (crosswordBoard.trackerMode === 'faith') {
      handlePlayFaithPuzzle(personalizedMeta?.faithReligion || faithProgress.activeReligion);
      return;
    }
    handleRetryTimedRound();
  };

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

  const switchTabWithSwipe = useCallback(
    (nextTab: AppTab, direction: 'left' | 'right') => {
      if (nextTab === activeTab) return;
      setSwipeTransitionDir(direction);
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (swipeAnimTimerRef.current) window.clearTimeout(swipeAnimTimerRef.current);
      swipeAnimTimerRef.current = window.setTimeout(() => {
        setSwipeTransitionDir(null);
        swipeAnimTimerRef.current = null;
      }, 260);
    },
    [activeTab]
  );

  const handleSignOutUnified = useCallback(async () => {
    setAuthBusy(true);
    try {
      if (userAccount?.email) {
        await saveEmailProgressBundle(buildEmailProgressBundle(userAccount));
      }
      await clearActiveLocalUserAccount();
      try {
        await signOutFirebaseSession();
      } catch {
        // Ignore offline Firebase signout failure
      }
      setUserAccount(null);
      setProfileViewOpen(false);
      setWeeklyRankOpen(false);
      setAuthModalError(null);
      setProfileModalMode('signin');
      setProfileModalOpen(true);
      showToast('Signed out. Sign in anytime to restore your progress.', 2600);
    } finally {
      setAuthBusy(false);
    }
  }, [buildEmailProgressBundle, showToast, userAccount]);

  const openPrivacyPolicy = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!isPrivacyPath(window.location.pathname)) {
        window.history.pushState({ page: 'privacy' }, '', '/privacy');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsPrivacyRoute(true);
  }, []);

  const closePrivacyPolicy = useCallback(() => {
    if (typeof window !== 'undefined' && isPrivacyPath(window.location.pathname)) {
      window.history.pushState({ page: 'app' }, '', '/');
    }
    setIsPrivacyRoute(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setIsPrivacyRoute(isPrivacyPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = isPrivacyRoute
      ? 'Privacy Policy — Wordvibe'
      : 'Wordvibe: Daily Word Puzzle, Brain Trivia & Faith Study';
  }, [isPrivacyRoute]);

  const handleClearAllLocalData = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear();
      } catch {
        // Ignore storage restrictions
      }
      if ('indexedDB' in window) {
        try {
          window.indexedDB.deleteDatabase('wordvibe_offline_accounts_db');
        } catch {
          // Ignore IndexedDB deletion restrictions
        }
      }
      if ('caches' in window) {
        try {
          const keys = await window.caches.keys();
          await Promise.all(
            keys.filter((k) => k.startsWith('wordvibe-')).map((k) => window.caches.delete(k))
          );
        } catch {
          // Ignore Cache API errors
        }
      }
    }
    setUserAccount(null);
    showToast('Local profiles, scores, and browser caches cleared.');
  }, [showToast]);

  const anyModalBlockingSwipe =
    isPrivacyRoute ||
    Boolean(activeAdPlacement) ||
    clueSlotModalOpen ||
    summaryOpen ||
    categoryExplorerOpen ||
    weeklyRankOpen ||
    personalizationOpen ||
    settingsOpen ||
    profileModalOpen ||
    profileViewOpen;

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
        userAccount={userAccount}
        onToggleSound={() => {
          const nextMode: SoundMode =
            activeSoundMode === 'on' ? 'mute' : activeSoundMode === 'mute' ? 'off' : 'on';
          handleUpdateSettings({ soundMode: nextMode, soundEnabled: nextMode === 'on' });
          showToast(
            nextMode === 'on'
              ? 'Sound Effects On'
              : nextMode === 'mute'
              ? 'Sound Muted — Vibrate Only'
              : 'Sound Effects & Vibration Off'
          );
        }}
        onOpenStats={() => setSummaryOpen(true)}
        onOpenWeeklyRank={handleOpenWeeklyRankModal}
        onOpenSettings={() => {
          setSettingsOpenRequest(null);
          setSettingsOpen(true);
        }}
        onOpenProfile={() => setProfileViewOpen(true)}
        onNavigateHome={() => {
          closePrivacyPolicy();
          setActiveTab('home');
        }}
        showXp={activeTab !== 'home'}
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
              +{achievementBanner.xpReward} XP
            </p>
          </div>
        </div>
      )}

      <main
        data-testid="main-swipe-container"
        onTouchStart={(e) => {
          if (e.touches.length !== 1 || anyModalBlockingSwipe) {
            swipeTouchStartRef.current = null;
            return;
          }
          const targetEl = e.target as HTMLElement | null;
          const ignored = isSwipeIgnoredTarget({
            tagName: targetEl?.tagName,
            isContentEditable: targetEl?.isContentEditable,
            closestHorizontalScroll: Boolean(
              targetEl?.closest('[data-no-swipe="true"], .overflow-x-auto')
            ),
            closestHorizontalSwitcher: Boolean(
              targetEl?.closest('[data-horizontal-switcher="true"]')
            ),
          });
          swipeTouchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now(),
            ignored,
          };
        }}
        onTouchEnd={(e) => {
          const start = swipeTouchStartRef.current;
          swipeTouchStartRef.current = null;
          if (!start || start.ignored || anyModalBlockingSwipe) return;
          const changed = e.changedTouches[0];
          if (!changed) return;
          const resolution = resolveSwipeTabChange({
            currentTab: activeTab,
            deltaX: changed.clientX - start.x,
            deltaY: changed.clientY - start.y,
            durationMs: Date.now() - start.time,
          });
          if (resolution.nextTab && resolution.direction) {
            switchTabWithSwipe(resolution.nextTab, resolution.direction);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch' || e.button !== 0 || anyModalBlockingSwipe) {
            swipePointerStartRef.current = null;
            return;
          }
          const targetEl = e.target as HTMLElement | null;
          const ignored = isSwipeIgnoredTarget({
            tagName: targetEl?.tagName,
            isContentEditable: targetEl?.isContentEditable,
            closestHorizontalScroll: Boolean(
              targetEl?.closest('[data-no-swipe="true"], .overflow-x-auto')
            ),
            closestHorizontalSwitcher: Boolean(
              targetEl?.closest('[data-horizontal-switcher="true"]')
            ),
          });
          swipePointerStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            time: Date.now(),
            pointerId: e.pointerId,
            ignored,
          };
        }}
        onPointerUp={(e) => {
          const start = swipePointerStartRef.current;
          swipePointerStartRef.current = null;
          if (!start || start.ignored || e.pointerId !== start.pointerId || anyModalBlockingSwipe) {
            return;
          }
          const resolution = resolveSwipeTabChange({
            currentTab: activeTab,
            deltaX: e.clientX - start.x,
            deltaY: e.clientY - start.y,
            durationMs: Date.now() - start.time,
          });
          if (resolution.nextTab && resolution.direction) {
            suppressMainClickUntilRef.current = Date.now() + 260;
            switchTabWithSwipe(resolution.nextTab, resolution.direction);
          }
        }}
        onClickCapture={(e) => {
          if (Date.now() < suppressMainClickUntilRef.current) {
            suppressMainClickUntilRef.current = 0;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onWheel={(e) => {
          if (anyModalBlockingSwipe) return;
          const targetEl = e.target as HTMLElement | null;
          if (
            isSwipeIgnoredTarget({
              tagName: targetEl?.tagName,
              isContentEditable: targetEl?.isContentEditable,
              closestHorizontalScroll: Boolean(
                targetEl?.closest('[data-no-swipe="true"], .overflow-x-auto')
              ),
              closestHorizontalSwitcher: Boolean(
                targetEl?.closest('[data-horizontal-switcher="true"]')
              ),
            })
          ) {
            return;
          }
          const step = resolveWheelStepDirection({
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            shiftKey: e.shiftKey,
          });
          if (!step) return;
          const now = Date.now();
          if (now - lastMainWheelAtRef.current < 380) return;
          const nextTab = stepHorizontalSelection(APP_TAB_ORDER, activeTab, step);
          if (nextTab) {
            lastMainWheelAtRef.current = now;
            switchTabWithSwipe(nextTab, step > 0 ? 'left' : 'right');
          }
        }}
        className={`flex-1 flex flex-col items-center pb-[78px] ${
          swipeTransitionDir === 'left'
            ? 'animate-swipe-from-right'
            : swipeTransitionDir === 'right'
            ? 'animate-swipe-from-left'
            : ''
        }`}
      >
        {isPrivacyRoute ? (
          <PrivacyPolicyView
            onBack={closePrivacyPolicy}
            onClearLocalData={handleClearAllLocalData}
          />
        ) : activeTab === 'home' ? (
          <>
            <StreakHomeView
            stats={stats}
            dateKey={dateKey}
            activeReligion={faithProgress.activeReligion}
            puzzleNumber={puzzleNumber}
            countdown={countdown}
            weekDays={weekDays}
            challenges={homeChallenges}
            spotlight={spotlight}
            playsRemaining={categoryProgress.playsRemaining}
            canSaveStreak={isStreakRecoverable}
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
            onSelectChallenge={handleSelectChallenge}
            onPlayEntertainmentCategory={handlePlayEntertainmentCategory}
            onBrowseEntertainment={() => {
              setCategoryExplorerInitialTab('Entertainment');
              setCategoryExplorerOpen(true);
            }}
          />
            <footer className="mx-auto mb-6 w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm wv-text-muted">
              <span>On-Device Offline Ready</span>
              <a
                href="/privacy"
                data-testid="footer-privacy-link"
                onClick={(e) => {
                  e.preventDefault();
                  openPrivacyPolicy();
                }}
                className="font-semibold underline underline-offset-4 hover:opacity-85 cursor-pointer"
              >
                Privacy Policy
              </a>
            </footer>
          </>
        ) : activeTab === 'faith' ? (
          <>
            <FaithStudyView
              dateKey={dateKey}
              activeReligion={faithProgress.activeReligion}
              showScriptureReferences={appSettings.showScriptureReferences}
              completedToday={faithProgress.completedSessionsByDate[dateKey] || []}
              refreshSignal={refreshSignal}
              isOnline={isOnline}
              onChangeReligion={handleChangeFaithReligion}
              onPlayFaithPuzzle={handlePlayFaithPuzzle}
              onFaithAnswerRecorded={handleFaithAnswerRecorded}
            />
            <footer className="mx-auto mb-6 w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm wv-text-muted">
              <span>On-Device Offline Ready</span>
              <a
                href="/privacy"
                data-testid="footer-privacy-link"
                onClick={(e) => {
                  e.preventDefault();
                  openPrivacyPolicy();
                }}
                className="font-semibold underline underline-offset-4 hover:opacity-85 cursor-pointer"
              >
                Privacy Policy
              </a>
            </footer>
          </>
        ) : activeTab === 'trivia' ? (
          <>
            <TriviaView
              selectedCategoryId={triviaState.selectedCategoryId}
              sessionMode={modeConfig.triviaSessionMode}
              levelNumber={modeConfig.triviaLevelNumber}
              maxUnlockedLevel={modeConfig.highestUnlockedTriviaLevel}
              climbState={triviaClimb}
              streak={triviaState.streak}
              bestStreak={triviaState.bestStreak}
              bonusUnlockUntil={triviaState.bonusUnlockUntil}
              mastermindUnlocked={triviaState.mastermindUnlocked}
              currentXp={currentSpendableXp}
              recentQuestions={triviaState.recentQuestions}
              playerProfile={playerProfile}
              refreshSignal={refreshSignal}
            isOnline={isOnline}
            isPaused={
              Boolean(activeAdPlacement) ||
              categoryExplorerOpen ||
              weeklyRankOpen ||
              personalizationOpen ||
              settingsOpen ||
              profileModalOpen ||
              profileViewOpen
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
            onSpendXpUnlockMastermind={handleSpendXpUnlockMastermind}
            onSpendXpSolve={handleSpendXpTriviaSolve}
            onRequestAdPlacement={handleRequestAdPlacement}
            onAnswerRecorded={handleTriviaAnswerRecorded}
            onRoundCompleted={handleTriviaRoundCompleted}
            onDoubleXpClaimed={handleTriviaDoubleXpClaimed}
          />
            <footer className="mx-auto mb-6 w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm wv-text-muted">
              <span>On-Device Offline Ready</span>
              <a
                href="/privacy"
                data-testid="footer-privacy-link"
                onClick={(e) => {
                  e.preventDefault();
                  openPrivacyPolicy();
                }}
                className="font-semibold underline underline-offset-4 hover:opacity-85 cursor-pointer"
              >
                Privacy Policy
              </a>
            </footer>
          </>
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
              categoryUnlockAdsWatched={activeCategoryUnlockAdsWatched}
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
              categoryUnlockAdProgress={categoryProgress.unlockAdProgress}
              currentXp={currentSpendableXp}
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
              onSpendXpForHint={handleSpendXpForPuzzleHint}
              onTriggerWordClue={() => setClueSlotModalOpen(true)}
              onUnlockActiveClue={(slotType, index) => {
                const slot = { slotType, index };
                pendingClueSlotRef.current = slot;
                setPendingClueSlot(slot);
                setActiveAdPlacement('puzzle_clue');
              }}
              onSpendXpForClue={handleSpendXpForPuzzleClue}
              onTriggerSkipBoard={() => {
                if (crosswordBoard.status === 'playing') {
                  recordPuzzleBoardOutcome(crosswordBoard, false);
                }
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
              categoryUnlockAdsWatched={activeCategoryUnlockAdsWatched}
              onToggleCluePanel={() => setCluePanelOpen((prev) => !prev)}
              onWatchAdSaveStreak={() => setActiveAdPlacement('save_streak')}
              onWatchAdUnlockCategory={() => promptUnlockCategory(activeCategory)}
              onNewBoard={() => {
                if (crosswordBoard.status === 'playing') {
                  recordPuzzleBoardOutcome(crosswordBoard, false);
                }
                dealNextSessionBoard();
              }}
              onShareResult={() => void handleSharePuzzleProgress()}
              onInviteFriends={() => void handleInviteFriends()}
              onOpenSummary={() => setSummaryOpen(true)}
            />

            <EditorialGuideAndAdSlot
              isActivelyTyping={isActivelyTyping}
              onOpenPrivacyPolicy={openPrivacyPolicy}
            />
          </div>
        )}
      </main>

      {/* Non-blocking Floating Toast Banner */}
      <div
        className="fixed top-[62px] left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4"
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
          closePrivacyPolicy();
          setActiveTab(tab);
        }}
      />

      <CategoryExplorerModal
        open={categoryExplorerOpen}
        initialTab={categoryExplorerInitialTab}
        activeCategoryId={activeCategory.id}
        playsRemaining={categoryProgress.playsRemaining}
        unlockAdProgress={categoryProgress.unlockAdProgress}
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
        categoryUnlockAdsWatched={activeCategoryUnlockAdsWatched}
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
        openRequest={settingsOpenRequest}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onOpenPersonalize={() => {
          setSettingsOpen(false);
          setPersonalizationOpen(true);
        }}
        onOpenEditProfile={() => {
          setAuthModalError(null);
          setProfileModalMode(userAccount ? 'edit' : 'signin');
          setProfileModalOpen(true);
        }}
        onShareApp={() => void handleInviteFriends()}
        onResetTutorial={() => {
          handleUpdateSettings({ tutorialCompleted: false });
          setSettingsOpenRequest({
            section: 'about',
            aboutTab: 'rules',
            nonce: Date.now(),
          });
          showToast('Tutorial guide opened in Settings → About.');
        }}
        onOpenPrivacyPolicy={openPrivacyPolicy}
      />

      <WeeklyRankModal
        open={weeklyRankOpen}
        weeklyProgress={weeklyProgress}
        weeklyCountdown={weeklyCountdown}
        playerId={verifiedState.uid || userAccount?.id || leaderboardPlayerId}
        playerName={effectivePlayerName}
        userAccount={userAccount}
        playerPuzzlesSolved={stats.gamesWon}
        playerTriviaCorrect={weeklyProgress.triviaCorrect}
        playerStreak={stats.currentStreak}
        verifiedState={verifiedState}
        leaderboardCache={leaderboardCache}
        isOnline={isOnline}
        firebaseSignedIn={Boolean(firebaseUser)}
        firebaseUserEmail={firebaseUser?.email || null}
        isSyncingScore={isSyncingScore}
        syncStatusMessage={syncStatusMessage}
        authBusy={authBusy}
        authNotice={authNotice}
        lastClaimReceipt={lastClaimReceipt}
        onManualSyncScore={() => performVerifiedFlush(false)}
        onRefreshLeaderboardCache={async () => {
          try {
            const res = await fetchWeeklyLeaderboardSingleDoc(true);
            setLeaderboardCache(res.cache);
            showToast(
              res.fromCache
                ? 'Leaderboard is up to date.'
                : 'Leaderboard refreshed!',
              2400
            );
          } catch (err) {
            const rawMsg = err instanceof Error ? err.message : '';
            const isPermDenied = rawMsg.includes('Missing or insufficient permissions');
            setSyncStatusMessage(
              isPermDenied
                ? 'Unable to read cloud profile — verify your signed-in session.'
                : 'Unable to refresh cloud profile right now.'
            );
            showToast(
              isPermDenied
                ? 'Unable to read cloud profile.'
                : 'Unable to refresh leaderboard.',
              3000
            );
          }
        }}
        onSignOutFirebase={handleSignOutUnified}
        onSubmitRewardClaim={async (input: RewardClaimInput) => {
          const res = await submitVerifiedRewardClaim({
            state: verifiedStateRef.current,
            input,
          });
          verifiedStateRef.current = res.state;
          setVerifiedState(res.state);
          setLastClaimReceipt(res.receipt);
          showToast(`Claim ${res.receipt.claimCode} logged! Complete WhatsApp/Email verification.`, 4000);
        }}
        onUpdatePlayerName={(name) => {
          setPlayerProfile((prev) => ({
            ...prev,
            displayName: name,
          }));
          setVerifiedState((prev) => ({
            ...prev,
            displayName: name,
          }));
        }}
        onOpenEditProfile={() => {
          setWeeklyRankOpen(false);
          setAuthModalError(null);
          setProfileModalMode(userAccount ? 'edit' : 'signin');
          setProfileModalOpen(true);
        }}
        onOpenUnifiedAuth={() => {
          setWeeklyRankOpen(false);
          setAuthModalError(null);
          setProfileModalMode('signin');
          setProfileModalOpen(true);
        }}
        onShareProgress={(rank, activeCount, gradeLabel) =>
          handleShareLeaderboardProgress(rank, activeCount, gradeLabel, true)
        }
        onInviteFriends={(rank, activeCount) => handleInviteFriends(rank, activeCount, true)}
        onClose={() => setWeeklyRankOpen(false)}
      />

      <ProfileViewModal
        open={profileViewOpen}
        userAccount={userAccount}
        playerProfile={playerProfile}
        stats={stats}
        weeklyProgress={weeklyProgress}
        verifiedXp={verifiedState.verifiedRewardXp}
        weeklyRank={leaderboardSummary.rank}
        gradeLabel={weeklyGradeInfo.current.tierName}
        faithTraditionName={getFaithTradition(faithProgress.activeReligion).name}
        faithSessionsCount={faithProgress.faithTriviaCorrect}
        firebaseSignedIn={Boolean(firebaseUser)}
        firebaseEmail={firebaseUser?.email || null}
        isOnline={isOnline}
        isSyncing={isSyncingScore}
        lastSyncAtMs={verifiedState.lastSyncAtMs}
        syncStatusMessage={syncStatusMessage}
        onClose={() => setProfileViewOpen(false)}
        onEditProfile={() => {
          setProfileViewOpen(false);
          setAuthModalError(null);
          setProfileModalMode(userAccount ? 'edit' : 'signin');
          setProfileModalOpen(true);
        }}
        onSyncProgress={() => performVerifiedFlush(false)}
        onSignOut={handleSignOutUnified}
      />

      <ProfileAuthModal
        open={profileModalOpen}
        mode={profileModalMode}
        existingAccount={userAccount}
        authError={authModalError}
        authBusy={authBusy}
        onSaveAccount={async (acct, passwordPlain) => {
          setAuthModalError(null);
          setAuthBusy(true);
          try {
            if (isOnlineRef.current && acct.email && passwordPlain && profileModalMode !== 'edit') {
              const fbRes = await signInOrLinkEmail(acct.email, passwordPlain, true);
              if (fbRes.user) {
                await updateFirebaseDisplayName(acct.username);
              } else if (!firebaseUserRef.current) {
                await ensureAnonymousSession();
              }
            } else if (isOnlineRef.current && profileModalMode === 'edit') {
              await updateFirebaseDisplayName(acct.username);
            }
            await saveLocalUserAccount(acct);
            setUserAccount(acct);
            setPlayerProfile((prev) => ({
              ...prev,
              displayName: acct.username,
            }));
            setVerifiedState((prev) => {
              const next = { ...prev, displayName: acct.username };
              if (next.uid) {
                return reconcileVerifiedStateUid(next, next.uid, acct.username, next.authType);
              }
              return next;
            });
            await saveEmailProgressBundle(
              buildEmailProgressBundle({
                ...acct,
              })
            );
            setProfileModalOpen(false);
            showToast(
              profileModalMode === 'edit' ? 'Profile updated!' : `Welcome, @${acct.username}!`
            );
          } finally {
            setAuthBusy(false);
          }
        }}
        onSignInWithEmail={async (emailInput, passwordInput) => {
          setAuthModalError(null);
          setAuthBusy(true);
          try {
            const cleanEmail = normalizeEmailKey(emailInput);
            const bundle = await loadEmailProgressBundle(cleanEmail);
            const localOk = bundle?.account.passwordHash
              ? await verifyPasswordLocal(
                  passwordInput,
                  bundle.account.passwordSalt,
                  bundle.account.passwordHash
                )
              : false;

            let fbSuccess = false;
            let fbUserResult: User | null = null;
            let fbErrorMsg: string | undefined;
            if (isOnlineRef.current) {
              const fbRes = await signInOrLinkEmail(cleanEmail, passwordInput, false);
              if (fbRes.user) {
                fbSuccess = true;
                fbUserResult = fbRes.user;
              } else {
                fbErrorMsg = fbRes.error;
              }
            }

            if (bundle && (localOk || fbSuccess)) {
              applyEmailProgressBundle(bundle);
              await saveLocalUserAccount(bundle.account);
              setVerifiedState((prev) => ({
                ...prev,
                displayName: bundle.account.username,
              }));
              setProfileModalOpen(false);
              showToast(`Welcome back, @${bundle.account.username}!`);
              return null;
            }

            if (fbSuccess && fbUserResult) {
              const fallbackName =
                fbUserResult.displayName || cleanEmail.split('@')[0] || 'Player';
              const cleanHandle =
                fallbackName.replace(/[^a-zA-Z0-9._]/g, '_').slice(0, 24) || 'Player';
              const now = Date.now();
              const hydratedAccount: LocalUserAccount = {
                id: `user:${cleanHandle.toLowerCase()}`,
                realName: fallbackName,
                username: cleanHandle,
                email: cleanEmail,
                passwordHash: '',
                passwordSalt: '',
                avatarType: 'builtin',
                builtinAvatarId: 'crown',
                createdAt: now,
                updatedAt: now,
              };
              await saveLocalUserAccount(hydratedAccount);
              setUserAccount(hydratedAccount);
              setPlayerProfile((prev) => ({
                ...prev,
                displayName: hydratedAccount.username,
              }));
              setVerifiedState((prev) => ({
                ...prev,
                displayName: hydratedAccount.username,
              }));
              await saveEmailProgressBundle(buildEmailProgressBundle(hydratedAccount));
              setProfileModalOpen(false);
              showToast(`Welcome back, @${hydratedAccount.username}!`);
              return null;
            }

            if (bundle && !localOk) {
              return 'Incorrect email or password.';
            }
            return fbErrorMsg || 'No account found for that email. Tap Create Account to sign up.';
          } finally {
            setAuthBusy(false);
          }
        }}
        onContinueWithGoogle={async () => {
          setAuthModalError(null);
          setAuthBusy(true);
          try {
            const res = await signInOrLinkGoogle();
            if (res.redirectPending) {
              return null;
            }
            if (res.domainUnauthorized) {
              return 'Google sign-in is unavailable on this preview URL. Use Email or Continue as Guest.';
            }
            if (res.error || !res.user) {
              return res.error || 'Unable to sign in with Google.';
            }
            const googleEmail = normalizeEmailKey(res.user.email || '');
            const existingBundle = googleEmail
              ? await loadEmailProgressBundle(googleEmail)
              : null;
            if (existingBundle) {
              applyEmailProgressBundle(existingBundle);
              await saveLocalUserAccount(existingBundle.account);
              setProfileModalOpen(false);
              showToast(`Welcome back, @${existingBundle.account.username}!`);
              return null;
            }
            const display = res.user.displayName || googleEmail.split('@')[0] || 'Player';
            const handle = display.replace(/[^a-zA-Z0-9._]/g, '_').slice(0, 24) || 'Player';
            const now = Date.now();
            const googleAccount: LocalUserAccount = {
              id: `user:${handle.toLowerCase()}`,
              realName: display,
              username: handle,
              email: googleEmail,
              passwordHash: '',
              passwordSalt: '',
              avatarType: 'builtin',
              builtinAvatarId: 'crown',
              createdAt: now,
              updatedAt: now,
            };
            await saveLocalUserAccount(googleAccount);
            setUserAccount(googleAccount);
            setPlayerProfile((prev) => ({ ...prev, displayName: googleAccount.username }));
            setVerifiedState((prev) => ({ ...prev, displayName: googleAccount.username }));
            if (googleEmail) {
              await saveEmailProgressBundle(buildEmailProgressBundle(googleAccount));
            }
            setProfileModalOpen(false);
            showToast(`Signed in as @${googleAccount.username}!`);
            return null;
          } finally {
            setAuthBusy(false);
          }
        }}
        onContinueAsGuest={async () => {
          setAuthModalError(null);
          setProfileModalOpen(false);
          if (isOnlineRef.current) {
            void ensureAnonymousSession().catch(() => {});
          }
          showToast('Playing as Guest');
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

      <WordTriviaRowModal
        open={clueSlotModalOpen}
        board={crosswordBoard}
        activeRow={activeRow}
        activeCol={activeCol}
        typingDirection={typingDirection}
        currentXp={currentSpendableXp}
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
        onSpendXpSlot={(slotType, index) => {
          setClueSlotModalOpen(false);
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
          handleSpendXpForPuzzleClue(slotType, index);
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
        multiAdProgress={
          activeAdPlacement === 'unlock_category' && CATEGORY_UNLOCK_REQUIRED_ADS > 1
            ? {
                current: getCategoryUnlockAdProgress(
                  categoryProgress.unlockAdProgress,
                  (pendingCategoryForAd || activeCategory).id
                ),
                total: CATEGORY_UNLOCK_REQUIRED_ADS,
              }
            : null
        }
        xpCost={
          activeAdPlacement === 'hint'
            ? XP_COSTS.PUZZLE_HINT
            : activeAdPlacement === 'puzzle_clue' || activeAdPlacement === 'puzzle_word_trivia'
            ? XP_COSTS.PUZZLE_CLUE
            : activeAdPlacement === 'unlock_trivia_24h'
            ? XP_COSTS.TRIVIA_MASTERMIND_UNLOCK
            : undefined
        }
        currentXp={currentSpendableXp}
        xpActionLabel={
          activeAdPlacement === 'hint'
            ? 'Reveal Letter Hint Offline'
            : activeAdPlacement === 'puzzle_clue' || activeAdPlacement === 'puzzle_word_trivia'
            ? 'Unlock Word Clue Offline'
            : activeAdPlacement === 'unlock_trivia_24h'
            ? 'Unlock Mastermind Forever'
            : undefined
        }
        onSpendXp={
          activeAdPlacement === 'hint'
            ? () => {
                setActiveAdPlacement(null);
                handleSpendXpForPuzzleHint();
              }
            : activeAdPlacement === 'puzzle_clue' || activeAdPlacement === 'puzzle_word_trivia'
            ? () => {
                const chosen = pendingClueSlotRef.current || {
                  slotType: typingDirection === 'down' ? ('col' as const) : ('row' as const),
                  index: typingDirection === 'down' ? activeCol : activeRow,
                };
                setActiveAdPlacement(null);
                pendingClueSlotRef.current = null;
                setPendingClueSlot(null);
                handleSpendXpForPuzzleClue(chosen.slotType, chosen.index);
              }
            : activeAdPlacement === 'unlock_trivia_24h'
            ? () => {
                setActiveAdPlacement(null);
                handleSpendXpUnlockMastermind();
              }
            : undefined
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
