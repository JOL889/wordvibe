import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Grid3X3,
  RefreshCw,
  Sparkles,
  Split,
  XCircle,
} from 'lucide-react';
import {
  FAITH_TRADITIONS,
  getDailyFaithPassage,
  getFaithTradition,
  getFaithTriviaQuestions,
  pickFaithPuzzleWord,
  RELIGION_IDS,
  type ReligionId,
} from '../game/faithStudyLogic';
import { computeFiftyFiftyIndices, type TriviaDifficulty } from '../game/triviaLogic';
import { soundService } from '../services/soundService';
import { ReligionIcon } from './ReligionIcons';

interface FaithStudyViewProps {
  dateKey: string;
  activeReligion: ReligionId;
  showScriptureReferences: boolean;
  difficultyFilter?: TriviaDifficulty;
  completedToday: ReligionId[];
  onChangeReligion: (religion: ReligionId) => void;
  onPlayFaithPuzzle: (religion: ReligionId) => void;
  onFaithAnswerRecorded: (correct: boolean, religion: ReligionId) => void;
  onFaithSessionCompleted: (params: {
    religion: ReligionId;
    correctCount: number;
    totalCount: number;
  }) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const FaithStudyView: React.FC<FaithStudyViewProps> = ({
  dateKey,
  activeReligion,
  showScriptureReferences,
  difficultyFilter,
  completedToday,
  onChangeReligion,
  onPlayFaithPuzzle,
  onFaithAnswerRecorded,
  onFaithSessionCompleted,
}) => {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [fiftyUsedThisRound, setFiftyUsedThisRound] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundDone, setRoundDone] = useState(false);

  const tradition = useMemo(() => getFaithTradition(activeReligion), [activeReligion]);
  const passage = useMemo(
    () => getDailyFaithPassage(activeReligion, dateKey),
    [activeReligion, dateKey]
  );
  const dailyWord = useMemo(
    () => pickFaithPuzzleWord(activeReligion, 5, dateKey),
    [activeReligion, dateKey]
  );
  const questions = useMemo(
    () => getFaithTriviaQuestions(activeReligion, 5, difficultyFilter),
    [activeReligion, difficultyFilter]
  );

  const currentQ = questions[questionIdx] || questions[0];
  const activeIdx = RELIGION_IDS.indexOf(activeReligion);
  const isCompletedToday = completedToday.includes(activeReligion);

  const handleSelectReligion = (nextReligion: ReligionId) => {
    if (nextReligion === activeReligion) return;
    soundService.playTapPop();
    onChangeReligion(nextReligion);
    setQuestionIdx(0);
    setSelectedIdx(null);
    setEliminatedIndices([]);
    setFiftyUsedThisRound(false);
    setCorrectCount(0);
    setRoundDone(false);
  };

  const handleAnswer = (optIdx: number) => {
    if (!currentQ || selectedIdx !== null || eliminatedIndices.includes(optIdx)) return;
    setSelectedIdx(optIdx);
    const isRight = optIdx === currentQ.correctIndex;
    if (isRight) {
      setCorrectCount((prev) => prev + 1);
      soundService.playTriviaCorrect(correctCount + 1);
    } else {
      soundService.playTriviaWrong();
    }
    onFaithAnswerRecorded(isRight, activeReligion);
  };

  const handleUseFifty = () => {
    if (!currentQ || selectedIdx !== null || eliminatedIndices.length > 0 || fiftyUsedThisRound) {
      return;
    }
    const pair = computeFiftyFiftyIndices(currentQ.correctIndex, questionIdx + activeIdx + 2);
    setEliminatedIndices(pair);
    setFiftyUsedThisRound(true);
    soundService.playFiftyFiftyWhoosh();
  };

  const handleNext = () => {
    const nextIdx = questionIdx + 1;
    if (nextIdx >= questions.length) {
      setRoundDone(true);
      soundService.playWinFanfare();
      onFaithSessionCompleted({
        religion: activeReligion,
        correctCount,
        totalCount: questions.length,
      });
      return;
    }
    setQuestionIdx(nextIdx);
    setSelectedIdx(null);
    setEliminatedIndices([]);
  };

  const handleRestartSession = () => {
    setQuestionIdx(0);
    setSelectedIdx(null);
    setEliminatedIndices([]);
    setFiftyUsedThisRound(false);
    setCorrectCount(0);
    setRoundDone(false);
  };

  return (
    <section
      data-testid="faith-study-view"
      aria-label="Faith Study mode"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 sm:px-4 pt-3 pb-24 sm:pt-5 animate-stage-enter"
    >
      {/* Icon-Based Religion Switcher Bar with smooth sliding highlight */}
      <div className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-3 sm:p-4 shadow-xs amoled-surface">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold wv-accent-text">
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Faith Study · {tradition.name}</span>
          </div>
          {isCompletedToday && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold wv-accent-pill border">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>Today Done</span>
            </span>
          )}
        </div>

        <div
          data-testid="religion-switcher"
          role="tablist"
          aria-label="Choose faith tradition"
          className="relative grid grid-cols-6 gap-1 rounded-xl bg-stone-100/90 dark:bg-zinc-950/70 p-1 border border-stone-200/70 dark:border-zinc-800/80"
        >
          {/* Smooth Sliding Active Highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-white dark:bg-zinc-800 shadow-xs border border-stone-200/80 dark:border-zinc-700 transition-transform duration-300 ease-out"
            style={{
              width: 'calc((100% - 8px) / 6)',
              transform: `translateX(${Math.max(0, activeIdx) * 100}%)`,
            }}
          />

          {RELIGION_IDS.map((id) => {
            const item = FAITH_TRADITIONS[id];
            const isSelected = id === activeReligion;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${item.name} (${item.shortLabel})`}
                data-religion={id}
                onClick={() => handleSelectReligion(id)}
                className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <ReligionIcon
                  religion={id}
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isSelected ? 'scale-110 wv-accent-text' : ''
                  }`}
                />
                <span className="truncate max-w-full leading-none">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          {tradition.tagline}
        </p>

        {/* 5-Level Difficulty Picker for Faith Study */}
        <div className="mt-3.5 border-t border-stone-200/70 dark:border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Faith Study Level (5 Tiers):
            </span>
            <span className="font-mono-tabular text-[11px] font-semibold text-[#1E6B52] dark:text-emerald-400">
              Novice · Beginner · Intermed. · Expert · Legendary
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: 'novice', label: 'Novice' },
                { id: 'beginner', label: 'Beginner' },
                { id: 'intermediate', label: 'Intermed.' },
                { id: 'expert', label: 'Expert' },
                { id: 'legendary', label: 'Legendary' },
              ] as const
            ).map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  soundService.playTapPop();
                }}
                className="flex items-center justify-center rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-950/60 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-stone-400 hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Sacred Passage & Quick 5-Letter Faith Puzzle Card */}
      <div
        key={`passage-${activeReligion}`}
        className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-5 shadow-xs animate-stage-enter amoled-surface"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl wv-accent-pill border">
              <ReligionIcon religion={activeReligion} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider wv-accent-text">
                Daily {tradition.sacredTextLabel} Reflection
              </p>
              {showScriptureReferences && (
                <p
                  data-testid="faith-passage-reference"
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {passage.reference}
                </p>
              )}
            </div>
          </div>
        </div>

        <blockquote
          data-testid="faith-passage-quote"
          className="mt-3 font-display text-lg sm:text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50"
        >
          &ldquo;{passage.quote}&rdquo;
        </blockquote>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {passage.reflection}
        </p>

        {/* Faith Word Challenge Quick-Launch */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-stone-200/75 dark:border-zinc-800 pt-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <Grid3X3 className="h-3.5 w-3.5 wv-accent-text shrink-0" aria-hidden="true" />
              <span>5-Letter {tradition.name} Word Puzzle</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              Clue preview: {dailyWord.clue}
            </p>
          </div>

          <button
            type="button"
            data-testid="play-faith-puzzle-btn"
            onClick={() => onPlayFaithPuzzle(activeReligion)}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold wv-accent-btn transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span>Play {tradition.shortLabel} Word</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 5-Question Interactive Faith Quiz */}
      {roundDone ? (
        <div
          data-testid="faith-round-summary"
          className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs animate-modal-pop amoled-surface"
        >
          <div className="flex items-center gap-2 text-xs font-semibold wv-accent-text">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{tradition.name} Study Session Complete</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {correctCount} / {questions.length} Questions Mastered
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            You earned Weekly XP and study coins for reflecting on {tradition.sacredTextLabel}.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              data-testid="faith-play-puzzle-after-btn"
              onClick={() => onPlayFaithPuzzle(activeReligion)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold wv-accent-btn transition-transform active:scale-95 cursor-pointer"
            >
              <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              <span>Play {tradition.shortLabel} Word Puzzle</span>
            </button>
            <button
              type="button"
              data-testid="faith-restart-btn"
              onClick={handleRestartSession}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-stone-200/70 dark:hover:bg-zinc-700 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Study Quiz Again</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          key={`quiz-${activeReligion}-${questionIdx}`}
          data-testid="faith-quiz-card"
          className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-6 shadow-xs animate-stage-enter amoled-surface"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200/70 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <span className="font-mono-tabular text-zinc-900 dark:text-zinc-100">
                Study {questionIdx + 1} / {questions.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{currentQ.difficulty}</span>
            </div>

            <button
              type="button"
              data-testid="faith-fifty-btn"
              disabled={selectedIdx !== null || fiftyUsedThisRound || eliminatedIndices.length > 0}
              onClick={handleUseFifty}
              aria-label="50/50 split eliminate two wrong options"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-amber-500/60 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <Split className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>50/50</span>
              <span className="font-mono-tabular text-[10px] opacity-75">
                {fiftyUsedThisRound ? '0' : '1'}
              </span>
            </button>
          </div>

          <h2
            data-testid="faith-question-text"
            className="mt-4 font-display text-lg sm:text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50"
          >
            {currentQ.question}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isElim = eliminatedIndices.includes(idx);
              const isAnswered = selectedIdx !== null;
              const isCorrectOpt = idx === currentQ.correctIndex;
              const isPicked = idx === selectedIdx;

              let styleClass =
                'border-stone-200/90 dark:border-zinc-800 bg-[#F7F5F0]/75 dark:bg-zinc-950/50 text-zinc-900 dark:text-zinc-100 hover:border-stone-400 dark:hover:border-zinc-600';
              if (isElim) {
                styleClass =
                  'border-stone-200/50 dark:border-zinc-800/40 bg-stone-100/50 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-600 line-through opacity-50 cursor-not-allowed';
              } else if (isAnswered) {
                if (isCorrectOpt) {
                  styleClass =
                    'border-[#1E6B52] bg-emerald-50/85 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/45 dark:text-emerald-100';
                } else if (isPicked) {
                  styleClass =
                    'border-rose-600 bg-rose-50/85 text-rose-950 dark:border-rose-500 dark:bg-rose-950/45 dark:text-rose-100';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`faith-option-${idx}`}
                  disabled={isAnswered || isElim}
                  onClick={() => handleAnswer(idx)}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150 active:scale-[0.985] cursor-pointer disabled:cursor-default ${styleClass} ${
                    isAnswered && isCorrectOpt
                      ? 'animate-tile-pop'
                      : isAnswered && isPicked && !isCorrectOpt
                      ? 'animate-row-shake'
                      : ''
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/20 bg-white/60 dark:bg-zinc-900/60 font-mono-tabular text-xs font-bold">
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span>{opt}</span>
                  </span>

                  {isAnswered && isCorrectOpt && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
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
              data-testid="faith-explanation-box"
              className="mt-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-[#F7F5F0] dark:bg-zinc-950/75 p-4 animate-stage-enter"
            >
              <p className="text-xs font-bold wv-accent-text">
                {selectedIdx === currentQ.correctIndex ? 'Insight Unlocked! +35 XP' : 'Study Note'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {currentQ.explanation}
              </p>

              {currentQ.funFact && (
                <div
                  data-testid="faith-fun-fact"
                  className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-xs text-zinc-800 dark:text-amber-100"
                >
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    Did You Know?{' '}
                  </span>
                  <span>{currentQ.funFact}</span>
                </div>
              )}

              <button
                type="button"
                data-testid="faith-next-btn"
                onClick={handleNext}
                className="mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold wv-accent-btn transition-transform active:scale-95 cursor-pointer"
              >
                <span>
                  {questionIdx + 1 >= questions.length
                    ? 'Complete Faith Session'
                    : 'Next Question'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
