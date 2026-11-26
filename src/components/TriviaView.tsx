import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Unlock,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  formatLocationLabel,
  INTEREST_CATALOG,
  type PlayerProfileState,
} from '../game/playerProfileLogic';
import {
  formatLevelLabel,
  levelNumberToDifficultyBand,
  normalizeLevelNumber,
  type SessionPlayMode,
} from '../game/settingsLogic';
import {
  advanceTriviaLevelClimb,
  calculateTriviaXp,
  createTriviaClimbState,
  drawZeroRepeatTriviaQuestion,
  getStreakMultiplier,
  getTriviaCategoryById,
  getTriviaQuestionTimeLimitSeconds,
  getTriviaUnlockRemainingHours,
  isTriviaCategoryUnlocked,
  TRIVIA_CATEGORIES,
  TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD,
  TRIVIA_LEVEL_CLIMB_TOTAL,
  type TriviaClimbProgress,
  type TriviaQuestion,
} from '../game/triviaLogic';
import { recordModeOutcome } from '../game/retirementQueueLogic';
import { formatNotEnoughXpMessage, XP_COSTS } from '../game/xpEconomyLogic';
import { rewardedAdService, type RewardPlacement } from '../services/rewardedAdService';
import { soundService } from '../services/soundService';

interface TriviaViewProps {
  selectedCategoryId: string;
  sessionMode: SessionPlayMode;
  levelNumber: number;
  maxUnlockedLevel: number;
  climbState: TriviaClimbProgress;
  streak: number;
  bestStreak: number;
  bonusUnlockUntil: Record<string, number>;
  mastermindUnlocked?: boolean;
  currentXp?: number;
  recentQuestions: string[];
  playerProfile: PlayerProfileState;
  refreshSignal?: number;
  isPaused?: boolean;
  onOpenPersonalize: () => void;
  onSelectCategory: (categoryId: string) => void;
  onChangeSessionMode: (mode: SessionPlayMode) => void;
  onChangeLevelNumber: (levelNumber: number) => void;
  onUpdateClimbState: (next: TriviaClimbProgress) => void;
  onPromoteLevelNumber: (nextLevel: number) => void;
  onUnlockBonusCategory: () => void;
  onSpendXpUnlockMastermind?: () => boolean;
  onSpendXpSolve?: (question: TriviaQuestion) => boolean;
  onRequestAdPlacement: (placement: RewardPlacement, onGranted: () => void) => void;
  onAnswerRecorded: (params: {
    correct: boolean;
    difficulty: TriviaQuestion['difficulty'];
    streakAfter: number;
    xpAwarded: number;
    categoryId: string;
    questionText: string;
  }) => void;
  onRoundCompleted: (params: {
    correctCount: number;
    totalCount: number;
    roundXpEarned: number;
    categoryId: string;
  }) => void;
  onDoubleXpClaimed: (bonusXp: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// Session cache preserves unanswered question across React StrictMode remounts & tab switches
const pendingTriviaByKey = new Map<string, TriviaQuestion>();
let lastHandledRefreshSignal = 0;

export const TriviaView: React.FC<TriviaViewProps> = ({
  selectedCategoryId,
  sessionMode,
  levelNumber,
  maxUnlockedLevel,
  climbState,
  streak,
  bestStreak,
  bonusUnlockUntil,
  mastermindUnlocked = false,
  currentXp = 0,
  recentQuestions,
  playerProfile,
  refreshSignal = 0,
  isPaused = false,
  onOpenPersonalize,
  onSelectCategory,
  onChangeSessionMode,
  onChangeLevelNumber,
  onUpdateClimbState,
  onPromoteLevelNumber,
  onUnlockBonusCategory,
  onSpendXpUnlockMastermind,
  onSpendXpSolve,
  onRequestAdPlacement,
  onAnswerRecorded,
  onRoundCompleted,
  onDoubleXpClaimed,
}) => {
  const safeLevel = normalizeLevelNumber(levelNumber, 1);
  const safeMaxUnlocked = Math.max(1, normalizeLevelNumber(maxUnlockedLevel, 1));
  const canIncrementLevel = safeLevel < safeMaxUnlocked;

  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [solvedViaXp, setSolvedViaXp] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [revivedThisQuestion, setRevivedThisQuestion] = useState(false);
  const [streakBeforeMiss, setStreakBeforeMiss] = useState(0);
  const [lastXpFlash, setLastXpFlash] = useState<number | null>(null);
  const [sprintAnswered, setSprintAnswered] = useState(0);
  const [sprintCorrect, setSprintCorrect] = useState(0);
  const [stageXpEarned, setStageXpEarned] = useState(0);
  const [doubleXpClaimed, setDoubleXpClaimed] = useState(false);
  const [adsWatchedForReveal, setAdsWatchedForReveal] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(() =>
    getTriviaQuestionTimeLimitSeconds(safeLevel, climbState.questionIndex)
  );

  const drawNextQuestion = useCallback(
    (categoryId: string, lvNum: number, nextClimbIdx: number, forceFresh = false) => {
      const cacheKey = `${categoryId}::${lvNum}`;
      let q = !forceFresh ? pendingTriviaByKey.get(cacheKey) : undefined;
      if (!q) {
        const interestLabels = playerProfile.selectedInterests.map(
          (id) => INTEREST_CATALOG.find((item) => item.id === id)?.label || id
        );
        q = drawZeroRepeatTriviaQuestion({
          categoryId,
          levelNumber: lvNum,
          excludeTexts: recentQuestions,
          context: {
            locationLabel:
              playerProfile.locationEnabled && !playerProfile.locationOptOut
                ? formatLocationLabel(playerProfile.location)
                : undefined,
            interests: interestLabels,
          },
        });
        pendingTriviaByKey.set(cacheKey, q);
      }
      setQuestion(q);
      setSelectedIdx(null);
      setSolvedViaXp(false);
      setTimedOut(false);
      setRevivedThisQuestion(false);
      setStreakBeforeMiss(0);
      setLastXpFlash(null);
      setAdsWatchedForReveal(0);
      setQuestionTimeLeft(getTriviaQuestionTimeLimitSeconds(lvNum, nextClimbIdx));
    },
    [playerProfile, recentQuestions]
  );

  // Restore cached unanswered question or draw fresh if force-refreshed
  useEffect(() => {
    const forceFresh = refreshSignal !== lastHandledRefreshSignal;
    lastHandledRefreshSignal = refreshSignal;
    drawNextQuestion(selectedCategoryId, safeLevel, climbState.questionIndex, forceFresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, safeLevel, sessionMode, refreshSignal]);

  const showClimbSummary =
    sessionMode === 'level_climb' && climbState.stageComplete && selectedIdx === null;

  // Shrinking countdown timer for Level Climb (pauses during modals/ads or after answering)
  useEffect(() => {
    if (
      sessionMode !== 'level_climb' ||
      !question ||
      selectedIdx !== null ||
      showClimbSummary ||
      isPaused
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionMode, question, selectedIdx, showClimbSummary, isPaused]);

  // Handle timeout once countdown hits 0
  useEffect(() => {
    if (
      sessionMode !== 'level_climb' ||
      !question ||
      selectedIdx !== null ||
      timedOut ||
      questionTimeLeft > 0 ||
      showClimbSummary
    ) {
      return;
    }
    setTimedOut(true);
    setSelectedIdx(-1);
    pendingTriviaByKey.delete(`${selectedCategoryId}::${safeLevel}`);
    soundService.playTriviaWrong();
    setStreakBeforeMiss(streak);
    setStageXpEarned(0);
    recordModeOutcome('trivia', question.id || `trivia-text:${question.question}`, false, {
      categoryId: selectedCategoryId,
      question,
    });
    onAnswerRecorded({
      correct: false,
      difficulty: question.difficulty,
      streakAfter: 0,
      xpAwarded: 5,
      categoryId: selectedCategoryId,
      questionText: question.question,
    });
    const resetClimb = advanceTriviaLevelClimb(climbState, false);
    onUpdateClimbState(resetClimb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionTimeLeft, sessionMode, question, selectedIdx, timedOut, showClimbSummary]);

  const handleCategoryClick = (catId: string) => {
    if (!isTriviaCategoryUnlocked(catId, bonusUnlockUntil, Date.now(), mastermindUnlocked)) {
      onUnlockBonusCategory();
      return;
    }
    onSelectCategory(catId);
    if (sessionMode === 'level_climb') {
      const fresh = createTriviaClimbState(safeLevel);
      onUpdateClimbState(fresh);
      setStageXpEarned(0);
      setDoubleXpClaimed(false);
      setQuestionTimeLeft(getTriviaQuestionTimeLimitSeconds(safeLevel, 0));
    }
  };

  const handleSelectOption = (optionIdx: number, skipXpReward = false) => {
    if (!question || selectedIdx !== null) return;
    setSelectedIdx(optionIdx);
    setSolvedViaXp(skipXpReward);
    setTimedOut(false);
    pendingTriviaByKey.delete(`${selectedCategoryId}::${safeLevel}`);

    const isCorrect = optionIdx === question.correctIndex;
    const questionId = question.id || `trivia-text:${question.question}`;
    let xpGained = skipXpReward ? 0 : 5;
    if (isCorrect) {
      const nextStreak = streak + 1;
      const baseXp = skipXpReward ? 0 : calculateTriviaXp(question.difficulty, nextStreak);
      xpGained = skipXpReward ? 0 : question.isRedemptionRound ? baseXp * 2 : baseXp;
      if (skipXpReward) {
        soundService.playHintChime();
        setLastXpFlash(0);
      } else {
        soundService.playTriviaCorrect(nextStreak);
        setLastXpFlash(xpGained);
      }
      setStageXpEarned((x) => x + xpGained);
      if (sessionMode === 'sprint') {
        setSprintCorrect((c) => c + 1);
      }
      recordModeOutcome('trivia', questionId, true, {
        categoryId: selectedCategoryId,
        question,
      });
      onAnswerRecorded({
        correct: true,
        difficulty: question.difficulty,
        streakAfter: nextStreak,
        xpAwarded: xpGained,
        categoryId: selectedCategoryId,
        questionText: question.question,
      });
    } else {
      soundService.playTriviaWrong();
      setStreakBeforeMiss(streak);
      if (sessionMode === 'level_climb') {
        setStageXpEarned(0);
      } else {
        setStageXpEarned((x) => x + 5);
      }
      recordModeOutcome('trivia', questionId, false, {
        categoryId: selectedCategoryId,
        question,
      });
      onAnswerRecorded({
        correct: false,
        difficulty: question.difficulty,
        streakAfter: 0,
        xpAwarded: 5,
        categoryId: selectedCategoryId,
        questionText: question.question,
      });
    }

    if (sessionMode === 'sprint') {
      setSprintAnswered((a) => a + 1);
    } else {
      const nextClimb = advanceTriviaLevelClimb(climbState, isCorrect);
      onUpdateClimbState(nextClimb);
      if (nextClimb.stageComplete) {
        if (nextClimb.promotedToLevelNumber) {
          onPromoteLevelNumber(nextClimb.promotedToLevelNumber);
        }
        onRoundCompleted({
          correctCount: nextClimb.correctCount,
          totalCount: TRIVIA_LEVEL_CLIMB_TOTAL,
          roundXpEarned: stageXpEarned + xpGained,
          categoryId: selectedCategoryId,
        });
      }
    }
  };

  const handleWatchTwoAdsForAnswer = () => {
    if (!question || selectedIdx !== null) return;
    if (adsWatchedForReveal === 0) {
      onRequestAdPlacement('trivia_reveal_answer_1', () => {
        setAdsWatchedForReveal(1);
        soundService.playHintChime();
      });
    } else if (adsWatchedForReveal === 1) {
      onRequestAdPlacement('trivia_reveal_answer_2', () => {
        setAdsWatchedForReveal(2);
        soundService.playHintChime();
        handleSelectOption(question.correctIndex);
      });
    }
  };

  const handleSpendXpForQuestion = () => {
    if (!question || selectedIdx !== null || !onSpendXpSolve) return;
    const ok = onSpendXpSolve(question);
    if (!ok) return;
    handleSelectOption(question.correctIndex, true);
  };

  const handleReviveStreak = () => {
    if (streakBeforeMiss < 3 || revivedThisQuestion) return;
    onRequestAdPlacement('trivia_revive', () => {
      setRevivedThisQuestion(true);
      onAnswerRecorded({
        correct: true,
        difficulty: question?.difficulty || levelNumberToDifficultyBand(safeLevel),
        streakAfter: streakBeforeMiss,
        xpAwarded: 25,
        categoryId: selectedCategoryId,
        questionText: question?.question || '',
      });
    });
  };

  const handleNextStep = useCallback(() => {
    drawNextQuestion(selectedCategoryId, safeLevel, climbState.questionIndex, true);
  }, [climbState.questionIndex, drawNextQuestion, safeLevel, selectedCategoryId]);

  // Auto-advance smoothly after revealing answer via 500 XP Solve
  useEffect(() => {
    if (!solvedViaXp || selectedIdx === null) return;
    const timer = window.setTimeout(() => {
      if (sessionMode === 'level_climb' && climbState.stageComplete) {
        setSelectedIdx(null);
      } else {
        handleNextStep();
      }
    }, 1450);
    return () => window.clearTimeout(timer);
  }, [climbState.stageComplete, handleNextStep, selectedIdx, sessionMode, solvedViaXp]);

  const handleStartNextClimbStage = () => {
    const targetLevelNum = climbState.promotedToLevelNumber || safeLevel;
    if (climbState.promotedToLevelNumber) {
      onPromoteLevelNumber(climbState.promotedToLevelNumber);
    }
    const freshClimb = createTriviaClimbState(targetLevelNum);
    onUpdateClimbState(freshClimb);
    setStageXpEarned(0);
    setDoubleXpClaimed(false);
    drawNextQuestion(selectedCategoryId, targetLevelNum, 0, true);
  };

  const handleDoubleStageXp = () => {
    if (doubleXpClaimed || stageXpEarned <= 0) return;
    onRequestAdPlacement('double_xp', () => {
      setDoubleXpClaimed(true);
      onDoubleXpClaimed(stageXpEarned);
    });
  };

  const activeCategory = getTriviaCategoryById(selectedCategoryId);
  const multiplier = getStreakMultiplier(streak);
  const isWrongOrTimeout =
    selectedIdx !== null && question !== null && selectedIdx !== question.correctIndex;
  const canOfferRevive =
    isWrongOrTimeout &&
    streakBeforeMiss >= 3 &&
    !revivedThisQuestion &&
    rewardedAdService.canShowOptionalPrompt();

  const canOfferDoubleXp =
    sessionMode === 'level_climb' &&
    climbState.stageComplete &&
    !doubleXpClaimed &&
    stageXpEarned > 0 &&
    rewardedAdService.canShowOptionalPrompt();

  const isLowTime = sessionMode === 'level_climb' && questionTimeLeft <= 5 && selectedIdx === null;

  return (
    <section
      data-testid="trivia-view"
      aria-label="WordVibe Brain Trivia"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-3 pb-24 sm:pt-5 animate-stage-enter"
    >
      {/* Top Trivia Studio Card: Mode, Category, Locked Timed Level Stepper */}
      <div className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-display text-base font-bold wv-accent-text">
            <Brain className="h-4 w-4" aria-hidden="true" />
            <span>Brain Trivia · {activeCategory.name}</span>
          </div>
          <div className="flex items-center gap-2 font-mono-tabular text-xs sm:text-sm font-bold wv-text">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-4 w-4 wv-accent-text" aria-hidden="true" />
              <span data-testid="trivia-streak-count">{streak}</span>
            </span>
            <span className="wv-text-muted">·</span>
            <span data-testid="trivia-multiplier" className="wv-accent-text">
              {multiplier}× XP
            </span>
            <span className="hidden sm:inline wv-text-muted">·</span>
            <span className="hidden sm:inline wv-text-muted">Best {bestStreak}</span>
          </div>
        </div>

        {/* 2 Session Modes: Level Climb (5 Timed) vs Endless Sprint */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Trivia session mode"
            className="inline-flex items-center rounded-xl border wv-border wv-card-muted p-0.5"
          >
            <button
              type="button"
              data-testid="trivia-mode-climb-btn"
              onClick={() => onChangeSessionMode('level_climb')}
              aria-pressed={sessionMode === 'level_climb'}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                sessionMode === 'level_climb' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Level Climb (5 Timed)</span>
            </button>
            <button
              type="button"
              data-testid="trivia-mode-sprint-btn"
              onClick={() => onChangeSessionMode('sprint')}
              aria-pressed={sessionMode === 'sprint'}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                sessionMode === 'sprint' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Endless Sprint</span>
            </button>
          </div>

          <span className="font-mono-tabular text-xs sm:text-sm font-bold wv-text-muted">
            {sessionMode === 'level_climb'
              ? `Q ${
                  selectedIdx === null
                    ? Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex + 1)
                    : climbState.correctCount === 0
                    ? 1
                    : Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex)
                }/${TRIVIA_LEVEL_CLIMB_TOTAL} · Wins ${climbState.correctCount}/${TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD}`
              : `Sprint #${sprintAnswered + 1} · ${sprintCorrect} Correct`}
          </span>
        </div>

        {/* Category Pills */}
        <div data-testid="trivia-category-selector" className="flex flex-wrap gap-1.5">
          {TRIVIA_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            const unlocked = isTriviaCategoryUnlocked(
              cat.id,
              bonusUnlockUntil,
              Date.now(),
              mastermindUnlocked
            );
            const hrsLeft =
              cat.isBonusLocked && !mastermindUnlocked
                ? getTriviaUnlockRemainingHours(cat.id, bonusUnlockUntil)
                : 0;

            return (
              <button
                key={cat.id}
                type="button"
                data-trivia-category={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'wv-accent-btn border-transparent'
                    : cat.isBonusLocked && !unlocked
                    ? 'wv-accent-pill'
                    : 'wv-border wv-card-muted wv-text hover:opacity-85'
                }`}
              >
                {cat.isBonusLocked &&
                  (unlocked ? (
                    <Unlock className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                  ))}
                <span>{cat.name}</span>
                {cat.isBonusLocked && unlocked && !mastermindUnlocked && hrsLeft > 0 && (
                  <span className="font-mono-tabular text-xs opacity-80">({hrsLeft}h)</span>
                )}
                {cat.isBonusLocked && mastermindUnlocked && (
                  <span className="font-mono-tabular text-xs opacity-80">∞</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mastermind Vault 200 XP Unlock Strip (when still locked) */}
        {!isTriviaCategoryUnlocked('mastermind-vault', bonusUnlockUntil, Date.now(), mastermindUnlocked) &&
          onSpendXpUnlockMastermind && (
            <div
              data-testid="trivia-mastermind-unlock-bar"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border wv-border wv-card-muted px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-bold wv-text">
                  Mastermind Vault Locked · Unlock forever with {XP_COSTS.TRIVIA_MASTERMIND_UNLOCK} XP
                </p>
                {currentXp < XP_COSTS.TRIVIA_MASTERMIND_UNLOCK && (
                  <p
                    data-testid="trivia-mastermind-xp-insufficient"
                    className="font-semibold wv-text-muted"
                  >
                    {formatNotEnoughXpMessage(XP_COSTS.TRIVIA_MASTERMIND_UNLOCK)} (Balance:{' '}
                    {currentXp.toLocaleString()} XP)
                  </p>
                )}
              </div>
              <button
                type="button"
                data-testid="trivia-unlock-mastermind-xp-btn"
                disabled={currentXp < XP_COSTS.TRIVIA_MASTERMIND_UNLOCK}
                onClick={() => {
                  const ok = onSpendXpUnlockMastermind();
                  if (ok && sessionMode === 'level_climb') {
                    const fresh = createTriviaClimbState(safeLevel);
                    onUpdateClimbState(fresh);
                    setStageXpEarned(0);
                    setDoubleXpClaimed(false);
                    setQuestionTimeLeft(getTriviaQuestionTimeLimitSeconds(safeLevel, 0));
                  }
                }}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl wv-gold-pill px-3 py-1.5 text-xs font-extrabold transition-transform active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unlock Mastermind · {XP_COSTS.TRIVIA_MASTERMIND_UNLOCK} XP</span>
              </button>
            </div>
          )}

        {/* Timed Level Progression Bar (Hidden in Endless Sprint; + locked until reached) */}
        {sessionMode === 'level_climb' && (
          <div
            data-testid="trivia-level-bar"
            className="flex items-center justify-between gap-2 border-t wv-border pt-3"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider wv-text-muted">
                Current Level · Shrinking Timer
              </span>
              <span className="text-xs wv-text-muted">
                Beat {TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD}/{TRIVIA_LEVEL_CLIMB_TOTAL} in time to reach Level{' '}
                {safeLevel + 1}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="trivia-level-dec"
                disabled={safeLevel <= 1}
                onClick={() => onChangeLevelNumber(Math.max(1, safeLevel - 1))}
                aria-label="Previous unlocked level"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border wv-border wv-card-muted wv-text transition-transform active:scale-95 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>

              <span
                data-testid="trivia-active-level-badge"
                className="inline-flex min-h-10 min-w-[96px] items-center justify-center rounded-xl wv-accent-btn px-3.5 py-1.5 font-mono-tabular text-sm font-extrabold"
              >
                {formatLevelLabel(safeLevel)}
              </span>

              <button
                type="button"
                data-testid="trivia-level-inc"
                disabled={!canIncrementLevel}
                onClick={() => {
                  if (canIncrementLevel) {
                    onChangeLevelNumber(safeLevel + 1);
                  }
                }}
                title={
                  canIncrementLevel
                    ? `Switch to ${formatLevelLabel(safeLevel + 1)}`
                    : `Answer 5 timed questions in a row to unlock Level ${safeLevel + 1}`
                }
                aria-label={
                  canIncrementLevel
                    ? 'Next unlocked level'
                    : `Level ${safeLevel + 1} locked until 5 timed wins`
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border wv-border wv-card-muted wv-text transition-transform active:scale-95 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                {canIncrementLevel ? (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t wv-border pt-2.5 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 wv-text-muted">
            <MapPin className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
            <span>
              {playerProfile.locationEnabled
                ? `Tuned to ${formatLocationLabel(playerProfile.location)}`
                : 'Zero-Repeat Offline Bank Active'}
            </span>
          </div>
          <button
            type="button"
            data-testid="trivia-personalize-btn"
            onClick={onOpenPersonalize}
            className="font-bold wv-accent-text hover:underline underline-offset-4 cursor-pointer"
          >
            Personalize Taste
          </button>
        </div>
      </div>

      {/* Stage Summary (only on completing 5/5 timed Level Climb) vs Active Question */}
      {showClimbSummary ? (
        <div
          data-testid="trivia-round-summary"
          className="wv-tilt-surface rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-md animate-modal-pop"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold wv-accent-text">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>
              {climbState.promotedToLevelNumber
                ? `Level Up Unlocked: ${formatLevelLabel(climbState.promotedToLevelNumber)}!`
                : `${formatLevelLabel(climbState.levelNumber ?? safeLevel)} Stage Complete`}
            </span>
          </div>

          <h2 className="mt-1 font-display text-2xl font-bold wv-text">
            {climbState.correctCount} / {TRIVIA_LEVEL_CLIMB_TOTAL} Timed Wins!
          </h2>
          <p className="mt-1 text-sm wv-text-muted">
            {climbState.promotedToLevelNumber
              ? `Awesome speed! You beat all 5 shrinking countdowns and promoted to ${formatLevelLabel(climbState.promotedToLevelNumber)}.`
              : `Answer all ${TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD}/${TRIVIA_LEVEL_CLIMB_TOTAL} before the timer runs out to unlock Level ${(climbState.levelNumber ?? safeLevel) + 1}.`}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold wv-text">
                {Math.round((climbState.correctCount / TRIVIA_LEVEL_CLIMB_TOTAL) * 100)}%
              </div>
              <div className="text-xs wv-text-muted">Accuracy</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold wv-accent-text">
                +{doubleXpClaimed ? stageXpEarned * 2 : stageXpEarned}
              </div>
              <div className="text-xs wv-text-muted">Weekly XP</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold wv-accent-text">{streak}</div>
              <div className="text-xs wv-text-muted">Streak</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            {canOfferDoubleXp && (
              <button
                type="button"
                data-testid="trivia-double-xp-btn"
                onClick={handleDoubleStageXp}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-3 text-sm font-bold cursor-pointer"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad: 2x Weekly XP (+{stageXpEarned})</span>
              </button>
            )}

            <button
              type="button"
              data-testid="trivia-new-round-btn"
              onClick={handleStartNextClimbStage}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl wv-gold-pill px-4 py-3 font-display text-base font-bold cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>
                {climbState.promotedToLevelNumber
                  ? `Start ${formatLevelLabel(climbState.promotedToLevelNumber)}`
                  : 'Play 5 Timed Questions'}
              </span>
            </button>
          </div>
        </div>
      ) : question ? (
        <div
          data-testid="trivia-question-card"
          className="wv-tilt-surface rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b wv-border">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold wv-text-muted">
              <span data-testid="trivia-round-progress" className="font-mono-tabular wv-text">
                {sessionMode === 'level_climb'
                  ? `Question ${
                      selectedIdx === null
                        ? Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex + 1)
                        : climbState.correctCount === 0
                        ? 1
                        : Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex)
                    } / ${TRIVIA_LEVEL_CLIMB_TOTAL}`
                  : `Sprint Question #${sprintAnswered + (selectedIdx !== null ? 0 : 1)}`}
              </span>
              {sessionMode === 'level_climb' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="wv-accent-text">{formatLevelLabel(safeLevel)}</span>
                </>
              )}
              {lastXpFlash !== null && lastXpFlash > 0 && (
                <span
                  data-testid="trivia-xp-gain"
                  className="font-mono-tabular font-extrabold wv-accent-text animate-pop"
                >
                  +{lastXpFlash} XP
                </span>
              )}
            </div>

            {sessionMode === 'level_climb' ? (
              <span
                data-testid="trivia-climb-timer"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 font-mono-tabular text-xs font-extrabold ${
                  isLowTime ? 'wv-gold-pill animate-pulse' : 'wv-accent-pill'
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{questionTimeLeft}s</span>
              </span>
            ) : (
              <span className="rounded-lg border wv-border wv-card-muted px-2.5 py-0.5 font-mono-tabular text-xs font-bold wv-text-muted">
                0% Repeat Bank
              </span>
            )}
          </div>

          {question.isRedemptionRound && (
            <div
              data-testid="trivia-redemption-badge"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl wv-gold-pill px-3 py-1 text-xs sm:text-sm font-extrabold shadow-[0_0_16px_rgba(245,158,11,0.45)] animate-pulse"
            >
              <span>⚡ Redemption Round — 2X XP!</span>
            </div>
          )}

          {question.personalizationReason && (
            <p
              data-testid="trivia-personalization-reason"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold wv-accent-text"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{question.personalizationReason}</span>
            </p>
          )}

          <h2
            data-testid="trivia-question-text"
            className="mt-3 font-display text-xl sm:text-2xl font-bold leading-snug wv-text"
          >
            {question.question}
          </h2>

          {selectedIdx === null && (
            <div className="mt-3.5 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  data-testid="trivia-watch-two-ads-btn"
                  onClick={handleWatchTwoAdsForAnswer}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border wv-accent-pill px-4 py-2.5 text-xs sm:text-sm font-bold transition-transform active:scale-98 cursor-pointer"
                >
                  <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {adsWatchedForReveal === 0
                      ? 'Watch 2 Ads to Reveal Answer (Ad 1/2)'
                      : 'Ad 1 Watched! Watch Ad 2/2'}
                  </span>
                </button>
                {onSpendXpSolve && (
                  <button
                    type="button"
                    data-testid="trivia-solve-xp-btn"
                    disabled={currentXp < XP_COSTS.TRIVIA_SOLVE}
                    onClick={handleSpendXpForQuestion}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-transform active:scale-98 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Solve Question · {XP_COSTS.TRIVIA_SOLVE} XP</span>
                  </button>
                )}
              </div>
              {onSpendXpSolve && currentXp < XP_COSTS.TRIVIA_SOLVE && (
                <p
                  data-testid="trivia-solve-xp-insufficient"
                  className="text-right text-xs font-semibold wv-text-muted"
                >
                  {formatNotEnoughXpMessage(XP_COSTS.TRIVIA_SOLVE)} (Balance:{' '}
                  {currentXp.toLocaleString()} XP)
                </p>
              )}
            </div>
          )}

          <div data-testid="trivia-options" className="mt-4 grid grid-cols-1 gap-2.5">
            {question.options.map((opt, idx) => {
              const isAnswered = selectedIdx !== null;
              const isCorrectOpt = idx === question.correctIndex;
              const isPicked = idx === selectedIdx;

              let styleClass = 'wv-border wv-card-muted wv-text hover:opacity-90';
              if (isAnswered) {
                if (isCorrectOpt) {
                  styleClass = 'wv-tile-correct border-2 font-bold';
                } else if (isPicked) {
                  styleClass = 'wv-tile-absent border-2 font-bold line-through';
                } else {
                  styleClass = 'wv-border wv-card-muted wv-text-muted opacity-65';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`trivia-option-${idx}`}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base font-semibold transition-all active:scale-[0.985] cursor-pointer disabled:cursor-default ${styleClass} ${
                    isAnswered && isCorrectOpt
                      ? 'animate-tile-pop'
                      : isAnswered && isPicked && !isCorrectOpt
                      ? 'animate-row-shake'
                      : ''
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border wv-tile-wooden font-display text-xs font-bold">
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span>{opt}</span>
                  </span>

                  {isAnswered && isCorrectOpt && (
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  )}
                  {isAnswered && isPicked && !isCorrectOpt && (
                    <XCircle className="h-5 w-5 shrink-0 opacity-85" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedIdx !== null && (
            <div
              data-testid="trivia-explanation-box"
              className="mt-4 rounded-xl border wv-border wv-card-muted p-4 animate-stage-enter"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold wv-accent-text">
                  {selectedIdx === question.correctIndex
                    ? solvedViaXp
                      ? `Solved via ${XP_COSTS.TRIVIA_SOLVE} XP · Advancing...`
                      : `Correct! +${lastXpFlash || 30} Weekly XP`
                    : timedOut
                    ? "Time's Up! Climb reset to 1/5"
                    : revivedThisQuestion
                    ? `Streak Restored (${streakBeforeMiss})`
                    : sessionMode === 'level_climb'
                    ? 'Missed — Climb reset to 1/5'
                    : 'Study Note'}
                </span>
                <span className="text-xs font-semibold wv-text-muted">{question.category}</span>
              </div>
              <p className="mt-1.5 text-sm sm:text-base leading-relaxed wv-text">
                {question.explanation}
              </p>

              {question.funFact && (
                <div
                  data-testid="trivia-fun-fact"
                  className="mt-2.5 rounded-lg border wv-border wv-card px-3 py-2 text-xs sm:text-sm leading-relaxed wv-text"
                >
                  <span className="font-bold wv-accent-text">Did You Know? </span>
                  <span>{question.funFact}</span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {canOfferRevive && (
                  <button
                    type="button"
                    data-testid="trivia-revive-btn"
                    onClick={handleReviveStreak}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border wv-accent-pill px-4 py-2.5 text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Watch Ad: Keep {streakBeforeMiss}-Streak</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="trivia-next-btn"
                  onClick={() => {
                    if (sessionMode === 'level_climb' && climbState.stageComplete) {
                      setSelectedIdx(null);
                    } else {
                      handleNextStep();
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-2.5 text-sm font-bold cursor-pointer"
                >
                  <span>
                    {sessionMode === 'level_climb' && climbState.stageComplete
                      ? 'View Stage Results'
                      : sessionMode === 'level_climb' && climbState.correctCount === 0
                      ? 'Restart Climb (1/5)'
                      : 'Next Question'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};
