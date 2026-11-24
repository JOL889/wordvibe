import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ExternalLink,
  Flame,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Split,
  Unlock,
  XCircle,
  Zap,
} from 'lucide-react';
import type { ReligionId } from '../game/faithStudyLogic';
import {
  formatLocationLabel,
  INTEREST_CATALOG,
  summarizePlayerProfile,
  type PlayerProfileState,
} from '../game/playerProfileLogic';
import { buildUserResearchDossier } from '../game/userResearchLogic';
import {
  calculateTriviaXp,
  computeFiftyFiftyIndices,
  getStreakMultiplier,
  getTriviaCategoryById,
  getTriviaDifficultyForStreak,
  getTriviaUnlockRemainingHours,
  isTriviaCategoryUnlocked,
  pickFallbackTriviaQuestion,
  TRIVIA_CATEGORIES,
  TRIVIA_ROUND_LENGTH,
  type TriviaQuestion,
} from '../game/triviaLogic';
import { rewardedAdService, type RewardPlacement } from '../services/rewardedAdService';
import { soundService } from '../services/soundService';

interface TriviaViewProps {
  selectedCategoryId: string;
  streak: number;
  bestStreak: number;
  freeHintAvailableToday: boolean;
  bonusUnlockUntil: Record<string, number>;
  recentQuestions: string[];
  playerProfile: PlayerProfileState;
  activeReligion?: ReligionId;
  onOpenPersonalize: () => void;
  onSelectCategory: (categoryId: string) => void;
  onUnlockBonusCategory: () => void;
  onUseFreeFiftyFiftyHint: () => void;
  onRequestAdPlacement: (
    placement: RewardPlacement,
    onGranted: () => void
  ) => void;
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
  streak,
  bestStreak,
  freeHintAvailableToday,
  bonusUnlockUntil,
  recentQuestions,
  playerProfile,
  activeReligion = 'christianity',
  onOpenPersonalize,
  onSelectCategory,
  onUnlockBonusCategory,
  onUseFreeFiftyFiftyHint,
  onRequestAdPlacement,
  onAnswerRecorded,
  onRoundCompleted,
  onDoubleXpClaimed,
}) => {
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [roundIdx, setRoundIdx] = useState(0); // 0..TRIVIA_ROUND_LENGTH - 1
  const [roundCorrectCount, setRoundCorrectCount] = useState(0);
  const [roundXpEarned, setRoundXpEarned] = useState(0);
  const [roundFinished, setRoundFinished] = useState(false);
  const [doubleXpClaimed, setDoubleXpClaimed] = useState(false);
  const [revivedThisQuestion, setRevivedThisQuestion] = useState(false);
  const [streakBeforeMiss, setStreakBeforeMiss] = useState(0);
  const [lastXpFlash, setLastXpFlash] = useState<number | null>(null);

  const [userLevel, setUserLevel] = useState<TriviaDifficulty>('novice');
  const [adsWatchedForReveal, setAdsWatchedForReveal] = useState(0);

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

  const recentRef = useRef<string[]>(recentQuestions);
  recentRef.current = recentQuestions;

  const currentStreakRef = useRef(streak);
  currentStreakRef.current = streak;

  const profileRef = useRef(playerProfile);
  profileRef.current = playerProfile;

  const questionQueueRef = useRef<TriviaQuestion[]>([]);

  const loadQuestionBatch = useCallback(
    async (categoryId: string, streakValue: number, externalSignal?: AbortSignal) => {
      setLoading(true);
      setSelectedIdx(null);
      setEliminatedIndices([]);
      setRevivedThisQuestion(false);
      setStreakBeforeMiss(0);
      setLastXpFlash(null);

      const activeProfile = profileRef.current;
      const activeLoc =
        activeProfile.locationEnabled && !activeProfile.locationOptOut
          ? activeProfile.location
          : null;
      const insights = summarizePlayerProfile(activeProfile);
      const dossier = buildUserResearchDossier(activeProfile);
      const interestLabels = activeProfile.selectedInterests.map(
        (id) => INTEREST_CATALOG.find((item) => item.id === id)?.label || id
      );
      const difficulty =
        streakValue === 0 && activeProfile.triviaAnswered >= 3
          ? insights.recommendedDifficulty
          : getTriviaDifficultyForStreak(streakValue);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 16000);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) {
          window.clearTimeout(timeoutId);
          return;
        }
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const res = await fetch('/api/trivia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            categoryId,
            difficulty,
            count: TRIVIA_ROUND_LENGTH,
            startingStreak: streakValue,
            recentQuestions: recentRef.current.slice(-15),
            location: activeLoc,
            interests: interestLabels,
            religion: categoryId === 'faith-study' ? activeReligion : undefined,
            playerSummary: dossier.promptDossier,
          }),
        });

        window.clearTimeout(timeoutId);
        if (externalSignal?.aborted) return;

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = (await res.json()) as {
          question?: TriviaQuestion;
          questions?: TriviaQuestion[];
          source?: 'gemini' | 'fallback';
          notice?: string;
        };

        if (externalSignal?.aborted) return;

        const batch =
          Array.isArray(payload.questions) && payload.questions.length > 0
            ? payload.questions
            : payload.question
            ? [payload.question]
            : [];

        if (batch.length > 0) {
          questionQueueRef.current = batch;
          setQuestion(batch[0]);
          setSourceNotice(
            payload.source === 'fallback'
              ? payload.notice || 'Playing offline question bank.'
              : null
          );
          setLoading(false);
          return;
        }
        throw new Error('Malformed trivia payload');
      } catch {
        window.clearTimeout(timeoutId);
        if (externalSignal?.aborted) return;
        const fallbackBatch: TriviaQuestion[] = [];
        const seen = [...recentRef.current];
        for (let i = 0; i < TRIVIA_ROUND_LENGTH; i++) {
          const diff =
            i === 0 ? difficulty : getTriviaDifficultyForStreak(streakValue + i);
          const q = pickFallbackTriviaQuestion(categoryId, diff, seen, {
            locationLabel: activeLoc ? formatLocationLabel(activeLoc) : undefined,
            interests: interestLabels,
          });
          fallbackBatch.push(q);
          seen.push(q.question);
        }
        questionQueueRef.current = fallbackBatch;
        setQuestion(fallbackBatch[0]);
        setSourceNotice('Offline curated bank active — seamlessly ready without network.');
        setLoading(false);
      } finally {
        externalSignal?.removeEventListener('abort', onExternalAbort);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    questionQueueRef.current = [];
    void loadQuestionBatch(selectedCategoryId, currentStreakRef.current, controller.signal);
    return () => controller.abort();
  }, [selectedCategoryId, loadQuestionBatch]);

  const handleCategoryClick = (catId: string) => {
    if (!isTriviaCategoryUnlocked(catId, bonusUnlockUntil)) {
      onUnlockBonusCategory();
      return;
    }
    onSelectCategory(catId);
    setRoundIdx(0);
    setRoundCorrectCount(0);
    setRoundXpEarned(0);
    setRoundFinished(false);
    setDoubleXpClaimed(false);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!question || selectedIdx !== null) return;
    if (eliminatedIndices.includes(optionIdx)) return;

    setSelectedIdx(optionIdx);
    const isCorrect = optionIdx === question.correctIndex;

    if (isCorrect) {
      const nextStreak = streak + 1;
      const xpGained = calculateTriviaXp(question.difficulty, nextStreak);
      soundService.playTriviaCorrect(nextStreak);
      setLastXpFlash(xpGained);
      setRoundCorrectCount((c) => c + 1);
      setRoundXpEarned((x) => x + xpGained);
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
      setRoundXpEarned((x) => x + 5);
      onAnswerRecorded({
        correct: false,
        difficulty: question.difficulty,
        streakAfter: 0,
        xpAwarded: 5,
        categoryId: selectedCategoryId,
        questionText: question.question,
      });
    }
  };

  const handleFiftyFifty = () => {
    if (!question || selectedIdx !== null || eliminatedIndices.length > 0) return;

    const applyHint = () => {
      const pair = computeFiftyFiftyIndices(question.correctIndex, roundIdx + streak + 1);
      setEliminatedIndices(pair);
      soundService.playHintChime();
    };

    if (freeHintAvailableToday) {
      onUseFreeFiftyFiftyHint();
      applyHint();
      return;
    }

    onRequestAdPlacement('trivia_fifty_fifty', () => {
      applyHint();
    });
  };

  const handleReviveStreak = () => {
    if (streakBeforeMiss < 3 || revivedThisQuestion) return;
    onRequestAdPlacement('trivia_revive', () => {
      setRevivedThisQuestion(true);
      onAnswerRecorded({
        correct: true,
        difficulty: question?.difficulty || 'medium',
        streakAfter: streakBeforeMiss,
        xpAwarded: 25,
        categoryId: selectedCategoryId,
        questionText: question?.question || '',
      });
    });
  };

  const handleNextStep = () => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= TRIVIA_ROUND_LENGTH) {
      setRoundFinished(true);
      onRoundCompleted({
        correctCount: roundCorrectCount,
        totalCount: TRIVIA_ROUND_LENGTH,
        roundXpEarned,
        categoryId: selectedCategoryId,
      });
      return;
    }
    setRoundIdx(nextIdx);
    const queuedNext = questionQueueRef.current[nextIdx];
    if (queuedNext) {
      setSelectedIdx(null);
      setEliminatedIndices([]);
      setRevivedThisQuestion(false);
      setStreakBeforeMiss(0);
      setLastXpFlash(null);
      setQuestion(queuedNext);
      return;
    }
    void loadQuestionBatch(selectedCategoryId, streak);
  };

  const handleStartFreshRound = () => {
    setRoundIdx(0);
    setRoundCorrectCount(0);
    setRoundXpEarned(0);
    setRoundFinished(false);
    setDoubleXpClaimed(false);
    questionQueueRef.current = [];
    void loadQuestionBatch(selectedCategoryId, streak);
  };

  const handleDoubleRoundXp = () => {
    if (doubleXpClaimed || roundXpEarned <= 0) return;
    onRequestAdPlacement('double_xp', () => {
      setDoubleXpClaimed(true);
      onDoubleXpClaimed(roundXpEarned);
    });
  };

  const activeCategory = getTriviaCategoryById(selectedCategoryId);
  const multiplier = getStreakMultiplier(streak);
  const difficulty = question?.difficulty || getTriviaDifficultyForStreak(streak);
  const canOfferRevive =
    selectedIdx !== null &&
    question !== null &&
    selectedIdx !== question.correctIndex &&
    streakBeforeMiss >= 3 &&
    !revivedThisQuestion &&
    rewardedAdService.canShowOptionalPrompt();

  const canOfferDoubleXp =
    roundFinished &&
    !doubleXpClaimed &&
    roundXpEarned > 0 &&
    rewardedAdService.canShowOptionalPrompt();

  return (
    <section
      data-testid="trivia-view"
      aria-label="AI Trivia challenge mode"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-3 pb-24 sm:pt-5 animate-stage-enter"
    >
      {/* Category Selector Card */}
      <div className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(24,24,27,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E6B52] dark:text-emerald-400">
            <Brain className="h-4 w-4" aria-hidden="true" />
            <span>AI Study Quiz · {activeCategory.name}</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono-tabular text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span data-testid="trivia-streak-count">{streak}</span> Streak
            </span>
            <span className="text-zinc-400">·</span>
            <span data-testid="trivia-multiplier" className="text-[#1E6B52] dark:text-emerald-400">
              {multiplier}× XP
            </span>
            <span className="hidden sm:inline text-zinc-400">·</span>
            <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">
              Best {bestStreak}
            </span>
          </div>
        </div>

        <div
          data-testid="trivia-category-selector"
          className="mt-3 flex flex-wrap gap-1.5"
        >
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
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleCategoryClick(cat.id);
                }}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'wv-accent-btn border-transparent'
                    : cat.isBonusLocked && !unlocked
                    ? 'border-amber-600/30 bg-amber-50/60 text-amber-900 hover:bg-amber-100/70 dark:border-amber-500/35 dark:bg-amber-950/30 dark:text-amber-300'
                    : 'border-stone-200/80 dark:border-zinc-800 bg-[#F7F5F0]/80 dark:bg-zinc-950/50 text-zinc-600 dark:text-zinc-300 hover:border-stone-300 hover:text-zinc-900 dark:hover:border-zinc-700'
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

        {/* 5-Level Difficulty Picker */}
        <div className="mt-3 border-t border-stone-200/70 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Difficulty Level (5 Tiers):
            </span>
            <span className="font-mono-tabular text-[11px] font-semibold text-[#1E6B52] dark:text-emerald-400 capitalize">
              {userLevel} Mode
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: 'novice', label: 'Novice', badge: 'Very Simple' },
                { id: 'beginner', label: 'Beginner', badge: 'Easy' },
                { id: 'intermediate', label: 'Intermed.', badge: 'Moderate' },
                { id: 'expert', label: 'Expert', badge: 'Challenging' },
                { id: 'legendary', label: 'Legendary', badge: 'Master' },
              ] as const
            ).map((lvl) => {
              const active = userLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  data-trivia-level={lvl.id}
                  onClick={() => {
                    soundService.playTapPop();
                    setUserLevel(lvl.id);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-all cursor-pointer ${
                    active
                      ? 'wv-accent-btn border-transparent shadow-xs font-bold'
                      : 'border-stone-200/80 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-300 hover:border-stone-300 hover:text-zinc-900 dark:hover:border-zinc-700 font-medium'
                  }`}
                >
                  <span className="text-xs">{lvl.label}</span>
                  <span className="text-[9px] opacity-75 hidden sm:inline">{lvl.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 dark:border-zinc-800 pt-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5 text-[#1E6B52] dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              {playerProfile.locationEnabled
                ? `Tuned to ${formatLocationLabel(playerProfile.location)}`
                : 'Global mix · Location off'}
            </span>
          </div>
          <button
            type="button"
            data-testid="trivia-personalize-btn"
            onClick={onOpenPersonalize}
            className="font-semibold text-[#1E6B52] dark:text-emerald-400 hover:underline underline-offset-4 cursor-pointer"
          >
            Personalize Taste &amp; City
          </button>
        </div>
      </div>

      {/* Round Summary vs Active Question Card */}
      {roundFinished ? (
        <div
          data-testid="trivia-round-summary"
          className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs animate-modal-pop"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>5-Question Round Complete</span>
          </div>

          <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {roundCorrectCount} / {TRIVIA_ROUND_LENGTH} Answered Correctly
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Category: {activeCategory.name} · Current Streak: {streak} ({multiplier}× multiplier)
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 p-3">
              <div className="font-mono-tabular text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {Math.round((roundCorrectCount / TRIVIA_ROUND_LENGTH) * 100)}%
              </div>
              <div className="text-[11px] text-zinc-500">Accuracy</div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 p-3">
              <div className="font-mono-tabular text-xl font-bold text-emerald-700 dark:text-emerald-400">
                +{doubleXpClaimed ? roundXpEarned * 2 : roundXpEarned}
              </div>
              <div className="text-[11px] text-zinc-500">Weekly XP</div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 p-3">
              <div className="font-mono-tabular text-xl font-bold text-amber-600 dark:text-amber-400">
                {streak}
              </div>
              <div className="text-[11px] text-zinc-500">Live Streak</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            {canOfferDoubleXp && (
              <button
                type="button"
                data-testid="trivia-double-xp-btn"
                onClick={handleDoubleRoundXp}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad to Double Weekly XP (+{roundXpEarned} XP)</span>
              </button>
            )}

            <button
              type="button"
              data-testid="trivia-new-round-btn"
              onClick={handleStartFreshRound}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Play Another 5 Questions</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="trivia-question-card"
          className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(24,24,27,0.03)]"
        >
          {/* Round Progress + Difficulty + 50-50 Hint trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200/70 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span data-testid="trivia-round-progress" className="font-mono-tabular font-semibold text-zinc-800 dark:text-zinc-100">
                Question {roundIdx + 1} / {TRIVIA_ROUND_LENGTH}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{difficulty} Tier</span>
              {lastXpFlash !== null && (
                <span
                  data-testid="trivia-xp-gain"
                  className="font-mono-tabular font-bold text-[#1E6B52] dark:text-emerald-400 animate-pop"
                >
                  +{lastXpFlash} XP
                </span>
              )}
            </div>

            <button
              type="button"
              data-testid="trivia-fifty-fifty-btn"
              disabled={loading || selectedIdx !== null || eliminatedIndices.length > 0}
              onClick={handleFiftyFifty}
              title={freeHintAvailableToday ? '50/50 Split (1 Free Today)' : 'Watch Ad · 50/50 Split'}
              aria-label="50/50 Split eliminate two wrong answers"
              className="relative inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-transform active:scale-95 hover:border-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <Split className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>50/50</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-amber-600 dark:text-amber-300">
                {freeHintAvailableToday ? '1' : 'Ad'}
              </span>
            </button>
          </div>

          {loading || !question ? (
            <div className="py-10 space-y-3" aria-busy="true">
              <div className="h-5 w-4/5 rounded bg-stone-200/80 dark:bg-zinc-800 animate-pulse" />
              <div className="h-5 w-2/3 rounded bg-stone-200/80 dark:bg-zinc-800 animate-pulse" />
              <div className="pt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-xl bg-stone-100 dark:bg-zinc-800/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {question.personalizationReason && (
                <p
                  data-testid="trivia-personalization-reason"
                  className="mt-3.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1E6B52] dark:text-emerald-400"
                >
                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{question.personalizationReason}</span>
                </p>
              )}

              <h2
                data-testid="trivia-question-text"
                className={`${question.personalizationReason ? 'mt-1.5' : 'mt-4'} font-display text-xl sm:text-[22px] font-bold leading-snug text-zinc-900 dark:text-zinc-50`}
              >
                {question.question}
              </h2>

              {selectedIdx === null && (
                <button
                  type="button"
                  data-testid="trivia-watch-two-ads-btn"
                  onClick={handleWatchTwoAdsForAnswer}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/50 px-4 py-3 text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/85 cursor-pointer shadow-xs active:scale-98"
                >
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    {adsWatchedForReveal === 0
                      ? 'Stuck? Watch 2 Ads Concurrently to Reveal Answer (Ad 1 of 2)'
                      : 'Ad 1 of 2 Watched! Watch Ad 2 of 2 to Reveal Answer & Get Correct Answer'}
                  </span>
                </button>
              )}

              <div data-testid="trivia-options" className="mt-4 grid grid-cols-1 gap-2.5">
                {question.options.map((opt, idx) => {
                  const isEliminated = eliminatedIndices.includes(idx);
                  const isAnswered = selectedIdx !== null;
                  const isCorrectOpt = idx === question.correctIndex;
                  const isPicked = idx === selectedIdx;

                  let styleClass =
                    'border-stone-200/90 dark:border-zinc-800 bg-[#F7F5F0]/75 dark:bg-zinc-950/50 text-zinc-900 dark:text-zinc-100 hover:border-stone-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-900';

                  if (isEliminated) {
                    styleClass =
                      'border-stone-200/50 dark:border-zinc-800/40 bg-stone-100/50 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-600 line-through opacity-50 cursor-not-allowed';
                  } else if (isAnswered) {
                    if (isCorrectOpt) {
                      styleClass =
                        'border-[#1E6B52] bg-emerald-50/80 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100';
                    } else if (isPicked) {
                      styleClass =
                        'border-rose-600 bg-rose-50/80 text-rose-950 dark:border-rose-500 dark:bg-rose-950/45 dark:text-rose-100';
                    } else {
                      styleClass =
                        'border-stone-200/70 dark:border-zinc-800/70 bg-stone-50/60 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`trivia-option-${idx}`}
                      disabled={isAnswered || isEliminated}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleSelectOption(idx);
                      }}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150 active:scale-[0.985] cursor-pointer disabled:cursor-default disabled:active:scale-100 ${styleClass} ${
                        isAnswered && isCorrectOpt ? 'animate-tile-pop' : isAnswered && isPicked && !isCorrectOpt ? 'animate-row-shake' : ''
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/20 bg-white/60 dark:bg-zinc-900/60 font-mono-tabular text-xs font-bold">
                          {OPTION_LETTERS[idx]}
                        </span>
                        <span>{opt}</span>
                      </span>

                      {isAnswered && isCorrectOpt && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                      )}
                      {isAnswered && isPicked && !isCorrectOpt && (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedIdx !== null && (
                <div
                  data-testid="trivia-explanation-box"
                  className="mt-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-950/70 p-4 animate-stage-enter"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        selectedIdx === question.correctIndex
                          ? 'text-[#1E6B52] dark:text-emerald-400'
                          : revivedThisQuestion
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {selectedIdx === question.correctIndex
                        ? `Correct! +${lastXpFlash || 40} Weekly XP`
                        : revivedThisQuestion
                        ? `Streak Restored (${streakBeforeMiss} Streak)`
                        : 'Study Note'}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {question.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {question.explanation}
                  </p>

                  {question.funFact && (
                    <div
                      data-testid="trivia-fun-fact"
                      className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-zinc-800 dark:text-amber-100"
                    >
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        Did You Know?{' '}
                      </span>
                      <span>{question.funFact}</span>
                    </div>
                  )}

                  {question.groundingSources && question.groundingSources.length > 0 && (
                    <div
                      data-testid="trivia-grounding-sources"
                      className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]"
                    >
                      <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                        Live Web Sources:
                      </span>
                      {question.groundingSources.map((src) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0.5 font-medium text-[#1E6B52] dark:text-emerald-400 hover:underline"
                        >
                          <span className="max-w-[160px] truncate">{src.title}</span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {canOfferRevive && (
                      <button
                        type="button"
                        data-testid="trivia-revive-btn"
                        onClick={handleReviveStreak}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/60 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        <span>Watch Short Ad to Keep {streakBeforeMiss}-Streak</span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="trivia-next-btn"
                      onClick={handleNextStep}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6B52] hover:bg-[#175440] dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      <span>
                        {roundIdx + 1 >= TRIVIA_ROUND_LENGTH ? 'View Round Summary' : 'Next Question'}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {sourceNotice && (
                <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {sourceNotice}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};
