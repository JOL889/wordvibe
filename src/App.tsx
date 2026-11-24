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
import { PuzzleGrid } from './components/PuzzleGrid';
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
  type PersonalizedPuzzleData,
  type PlayerProfileState,
  type UserLocationData,
} from './game/playerProfileLogic';
import {
  resolveDailyEntertainmentSpotlight,
  type DailyEntertainmentSpotlight,
} from './game/entertainmentLogic';
import {
  applyBackspaceInDirection,
  applyLetterInDirection,
  applyStreakRecovery,
  BASE_ATTEMPTS,
  buildSmartHintClueText,
  canRecoverStreak,
  computeBoardFiftyFiftyElimination,
  computeSelectCellCol,
  consumeCategoryPlay,
  evaluateGuess,
  findNextUnsubmittedRow,
  formatCountdown,
  formatShareText,
  getCategoryRemainingPlays,
  getDailyPuzzleNumber,
  getDailyTargetWord,
  getHomeChallenges,
  getLocalDateKey,
  getProgressiveGuessNudge,
  getRandomSprintWord,
  getTimeUntilMidnightMs,
  getWeekStreakDays,
  grantCategoryPlays,
  isCategoryAccessible,
  isValidGuessWord,
  MAX_BONUS_ATTEMPTS,
  MAX_VERTICAL_HINT_BOXES,
  moveCursorDirection,
  pickNextCategoryWord,
  placeRewardedHintBox,
  rollProbabilityWordLength,
  updateStatsOnCompletion,
  type CursorDirection,
  type GameMode,
  type GridBoxHint,
  type HintUserContext,
  type HomeChallenge,
  type StatsData,
  type TypingDirection,
} from './game/puzzleLogic';
import {
  difficultyTierToPace,
  difficultyTierToTriviaLevel,
  resolveDocumentThemeState,
  type AppSettings,
} from './game/settingsLogic';
import {
  buildUserResearchDossier,
  gatherUserEnvironmentDetails,
} from './game/userResearchLogic';
import {
  TRIVIA_BONUS_UNLOCK_HOURS,
  type TriviaQuestion,
} from './game/triviaLogic';
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
import { buildCompletedWordSquare } from './game/wordSquareLogic';
import {
  buildCuratedWordFunFact,
  pickClueForRow,
  type PuzzleCluesBundle,
  type PuzzleWordTrivia,
} from './game/wordTriviaLogic';
import { rewardedAdService, type RewardPlacement } from './services/rewardedAdService';
import { soundService } from './services/soundService';
import {
  createFreshRound,
  getUsedCategoryWordsForDay,
  loadAppSettings,
  loadCategoryProgress,
  loadDailyRound,
  loadFaithStudyProgress,
  loadPlayerProfile,
  loadSprintRound,
  loadStats,
  loadTriviaState,
  loadWeeklyProgress,
  recordUsedCategoryWord,
  saveAppSettings,
  saveCategoryProgress,
  saveDailyRound,
  saveFaithStudyProgress,
  savePlayerProfile,
  saveSprintRound,
  saveStats,
  saveTriviaState,
  saveWeeklyProgress,
  type CategoryProgressState,
  type FaithStudyProgress,
  type PersistentTriviaState,
  type PuzzleRoundState,
} from './services/storageService';

const MAX_HINTS_PER_ROUND = 2;
const EMPTY_UNLOCKED_ROWS: number[] = [];

function loadExistingRound(
  mode: GameMode,
  length: WordLength,
  dateKey: string,
  categoryId: string
): PuzzleRoundState | null {
  return mode === 'daily'
    ? loadDailyRound(dateKey, length, categoryId)
    : loadSprintRound(length, categoryId);
}

function getInitialRoundState(
  mode: GameMode,
  length: WordLength,
  dateKey: string,
  initialProgress: CategoryProgressState,
  userContext?: HintUserContext
): { round: PuzzleRoundState; categoryId: string } {
  const cat = getCategoryById(initialProgress.activeCategoryId);
  const existing = loadExistingRound(mode, length, dateKey, cat.id);
  if (existing) {
    return { round: existing, categoryId: cat.id };
  }
  if (isCategoryAccessible(cat, initialProgress.playsRemaining)) {
    return {
      categoryId: cat.id,
      round: createFreshRound({
        mode,
        dateKey,
        length,
        categoryId: cat.id,
        target:
          mode === 'daily'
            ? getDailyTargetWord(dateKey, length, cat.id)
            : getRandomSprintWord(length, [], cat.id),
        playCharged: cat.isPremium,
        userContext,
      }),
    };
  }
  const fallbackId = 'general-classic';
  const fallbackSaved = loadExistingRound(mode, length, dateKey, fallbackId);
  return {
    categoryId: fallbackId,
    round:
      fallbackSaved ||
      createFreshRound({
        mode,
        dateKey,
        length,
        categoryId: fallbackId,
        target:
          mode === 'daily'
            ? getDailyTargetWord(dateKey, length, fallbackId)
            : getRandomSprintWord(length, [], fallbackId),
        userContext,
      }),
  };
}

function getInitialActiveRow(round: PuzzleRoundState): number {
  const firstOpen = round.rowGuesses.findIndex((g) => g === null);
  return firstOpen !== -1 ? firstOpen : 0;
}

function getInitialActiveCol(round: PuzzleRoundState, rowIdx: number): number {
  const draft = round.rowDrafts[rowIdx] || [];
  const firstEmpty = draft.findIndex((ch) => !ch);
  return firstEmpty !== -1 ? firstEmpty : round.length;
}

export default function App() {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
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
  const [mode, setMode] = useState<GameMode>('daily');
  const [length, setLength] = useState<WordLength>(5);

  const [initialBoot] = useState(() => {
    const bootDate = getLocalDateKey();
    const bootStats = loadStats();
    const env = gatherUserEnvironmentDetails();
    const loadedProfile = loadPlayerProfile();
    const autoLoc = !loadedProfile.locationOptOut
      ? loadedProfile.location || guessLocationFromTimezone(env.timezone)
      : loadedProfile.location;
    const bootProfile: PlayerProfileState = {
      ...loadedProfile,
      environmentSnapshot: env,
      locationEnabled: loadedProfile.locationOptOut ? false : true,
      location: autoLoc,
    };
    const bootDossier = buildUserResearchDossier(bootProfile, bootStats, []);
    const progress = loadCategoryProgress();
    const booted = getInitialRoundState('daily', 5, bootDate, progress, {
      cityToken: bootDossier.cityToken,
      timeOfDay: bootDossier.timeOfDay,
    });
    const cat = getCategoryById(booted.categoryId);
    // If booting into a fresh uncharged premium round that was accessible, deduct 1 play once
    const existing = loadExistingRound('daily', 5, bootDate, booted.categoryId);
    let nextProgress: CategoryProgressState = recordUsedCategoryWord(
      {
        ...progress,
        activeCategoryId: booted.categoryId,
      },
      bootDate,
      booted.categoryId,
      5,
      booted.round.target
    );
    if (!existing && cat.isPremium) {
      nextProgress = {
        ...nextProgress,
        playsRemaining: consumeCategoryPlay(cat, nextProgress.playsRemaining),
      };
    }
    return { progress: nextProgress, round: booted.round, profile: bootProfile, stats: bootStats };
  });

  const [categoryProgress, setCategoryProgress] = useState<CategoryProgressState>(
    initialBoot.progress
  );
  const [round, setRound] = useState<PuzzleRoundState>(initialBoot.round);
  const [activeRow, setActiveRow] = useState<number>(() => getInitialActiveRow(round));
  const [activeCol, setActiveCol] = useState<number>(() =>
    getInitialActiveCol(round, getInitialActiveRow(round))
  );
  const [typingDirection, setTypingDirection] = useState<TypingDirection>('across');
  const [autoLengthMode, setAutoLengthMode] = useState<boolean>(false);
  const [lastWonRow, setLastWonRow] = useState<number | null>(null);
  const [showWinBurst, setShowWinBurst] = useState<boolean>(false);

  const [stats, setStats] = useState<StatsData>(initialBoot.stats);
  const [preLossStats, setPreLossStats] = useState<StatsData | null>(null);
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
  const [localHeadlines, setLocalHeadlines] = useState<string[]>([]);
  const [loadingPersonalizedPuzzle, setLoadingPersonalizedPuzzle] = useState(false);
  const [achievementBanner, setAchievementBanner] = useState<AchievementDefinition | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [floatingRewards, setFloatingRewards] = useState<FloatingRewardItem[]>([]);
  const [lastPuzzleXpEarned, setLastPuzzleXpEarned] = useState(0);
  const [puzzleDoubleXpClaimed, setPuzzleDoubleXpClaimed] = useState(false);
  const [wordTriviaOpen, setWordTriviaOpen] = useState(() =>
    Boolean(initialBoot.round.wordTriviaUnlocked && initialBoot.round.wordTrivia)
  );
  const [wordTriviaRowModalOpen, setWordTriviaRowModalOpen] = useState(false);
  const [pendingWordTriviaRow, setPendingWordTriviaRow] = useState<number | null>(null);
  const [wordTriviaLoading, setWordTriviaLoading] = useState(false);
  const [wordTriviaError, setWordTriviaError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdown(getTimeUntilMidnightMs())
  );
  const [toast, setToast] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);

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
  const [adIntentForceSprint, setAdIntentForceSprint] = useState(false);
  const adRewardCallbackRef = useRef<(() => void) | null>(null);
  const pendingWordTriviaRowRef = useRef<number | null>(null);
  const wordTriviaPanelRef = useRef<HTMLElement | null>(null);
  const achievementTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const rewardIdRef = useRef<number>(1);

  const toastTimerRef = useRef<number | null>(null);
  const summaryTimerRef = useRef<number | null>(null);
  const cursorRef = useRef<{ row: number; col: number }>({ row: activeRow, col: activeCol });
  const draftsRef = useRef<string[][]>(round.rowDrafts);

  useEffect(() => {
    cursorRef.current = { row: activeRow, col: activeCol };
  }, [activeRow, activeCol]);

  useEffect(() => {
    draftsRef.current = round.rowDrafts;
  }, [round.rowDrafts]);

  const activeCategory = useMemo(
    () => getCategoryById(categoryProgress.activeCategoryId),
    [categoryProgress.activeCategoryId]
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

  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...patch }));
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

  // Sync theme, accent, animation intensity, sound, fanfare & haptics from AppSettings
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
    soundService.setEnabled(appSettings.soundEnabled);
    soundService.setVictoryFanfareEnabled(appSettings.victoryFanfareEnabled);
    soundService.setHapticsEnabled(appSettings.hapticsEnabled);
    saveAppSettings(appSettings);
  }, [appSettings]);

  // Sync body state attribute for accessibility/diagnostics
  useEffect(() => {
    document.body.dataset.state = round.status;
  }, [round.status]);

  // Persist round state on change
  useEffect(() => {
    if (round.mode === 'daily') {
      saveDailyRound(round);
    } else {
      saveSprintRound(round);
    }
  }, [round]);

  // Persist stats, category progress, weekly grading, faith study & trivia state
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

  // Silently auto-detect city/country on launch (GPS -> automatic IP fallback -> timezone fallback, never shows error on deny)
  useEffect(() => {
    if (!appSettings.autoDetectLocation || playerProfile.locationOptOut) return;
    if (playerProfile.location && playerProfile.location.source !== 'timezone') return;

    let cancelled = false;
    let settled = false;
    const tz =
      playerProfile.environmentSnapshot?.timezone ||
      (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');

    const resolveWithServer = (coords?: { lat: number; lon: number }) => {
      if (settled || cancelled) return;
      settled = true;
      fetch('/api/location/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          coords ? { lat: coords.lat, lon: coords.lon, timezone: tz } : { timezone: tz }
        ),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { location?: UserLocationData } | null) => {
          if (cancelled || !data?.location) return;
          const resolvedLoc = data.location;
          setPlayerProfile((prev) =>
            prev.locationOptOut
              ? prev
              : {
                  ...prev,
                  locationEnabled: true,
                  location: resolvedLoc,
                }
          );
          setRound((prev) => {
            if (
              prev.guesses.length > 0 ||
              prev.hintsUsed > 0 ||
              !prev.gridHintBoxes ||
              prev.gridHintBoxes.length === 0
            ) {
              return prev;
            }
            const cityToken = resolvedLoc.city?.trim().split(/\s+/)[0] || '';
            const updatedClue = buildSmartHintClueText({
              hint: prev.gridHintBoxes[0],
              previousClueWords: prev.defaultHintWordCount === 6 ? 5 : prev.defaultHintWordCount,
              userContext: {
                cityToken,
                timeOfDay: playerProfile.environmentSnapshot?.timeOfDay,
              },
            });
            return {
              ...prev,
              defaultHintText: updatedClue.text,
              defaultHintWordCount: updatedClue.wordCount,
            };
          });
        })
        .catch(() => {
          // Keep timezone-derived region silently offline
        });
    };

    const gpsTimeoutId = window.setTimeout(() => {
      resolveWithServer();
    }, 2200);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            window.clearTimeout(gpsTimeoutId);
            resolveWithServer({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          },
          () => {
            window.clearTimeout(gpsTimeoutId);
            resolveWithServer();
          },
          { timeout: 2200, maximumAge: 600_000 }
        );
      } catch {
        window.clearTimeout(gpsTimeoutId);
        resolveWithServer();
      }
    } else {
      window.clearTimeout(gpsTimeoutId);
      resolveWithServer();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(gpsTimeoutId);
    };
  }, [appSettings.autoDetectLocation, playerProfile.locationOptOut]);

  // Fetch live regional trending headlines when online & location enabled
  useEffect(() => {
    if (playerProfile.locationOptOut || !playerProfile.locationEnabled || !playerProfile.location) {
      setLocalHeadlines([]);
      return;
    }
    let cancelled = false;
    const cc = playerProfile.location.countryCode || 'US';
    const city = playerProfile.location.city || '';
    fetch(`/api/trending-local?cc=${encodeURIComponent(cc)}&city=${encodeURIComponent(city)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { headlines?: string[] } | null) => {
        if (!cancelled && data && Array.isArray(data.headlines)) {
          setLocalHeadlines(data.headlines.slice(0, 5));
        }
      })
      .catch(() => {
        // Stay gracefully offline
      });
    return () => {
      cancelled = true;
    };
  }, [
    playerProfile.locationOptOut,
    playerProfile.locationEnabled,
    playerProfile.location?.countryCode,
    playerProfile.location?.city,
  ]);

  const userDossier = useMemo(
    () => buildUserResearchDossier(playerProfile, stats, localHeadlines),
    [playerProfile, stats, localHeadlines]
  );

  // Preload AdMob rewarded ad on mount and register callbacks
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

  // Fetch today's live news & calendar-event entertainment spotlight (offline-safe fallback)
  useEffect(() => {
    let cancelled = false;
    setSpotlight(resolveDailyEntertainmentSpotlight(dateKey));

    fetch(`/api/entertainment-daily?date=${encodeURIComponent(dateKey)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DailyEntertainmentSpotlight | null) => {
        if (
          !cancelled &&
          data &&
          data.dateKey === dateKey &&
          typeof data.heroCategoryId === 'string' &&
          Array.isArray(data.featuredCategoryIds) &&
          data.featuredCategoryIds.length > 0
        ) {
          setSpotlight(data);
        }
      })
      .catch(() => {
        // Keep deterministic offline calendar spotlight
      });

    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const puzzleNumber = useMemo(() => getDailyPuzzleNumber(dateKey), [dateKey]);

  const gridHintBoxes = useMemo<GridBoxHint[]>(
    () => round.gridHintBoxes || [],
    [round.gridHintBoxes]
  );

  const boardAnimKey = useMemo(
    () => `${round.mode}-${round.categoryId}-${round.length}-${round.target}`,
    [round.categoryId, round.length, round.mode, round.target]
  );

  const isStreakRecoverable = useMemo(
    () => canRecoverStreak(stats, dateKey),
    [stats, dateKey]
  );

  const completedWordSquare = useMemo(() => {
    if (round.status === 'playing') return null;
    return buildCompletedWordSquare(round.target, round.length);
  }, [round.status, round.target, round.length]);

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

  const applyRoundTransition = useCallback((nextRound: PuzzleRoundState, nextMode: GameMode, nextLength: WordLength) => {
    setMode(nextMode);
    setLength(nextLength);
    setShakeRow(null);
    setRevealingRow(null);
    setLastWonRow(null);
    setShowWinBurst(false);
    setLastPuzzleXpEarned(0);
    setPuzzleDoubleXpClaimed(false);
    setWordTriviaError(null);
    setWordTriviaLoading(false);
    setWordTriviaRowModalOpen(false);
    setPendingWordTriviaRow(null);
    pendingWordTriviaRowRef.current = null;
    setWordTriviaOpen(Boolean(nextRound.wordTriviaUnlocked && nextRound.wordTrivia && nextRound.status === 'playing'));
    setPreLossStats(null);
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
    }
    draftsRef.current = nextRound.rowDrafts;
    setRound(nextRound);
    const nextRow = getInitialActiveRow(nextRound);
    const nextCol = getInitialActiveCol(nextRound, nextRow);
    cursorRef.current = { row: nextRow, col: nextCol };
    setActiveRow(nextRow);
    setActiveCol(nextCol);
  }, []);

  const promptUnlockCategory = useCallback((category: PuzzleCategory, forceSprint = false) => {
    setPendingCategoryForAd(category);
    setAdIntentForceSprint(forceSprint);
    setSummaryOpen(false);
    setActiveAdPlacement('unlock_category');
  }, []);

  const switchContext = useCallback(
    (
      nextMode: GameMode,
      nextLength: WordLength,
      nextCategory: PuzzleCategory,
      overrideDateKey?: string,
      forceNewWordOnRevisit = false
    ) => {
      const targetDate = overrideDateKey || dateKey;
      const saved = loadExistingRound(nextMode, nextLength, targetDate, nextCategory.id);
      const usedToday = getUsedCategoryWordsForDay(
        categoryProgress,
        targetDate,
        nextCategory.id,
        nextLength
      );

      // Rotate to a brand-new word whenever a category is explicitly chosen again today
      const shouldRotateWord =
        forceNewWordOnRevisit && (usedToday.length > 0 || saved !== null);

      if (saved && !shouldRotateWord) {
        setCategoryProgress((prev) =>
          recordUsedCategoryWord(
            {
              ...prev,
              activeCategoryId: nextCategory.id,
              exploredCategories: prev.exploredCategories.includes(nextCategory.id)
                ? prev.exploredCategories
                : [...prev.exploredCategories, nextCategory.id],
            },
            targetDate,
            nextCategory.id,
            nextLength,
            saved.target
          )
        );
        applyRoundTransition(saved, nextMode, nextLength);
        return true;
      }

      if (!isCategoryAccessible(nextCategory, categoryProgress.playsRemaining)) {
        promptUnlockCategory(nextCategory, false);
        return false;
      }

      const excludeWord = shouldRotateWord
        ? saved?.target || usedToday[usedToday.length - 1]
        : undefined;
      const nextTarget = pickNextCategoryWord({
        categoryId: nextCategory.id,
        length: nextLength,
        dateKey: targetDate,
        usedWordsToday: usedToday,
        excludeWord,
        mode: nextMode,
      });

      const fresh = createFreshRound({
        mode: nextMode,
        dateKey: targetDate,
        length: nextLength,
        categoryId: nextCategory.id,
        target: nextTarget,
        playCharged: nextCategory.isPremium,
        previousHintWordCount: round.defaultHintWordCount,
        userContext: {
          cityToken: userDossier.cityToken,
          timeOfDay: userDossier.timeOfDay,
        },
      });

      setCategoryProgress((prev) =>
        recordUsedCategoryWord(
          {
            ...prev,
            activeCategoryId: nextCategory.id,
            playsRemaining: consumeCategoryPlay(nextCategory, prev.playsRemaining),
            exploredCategories: prev.exploredCategories.includes(nextCategory.id)
              ? prev.exploredCategories
              : [...prev.exploredCategories, nextCategory.id],
          },
          targetDate,
          nextCategory.id,
          nextLength,
          nextTarget
        )
      );
      applyRoundTransition(fresh, nextMode, nextLength);
      return true;
    },
    [
      applyRoundTransition,
      categoryProgress,
      dateKey,
      promptUnlockCategory,
      round.defaultHintWordCount,
      userDossier.cityToken,
      userDossier.timeOfDay,
    ]
  );

  // Live countdown to next local midnight + Monday 00:00 UTC weekly reset rollover
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
        if (mode === 'daily') {
          const switched = switchContext('daily', length, activeCategory, latestKey, false);
          if (!switched) {
            switchContext('daily', length, getCategoryById('general-classic'), latestKey, false);
          }
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeCategory, dateKey, length, mode, switchContext]);

  const handleSelectCategory = useCallback(
    (category: PuzzleCategory) => {
      const remaining = getCategoryRemainingPlays(category, categoryProgress.playsRemaining);
      if (category.isPremium && remaining <= 0) {
        setActiveTab('puzzle');
        window.scrollTo({ top: 0, behavior: 'instant' });
        promptUnlockCategory(category, false);
        return;
      }
      const hadPriorToday =
        getUsedCategoryWordsForDay(categoryProgress, dateKey, category.id, length).length > 0 ||
        loadExistingRound(mode, length, dateKey, category.id) !== null;
      const switched = switchContext(mode, length, category, undefined, true);
      if (switched) {
        setCategoryExplorerOpen(false);
        setActiveTab('puzzle');
        window.scrollTo({ top: 0, behavior: 'instant' });
        showToast(hadPriorToday ? `Fresh word · ${category.name}` : `Topic: ${category.name}`);
      }
    },
    [
      categoryProgress,
      dateKey,
      length,
      mode,
      promptUnlockCategory,
      showToast,
      switchContext,
    ]
  );

  const startNewSprintWord = useCallback(
    (overrideAutoMode?: boolean) => {
      if (!isCategoryAccessible(activeCategory, categoryProgress.playsRemaining)) {
        promptUnlockCategory(activeCategory, true);
        return;
      }

      const useAuto = overrideAutoMode ?? autoLengthMode;
      const nextLength: WordLength = useAuto
        ? rollProbabilityWordLength({ previousLength: length })
        : length;

      if (appSettings.mixFaithWordsInDaily && nextLength === 5 && Math.random() < 0.35) {
        const faithWord = pickFaithPuzzleWord(faithProgress.activeReligion, 5, dateKey, [
          round.target,
        ]);
        const tradition = getFaithTradition(faithProgress.activeReligion);
        const freshFaith = createFreshRound({
          mode: 'sprint',
          dateKey,
          length: 5,
          categoryId: 'general-classic',
          target: faithWord.word,
          playCharged: false,
          isPersonalized: true,
          personalizedClue: faithWord.clue,
          personalizedReason: `Faith Study · ${tradition.name} (${tradition.sacredTextLabel})`,
          personalizedFunFact: faithWord.funFact,
          faithReligion: faithProgress.activeReligion,
          previousHintWordCount: round.defaultHintWordCount,
          userContext: {
            cityToken: userDossier.cityToken,
            timeOfDay: userDossier.timeOfDay,
          },
        });
        setSummaryOpen(false);
        applyRoundTransition(freshFaith, 'sprint', 5);
        return;
      }

      const usedToday = getUsedCategoryWordsForDay(
        categoryProgress,
        dateKey,
        activeCategory.id,
        nextLength
      );
      const nextTarget = pickNextCategoryWord({
        categoryId: activeCategory.id,
        length: nextLength,
        dateKey,
        usedWordsToday: usedToday,
        excludeWord: round.target,
        mode: 'sprint',
      });
      const fresh = createFreshRound({
        mode: 'sprint',
        dateKey,
        length: nextLength,
        categoryId: activeCategory.id,
        target: nextTarget,
        playCharged: activeCategory.isPremium,
        previousHintWordCount: round.defaultHintWordCount,
        userContext: {
          cityToken: userDossier.cityToken,
          timeOfDay: userDossier.timeOfDay,
        },
      });

      setCategoryProgress((prev) =>
        recordUsedCategoryWord(
          {
            ...prev,
            playsRemaining: consumeCategoryPlay(activeCategory, prev.playsRemaining),
            exploredCategories: prev.exploredCategories.includes(activeCategory.id)
              ? prev.exploredCategories
              : [...prev.exploredCategories, activeCategory.id],
          },
          dateKey,
          activeCategory.id,
          nextLength,
          nextTarget
        )
      );

      setSummaryOpen(false);
      applyRoundTransition(fresh, 'sprint', nextLength);
    },
    [
      activeCategory,
      appSettings.mixFaithWordsInDaily,
      applyRoundTransition,
      autoLengthMode,
      categoryProgress,
      dateKey,
      faithProgress.activeReligion,
      length,
      promptUnlockCategory,
      round.defaultHintWordCount,
      round.target,
      userDossier.cityToken,
      userDossier.timeOfDay,
    ]
  );

  const triggerRowShake = useCallback((rowIdx: number) => {
    setShakeRow(rowIdx);
    soundService.playInvalidShake();
    window.setTimeout(() => {
      setShakeRow((prev) => (prev === rowIdx ? null : prev));
    }, 400);
  }, []);

  const handleSelectCell = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (round.status !== 'playing') return;
      if (rowIdx < 0 || rowIdx >= round.maxAttempts) return;
      if (round.rowGuesses[rowIdx] !== null) return;

      const rowDraft = draftsRef.current[rowIdx] || [];
      const nextCol = computeSelectCellCol(rowDraft, colIdx);
      cursorRef.current = { row: rowIdx, col: nextCol };
      setActiveRow(rowIdx);
      setActiveCol(nextCol);
    },
    [round.maxAttempts, round.rowGuesses, round.status]
  );

  const roundCategory = useMemo(() => getCategoryById(round.categoryId), [round.categoryId]);

  const handleSubmitGuess = useCallback(() => {
    if (round.status !== 'playing') return;
    let rowIdx = cursorRef.current.row;
    // In Down typing mode (or if cursor stopped at bottom edge), find the intended open row
    if (rowIdx >= round.maxAttempts || round.rowGuesses[rowIdx] !== null) {
      const completeOpenRow = round.rowDrafts.findIndex(
        (d, idx) => round.rowGuesses[idx] === null && d.every((ch) => ch !== '')
      );
      if (completeOpenRow !== -1) {
        rowIdx = completeOpenRow;
      } else {
        const firstOpenRow = round.rowGuesses.findIndex((g) => g === null);
        if (firstOpenRow === -1) return;
        rowIdx = firstOpenRow;
      }
    }

    const draftRow = draftsRef.current[rowIdx] || [];
    const word = draftRow.join('');
    if (draftRow.some((ch) => !ch) || word.length < round.length) {
      triggerRowShake(rowIdx);
      showToast(`Enter all ${round.length} letters`);
      return;
    }

    if (!isValidGuessWord(word, round.length)) {
      triggerRowShake(rowIdx);
      showToast('Word not in dictionary');
      return;
    }

    const nextRowGuesses = [...round.rowGuesses];
    nextRowGuesses[rowIdx] = word;
    const nextGuesses = [...round.guesses, word];

    const evalStates = evaluateGuess(word, round.target);
    const won = evalStates.every((s) => s === 'correct');
    const allRowsFilled = nextRowGuesses.every((g) => g !== null);
    const lost = !won && allRowsFilled;
    const nextStatus = won ? 'won' : lost ? 'lost' : 'playing';

    evalStates.forEach((st, idx) => {
      soundService.playTileFlip(idx, st === 'correct');
    });

    setRevealingRow(rowIdx);
    window.setTimeout(() => {
      setRevealingRow((prev) => (prev === rowIdx ? null : prev));
    }, round.length * 90 + 450);

    if (won) {
      setLastWonRow(rowIdx);
      setShowWinBurst(true);
      window.setTimeout(() => setShowWinBurst(false), 1200);
      window.setTimeout(() => soundService.playWinFanfare(), round.length * 85 + 180);
    } else if (lost) {
      window.setTimeout(() => soundService.playLossTone(), round.length * 85 + 180);
    }

    const nextProgressiveNudge =
      nextStatus === 'playing'
        ? getProgressiveGuessNudge({
            guess: word,
            target: round.target,
            attemptIndex: nextGuesses.length,
            categoryName: roundCategory.name,
          })
        : undefined;

    if (nextStatus === 'playing') {
      const nextOpenRow = findNextUnsubmittedRow(nextRowGuesses, rowIdx);
      if (nextOpenRow !== null) {
        const nextOpenCol = getInitialActiveCol(
          { ...round, rowDrafts: draftsRef.current },
          nextOpenRow
        );
        cursorRef.current = { row: nextOpenRow, col: nextOpenCol };
        setActiveRow(nextOpenRow);
        setActiveCol(nextOpenCol);
      } else {
        // Reached the bottom row without wrapping back to the top
        cursorRef.current = { row: round.maxAttempts, col: 0 };
        setActiveRow(round.maxAttempts);
        setActiveCol(0);
      }
    }

    let nextStatsRecorded = round.statsRecorded;
    if (won) {
      triggerConfetti();
      if (round.extraAttemptGranted && preLossStats) {
        const updatedFromPreLoss = updateStatsOnCompletion(preLossStats, {
          mode: round.mode,
          won: true,
          attemptsUsed: nextGuesses.length,
          todayKey: dateKey,
          length: round.length,
        });
        setStats(updatedFromPreLoss);
        setPreLossStats(null);
      } else if (!round.statsRecorded) {
        setStats((prev) =>
          updateStatsOnCompletion(prev, {
            mode: round.mode,
            won: true,
            attemptsUsed: nextGuesses.length,
            todayKey: dateKey,
            length: round.length,
          })
        );
      }
      if (!round.statsRecorded || round.extraAttemptGranted) {
        setPlayerProfile((prev) =>
          recordPuzzleStudySignal(prev, {
            categoryId: round.categoryId,
            won: true,
            guessesUsed: nextGuesses.length,
            length: round.length,
          })
        );
        const xpDelta = recordWeeklyEvent({
          type: 'puzzle_completed',
          won: true,
          mode: round.mode,
          attemptsUsed: nextGuesses.length,
          wordLength: round.length,
          categoryId: round.categoryId,
        });
        const earned = xpDelta || 85;
        setLastPuzzleXpEarned(earned);
        setPuzzleDoubleXpClaimed(false);
        pushFloatingReward(`+${earned} XP`, 'xp');
        if (round.mode === 'daily') {
          pushFloatingReward('+Streak Safe', 'streak');
        }
        setCategoryProgress((prev) => ({
          ...prev,
          solvedByCategory: {
            ...prev.solvedByCategory,
            [round.categoryId]: (prev.solvedByCategory[round.categoryId] || 0) + 1,
          },
        }));
      }
      nextStatsRecorded = true;
    } else if (lost && !round.statsRecorded) {
      setPlayerProfile((prev) =>
        recordPuzzleStudySignal(prev, {
          categoryId: round.categoryId,
          won: false,
          guessesUsed: nextGuesses.length,
          length: round.length,
        })
      );
      recordWeeklyEvent({
        type: 'puzzle_completed',
        won: false,
        mode: round.mode,
        attemptsUsed: nextGuesses.length,
        wordLength: round.length,
        categoryId: round.categoryId,
      });
      setStats((prev) => {
        setPreLossStats(prev);
        return updateStatsOnCompletion(prev, {
          mode: round.mode,
          won: false,
          attemptsUsed: nextGuesses.length,
          todayKey: dateKey,
          length: round.length,
        });
      });
      nextStatsRecorded = true;
    }

    setRound((prev) => ({
      ...prev,
      guesses: nextGuesses,
      rowGuesses: nextRowGuesses,
      status: nextStatus,
      statsRecorded: nextStatsRecorded,
      progressiveNudge: nextProgressiveNudge,
    }));

    if (won || lost) {
      if (summaryTimerRef.current) window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = window.setTimeout(() => {
        setSummaryOpen(true);
      }, round.length * 85 + 520);
    }
  }, [
    dateKey,
    preLossStats,
    pushFloatingReward,
    recordWeeklyEvent,
    round,
    roundCategory.name,
    showToast,
    triggerConfetti,
    triggerRowShake,
  ]);

  const handleKeyInput = useCallback(
    (key: string) => {
      if (round.status !== 'playing') return;
      if (
        activeAdPlacement ||
        wordTriviaRowModalOpen ||
        summaryOpen ||
        helpOpen ||
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen
      ) {
        return;
      }

      const { row: currentRow, col: currentCol } = cursorRef.current;
      const currentDrafts = draftsRef.current;
      const upper = key.toUpperCase();

      if (upper === 'ENTER') {
        handleSubmitGuess();
        return;
      }

      if (upper === 'BACKSPACE') {
        const res = applyBackspaceInDirection(
          currentDrafts,
          round.rowGuesses,
          currentRow,
          currentCol,
          round.length,
          typingDirection
        );
        if (res.drafts !== currentDrafts) {
          draftsRef.current = res.drafts;
          soundService.playBackspace();
          setRound((prev) => ({ ...prev, rowDrafts: res.drafts }));
        }
        cursorRef.current = { row: res.nextRow, col: res.nextCol };
        setActiveRow(res.nextRow);
        setActiveCol(res.nextCol);
        return;
      }

      if (currentRow >= round.maxAttempts || round.rowGuesses[currentRow] !== null) {
        if (/^[A-Z]$/.test(upper) && round.rowGuesses.some((g) => g === null)) {
          showToast('Stopped at bottom row — tap any open box to type');
        }
        return;
      }

      if (/^[A-Z]$/.test(upper)) {
        const res = applyLetterInDirection(
          currentDrafts,
          round.rowGuesses,
          currentRow,
          currentCol,
          upper,
          round.length,
          typingDirection
        );
        if (res.drafts !== currentDrafts) {
          draftsRef.current = res.drafts;
          soundService.playKeyTap();
          setRound((prev) => ({ ...prev, rowDrafts: res.drafts }));
        }
        cursorRef.current = { row: res.nextRow, col: res.nextCol };
        setActiveRow(res.nextRow);
        setActiveCol(res.nextCol);
      }
    },
    [
      activeAdPlacement,
      categoryExplorerOpen,
      handleSubmitGuess,
      helpOpen,
      personalizationOpen,
      round.length,
      round.maxAttempts,
      round.rowGuesses,
      round.status,
      settingsOpen,
      showToast,
      summaryOpen,
      typingDirection,
      weeklyRankOpen,
      wordTriviaRowModalOpen,
    ]
  );

  const handleMoveCursor = useCallback(
    (dir: CursorDirection) => {
      if (round.status !== 'playing') return;
      const next = moveCursorDirection(
        round.rowGuesses,
        cursorRef.current.row,
        cursorRef.current.col,
        dir,
        round.length
      );
      cursorRef.current = next;
      setActiveRow(next.row);
      setActiveCol(next.col);
    },
    [round.length, round.rowGuesses, round.status]
  );

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
        setWordTriviaRowModalOpen(false);
        return;
      }
      if (
        targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.isContentEditable)
      ) {
        return;
      }
      if (activeTab !== 'puzzle') return;
      if (
        activeAdPlacement ||
        wordTriviaRowModalOpen ||
        summaryOpen ||
        helpOpen ||
        categoryExplorerOpen ||
        weeklyRankOpen ||
        personalizationOpen ||
        settingsOpen
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (targetEl?.tagName === 'BUTTON') return;
        e.preventDefault();
        handleKeyInput('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyInput('BACKSPACE');
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        if (round.status !== 'playing') return;
        e.preventDefault();
        const dirMap: Record<string, CursorDirection> = {
          ArrowLeft: 'left',
          ArrowRight: 'right',
          ArrowUp: 'up',
          ArrowDown: 'down',
        };
        handleMoveCursor(dirMap[e.key]);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyInput(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeAdPlacement,
    activeTab,
    categoryExplorerOpen,
    handleKeyInput,
    handleMoveCursor,
    helpOpen,
    personalizationOpen,
    round.status,
    settingsOpen,
    summaryOpen,
    weeklyRankOpen,
    wordTriviaRowModalOpen,
  ]);

  const handleShareResult = useCallback(async () => {
    const shareText = formatShareText({
      mode: round.mode,
      puzzleNumber,
      length: round.length,
      guesses: round.guesses,
      target: round.target,
      won: round.status === 'won',
      maxAttempts: round.maxAttempts,
      streak: stats.currentStreak,
      categoryId: round.categoryId,
    });

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        throw new Error('Clipboard unavailable');
      }
      showToast('Result copied to clipboard!');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Result copied to clipboard!');
      } catch {
        showToast('Unable to access clipboard');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [puzzleNumber, round, showToast, stats.currentStreak]);

  const fetchPuzzleWordTrivia = useCallback(
    async (
      targetWord: string,
      categoryName: string,
      rowNum: number,
      existingBundle?: PuzzleCluesBundle | null
    ) => {
      setWordTriviaError(null);
      setWordTriviaOpen(true);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          wordTriviaPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }

      if (existingBundle) {
        const clueForRow = pickClueForRow(existingBundle, rowNum);
        setWordTriviaLoading(false);
        setRound((prev) =>
          prev.target === targetWord
            ? {
                ...prev,
                wordTriviaUnlocked: true,
                wordTriviaRow: rowNum,
                unlockedTriviaRows: Array.from(
                  new Set([...(prev.unlockedTriviaRows || []), rowNum])
                ),
                wordTrivia: clueForRow,
                wordTriviaBundle: existingBundle,
              }
            : prev
        );
        return;
      }

      setWordTriviaLoading(true);
      try {
        const res = await fetch('/api/puzzle-clues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetWord,
            categoryName,
            rowNumber: rowNum,
            maxRows: 7,
            location:
              !playerProfile.locationOptOut && playerProfile.locationEnabled
                ? playerProfile.location
                : null,
            interests: playerProfile.selectedInterests,
            playerSummary: userDossier.promptDossier,
          }),
        });
        const payload = (await res.json()) as {
          bundle?: PuzzleCluesBundle;
          trivia?: PuzzleWordTrivia;
          error?: string;
        };
        if (!res.ok || (!payload.bundle && !payload.trivia)) {
          throw new Error(
            payload.error || 'Could not generate AI word trivia right now. Please retry.'
          );
        }
        const resolvedTrivia =
          payload.bundle
            ? pickClueForRow(payload.bundle, rowNum)
            : payload.trivia!;
        setRound((prev) =>
          prev.target === targetWord
            ? {
                ...prev,
                wordTriviaUnlocked: true,
                wordTriviaRow: rowNum,
                unlockedTriviaRows: Array.from(
                  new Set([...(prev.unlockedTriviaRows || []), rowNum])
                ),
                wordTrivia: resolvedTrivia,
                wordTriviaBundle: payload.bundle || prev.wordTriviaBundle || null,
              }
            : prev
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach AI word trivia service right now.';
        setWordTriviaError(msg);
      } finally {
        setWordTriviaLoading(false);
      }
    },
    [
      playerProfile.location,
      playerProfile.locationEnabled,
      playerProfile.locationOptOut,
      playerProfile.selectedInterests,
      userDossier.promptDossier,
    ]
  );

  const handleRewardEarned = useCallback(
    (placement: RewardPlacement) => {
      setActiveAdPlacement(null);
      soundService.playHintChime();

      if (placement === 'unlock_category') {
        const targetCat = pendingCategoryForAd || activeCategory;
        const forceSprint = adIntentForceSprint;
        setPendingCategoryForAd(null);
        setAdIntentForceSprint(false);
        setCategoryExplorerOpen(false);

        const grantedPlays = grantCategoryPlays(
          categoryProgress.playsRemaining,
          targetCat.id,
          PREMIUM_UNLOCK_PLAYS
        );

        const usedToday = getUsedCategoryWordsForDay(
          categoryProgress,
          dateKey,
          targetCat.id,
          length
        );
        const existingSaved = forceSprint
          ? null
          : loadExistingRound(mode, length, dateKey, targetCat.id);

        if (existingSaved && existingSaved.status === 'playing' && usedToday.length === 0) {
          setCategoryProgress((prev) =>
            recordUsedCategoryWord(
              {
                ...prev,
                activeCategoryId: targetCat.id,
                playsRemaining: grantedPlays,
                exploredCategories: prev.exploredCategories.includes(targetCat.id)
                  ? prev.exploredCategories
                  : [...prev.exploredCategories, targetCat.id],
              },
              dateKey,
              targetCat.id,
              length,
              existingSaved.target
            )
          );
          applyRoundTransition(existingSaved, mode, length);
          showToast(`${targetCat.name} unlocked! ${PREMIUM_UNLOCK_PLAYS} plays ready.`, 3200);
          return;
        }

        const nextMode: GameMode =
          forceSprint || (existingSaved && existingSaved.status !== 'playing') ? 'sprint' : mode;
        const nextTarget = pickNextCategoryWord({
          categoryId: targetCat.id,
          length,
          dateKey,
          usedWordsToday: usedToday,
          excludeWord: existingSaved?.target || round.target,
          mode: nextMode,
        });

        const fresh = createFreshRound({
          mode: nextMode,
          dateKey,
          length,
          categoryId: targetCat.id,
          target: nextTarget,
          playCharged: targetCat.isPremium,
          previousHintWordCount: round.defaultHintWordCount,
          userContext: {
            cityToken: userDossier.cityToken,
            timeOfDay: userDossier.timeOfDay,
          },
        });

        const afterConsume = consumeCategoryPlay(targetCat, grantedPlays);
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
            length,
            nextTarget
          )
        );

        applyRoundTransition(fresh, nextMode, length);
        const left = getCategoryRemainingPlays(targetCat, afterConsume);
        showToast(`${targetCat.name} unlocked! ${left} plays remaining.`, 3400);
        return;
      }

      if (placement === 'hint') {
        const currentBoxes = round.gridHintBoxes || [];
        const hintRes = placeRewardedHintBox({
          existingHints: currentBoxes,
          guesses: round.guesses,
          rowGuesses: round.rowGuesses,
          target: round.target,
          preferredRow: activeRow,
          maxAttempts: round.maxAttempts,
        });
        setRound((prev) => ({
          ...prev,
          hintsUsed: prev.hintsUsed + 1,
          gridHintBoxes: hintRes.hint
            ? [...(prev.gridHintBoxes || []), hintRes.hint]
            : prev.gridHintBoxes,
          revealedPositions: hintRes.hint
            ? Array.from(new Set([...prev.revealedPositions, hintRes.hint.col]))
            : prev.revealedPositions,
          eliminatedLetters:
            hintRes.eliminatedLetters && hintRes.eliminatedLetters.length > 0
              ? [...prev.eliminatedLetters, ...hintRes.eliminatedLetters]
              : prev.eliminatedLetters,
        }));
        showToast(hintRes.message, 3600);
        return;
      }

      if (placement === 'puzzle_word_trivia') {
        const chosenRow =
          pendingWordTriviaRowRef.current ??
          round.wordTriviaRow ??
          Math.min(activeRow + 1, round.maxAttempts);
        pendingWordTriviaRowRef.current = null;
        setPendingWordTriviaRow(null);

        setRound((prev) => ({
          ...prev,
          wordTriviaUnlocked: true,
          wordTriviaRow: chosenRow,
          unlockedTriviaRows: Array.from(
            new Set([...(prev.unlockedTriviaRows || []), chosenRow])
          ),
        }));
        setWordTriviaOpen(true);
        void fetchPuzzleWordTrivia(
          round.target,
          roundCategory.name,
          chosenRow,
          round.wordTriviaBundle
        );
        return;
      }

      if (placement === 'extra_attempt') {
        const bonusTotal = BASE_ATTEMPTS + MAX_BONUS_ATTEMPTS;
        setSummaryOpen(false);
        setRound((prev) => {
          if (prev.extraAttemptGranted) return prev;
          const nextRowGuesses = [...prev.rowGuesses];
          while (nextRowGuesses.length < bonusTotal) nextRowGuesses.push(null);
          const nextRowDrafts = [...prev.rowDrafts];
          while (nextRowDrafts.length < bonusTotal) {
            nextRowDrafts.push(new Array<string>(prev.length).fill(''));
          }
          return {
            ...prev,
            status: 'playing',
            maxAttempts: bonusTotal,
            rowGuesses: nextRowGuesses,
            rowDrafts: nextRowDrafts,
            extraAttemptGranted: true,
          };
        });
        cursorRef.current = { row: BASE_ATTEMPTS, col: 0 };
        setActiveRow(BASE_ATTEMPTS);
        setActiveCol(0);
        showToast('+1 Bonus row unlocked! Make your final guess.', 3200);
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
      activeRow,
      adIntentForceSprint,
      applyRoundTransition,
      categoryProgress,
      dateKey,
      fetchPuzzleWordTrivia,
      lastPuzzleXpEarned,
      length,
      mode,
      pendingCategoryForAd,
      puzzleDoubleXpClaimed,
      recordWeeklyEvent,
      round.defaultHintWordCount,
      round.gridHintBoxes,
      round.guesses,
      round.maxAttempts,
      round.rowGuesses,
      round.target,
      round.wordTriviaRow,
      roundCategory.name,
      showToast,
      userDossier.cityToken,
      userDossier.timeOfDay,
    ]
  );

  const activeDraftHasLetters = useMemo(
    () => (round.rowDrafts[activeRow] || []).some((ch) => ch !== ''),
    [activeRow, round.rowDrafts]
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
      switchContext(challenge.targetMode, challenge.targetLength, activeCategory);
    },
    [activeCategory, switchContext]
  );

  const handlePlayEntertainmentCategory = useCallback(
    (categoryId: string) => {
      const cat = getCategoryById(categoryId);
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      const remaining = getCategoryRemainingPlays(cat, categoryProgress.playsRemaining);
      if (cat.isPremium && remaining <= 0) {
        promptUnlockCategory(cat, false);
        return;
      }
      const hadPriorToday =
        getUsedCategoryWordsForDay(categoryProgress, dateKey, cat.id, length).length > 0 ||
        loadExistingRound(mode, length, dateKey, cat.id) !== null;
      const switched = switchContext(mode, length, cat, undefined, true);
      if (switched) {
        showToast(
          hadPriorToday ? `Fresh word · ${cat.name}` : `Entertainment Topic: ${cat.name}`
        );
      }
    },
    [categoryProgress, dateKey, length, mode, promptUnlockCategory, showToast, switchContext]
  );

  const handleBrowseEntertainment = useCallback(() => {
    setCategoryExplorerInitialTab('Entertainment');
    setCategoryExplorerOpen(true);
  }, []);

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

  const handleRequestAdPlacement = useCallback(
    (placement: RewardPlacement, onGranted: () => void) => {
      if (rewardedAdService.getDailyAdsRemaining() <= 0) {
        showToast('Daily rewarded ad limit reached — try again tomorrow.', 3000);
        return;
      }
      adRewardCallbackRef.current = onGranted;
      setActiveAdPlacement(placement);
    },
    [showToast]
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
          ? [...prev.recentQuestions, params.questionText].slice(-30)
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
      if (params.correctCount >= 4) {
        triggerConfetti();
        pushFloatingReward(`+${params.roundXpEarned || 60} XP`, 'xp');
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

  const handlePuzzleFiftyFifty = useCallback(() => {
    if (round.status !== 'playing') return;
    if (round.fiftyFiftyUsed) {
      showToast('50/50 already used on this board');
      return;
    }
    const eliminated = computeBoardFiftyFiftyElimination(
      round.guesses,
      round.target,
      round.eliminatedLetters,
      5
    );
    if (eliminated.length === 0) {
      showToast('No remaining decoy letters to clear');
      return;
    }
    soundService.playFiftyFiftyWhoosh();
    setRound((prev) => ({
      ...prev,
      fiftyFiftyUsed: true,
      eliminatedLetters: Array.from(new Set([...prev.eliminatedLetters, ...eliminated])),
    }));
    showToast(`50/50 cleared: ${eliminated.join(', ')}`, 2800);
  }, [
    round.eliminatedLetters,
    round.fiftyFiftyUsed,
    round.guesses,
    round.status,
    round.target,
    showToast,
  ]);

  const handleSkipPuzzleWord = useCallback(() => {
    if (round.status !== 'playing') return;
    soundService.playTapPop();
    if (round.mode === 'sprint') {
      startNewSprintWord();
      showToast('Swapped to a fresh word!');
      return;
    }
    const usedToday = getUsedCategoryWordsForDay(
      categoryProgress,
      dateKey,
      activeCategory.id,
      round.length
    );
    const nextTarget = pickNextCategoryWord({
      categoryId: activeCategory.id,
      length: round.length,
      dateKey,
      usedWordsToday: usedToday,
      excludeWord: round.target,
      mode: 'daily',
    });
    const fresh = createFreshRound({
      mode: 'daily',
      dateKey,
      length: round.length,
      categoryId: activeCategory.id,
      target: nextTarget,
      playCharged: false,
      previousHintWordCount: round.defaultHintWordCount,
      userContext: {
        cityToken: userDossier.cityToken,
        timeOfDay: userDossier.timeOfDay,
      },
    });
    setCategoryProgress((prev) =>
      recordUsedCategoryWord(prev, dateKey, activeCategory.id, round.length, nextTarget)
    );
    applyRoundTransition(fresh, 'daily', round.length);
    showToast('Skipped to backup word!');
  }, [
    activeCategory.id,
    applyRoundTransition,
    categoryProgress,
    dateKey,
    round.defaultHintWordCount,
    round.length,
    round.mode,
    round.status,
    round.target,
    showToast,
    startNewSprintWord,
    userDossier.cityToken,
    userDossier.timeOfDay,
  ]);

  const handleChangeFaithReligion = useCallback((religion: ReligionId) => {
    setFaithProgress((prev) => ({ ...prev, activeReligion: religion }));
    setAppSettings((prev) => ({ ...prev, defaultReligion: religion }));
  }, []);

  const handlePlayFaithPuzzle = useCallback(
    (religion: ReligionId) => {
      const tradition = getFaithTradition(religion);
      const faithWord = pickFaithPuzzleWord(religion, 5, dateKey, [round.target]);
      const fresh = createFreshRound({
        mode: 'sprint',
        dateKey,
        length: 5,
        categoryId: 'general-classic',
        target: faithWord.word,
        playCharged: false,
        isPersonalized: true,
        personalizedClue: faithWord.clue,
        personalizedReason: `Faith Study · ${tradition.name} (${tradition.sacredTextLabel})`,
        personalizedFunFact: faithWord.funFact,
        faithReligion: religion,
        previousHintWordCount: round.defaultHintWordCount,
        userContext: {
          cityToken: userDossier.cityToken,
          timeOfDay: userDossier.timeOfDay,
        },
      });
      setSummaryOpen(false);
      applyRoundTransition(fresh, 'sprint', 5);
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      showToast(`${tradition.name} word ready!`, 2400);
    },
    [
      applyRoundTransition,
      dateKey,
      round.defaultHintWordCount,
      round.target,
      showToast,
      userDossier.cityToken,
      userDossier.timeOfDay,
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
        difficulty: 'medium',
        streakAfter: correct ? 1 : 0,
        xpAwarded: correct ? 25 : 5,
        categoryId: `faith:${religion}`,
      });
    },
    [recordWeeklyEvent]
  );

  const handleFaithSessionCompleted = useCallback(
    (params: { religion: ReligionId; correctCount: number; totalCount: number }) => {
      setFaithProgress((prev) => {
        const existing = prev.completedSessionsByDate[dateKey] || [];
        const updated = existing.includes(params.religion)
          ? existing
          : [...existing, params.religion];
        return {
          ...prev,
          completedSessionsByDate: {
            ...prev.completedSessionsByDate,
            [dateKey]: updated,
          },
          totalSessionsCompleted: prev.totalSessionsCompleted + 1,
        };
      });
      triggerConfetti();
      pushFloatingReward('+15 Coins · +90 XP', 'coins');
      recordWeeklyEvent({
        type: 'trivia_round_completed',
        correctCount: params.correctCount,
        totalCount: params.totalCount,
        categoryId: `faith:${params.religion}`,
      });
      setWeeklyProgress((prev) => ({
        ...prev,
        bonusCoins: prev.bonusCoins + 15,
      }));
    },
    [dateKey, pushFloatingReward, recordWeeklyEvent, triggerConfetti]
  );

  const solveFunFact = useMemo(() => {
    if (round.status === 'playing') return undefined;
    return (
      round.personalizedFunFact ||
      round.wordTriviaBundle?.funFact ||
      round.wordTrivia?.funFact ||
      buildCuratedWordFunFact(round.target, roundCategory.name)
    );
  }, [
    round.personalizedFunFact,
    round.status,
    round.target,
    round.wordTrivia?.funFact,
    round.wordTriviaBundle?.funFact,
    roundCategory.name,
  ]);

  const handlePlayPersonalizedPuzzle = useCallback(
    async (explicitLength?: WordLength) => {
      const insights = summarizePlayerProfile(playerProfile);
      const targetLength: WordLength =
        explicitLength ||
        (autoLengthMode
          ? rollProbabilityWordLength({ previousLength: length })
          : insights.favoriteLength || 5);
      const activeLoc =
        !playerProfile.locationOptOut && playerProfile.locationEnabled
          ? playerProfile.location
          : null;
      setLoadingPersonalizedPuzzle(true);

      let puzzleData: PersonalizedPuzzleData;
      let preloadedBundle: PuzzleCluesBundle | null = null;
      try {
        const res = await fetch('/api/puzzle-clues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'personalized',
            length: targetLength,
            maxRows: 7,
            location: activeLoc,
            interests: playerProfile.selectedInterests,
            recentWords: [round.target],
            playerSummary: userDossier.promptDossier,
          }),
        });
        if (!res.ok) throw new Error('Personalized puzzle failed');
        const payload = (await res.json()) as {
          puzzle?: PersonalizedPuzzleData;
          bundle?: PuzzleCluesBundle | null;
          headlines?: string[];
        };
        if (payload.headlines?.length) {
          setLocalHeadlines(payload.headlines);
        }
        if (payload.bundle) {
          preloadedBundle = payload.bundle;
        }
        if (payload.puzzle && payload.puzzle.target?.length === targetLength) {
          puzzleData = payload.puzzle;
        } else {
          throw new Error('Malformed puzzle payload');
        }
      } catch {
        puzzleData = pickFallbackPersonalizedPuzzle({
          length: targetLength,
          interests: playerProfile.selectedInterests,
          location: activeLoc,
          excludeWords: [round.target],
          trendingHeadlines: localHeadlines,
        });
      } finally {
        setLoadingPersonalizedPuzzle(false);
      }

      const fresh: PuzzleRoundState = {
        ...createFreshRound({
          mode: 'sprint',
          dateKey,
          length: puzzleData.length,
          categoryId: activeCategory.id,
          target: puzzleData.target,
          playCharged: false,
          isPersonalized: true,
          personalizedClue: puzzleData.clue,
          personalizedReason: puzzleData.trendReason,
          personalizedCulturalNote: puzzleData.culturalNote,
          personalizedLocationLabel: puzzleData.locationLabel,
          previousHintWordCount: round.defaultHintWordCount,
          userContext: {
            cityToken: userDossier.cityToken,
            timeOfDay: userDossier.timeOfDay,
          },
        }),
        wordTriviaBundle: preloadedBundle,
      };

      setSummaryOpen(false);
      applyRoundTransition(fresh, 'sprint', puzzleData.length);
      setActiveTab('puzzle');
      window.scrollTo({ top: 0, behavior: 'instant' });
      showToast(puzzleData.trendReason, 3200);
    },
    [
      activeCategory.id,
      applyRoundTransition,
      autoLengthMode,
      dateKey,
      length,
      localHeadlines,
      playerProfile,
      round.defaultHintWordCount,
      round.target,
      showToast,
      userDossier.cityToken,
      userDossier.promptDossier,
      userDossier.timeOfDay,
    ]
  );

  return (
    <div
      id="top"
      className="min-h-[100dvh] flex flex-col bg-[#F7F5F0] dark:bg-[#111315] amoled-surface"
    >
      <Header
        soundEnabled={appSettings.soundEnabled}
        weeklyGradeId={weeklyGradeInfo.current.id}
        weeklyXp={weeklyProgress.weeklyXp}
        bonusCoins={weeklyProgress.bonusCoins}
        onToggleSound={() =>
          handleUpdateSettings({ soundEnabled: !appSettings.soundEnabled })
        }
        onOpenStats={() => setSummaryOpen(true)}
        onOpenWeeklyRank={() => setWeeklyRankOpen(true)}
        onOpenHelp={() => openHelpModal('rules')}
        onOpenSettings={() => setSettingsOpen(true)}
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
          className="fixed top-16 right-4 z-50 flex max-w-xs items-center gap-3 rounded-xl border border-emerald-700/40 bg-white dark:bg-zinc-900 p-3 shadow-xl animate-toast-up"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              Achievement Unlocked!
            </p>
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {achievementBanner.title}
            </p>
            <p className="font-mono-tabular text-[11px] text-zinc-500 dark:text-zinc-400">
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
            playerProfile={playerProfile}
            localHeadlines={localHeadlines}
            loadingPersonalizedPuzzle={loadingPersonalizedPuzzle}
            onOpenPersonalize={() => setPersonalizationOpen(true)}
            onPlayPersonalizedPuzzle={() => {
              void handlePlayPersonalizedPuzzle();
            }}
            onPlayLocalTrivia={() => {
              setTriviaState((prev) => ({
                ...prev,
                selectedCategoryId: 'local-trending',
              }));
              setActiveTab('trivia');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
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
            onBrowseEntertainment={handleBrowseEntertainment}
            onOpenHelp={openHelpModal}
          />
        ) : activeTab === 'faith' ? (
          <FaithStudyView
            dateKey={dateKey}
            activeReligion={faithProgress.activeReligion}
            showScriptureReferences={appSettings.showScriptureReferences}
            difficultyFilter={difficultyTierToTriviaLevel(appSettings.difficultyTier)}
            completedToday={faithProgress.completedSessionsByDate[dateKey] || []}
            onChangeReligion={handleChangeFaithReligion}
            onPlayFaithPuzzle={handlePlayFaithPuzzle}
            onFaithAnswerRecorded={handleFaithAnswerRecorded}
            onFaithSessionCompleted={handleFaithSessionCompleted}
          />
        ) : activeTab === 'trivia' ? (
          <TriviaView
            selectedCategoryId={triviaState.selectedCategoryId}
            streak={triviaState.streak}
            bestStreak={triviaState.bestStreak}
            freeHintAvailableToday={triviaState.freeHintLastDateKey !== dateKey}
            bonusUnlockUntil={triviaState.bonusUnlockUntil}
            recentQuestions={triviaState.recentQuestions}
            playerProfile={playerProfile}
            activeReligion={faithProgress.activeReligion}
            onOpenPersonalize={() => setPersonalizationOpen(true)}
            onSelectCategory={(catId) =>
              setTriviaState((prev) => ({ ...prev, selectedCategoryId: catId }))
            }
            onUnlockBonusCategory={() => setActiveAdPlacement('unlock_trivia_24h')}
            onUseFreeFiftyFiftyHint={() =>
              setTriviaState((prev) => ({ ...prev, freeHintLastDateKey: dateKey }))
            }
            onRequestAdPlacement={handleRequestAdPlacement}
            onAnswerRecorded={handleTriviaAnswerRecorded}
            onRoundCompleted={handleTriviaRoundCompleted}
            onDoubleXpClaimed={handleTriviaDoubleXpClaimed}
          />
        ) : (
          <div key="puzzle-stage" className="w-full flex flex-col items-center animate-stage-enter">
            <ModeControls
              mode={mode}
              length={length}
              autoLengthMode={autoLengthMode}
              activeCategory={activeCategory}
              categoryPlaysRemaining={categoryPlaysRemaining}
              puzzleNumber={puzzleNumber}
              countdown={countdown}
              currentStreak={stats.currentStreak}
              sprintSolved={stats.sprintSolved}
              isPersonalizedRound={round.isPersonalized}
              personalizedClue={round.personalizedClue}
              personalizedReason={round.personalizedReason}
              loadingPersonalizedPuzzle={loadingPersonalizedPuzzle}
              onPlayPersonalizedPuzzle={() => {
                void handlePlayPersonalizedPuzzle(autoLengthMode ? undefined : length);
              }}
              onChangeMode={(nextMode) => {
                if (nextMode === 'daily') {
                  setAutoLengthMode(false);
                }
                switchContext(nextMode, length, activeCategory);
              }}
              onChangeLength={(nextLength) => {
                setAutoLengthMode(false);
                switchContext(mode, nextLength, activeCategory);
              }}
              onToggleAutoLength={() => {
                const nextAuto = !autoLengthMode;
                setAutoLengthMode(nextAuto);
                if (nextAuto) {
                  const rolled = rollProbabilityWordLength({ previousLength: length });
                  if (mode === 'sprint') {
                    switchContext('sprint', rolled, activeCategory);
                  } else {
                    switchContext('daily', rolled, activeCategory);
                  }
                  showToast(`Auto length · ${rolled}-letter board`, 2200);
                }
              }}
              onOpenCategories={() => {
                setCategoryExplorerInitialTab('All');
                setCategoryExplorerOpen(true);
              }}
            />

            <PuzzleGrid
              length={round.length}
              maxAttempts={round.maxAttempts}
              rowGuesses={round.rowGuesses}
              rowDrafts={round.rowDrafts}
              activeRow={activeRow}
              activeCol={activeCol}
              typingDirection={typingDirection}
              onChangeDirection={setTypingDirection}
              target={round.target}
              status={round.status}
              shakeRow={shakeRow}
              revealingRow={revealingRow}
              lastWonRow={lastWonRow}
              showWinBurst={showWinBurst}
              boardAnimKey={boardAnimKey}
              gridHintBoxes={gridHintBoxes}
              defaultHintText={round.defaultHintText}
              progressiveNudge={round.progressiveNudge}
              eliminatedLetters={round.eliminatedLetters}
              solveFunFact={solveFunFact}
              hintsRemaining={Math.max(
                0,
                Math.min(
                  MAX_HINTS_PER_ROUND - round.hintsUsed,
                  MAX_VERTICAL_HINT_BOXES - gridHintBoxes.length
                )
              )}
              fiftyFiftyUsed={Boolean(round.fiftyFiftyUsed)}
              wordTriviaUnlocked={Boolean(round.wordTriviaUnlocked)}
              onTriggerHint={() => setActiveAdPlacement('hint')}
              onTriggerFiftyFifty={handlePuzzleFiftyFifty}
              onTriggerWordTrivia={() => setWordTriviaRowModalOpen(true)}
              onTriggerSkipWord={handleSkipPuzzleWord}
              completedWordSquare={completedWordSquare}
              onSelectCell={handleSelectCell}
              onKey={handleKeyInput}
              onMoveCursor={handleMoveCursor}
            />

            {round.status === 'playing' &&
              (round.wordTriviaUnlocked || wordTriviaLoading || wordTriviaError) && (
                <WordTriviaHintPanel
                  panelRef={wordTriviaPanelRef}
                  rowNumber={round.wordTriviaRow || Math.min(activeRow + 1, round.maxAttempts)}
                  unlockedRows={round.unlockedTriviaRows ?? EMPTY_UNLOCKED_ROWS}
                  wordLength={round.length}
                  categoryName={roundCategory.name}
                  trivia={round.wordTrivia || null}
                  loading={wordTriviaLoading}
                  error={wordTriviaError}
                  isOpen={wordTriviaOpen}
                  onToggleOpen={() => setWordTriviaOpen((prev) => !prev)}
                  onSelectUnlockedRow={(selectedRowNum) => {
                    const targetRowIdx = selectedRowNum - 1;
                    if (
                      targetRowIdx >= 0 &&
                      targetRowIdx < round.maxAttempts &&
                      round.rowGuesses[targetRowIdx] === null
                    ) {
                      const nextCol = getInitialActiveCol(round, targetRowIdx);
                      cursorRef.current = { row: targetRowIdx, col: nextCol };
                      setActiveRow(targetRowIdx);
                      setActiveCol(nextCol);
                    }
                    void fetchPuzzleWordTrivia(
                      round.target,
                      roundCategory.name,
                      selectedRowNum,
                      round.wordTriviaBundle
                    );
                  }}
                  onRequestAnotherLine={() => setWordTriviaRowModalOpen(true)}
                  onRetry={() => {
                    void fetchPuzzleWordTrivia(
                      round.target,
                      roundCategory.name,
                      round.wordTriviaRow || Math.min(activeRow + 1, round.maxAttempts),
                      round.wordTriviaBundle
                    );
                  }}
                />
              )}

            <RewardedDock
              mode={round.mode}
              status={round.status}
              wordTriviaUnlocked={Boolean(round.wordTriviaUnlocked)}
              wordTriviaOpen={wordTriviaOpen}
              extraAttemptGranted={round.extraAttemptGranted}
              canSaveStreak={isStreakRecoverable}
              previousLostStreak={stats.previousLostStreak}
              isCategoryLockedForNext={isCategoryLockedForNext}
              onToggleWordTrivia={() => {
                setWordTriviaOpen((prev) => {
                  const next = !prev;
                  if (next && !round.wordTrivia && !wordTriviaLoading) {
                    void fetchPuzzleWordTrivia(
                      round.target,
                      roundCategory.name,
                      round.wordTriviaRow || Math.min(activeRow + 1, round.maxAttempts),
                      round.wordTriviaBundle
                    );
                  }
                  return next;
                });
              }}
              onWatchAdExtraAttempt={() => setActiveAdPlacement('extra_attempt')}
              onWatchAdSaveStreak={() => setActiveAdPlacement('save_streak')}
              onWatchAdUnlockCategory={() => promptUnlockCategory(activeCategory, true)}
              onNewSprintWord={() => startNewSprintWord()}
              onShareResult={handleShareResult}
              onOpenSummary={() => setSummaryOpen(true)}
            />

            <EditorialGuideAndAdSlot
              isActivelyTyping={activeDraftHasLetters && round.status === 'playing'}
              onOpenHelp={openHelpModal}
            />
          </div>
        )}
      </main>

      {/* Non-blocking Floating Toast Banner (below Header so it never covers hints or BottomNav) */}
      <div
        className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[75] pointer-events-none px-4"
        aria-live="polite"
      >
        {toast && (
          <div
            data-testid="toast-message"
            className="max-w-sm sm:max-w-md truncate rounded-lg bg-[#1F2925] dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-lg animate-toast-up"
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
        mode={round.mode}
        length={round.length}
        categoryName={round.isPersonalized ? 'For You (Trend Pick)' : roundCategory.name}
        isPremiumCategory={!round.isPersonalized && activeCategory.isPremium}
        categoryPlaysRemaining={categoryPlaysRemaining}
        status={round.status}
        target={round.target}
        guessesCount={round.guesses.length}
        maxAttempts={round.maxAttempts}
        puzzleNumber={puzzleNumber}
        countdown={countdown}
        stats={stats}
        extraAttemptGranted={round.extraAttemptGranted}
        canSaveStreak={isStreakRecoverable}
        canDoubleXp={!puzzleDoubleXpClaimed && rewardedAdService.canShowOptionalPrompt()}
        lastPuzzleXpEarned={lastPuzzleXpEarned}
        personalizedReason={round.personalizedReason}
        personalizedCulturalNote={round.personalizedCulturalNote}
        funFact={solveFunFact}
        completedWordSquare={completedWordSquare}
        onClose={() => setSummaryOpen(false)}
        onShare={handleShareResult}
        onWatchAdExtraAttempt={() => {
          setSummaryOpen(false);
          setActiveAdPlacement('extra_attempt');
        }}
        onWatchAdSaveStreak={() => {
          setSummaryOpen(false);
          setActiveAdPlacement('save_streak');
        }}
        onWatchAdDoubleXp={() => {
          setSummaryOpen(false);
          setActiveAdPlacement('double_xp');
        }}
        onWatchAdUnlockCategory={() => promptUnlockCategory(activeCategory, true)}
        onPlaySprint={() => {
          if (round.faithReligion) {
            handlePlayFaithPuzzle(round.faithReligion);
          } else if (round.isPersonalized) {
            void handlePlayPersonalizedPuzzle(length);
          } else {
            startNewSprintWord();
          }
        }}
      />

      <PersonalizationModal
        open={personalizationOpen}
        profile={playerProfile}
        stats={stats}
        localHeadlines={localHeadlines}
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
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onOpenPersonalize={() => {
          setSettingsOpen(false);
          setPersonalizationOpen(true);
        }}
        onShareApp={() => {
          void (async () => {
            const shareCopy =
              'WordVibe: Daily Puzzle, AI Trivia & Faith Study — Challenge your brain daily!';
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareCopy);
              }
              showToast('WordVibe invite copied!');
            } catch {
              showToast('Share WordVibe with friends!');
            }
          })();
        }}
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
        onClose={() => setWeeklyRankOpen(false)}
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
        open={wordTriviaRowModalOpen}
        maxAttempts={round.maxAttempts}
        wordLength={round.length}
        activeRow={activeRow}
        rowGuesses={round.rowGuesses}
        rowDrafts={round.rowDrafts}
        unlockedTriviaRows={round.unlockedTriviaRows ?? EMPTY_UNLOCKED_ROWS}
        onCancel={() => {
          setWordTriviaRowModalOpen(false);
          setPendingWordTriviaRow(null);
          pendingWordTriviaRowRef.current = null;
        }}
        onConfirmRow={(chosenRow) => {
          setWordTriviaRowModalOpen(false);
          pendingWordTriviaRowRef.current = chosenRow;
          setPendingWordTriviaRow(chosenRow);
          const targetRowIdx = chosenRow - 1;
          if (
            targetRowIdx >= 0 &&
            targetRowIdx < round.maxAttempts &&
            round.rowGuesses[targetRowIdx] === null
          ) {
            const nextCol = getInitialActiveCol(round, targetRowIdx);
            cursorRef.current = { row: targetRowIdx, col: nextCol };
            setActiveRow(targetRowIdx);
            setActiveCol(nextCol);
          }
          setActiveAdPlacement('puzzle_word_trivia');
        }}
      />

      <RewardedAdModal
        placement={activeAdPlacement}
        contextLabel={
          activeAdPlacement === 'puzzle_word_trivia' && pendingWordTriviaRow
            ? `Row ${pendingWordTriviaRow}`
            : pendingCategoryForAd?.name || activeCategory.name
        }
        onCancel={() => {
          setActiveAdPlacement(null);
          setPendingCategoryForAd(null);
          setPendingWordTriviaRow(null);
          pendingWordTriviaRowRef.current = null;
          setAdIntentForceSprint(false);
          adRewardCallbackRef.current = null;
        }}
        onRewardEarned={handleRewardEarned}
      />

      <OfflineBanner />
    </div>
  );
}
