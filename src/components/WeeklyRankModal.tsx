import React from 'react';
import { Award, CheckCircle2, Clock, Coins, Crown, Flame, Lock, Sparkles, Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENTS,
  computeWeeklyGrade,
  WEEKLY_GRADES,
  type WeeklyActivityState,
  type WeeklyRolloverSummary,
} from '../game/weeklyLogic';

interface WeeklyRankModalProps {
  open: boolean;
  weeklyProgress: WeeklyActivityState;
  weeklyCountdown: string;
  onClose: () => void;
}

export const WeeklyRankModal: React.FC<WeeklyRankModalProps> = ({
  open,
  weeklyProgress,
  weeklyCountdown,
  onClose,
}) => {
  if (!open) return null;

  const gradeInfo = computeWeeklyGrade(
    weeklyProgress.weeklyXp,
    weeklyProgress.unlockedAchievements.length
  );

  return (
    <div
      data-testid="weekly-rank-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-rank-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Crown className="h-4 w-4" aria-hidden="true" />
              <span>Weekly Grading &amp; Achievements</span>
            </div>
            <h2
              id="weekly-rank-title"
              className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Rank {gradeInfo.current.id} · {gradeInfo.current.tierName} ({gradeInfo.current.badgeTitle})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close weekly grading modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Active Grade Progress Card */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Current Weekly XP
                </p>
                <p
                  data-testid="modal-weekly-xp"
                  className="font-mono-tabular text-2xl font-bold text-zinc-900 dark:text-zinc-50"
                >
                  {weeklyProgress.weeklyXp.toLocaleString()} XP
                </p>
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Resets Mon 00:00 UTC</span>
                </p>
                <p
                  data-testid="weekly-reset-countdown"
                  className="mt-0.5 font-mono-tabular text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {weeklyCountdown}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-700 dark:bg-emerald-500 transition-all duration-300"
                style={{ width: `${gradeInfo.progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {gradeInfo.statusHint}
            </p>

            {/* Tier Ladder strip */}
            <div className="mt-4 grid grid-cols-5 gap-1.5 border-t border-stone-200/80 dark:border-zinc-800 pt-3 text-center">
              {WEEKLY_GRADES.map((g) => {
                const isActive = g.id === gradeInfo.current.id;
                return (
                  <div
                    key={g.id}
                    className={`rounded-lg border px-1 py-1.5 ${
                      isActive
                        ? 'border-emerald-700 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900/60'
                    }`}
                  >
                    <div
                      className={`font-display text-sm font-bold ${
                        isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {g.id}
                    </div>
                    <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      {g.tierName}
                    </div>
                    <div className="font-mono-tabular text-[9px] text-zinc-500 dark:text-zinc-500">
                      {g.minXp === 0 ? '0+' : `${g.minXp}+`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Activity Breakdown */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {weeklyProgress.puzzlesSolved}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Puzzles</div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {weeklyProgress.triviaCorrect}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Trivia</div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {weeklyProgress.bestTriviaStreak}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Top Streak</div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold text-amber-600 dark:text-amber-400">
                {weeklyProgress.bonusCoins}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Coins</div>
            </div>
          </div>

          {/* 12 Trackable Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="inline-flex items-center gap-1.5 font-display text-base font-bold text-zinc-900 dark:text-zinc-50">
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Achievements</span>
              </h3>
              <span className="font-mono-tabular text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {weeklyProgress.unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
              </span>
            </div>

            <div data-testid="achievements-list" className="space-y-2">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = weeklyProgress.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    data-achievement-id={ach.id}
                    data-unlocked={unlocked ? 'true' : 'false'}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                      unlocked
                        ? 'border-emerald-700/30 dark:border-emerald-500/35 bg-emerald-50/60 dark:bg-emerald-950/25'
                        : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {unlocked ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Lock
                            className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {ach.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {ach.description}
                      </p>
                      <p className="mt-1 font-mono-tabular text-[11px] text-zinc-500 dark:text-zinc-400">
                        Reward: +{ach.xpReward} XP · +{ach.coinReward} Coins
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono-tabular text-xs font-semibold ${
                        unlocked
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {unlocked ? 'Earned' : ach.metricLabel(weeklyProgress)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface WeeklyRolloverModalProps {
  summary: WeeklyRolloverSummary | null;
  onDismiss: () => void;
}

export const WeeklyRolloverModal: React.FC<WeeklyRolloverModalProps> = ({
  summary,
  onDismiss,
}) => {
  if (!summary) return null;

  return (
    <div
      data-testid="weekly-rollover-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-rollover-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Award className="h-4 w-4" aria-hidden="true" />
          <span>Weekly Reset · Final Grade Report</span>
        </div>

        <h2
          id="weekly-rollover-title"
          className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Last Week: Rank {summary.finalGrade} ({summary.tierName})
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Title earned: <strong className="text-zinc-900 dark:text-zinc-100">{summary.badgeTitle}</strong> · Week of {summary.weekKey}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-2.5">
            <div className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {summary.finalXp}
            </div>
            <div className="text-[11px] text-zinc-500">Weekly XP</div>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-2.5">
            <div className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {summary.puzzlesSolved + summary.triviaCorrect}
            </div>
            <div className="text-[11px] text-zinc-500">Solves</div>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-2.5">
            <div className="font-mono-tabular text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {summary.achievementsCount}
            </div>
            <div className="text-[11px] text-zinc-500">Badges</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-700/25 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 text-sm">
          <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-200">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              New Week Kickoff Bonus
            </span>
            <span className="inline-flex items-center gap-2 font-mono-tabular">
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" aria-hidden="true" />+{summary.bonusCoinsAwarded}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />+{summary.bonusXpAwarded} XP
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
        >
          Start New Weekly Climb
        </button>
      </div>
    </div>
  );
};
