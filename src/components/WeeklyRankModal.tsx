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
      <div className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border-2 wv-border wv-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b wv-border px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Crown className="h-4 w-4" aria-hidden="true" />
              <span>Weekly Grading &amp; Achievements</span>
            </div>
            <h2
              id="weekly-rank-title"
              className="mt-1 font-display text-2xl font-bold wv-text"
            >
              Rank {gradeInfo.current.id} · {gradeInfo.current.tierName} ({gradeInfo.current.badgeTitle})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close weekly grading modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Active Grade Progress Card */}
          <div className="rounded-xl border wv-border wv-card-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium wv-text-muted">
                  Current Weekly XP
                </p>
                <p
                  data-testid="modal-weekly-xp"
                  className="font-mono-tabular text-2xl font-bold wv-text"
                >
                  {weeklyProgress.weeklyXp.toLocaleString()} XP
                </p>
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-1 text-xs font-medium wv-text-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Resets Mon 00:00 UTC</span>
                </p>
                <p
                  data-testid="weekly-reset-countdown"
                  className="mt-0.5 font-mono-tabular text-sm font-semibold wv-text"
                >
                  {weeklyCountdown}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
              <div
                className="h-full rounded-full wv-accent-btn transition-all duration-300"
                style={{ width: `${gradeInfo.progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-medium wv-text-muted">
              {gradeInfo.statusHint}
            </p>

            {/* Tier Ladder strip */}
            <div className="mt-4 grid grid-cols-5 gap-1.5 border-t wv-border pt-3 text-center">
              {WEEKLY_GRADES.map((g) => {
                const isActive = g.id === gradeInfo.current.id;
                return (
                  <div
                    key={g.id}
                    className={`rounded-lg border px-1 py-1.5 ${
                      isActive ? 'wv-accent-pill' : 'wv-border wv-card'
                    }`}
                  >
                    <div
                      className={`font-display text-sm font-bold ${
                        isActive ? 'wv-accent-text' : 'wv-text'
                      }`}
                    >
                      {g.id}
                    </div>
                    <div className="text-[10px] font-semibold wv-text-muted">
                      {g.tierName}
                    </div>
                    <div className="font-mono-tabular text-[9px] wv-text-muted">
                      {g.minXp === 0 ? '0+' : `${g.minXp}+`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Activity Breakdown */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold wv-text">
                {weeklyProgress.puzzlesSolved}
              </div>
              <div className="text-[11px] wv-text-muted">Puzzles</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold wv-text">
                {weeklyProgress.triviaCorrect}
              </div>
              <div className="text-[11px] wv-text-muted">Trivia</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold wv-accent-text">
                {weeklyProgress.bestTriviaStreak}
              </div>
              <div className="text-[11px] wv-text-muted">Top Streak</div>
            </div>
            <div className="rounded-xl border wv-border wv-card-muted px-2 py-2.5">
              <div className="font-mono-tabular text-lg font-bold text-amber-500">
                {weeklyProgress.bonusCoins}
              </div>
              <div className="text-[11px] wv-text-muted">Coins</div>
            </div>
          </div>

          {/* 12 Trackable Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="inline-flex items-center gap-1.5 font-display text-base font-bold wv-text">
                <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>Achievements</span>
              </h3>
              <span className="font-mono-tabular text-xs font-semibold wv-text-muted">
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
                      unlocked ? 'wv-accent-pill' : 'wv-border wv-card-muted'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {unlocked ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 wv-accent-text"
                            aria-hidden="true"
                          />
                        ) : (
                          <Lock
                            className="h-3.5 w-3.5 shrink-0 wv-text-muted"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-sm font-semibold wv-text">
                          {ach.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs wv-text-muted">
                        {ach.description}
                      </p>
                      <p className="mt-1 font-mono-tabular text-[11px] wv-text-muted">
                        Reward: +{ach.xpReward} XP · +{ach.coinReward} Coins
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono-tabular text-xs font-semibold ${
                        unlocked ? 'wv-accent-text' : 'wv-text-muted'
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
      <div className="w-full max-w-md rounded-2xl border-2 wv-border wv-card p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider wv-accent-text">
          <Award className="h-4 w-4" aria-hidden="true" />
          <span>Weekly Reset · Final Grade Report</span>
        </div>

        <h2
          id="weekly-rollover-title"
          className="mt-1 font-display text-2xl font-bold wv-text"
        >
          Last Week: Rank {summary.finalGrade} ({summary.tierName})
        </h2>
        <p className="mt-1 text-xs wv-text-muted">
          Title earned: <strong className="wv-text">{summary.badgeTitle}</strong> · Week of {summary.weekKey}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-text">
              {summary.finalXp}
            </div>
            <div className="text-[11px] wv-text-muted">Weekly XP</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-text">
              {summary.puzzlesSolved + summary.triviaCorrect}
            </div>
            <div className="text-[11px] wv-text-muted">Solves</div>
          </div>
          <div className="rounded-xl border wv-border wv-card-muted p-2.5">
            <div className="font-mono-tabular text-lg font-bold wv-accent-text">
              {summary.achievementsCount}
            </div>
            <div className="text-[11px] wv-text-muted">Badges</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border wv-accent-pill p-3.5 text-sm">
          <div className="flex items-center justify-between font-bold">
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
          className="mt-5 w-full min-h-12 rounded-xl wv-accent-btn py-3 text-sm font-bold cursor-pointer"
        >
          Start New Weekly Climb
        </button>
      </div>
    </div>
  );
};
