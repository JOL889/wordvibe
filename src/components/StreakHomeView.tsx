import React from 'react';
import {
  ArrowRight,
  Brain,
  CalendarDays,
  Check,
  Clock,
  Compass,
  Crown,
  Flame,
  HelpCircle,
  Lock,
  Minus,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Unlock,
} from 'lucide-react';
import { getCategoryById } from '../data/categories';
import type { DailyEntertainmentSpotlight } from '../game/entertainmentLogic';
import {
  formatLocationLabel,
  summarizePlayerProfile,
  type PlayerProfileState,
} from '../game/playerProfileLogic';
import {
  getCategoryRemainingPlays,
  type HomeChallenge,
  type StatsData,
  type WeekStreakDay,
} from '../game/puzzleLogic';
import {
  ACHIEVEMENTS,
  computeWeeklyGrade,
  type WeeklyActivityState,
} from '../game/weeklyLogic';
import type { HelpSectionTab } from './HowToPlayModal';
import {
  getDailyFaithPassage,
  getFaithTradition,
  type ReligionId,
} from '../game/faithStudyLogic';
import { ReligionIcon } from './ReligionIcons';

interface StreakHomeViewProps {
  stats: StatsData;
  dateKey: string;
  activeReligion: ReligionId;
  puzzleNumber: number;
  countdown: string;
  weekDays: WeekStreakDay[];
  challenges: HomeChallenge[];
  activeCategoryName: string;
  spotlight: DailyEntertainmentSpotlight;
  playsRemaining: Record<string, number>;
  canSaveStreak: boolean;
  weeklyProgress: WeeklyActivityState;
  weeklyCountdown: string;
  playerProfile: PlayerProfileState;
  onOpenPersonalize: () => void;
  onPlayPersonalizedPuzzle: () => void;
  onWatchAdSaveStreak: () => void;
  onStartPuzzle: () => void;
  onStartFaith: () => void;
  onStartTrivia: () => void;
  onOpenWeeklyRank: () => void;
  onSelectChallenge: (challenge: HomeChallenge) => void;
  onPlayEntertainmentCategory: (categoryId: string) => void;
  onBrowseEntertainment: () => void;
  onOpenHelp?: (tab?: HelpSectionTab) => void;
}

export const StreakHomeView: React.FC<StreakHomeViewProps> = ({
  stats,
  dateKey,
  activeReligion,
  puzzleNumber,
  countdown,
  weekDays,
  challenges,
  activeCategoryName,
  spotlight,
  playsRemaining,
  canSaveStreak,
  weeklyProgress,
  weeklyCountdown,
  playerProfile,
  onOpenPersonalize,
  onPlayPersonalizedPuzzle,
  onWatchAdSaveStreak,
  onStartPuzzle,
  onStartFaith,
  onStartTrivia,
  onOpenWeeklyRank,
  onSelectChallenge,
  onPlayEntertainmentCategory,
  onBrowseEntertainment,
  onOpenHelp,
}) => {
  const faithTradition = getFaithTradition(activeReligion);
  const dailyFaithPassage = getDailyFaithPassage(activeReligion, dateKey);
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const completedChallenges = challenges.filter((c) => c.completed).length;
  const completedThisWeek = weekDays.filter((d) => d.state === 'completed').length;
  const weeklyGrade = computeWeeklyGrade(
    weeklyProgress.weeklyXp,
    weeklyProgress.unlockedAchievements.length
  );

  const heroCategory = getCategoryById(spotlight.heroCategoryId);
  const heroPlays = getCategoryRemainingPlays(heroCategory, playsRemaining);
  const heroLocked = heroCategory.isPremium && heroPlays <= 0;
  const insights = summarizePlayerProfile(playerProfile);
  const locationLabel = playerProfile.locationEnabled
    ? formatLocationLabel(playerProfile.location)
    : 'Global Mix';

  return (
    <section
      data-testid="streak-home"
      aria-label="WordVibe streak and game launcher"
      className="mx-auto flex w-full max-w-xl lg:max-w-5xl flex-col gap-4 px-4 sm:px-6 pt-4 pb-24 sm:pt-5 animate-stage-enter"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        {/* Primary Column: Arcade Streak Hero + Daily Quests */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Tactile Word-Game Streak Hero */}
          <div className="wv-tilt-surface relative overflow-hidden rounded-2xl border-2 wv-border wv-card shadow-md">
            <div className="wv-hero-arcade relative px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    <Flame className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                    <span className="font-bold">WordVibe Streak · #{puzzleNumber}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span
                      data-testid="home-streak-count"
                      className="font-display text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)] tabular-nums"
                    >
                      {stats.currentStreak}
                    </span>
                    <span className="font-display text-lg sm:text-xl font-bold text-white">
                      {stats.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                    </span>
                  </div>
                </div>

                {/* Decorative Tactile Word Tiles */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {['P', 'L', 'A', 'Y'].map((letter, idx) => (
                    <span
                      key={letter}
                      style={{ animationDelay: `${idx * 70}ms` }}
                      className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border-2 wv-tile-wooden font-display text-xl font-bold animate-tile-deal"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-white/95">
                <span>
                  Best:{' '}
                  <strong className="font-mono-tabular font-extrabold text-white">
                    {stats.bestStreak}
                  </strong>
                </span>
                <span>
                  Win Rate:{' '}
                  <strong className="font-mono-tabular font-extrabold text-white">{winRate}%</strong>
                </span>
                <span>
                  Reset in:{' '}
                  <strong className="font-mono-tabular font-extrabold text-white">{countdown}</strong>
                </span>
              </div>
            </div>

            {/* Clean 7-Day Rhythm Strip */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs sm:text-sm wv-text-muted mb-2.5">
                <span className="inline-flex items-center gap-1.5 font-bold wv-text">
                  <CalendarDays className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                  <span>7-Day Rhythm</span>
                </span>
                <span className="font-mono-tabular font-semibold">
                  {completedThisWeek} / 7 days active
                </span>
              </div>

              <div data-testid="week-streak-grid" className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const isCompleted = day.state === 'completed';
                  const isTodayPending = day.state === 'today';
                  const isMissed = day.state === 'missed';

                  return (
                    <div
                      key={day.dateKey}
                      data-week-day={day.shortLabel}
                      data-day-state={day.state}
                      className={`flex flex-col items-center rounded-xl py-2 px-1 border ${
                        isCompleted
                          ? 'wv-accent-pill'
                          : isTodayPending
                          ? 'wv-border wv-card-muted ring-2 ring-[var(--wv-accent)]/50'
                          : 'wv-border wv-card-muted opacity-80'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase wv-text-muted">
                        {day.shortLabel}
                      </span>
                      <div
                        className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted
                            ? 'wv-accent-btn'
                            : isTodayPending
                            ? 'wv-gold-pill'
                            : 'wv-card wv-text-muted border wv-border'
                        }`}
                        aria-label={`${day.shortLabel} ${day.dayNumber}: ${day.state}`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                        ) : isTodayPending ? (
                          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : isMissed ? (
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <span className="font-mono-tabular text-xs">{day.dayNumber}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clean Game Mode Launcher Buttons */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  data-testid="home-play-puzzle-btn"
                  onClick={onStartPuzzle}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-2.5 font-display text-base font-bold cursor-pointer"
                >
                  <span>Play Crossword</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  data-testid="home-play-trivia-btn"
                  onClick={onStartTrivia}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl wv-gold-pill px-4 py-2.5 font-display text-base font-bold transition-transform active:scale-95 cursor-pointer"
                >
                  <Brain className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Play Trivia</span>
                </button>

                {canSaveStreak && (
                  <button
                    type="button"
                    onClick={onWatchAdSaveStreak}
                    className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border wv-accent-pill px-3.5 py-2.5 text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Save ({stats.previousLostStreak}d)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Streamlined Daily Quests */}
          <div className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <h2 className="font-display text-xl font-bold wv-text">Daily Quests</h2>
              </div>
              <span
                data-testid="challenges-summary"
                className="font-mono-tabular text-xs sm:text-sm font-bold wv-accent-text"
              >
                {completedChallenges} / {challenges.length}
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full wv-card-muted">
              <div
                className="h-full rounded-full wv-accent-btn transition-all duration-300"
                style={{ width: `${Math.round((completedChallenges / challenges.length) * 100)}%` }}
              />
            </div>

            <div data-testid="challenges-list" className="mt-3 divide-y wv-border">
              {challenges.slice(0, 4).map((ch) => {
                const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
                return (
                  <div
                    key={ch.id}
                    data-challenge-id={ch.id}
                    data-challenge-completed={ch.completed ? 'true' : 'false'}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ch.completed ? (
                          <Check
                            className="h-4 w-4 shrink-0 wv-accent-text"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        ) : ch.openCategories ? (
                          <Compass className="h-4 w-4 shrink-0 wv-accent-text" aria-hidden="true" />
                        ) : (
                          <Trophy className="h-4 w-4 shrink-0 wv-text-muted" aria-hidden="true" />
                        )}
                        <h3 className="truncate font-display text-base font-bold wv-text">
                          {ch.title}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-2 max-w-xs">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full wv-card-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ch.completed ? 'wv-accent-btn' : 'bg-[var(--wv-text-muted)]/45'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-tabular text-xs font-bold wv-text-muted">
                          {ch.current}/{ch.target}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectChallenge(ch)}
                      className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${
                        ch.completed
                          ? 'wv-accent-pill'
                          : 'wv-border wv-card-muted wv-text hover:opacity-85'
                      }`}
                    >
                      {ch.completed ? 'Done' : ch.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Secondary Column: Faith Sprint, Weekly Rank & Personalized Pick */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Endless Faith Study Card */}
          <div
            data-testid="home-faith-study-card"
            className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border wv-accent-pill">
                  <ReligionIcon religion={activeReligion} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
                    Endless Faith Sprint · {faithTradition.name}
                  </p>
                  <h2 className="truncate font-display text-lg font-bold wv-text">
                    {faithTradition.sacredTextLabel}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                data-testid="home-open-faith-btn"
                onClick={onStartFaith}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold wv-accent-btn cursor-pointer whitespace-nowrap"
              >
                <span>Study</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2.5 text-sm italic leading-relaxed wv-text-muted line-clamp-2">
              &ldquo;{dailyFaithPassage.quote}&rdquo;
            </p>
          </div>

          {/* Weekly Rank + Curated Pick Card */}
          <div
            data-testid="home-weekly-rank-card"
            className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold wv-accent-text">
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Rank {weeklyGrade.current.id} · {weeklyGrade.current.tierName}
                  </span>
                </div>
                <h2 className="mt-0.5 font-display text-lg font-bold wv-text">
                  {weeklyProgress.weeklyXp} Weekly XP · {weeklyProgress.bonusCoins} Coins
                </h2>
              </div>

              <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold wv-text-muted shrink-0">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {weeklyCountdown}
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full wv-card-muted">
              <div
                className="h-full rounded-full wv-accent-btn transition-all duration-300"
                style={{ width: `${weeklyGrade.progressPercent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="font-mono-tabular wv-text-muted">
                Badges: {weeklyProgress.unlockedAchievements.length}/{ACHIEVEMENTS.length} · Topic:{' '}
                {activeCategoryName}
              </span>
              <button
                type="button"
                data-testid="home-open-weekly-rank-btn"
                onClick={onOpenWeeklyRank}
                className="rounded-xl border wv-border wv-card-muted px-3 py-1.5 text-xs sm:text-sm font-bold wv-text hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                Rank &amp; Badges
              </button>
            </div>
          </div>

          {/* Unified Personalization & Featured Topic Card */}
          <div
            data-testid="home-entertainment-spotlight"
            className="rounded-2xl border wv-border wv-card p-4 sm:p-5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
                  {locationLabel} · {spotlight.eventTitle}
                </p>
                <h2 className="mt-0.5 font-display text-lg font-bold wv-text truncate">
                  {heroCategory.name}
                </h2>
              </div>

              <button
                type="button"
                data-testid="open-personalization-btn"
                onClick={onOpenPersonalize}
                className="shrink-0 rounded-xl border wv-border wv-card-muted px-3 py-1.5 text-xs sm:text-sm font-bold wv-text hover:opacity-85 cursor-pointer"
              >
                Personalize
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="home-for-you-puzzle-btn"
                onClick={onPlayPersonalizedPuzzle}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border wv-accent-pill px-3 py-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {insights.favoriteLength}×{insights.favoriteLength} For You
                </span>
              </button>

              <button
                type="button"
                data-testid="home-play-hero-entertainment-btn"
                onClick={() => onPlayEntertainmentCategory(heroCategory.id)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border wv-border wv-card-muted px-3 py-2 text-xs sm:text-sm font-bold wv-text hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                {heroCategory.isPremium ? (
                  heroLocked ? (
                    <Lock className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                  )
                ) : null}
                <span>{heroLocked ? 'Unlock Topic' : 'Play Topic'}</span>
              </button>

              <button
                type="button"
                data-testid="home-browse-entertainment-btn"
                onClick={onBrowseEntertainment}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border wv-border wv-card-muted px-3 py-2 text-xs sm:text-sm font-bold wv-text-muted hover:opacity-85 cursor-pointer"
              >
                100 Topics
              </button>
            </div>
          </div>
        </div>
      </div>

      {onOpenHelp && (
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            data-testid="home-enquiry-help-btn"
            onClick={() => onOpenHelp('rules')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold wv-text-muted hover:underline underline-offset-4 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>How to Play Crossword, Climb &amp; Faith Sprint</span>
          </button>
        </div>
      )}
    </section>
  );
};
