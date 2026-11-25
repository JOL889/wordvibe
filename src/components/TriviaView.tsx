import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  Lock,
  MapPin,
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
  FIVE_LEVEL_META,
  FIVE_LEVEL_ORDER,
  type FiveDifficultyLevel,
  type SessionPlayMode,
} from '../game/settingsLogic';
import {
  advanceTriviaLevelClimb,
  calculateTriviaXp,
  createTriviaClimbState,
  drawZeroRepeatTriviaQuestion,
  getStreakMultiplier,
  getTriviaCategoryById,
  getTriviaUnlockRemainingHours,
  isTriviaCategoryUnlocked,
  TRIVIA_CATEGORIES,
  TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD,
  TRIVIA_LEVEL_CLIMB_TOTAL,
  type TriviaClimbProgress,
  type TriviaQuestion,
} from '../game/triviaLogic';
import { rewardedAdService, type RewardPlacement } from '../services/rewardedAdService';
import { soundService } from '../services/soundService';

interface TriviaViewProps {
  selectedCategoryId: string;
  sessionMode: SessionPlayMode;
  activeLevel: FiveDifficultyLevel;
  climbState: TriviaClimbProgress;
  streak: number;
  bestStreak: number;
  bonusUnlockUntil: Record<string, number>;
  recentQuestions: string[];
  playerProfile: PlayerProfileState;
  refreshSignal?: number;
  onOpenPersonalize: () => void;
  onSelectCategory: (categoryId: string) => void;
  onChangeSessionMode: (mode: SessionPlayMode) => void;
  onChangeLevel: (level: FiveDifficultyLevel) => void;
  onUpdateClimbState: (next: TriviaClimbProgress) => void;
  onPromoteLevel: (nextLevel: FiveDifficultyLevel) => void;
  onUnlockBonusCategory: () => void;
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

export const TriviaView: React.FC<TriviaViewProps> = ({
  selectedCategoryId,
  sessionMode,
  activeLevel,
  climbState,
  streak,
  bestStreak,
  bonusUnlockUntil,
  recentQuestions,
  playerProfile,
  refreshSignal = 0,
  onOpenPersonalize,
  onSelectCategory,
  onChangeSessionMode,
  onChangeLevel,
  onUpdateClimbState,
  onPromoteLevel,
  onUnlockBonusCategory,
  onRequestAdPlacement,
  onAnswerRecorded,
  onRoundCompleted,
  onDoubleXpClaimed,
}) => {
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revivedThisQuestion, setRevivedThisQuestion] = useState(false);
  const [streakBeforeMiss, setStreakBeforeMiss] = useState(0);
  const [lastXpFlash, setLastXpFlash] = useState<number | null>(null);
  const [sprintAnswered, setSprintAnswered] = useState(0);
  const [sprintCorrect, setSprintCorrect] = useState(0);
  const [stageXpEarned, setStageXpEarned] = useState(0);
  const [doubleXpClaimed, setDoubleXpClaimed] = useState(false);
  const [adsWatchedForReveal, setAdsWatchedForReveal] = useState(0);

  const drawNextQuestion = useCallback(
    (categoryId: string, level: FiveDifficultyLevel) => {
      const interestLabels = playerProfile.selectedInterests.map(
        (id) => INTEREST_CATALOG.find((item) => item.id === id)?.label || id
      );
      const q = drawZeroRepeatTriviaQuestion({
        categoryId,
        level,
        excludeTexts: recentQuestions,
        context: {
          locationLabel:
            playerProfile.locationEnabled && !playerProfile.locationOptOut
              ? formatLocationLabel(playerProfile.location)
              : undefined,
          interests: interestLabels,
        },
      });
      setQuestion(q);
      setSelectedIdx(null);
      setRevivedThisQuestion(false);
      setStreakBeforeMiss(0);
      setLastXpFlash(null);
      setAdsWatchedForReveal(0);
    },
    [playerProfile, recentQuestions]
  );

  // Sync fresh question when category, level, session mode, or shake refreshSignal changes
  useEffect(() => {
    drawNextQuestion(selectedCategoryId, activeLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, activeLevel, sessionMode, refreshSignal]);

  const handleCategoryClick = (catId: string) => {
    if (!isTriviaCategoryUnlocked(catId, bonusUnlockUntil)) {
      onUnlockBonusCategory();
      return;
    }
    soundService.playTapPop();
    onSelectCategory(catId);
    if (sessionMode === 'level_climb') {
      onUpdateClimbState(createTriviaClimbState(activeLevel));
      setStageXpEarned(0);
      setDoubleXpClaimed(false);
    }
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!question || selectedIdx !== null) return;
    setSelectedIdx(optionIdx);
    const isCorrect = optionIdx === question.correctIndex;

    let xpGained = 5;
    if (isCorrect) {
      const nextStreak = streak + 1;
      xpGained = calculateTriviaXp(question.difficulty, nextStreak);
      soundService.playTriviaCorrect(nextStreak);
      setLastXpFlash(xpGained);
      setStageXpEarned((x) => x + xpGained);
      if (sessionMode === 'sprint') {
        setSprintCorrect((c) => c + 1);
      }
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
      setStageXpEarned((x) => x + 5);
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

  const handleReviveStreak = () => {
    if (streakBeforeMiss < 3 || revivedThisQuestion) return;
    onRequestAdPlacement('trivia_revive', () => {
      setRevivedThisQuestion(true);
      onAnswerRecorded({
        correct: true,
        difficulty: question?.difficulty || activeLevel,
        streakAfter: streakBeforeMiss,
        xpAwarded: 25,
        categoryId: selectedCategoryId,
        questionText: question?.question || '',
      });
    });
  };

  const handleNextStep = () => {
    soundService.playTapPop();
    drawNextQuestion(selectedCategoryId, activeLevel);
  };

  const handleStartNextClimbStage = () => {
    soundService.playTapPop();
    const targetLevel = climbState.promotedToLevel || climbState.currentLevel;
    if (climbState.promotedToLevel) {
      onPromoteLevel(climbState.promotedToLevel);
    }
    onUpdateClimbState(createTriviaClimbState(targetLevel));
    setStageXpEarned(0);
    setDoubleXpClaimed(false);
    drawNextQuestion(selectedCategoryId, targetLevel);
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
  const canOfferRevive =
    selectedIdx !== null &&
    question !== null &&
    selectedIdx !== question.correctIndex &&
    streakBeforeMiss >= 3 &&
    !revivedThisQuestion &&
    rewardedAdService.canShowOptionalPrompt();

  const canOfferDoubleXp =
    sessionMode === 'level_climb' &&
    climbState.stageComplete &&
    !doubleXpClaimed &&
    stageXpEarned > 0 &&
    rewardedAdService.canShowOptionalPrompt();

  const showClimbSummary = sessionMode === 'level_climb' && climbState.stageComplete && selectedIdx === null;

  return (
    <section
      data-testid="trivia-view"
      aria-label="WordVibe Brain Trivia"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-3 pb-24 sm:pt-5 animate-stage-enter"
    >
      {/* Top Trivia Studio Card: Mode, Category, 5-Level Selector */}
      <div className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-display text-sm font-bold wv-accent-text">
            <Brain className="h-4 w-4" aria-hidden="true" />
            <span>Brain Trivia · {activeCategory.name}</span>
          </div>
          <div className="flex items-center gap-2 font-mono-tabular text-xs font-bold wv-text">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
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

        {/* 2 Session Modes: Level Climb (8/10) vs Endless Sprint */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Trivia session mode"
            className="inline-flex items-center rounded-xl border wv-border wv-card-muted p-0.5"
          >
            <button
              type="button"
              data-testid="trivia-mode-climb-btn"
              onClick={() => {
                soundService.playTapPop();
                onChangeSessionMode('level_climb');
              }}
              aria-pressed={sessionMode === 'level_climb'}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                sessionMode === 'level_climb' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Level Climb (8/10)</span>
            </button>
            <button
              type="button"
              data-testid="trivia-mode-sprint-btn"
              onClick={() => {
                soundService.playTapPop();
                onChangeSessionMode('sprint');
              }}
              aria-pressed={sessionMode === 'sprint'}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                sessionMode === 'sprint' ? 'wv-accent-btn' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Endless Sprint</span>
            </button>
          </div>

          <span className="font-mono-tabular text-xs font-bold wv-text-muted">
            {sessionMode === 'level_climb'
              ? `Q ${
                  selectedIdx === null
                    ? Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex + 1)
                    : Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex)
                }/${TRIVIA_LEVEL_CLIMB_TOTAL} · Score ${climbState.correctCount}/8`
              : `Sprint #${sprintAnswered + 1} · ${sprintCorrect} Correct`}
          </span>
        </div>

        {/* Category Pills */}
        <div data-testid="trivia-category-selector" className="flex flex-wrap gap-1.5">
          {TRIVIA_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            const unlocked = isTriviaCategoryUnlocked(cat.id, bonusUnlockUntil);
            const hrsLeft = cat.isBonusLocked
              ? getTriviaUnlockRemainingHours(cat.id, bonusUnlockUntil)
              : 0;

            return (
              <button
                key={cat.id}
                type="button"
                data-trivia-category={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'wv-accent-btn border-transparent'
                    : cat.isBonusLocked && !unlocked
                    ? 'border-amber-500/40 wv-card-muted text-amber-500'
                    : 'wv-border wv-card-muted wv-text hover:opacity-85'
                }`}
              >
                {cat.isBonusLocked &&
                  (unlocked ? (
                    <Unlock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  ))}
                <span>{cat.name}</span>
                {cat.isBonusLocked && unlocked && (
                  <span className="font-mono-tabular text-[10px] opacity-80">({hrsLeft}h)</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive 5-Level Difficulty Switcher */}
        <div className="border-t wv-border pt-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider wv-text-muted">
              Difficulty Tier
            </span>
            <span
              data-testid="trivia-active-level-badge"
              className="font-mono-tabular text-[11px] font-bold wv-accent-text"
            >
              {FIVE_LEVEL_META[activeLevel].label} ({FIVE_LEVEL_META[activeLevel].badge})
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {FIVE_LEVEL_ORDER.map((lvlId) => {
              const meta = FIVE_LEVEL_META[lvlId];
              const active = activeLevel === lvlId;
              return (
                <button
                  key={lvlId}
                  type="button"
                  data-trivia-level={lvlId}
                  aria-pressed={active}
                  onClick={() => {
                    soundService.playTapPop();
                    onChangeLevel(lvlId);
                  }}
                  className={`flex min-h-10 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-all active:scale-95 cursor-pointer ${
                    active
                      ? 'wv-accent-btn border-transparent font-bold'
                      : 'wv-border wv-card-muted wv-text hover:opacity-85 font-semibold'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs">{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t wv-border pt-2.5 text-xs">
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

      {/* Stage Summary (only at end of 10-question Level Climb stage) vs Active Question */}
      {showClimbSummary ? (
        <div
          data-testid="trivia-round-summary"
          className="wv-tilt-surface rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-md animate-modal-pop"
        >
          <div className="flex items-center gap-2 text-xs font-bold wv-accent-text">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>
              {climbState.promotedToLevel
                ? `Level Up Unlocked: ${FIVE_LEVEL_META[climbState.promotedToLevel].label}!`
                : `${FIVE_LEVEL_META[climbState.currentLevel].label} Stage Complete`}
            </span>
          </div>

          <h2 className="mt-1 font-display text-2xl font-bold wv-text">
            {climbState.correctCount} / {TRIVIA_LEVEL_CLIMB_TOTAL} Answered Correctly
          </h2>
          <p className="mt-1 text-sm wv-text-muted">
            {climbState.promotedToLevel
              ? `Awesome! You passed ${TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD}+ questions and promoted to ${FIVE_LEVEL_META[climbState.promotedToLevel].label}.`
              : climbState.correctCount >= TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD
              ? 'Mastered Legendary tier! Ready for another championship set.'
              : `Score ${TRIVIA_LEVEL_CLIMB_PASS_THRESHOLD}/10 or higher to advance to the next tier.`}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold wv-text">
                {Math.round((climbState.correctCount / TRIVIA_LEVEL_CLIMB_TOTAL) * 100)}%
              </div>
              <div className="text-[11px] wv-text-muted">Accuracy</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold wv-accent-text">
                +{doubleXpClaimed ? stageXpEarned * 2 : stageXpEarned}
              </div>
              <div className="text-[11px] wv-text-muted">Weekly XP</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted p-3">
              <div className="font-mono-tabular text-xl font-bold text-amber-500">{streak}</div>
              <div className="text-[11px] wv-text-muted">Streak</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            {canOfferDoubleXp && (
              <button
                type="button"
                data-testid="trivia-double-xp-btn"
                onClick={handleDoubleStageXp}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700 cursor-pointer"
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
                {climbState.promotedToLevel
                  ? `Start ${FIVE_LEVEL_META[climbState.promotedToLevel].label} Stage`
                  : 'Play Next 10 Questions'}
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
            <div className="flex items-center gap-2 text-xs font-bold wv-text-muted">
              <span data-testid="trivia-round-progress" className="font-mono-tabular wv-text">
                {sessionMode === 'level_climb'
                  ? `Question ${
                      selectedIdx === null
                        ? Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex + 1)
                        : Math.min(TRIVIA_LEVEL_CLIMB_TOTAL, climbState.questionIndex)
                    } / ${TRIVIA_LEVEL_CLIMB_TOTAL}`
                  : `Sprint Question #${sprintAnswered + (selectedIdx !== null ? 0 : 1)}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize wv-accent-text">{activeLevel} Tier</span>
              {lastXpFlash !== null && (
                <span
                  data-testid="trivia-xp-gain"
                  className="font-mono-tabular font-extrabold text-amber-500 animate-pop"
                >
                  +{lastXpFlash} XP
                </span>
              )}
            </div>

            <span className="rounded-lg border wv-border wv-card-muted px-2 py-0.5 font-mono-tabular text-[10px] font-bold wv-text-muted">
              0% Repeat Bank
            </span>
          </div>

          {question.personalizationReason && (
            <p
              data-testid="trivia-personalization-reason"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold wv-accent-text"
            >
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{question.personalizationReason}</span>
            </p>
          )}

          <h2
            data-testid="trivia-question-text"
            className="mt-3 font-display text-xl sm:text-[23px] font-bold leading-snug wv-text"
          >
            {question.question}
          </h2>

          {selectedIdx === null && (
            <button
              type="button"
              data-testid="trivia-watch-two-ads-btn"
              onClick={handleWatchTwoAdsForAnswer}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 wv-card-muted px-4 py-2.5 text-xs font-bold text-amber-500 transition-transform active:scale-98 cursor-pointer"
            >
              <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {adsWatchedForReveal === 0
                  ? 'Stuck? Watch 2 Ads to Reveal Answer (Ad 1 of 2)'
                  : 'Ad 1 Watched! Watch Ad 2 of 2 to Reveal Answer'}
              </span>
            </button>
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
                  styleClass = 'border-2 border-rose-500 bg-rose-500/15 wv-text font-bold';
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
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.985] cursor-pointer disabled:cursor-default ${styleClass} ${
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
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
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
                <span
                  className={`text-xs font-bold ${
                    selectedIdx === question.correctIndex
                      ? 'wv-accent-text'
                      : revivedThisQuestion
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }`}
                >
                  {selectedIdx === question.correctIndex
                    ? `Correct! +${lastXpFlash || 30} Weekly XP`
                    : revivedThisQuestion
                    ? `Streak Restored (${streakBeforeMiss})`
                    : 'Study Note'}
                </span>
                <span className="text-[11px] font-semibold wv-text-muted">{question.category}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed wv-text">{question.explanation}</p>

              {question.funFact && (
                <div
                  data-testid="trivia-fun-fact"
                  className="mt-2.5 rounded-lg border border-amber-500/35 wv-card px-3 py-2 text-xs leading-relaxed wv-text"
                >
                  <span className="font-bold text-amber-500">Did You Know? </span>
                  <span>{question.funFact}</span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {canOfferRevive && (
                  <button
                    type="button"
                    data-testid="trivia-revive-btn"
                    onClick={handleReviveStreak}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border wv-accent-pill px-4 py-2.5 text-xs font-bold cursor-pointer"
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
