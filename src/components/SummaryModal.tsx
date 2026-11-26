import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Crown,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import {
  CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD,
  CROSSWORD_LEVEL_CLIMB_TOTAL,
  getCrosswordProgressSummary,
  type CrosswordBoardState,
  type CrosswordLevelClimbState,
} from '../game/crosswordLogic';
import type { StatsData } from '../game/puzzleLogic';
import {
  formatLevelLabel,
  normalizeLevelNumber,
  type SessionPlayMode,
} from '../game/settingsLogic';
import { getWordMeaningClue } from '../game/wordMeanings';

interface SummaryModalProps {
  open: boolean;
  sessionMode: SessionPlayMode;
  board: CrosswordBoardState;
  climbState: CrosswordLevelClimbState;
  categoryName: string;
  isPremiumCategory: boolean;
  categoryPlaysRemaining: number;
  countdown: string;
  stats: StatsData;
  canSaveStreak: boolean;
  canDoubleXp?: boolean;
  lastPuzzleXpEarned?: number;
  weeklyRank?: number;
  activeWeeklyPlayersCount?: number;
  weeklyXp?: number;
  personalizedReason?: string;
  personalizedCulturalNote?: string;
  funFact?: string;
  onClose: () => void;
  onShare: () => Promise<string | void> | void;
  onInviteFriends?: () => Promise<string | void> | void;
  onWatchAdSaveStreak: () => void;
  onWatchAdDoubleXp?: () => void;
  onWatchAdUnlockCategory: () => void;
  onNextBoard: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  open,
  sessionMode,
  board,
  climbState,
  categoryName,
  isPremiumCategory,
  categoryPlaysRemaining,
  countdown,
  stats,
  canSaveStreak,
  canDoubleXp = false,
  lastPuzzleXpEarned = 0,
  weeklyRank,
  activeWeeklyPlayersCount,
  weeklyXp,
  personalizedReason,
  personalizedCulturalNote,
  funFact,
  onClose,
  onShare,
  onInviteFriends,
  onWatchAdSaveStreak,
  onWatchAdDoubleXp,
  onWatchAdUnlockCategory,
  onNextBoard,
}) => {
  const [selectedSummaryWord, setSelectedSummaryWord] = useState<{
    word: string;
    label: string;
    meaning: string;
  } | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setShareNote(null);
      setSelectedSummaryWord(null);
    }
  }, [open]);

  if (!open) return null;

  const isBoardWon = board.status === 'won';
  const prog = getCrosswordProgressSummary(board);
  const boardLevelNum = board.levelNumber ?? normalizeLevelNumber(board.level, 1);
  const levelLabel = formatLevelLabel(boardLevelNum);
  const climbLevelNum = climbState.levelNumber ?? normalizeLevelNumber(climbState.currentLevel, 1);
  const promotedLevelNum = climbState.promotedToLevelNumber;
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div
      data-testid="summary-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="my-auto w-full max-w-md rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
              {sessionMode === 'level_climb'
                ? `Level Climb · ${levelLabel}`
                : 'Endless Sprint'}{' '}
              · {board.length}×{board.length}
            </p>
            <h2 id="summary-modal-title" className="mt-1 font-display text-2xl font-bold wv-text">
              {isBoardWon ? 'Crossword Solved!' : 'Crossword Stats'}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm wv-text-muted">{categoryName}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Climb Stage Status Banner */}
        {sessionMode === 'level_climb' && (
          <div className="mt-3.5 rounded-xl border wv-border wv-card-muted p-3.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold wv-accent-text">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>
                  {climbState.stageComplete
                    ? promotedLevelNum
                      ? `Level Up to ${formatLevelLabel(promotedLevelNum)}!`
                      : `Stage Complete (${climbState.roundPassedCount}/${CROSSWORD_LEVEL_CLIMB_TOTAL})`
                    : `Climb Progress · ${formatLevelLabel(climbLevelNum)}`}
                </span>
              </span>
              <span className="font-mono-tabular font-bold wv-text">
                {climbState.roundIndex}/{CROSSWORD_LEVEL_CLIMB_TOTAL}
              </span>
            </div>
            <p className="mt-1 wv-text-muted">
              {climbState.stageComplete
                ? promotedLevelNum
                  ? `You beat all ${climbState.roundPassedCount}/${CROSSWORD_LEVEL_CLIMB_TOTAL} shrinking timers! Promoted to ${formatLevelLabel(promotedLevelNum)}!`
                  : `Scored ${climbState.roundPassedCount}/${CROSSWORD_LEVEL_CLIMB_TOTAL}. Beat ${CROSSWORD_LEVEL_CLIMB_PASS_THRESHOLD}/${CROSSWORD_LEVEL_CLIMB_TOTAL} within the timer to unlock Level ${climbLevelNum + 1}.`
                : `${climbState.roundPassedCount}/${CROSSWORD_LEVEL_CLIMB_TOTAL} timed wins so far — win all 5 concurrently before time runs out to reach Level ${climbLevelNum + 1}.`}
            </p>
          </div>
        )}

        {isBoardWon && (
          <div className="mt-3.5 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border wv-border wv-card-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 wv-accent-text" aria-hidden="true" />
                <div>
                  <span className="text-xs wv-text-muted">Linked Words Solved</span>
                  <p className="font-mono-tabular text-base font-bold wv-text">
                    {prog.solvedWordsCount} / {prog.totalWords}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs wv-text-muted">Wrong Checks / Hints</span>
                <p className="font-mono-tabular text-sm font-bold wv-text">
                  {board.wrongChecks} err · {board.hintsUsed} hints
                </p>
              </div>
            </div>

            {typeof weeklyRank === 'number' && typeof activeWeeklyPlayersCount === 'number' && (
              <div
                data-testid="summary-weekly-rank"
                className="flex items-center justify-between gap-2 rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-xs sm:text-sm"
              >
                <span className="inline-flex items-center gap-1.5 font-bold wv-text">
                  <Crown className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
                  <span>
                    Rank #{weeklyRank} of {activeWeeklyPlayersCount} active players this week
                  </span>
                </span>
                {typeof weeklyXp === 'number' && (
                  <span className="font-mono-tabular font-bold wv-accent-text shrink-0">
                    {weeklyXp.toLocaleString()} XP
                  </span>
                )}
              </div>
            )}

            {personalizedReason && (
              <div className="rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 font-bold wv-accent-text">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{personalizedReason}</span>
                </div>
                {personalizedCulturalNote && (
                  <p className="mt-1 leading-relaxed wv-text-muted">{personalizedCulturalNote}</p>
                )}
              </div>
            )}

            {funFact && (
              <div className="rounded-xl border wv-border wv-card-muted px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed wv-text">
                <span className="font-bold wv-accent-text">Did You Know? </span>
                <span>{funFact}</span>
              </div>
            )}

            <div
              data-testid="summary-cross-words"
              className="rounded-xl border wv-border wv-card-muted px-3.5 py-3 text-xs sm:text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold wv-text">
                  Completed Linked Grid ({board.length}×{board.length})
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold wv-accent-text">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tap word</span>
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 font-mono-tabular text-xs wv-text">
                <div>
                  <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Across</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {board.solution.rows.map((w, idx) => (
                      <button
                        key={`sum-r-${idx}`}
                        type="button"
                        onClick={() =>
                          setSelectedSummaryWord({
                            word: w,
                            label: `Row ${idx + 1} Across`,
                            meaning: getWordMeaningClue(w, categoryName),
                          })
                        }
                        className={`rounded-md px-1.5 py-0.5 font-bold cursor-pointer ${
                          selectedSummaryWord?.word === w &&
                          selectedSummaryWord?.label === `Row ${idx + 1} Across`
                            ? 'wv-accent-btn'
                            : 'border wv-border wv-card hover:opacity-85'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-sans font-bold wv-accent-text">
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Down</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {board.solution.cols.map((w, idx) => (
                      <button
                        key={`sum-c-${idx}`}
                        type="button"
                        onClick={() =>
                          setSelectedSummaryWord({
                            word: w,
                            label: `Col ${idx + 1} Down`,
                            meaning: getWordMeaningClue(w, categoryName),
                          })
                        }
                        className={`rounded-md px-1.5 py-0.5 font-bold cursor-pointer ${
                          selectedSummaryWord?.word === w &&
                          selectedSummaryWord?.label === `Col ${idx + 1} Down`
                            ? 'wv-accent-btn'
                            : 'border wv-border wv-card hover:opacity-85'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {selectedSummaryWord && (
                <div
                  data-testid="summary-word-definition"
                  className="mt-2.5 rounded-lg border wv-border wv-card px-3 py-2 text-xs leading-relaxed wv-text"
                >
                  <span className="font-bold wv-accent-text">
                    {selectedSummaryWord.word} ({selectedSummaryWord.label}):{' '}
                  </span>
                  <span>{selectedSummaryWord.meaning}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4 Key Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{stats.gamesPlayed}</div>
            <div className="mt-0.5 text-xs font-medium wv-text-muted">Played</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{winRate}%</div>
            <div className="mt-0.5 text-xs font-medium wv-text-muted">Win Rate</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-accent-text">
              {stats.currentStreak}
            </div>
            <div className="mt-0.5 text-xs font-medium wv-text-muted">Streak</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted py-2.5 px-1">
            <div className="font-mono-tabular text-xl font-bold wv-text">{stats.bestStreak}</div>
            <div className="mt-0.5 text-xs font-medium wv-text-muted">Best</div>
          </div>
        </div>

        {(canSaveStreak || (isBoardWon && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp)) && (
          <div className="mt-4 flex flex-col gap-2 border-t wv-border pt-4">
            {isBoardWon && canDoubleXp && lastPuzzleXpEarned > 0 && onWatchAdDoubleXp && (
              <button
                type="button"
                data-testid="puzzle-double-xp-btn"
                onClick={onWatchAdDoubleXp}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl wv-gold-pill px-4 py-2.5 text-sm font-bold transition-transform active:scale-95 cursor-pointer"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad for 2x Weekly XP (+{lastPuzzleXpEarned} XP)</span>
              </button>
            )}
            {canSaveStreak && (
              <button
                type="button"
                onClick={onWatchAdSaveStreak}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border wv-accent-pill px-4 py-2.5 text-sm font-bold cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Watch Ad to Save Streak ({stats.previousLostStreak} days)</span>
              </button>
            )}
          </div>
        )}

        {isPremiumCategory && (
          <div className="mt-4 flex items-center justify-between rounded-xl border wv-border wv-card-muted px-3.5 py-2 text-xs sm:text-sm">
            <span className="font-semibold wv-text">{categoryName} Access</span>
            <span className="font-mono-tabular font-bold wv-accent-text">
              {categoryPlaysRemaining > 0
                ? `${categoryPlaysRemaining} plays left`
                : '0 plays left · Ad or 300 XP'}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t wv-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 wv-accent-text" aria-hidden="true" />
              <div>
                <div className="text-xs font-medium wv-text-muted">Daily Cycle Reset</div>
                <div className="font-mono-tabular text-sm font-bold wv-text">{countdown}</div>
              </div>
            </div>

            {isPremiumCategory && categoryPlaysRemaining <= 0 ? (
              <button
                type="button"
                onClick={onWatchAdUnlockCategory}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl wv-accent-btn px-4 py-2 text-sm font-bold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Unlock Topic</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="summary-next-board-btn"
                onClick={onNextBoard}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl wv-gold-pill px-4 py-2 text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <span>
                  {sessionMode === 'level_climb'
                    ? climbState.stageComplete
                      ? promotedLevelNum
                        ? `Start ${formatLevelLabel(promotedLevelNum)}`
                        : 'Retry Stage'
                      : 'Next Climb Board'
                    : 'Next Crossword'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {isBoardWon && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="summary-share-progress-btn"
                  onClick={() => {
                    void Promise.resolve(onShare()).then((res) => {
                      if (res === 'copied') {
                        setShareNote('Score & rank copied to clipboard — ready to paste!');
                      } else if (res === 'shared') {
                        setShareNote('Progress shared!');
                      } else if (res === 'failed') {
                        setShareNote('Clipboard blocked in this browser — share manually.');
                      }
                    });
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl wv-accent-btn px-3 py-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Share Progress</span>
                </button>

                {onInviteFriends && (
                  <button
                    type="button"
                    data-testid="summary-invite-friends-btn"
                    onClick={() => {
                      void Promise.resolve(onInviteFriends()).then((res) => {
                        if (res === 'copied') {
                          setShareNote('Invite message copied to clipboard!');
                        } else if (res === 'shared') {
                          setShareNote('Invite sent!');
                        } else if (res === 'failed') {
                          setShareNote('Clipboard blocked in this browser — copy URL to invite.');
                        }
                      });
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border wv-border wv-card-muted px-3 py-2 text-xs sm:text-sm font-bold wv-text hover:opacity-90 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                    <span>Invite Friends</span>
                  </button>
                )}
              </div>
              {shareNote && (
                <p
                  data-testid="summary-share-feedback"
                  role="status"
                  className="flex items-center justify-center gap-1 text-center text-xs font-semibold wv-accent-text"
                >
                  <Copy className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{shareNote}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
