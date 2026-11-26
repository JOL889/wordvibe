import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Grid3X3,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  drawZeroRepeatFaithQuestion,
  FAITH_TRADITIONS,
  getDailyFaithPassage,
  getFaithTradition,
  pickFaithPuzzleWord,
  RELIGION_IDS,
  type ReligionId,
} from '../game/faithStudyLogic';
import { recordModeOutcome } from '../game/retirementQueueLogic';
import type { TriviaQuestion } from '../game/triviaLogic';
import { soundService } from '../services/soundService';
import { ReligionIcon } from './ReligionIcons';

interface FaithStudyViewProps {
  dateKey: string;
  activeReligion: ReligionId;
  showScriptureReferences: boolean;
  completedToday: ReligionId[];
  refreshSignal?: number;
  onChangeReligion: (religion: ReligionId) => void;
  onPlayFaithPuzzle: (religion: ReligionId) => void;
  onFaithAnswerRecorded: (correct: boolean, religion: ReligionId) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// Session cache avoids re-drawing/burning an unseen question on StrictMode remount or tab switch
const pendingFaithByKey = new Map<string, TriviaQuestion>();
let lastHandledFaithRefresh = 0;

export const FaithStudyView: React.FC<FaithStudyViewProps> = ({
  dateKey,
  activeReligion,
  showScriptureReferences,
  completedToday,
  refreshSignal = 0,
  onChangeReligion,
  onPlayFaithPuzzle,
  onFaithAnswerRecorded,
}) => {
  const [currentQ, setCurrentQ] = useState<TriviaQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionSeen, setSessionSeen] = useState<string[]>([]);

  const tradition = useMemo(() => getFaithTradition(activeReligion), [activeReligion]);
  const passage = useMemo(
    () => getDailyFaithPassage(activeReligion, dateKey),
    [activeReligion, dateKey]
  );
  const dailyWord = useMemo(
    () => pickFaithPuzzleWord(activeReligion, 5, dateKey),
    [activeReligion, dateKey]
  );

  const drawNextFaith = useCallback(
    (religion: ReligionId, extraSeen: string[], forceFresh = false) => {
      const cacheKey = `${religion}::sprint`;
      let q = !forceFresh ? pendingFaithByKey.get(cacheKey) : undefined;
      if (!q) {
        q = drawZeroRepeatFaithQuestion({
          religion,
          levelNumber: 1,
          excludeIdsOrQuestions: extraSeen,
        });
        pendingFaithByKey.set(cacheKey, q);
      }
      setCurrentQ(q);
      setSelectedIdx(null);
      setSessionSeen((prev) => [...prev.slice(-60), q.question]);
    },
    []
  );

  useEffect(() => {
    const forceFresh = refreshSignal !== lastHandledFaithRefresh;
    lastHandledFaithRefresh = refreshSignal;
    drawNextFaith(activeReligion, sessionSeen, forceFresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReligion, refreshSignal]);

  const activeIdx = RELIGION_IDS.indexOf(activeReligion);
  const isCompletedToday = completedToday.includes(activeReligion);
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;

  const handleSelectReligion = (nextReligion: ReligionId) => {
    if (nextReligion === activeReligion) return;
    onChangeReligion(nextReligion);
    setAnsweredCount(0);
    setCorrectCount(0);
  };

  const handleAnswer = (optIdx: number) => {
    if (!currentQ || selectedIdx !== null) return;
    setSelectedIdx(optIdx);
    pendingFaithByKey.delete(`${activeReligion}::sprint`);
    const isRight = optIdx === currentQ.correctIndex;
    const questionId = currentQ.id || `faith-q:${activeReligion}:${currentQ.question}`;
    recordModeOutcome('faith', questionId, isRight, {
      religion: activeReligion,
      question: currentQ,
    });
    setAnsweredCount((a) => a + 1);
    if (isRight) {
      setCorrectCount((prev) => prev + 1);
      soundService.playTriviaCorrect(correctCount + 1);
    } else {
      soundService.playTriviaWrong();
    }
    onFaithAnswerRecorded(isRight, activeReligion);
  };

  const handleNext = () => {
    drawNextFaith(activeReligion, sessionSeen, true);
  };

  return (
    <section
      data-testid="faith-study-view"
      aria-label="Faith Study Endless Sprint"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 sm:px-4 pt-3 pb-24 sm:pt-5 animate-stage-enter"
    >
      {/* Tradition Selector + Unbounded Numeric Level Stepper */}
      <div className="rounded-2xl border wv-border wv-card p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-display text-base font-bold wv-accent-text">
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Faith Study · Endless Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border wv-accent-pill px-2.5 py-0.5 text-xs font-bold">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Endless Mode</span>
            </span>
            {isCompletedToday && (
              <span className="inline-flex items-center gap-1 rounded-full border wv-border wv-card-muted px-2.5 py-0.5 text-xs font-bold wv-text">
                <CheckCircle2 className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                <span>Active</span>
              </span>
            )}
          </div>
        </div>

        <div
          data-testid="religion-switcher"
          role="tablist"
          aria-label="Choose faith tradition"
          className="relative grid grid-cols-6 gap-1 rounded-xl border wv-border wv-card-muted p-1"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg border wv-border wv-card shadow-xs transition-transform duration-300 ease-out"
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
                className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 ${
                  isSelected ? 'wv-text' : 'wv-text-muted hover:opacity-90'
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
      </div>

      {/* Daily Reflection & Quick Crossword Link */}
      <div
        key={`passage-${activeReligion}`}
        className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs animate-stage-enter"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl wv-accent-pill border">
            <ReligionIcon religion={activeReligion} className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
              {tradition.name} · {tradition.sacredTextLabel}
            </p>
            {showScriptureReferences && (
              <p
                data-testid="faith-passage-reference"
                className="text-xs sm:text-sm font-medium wv-text-muted"
              >
                {passage.reference}
              </p>
            )}
          </div>
        </div>

        <blockquote
          data-testid="faith-passage-quote"
          className="mt-2.5 font-display text-lg sm:text-xl font-bold leading-snug wv-text"
        >
          &ldquo;{passage.quote}&rdquo;
        </blockquote>

        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t wv-border pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold wv-text">
              <Grid3X3 className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
              <span>{tradition.shortLabel} Crossword Puzzle</span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm wv-text-muted line-clamp-1">{dailyWord.clue}</p>
          </div>

          <button
            type="button"
            data-testid="play-faith-puzzle-btn"
            onClick={() => onPlayFaithPuzzle(activeReligion)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold wv-accent-btn cursor-pointer whitespace-nowrap"
          >
            <span>Play Crossword</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Continuous Endless Sprint Quiz Card */}
      {currentQ && (
        <div
          key={`faith-q-${currentQ.question}`}
          data-testid="faith-quiz-card"
          className="wv-tilt-surface rounded-2xl border-2 wv-border wv-card p-4 sm:p-6 shadow-md animate-stage-enter"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b wv-border">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold wv-text-muted">
              <span data-testid="faith-sprint-counter" className="font-mono-tabular wv-text">
                Endless Sprint #{answeredCount + (selectedIdx !== null ? 0 : 1)}
              </span>
            </div>
            <span className="font-mono-tabular text-xs sm:text-sm font-bold wv-text-muted">
              {correctCount}/{answeredCount} ({accuracy}%)
            </span>
          </div>

          <h2
            data-testid="faith-question-text"
            className="mt-4 font-display text-xl sm:text-2xl font-bold leading-snug wv-text"
          >
            {currentQ.question}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isAnswered = selectedIdx !== null;
              const isCorrectOpt = idx === currentQ.correctIndex;
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
                  data-testid={`faith-option-${idx}`}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(idx)}
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
              data-testid="faith-explanation-box"
              className="mt-4 rounded-xl border wv-border wv-card-muted p-4 animate-stage-enter"
            >
              <p className="text-xs sm:text-sm font-bold wv-accent-text">
                {selectedIdx === currentQ.correctIndex ? 'Insight Unlocked! +35 XP' : 'Study Note'}
              </p>
              <p className="mt-1 text-sm sm:text-base leading-relaxed wv-text">
                {currentQ.explanation}
              </p>

              {currentQ.funFact && (
                <div
                  data-testid="faith-fun-fact"
                  className="mt-2.5 rounded-lg border wv-border wv-card px-3 py-2 text-xs sm:text-sm wv-text"
                >
                  <span className="font-bold wv-accent-text">Did You Know? </span>
                  <span>{currentQ.funFact}</span>
                </div>
              )}

              <button
                type="button"
                data-testid="faith-next-btn"
                onClick={handleNext}
                className="mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold wv-accent-btn cursor-pointer"
              >
                <span>Next Question (Endless)</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
