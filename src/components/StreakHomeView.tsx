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
  MapPin,
  Minus,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Tv,
  Unlock,
} from 'lucide-react';
import { getCategoryById } from '../data/categories';
import {
  getEntertainmentSpec,
  type DailyEntertainmentSpotlight,
} from '../game/entertainmentLogic';
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
  localHeadlines: string[];
  loadingPersonalizedPuzzle?: boolean;
  onOpenPersonalize: () => void;
  onPlayPersonalizedPuzzle: () => void;
  onPlayLocalTrivia: () => void;
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
  localHeadlines,
  loadingPersonalizedPuzzle = false,
  onOpenPersonalize,
  onPlayPersonalizedPuzzle,
  onPlayLocalTrivia,
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
  const secondaryEntertainment = spotlight.featuredCategoryIds
    .slice(1, 4)
    .map((id) => getCategoryById(id));
  const insights = summarizePlayerProfile(playerProfile);
  const locationLabel = playerProfile.locationEnabled
    ? formatLocationLabel(playerProfile.location)
    : 'Off · Tap Personalize';

  return (
    <section
      data-testid="streak-home"
      aria-label="Streak overview and daily challenges"
      className="mx-auto flex w-full max-w-xl lg:max-w-5xl flex-col gap-5 px-4 sm:px-6 pt-4 pb-24 sm:pt-6 animate-stage-enter"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-6">
        {/* Left Scholar Column (Focal Streak + 5 Daily Challenges) */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Daily Streak Hero & 7-Day Week Tracker */}
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(24,24,27,0.03)]">
            {/* Subtle Universal Geometric Knowledge Motif (Golden-Ratio Study Arcs, zero distraction) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 220 220"
              className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 text-emerald-800 dark:text-emerald-400 opacity-[0.045] dark:opacity-[0.06] animate-emblem-float"
              fill="none"
            >
              <circle cx="110" cy="110" r="98" stroke="currentColor" strokeWidth="1" />
              <circle cx="110" cy="110" r="68" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 4" />
              <circle cx="110" cy="110" r="38" stroke="currentColor" strokeWidth="0.9" />
              <path d="M12 110H208M110 12V208" stroke="currentColor" strokeWidth="0.7" />
              <path d="M40 40C85 85 135 135 180 180" stroke="currentColor" strokeWidth="0.7" />
              <path d="M180 40C135 85 85 135 40 180" stroke="currentColor" strokeWidth="0.7" />
            </svg>

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold wv-accent-text">
                  <Flame className="h-4 w-4 text-amber-500 animate-flame-pulse" aria-hidden="true" />
                  <span>Daily Study Streak · Puzzle #{puzzleNumber}</span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2.5">
                  <span
                    data-testid="home-streak-count"
                    className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums"
                  >
                    {stats.currentStreak}
                  </span>
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {stats.currentStreak === 1 ? 'day rhythm' : 'days rhythm'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Next daily word in
                </p>
                <p className="mt-0.5 font-mono-tabular text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {countdown}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Best{' '}
                  <span className="font-mono-tabular font-semibold text-zinc-800 dark:text-zinc-200">
                    {stats.bestStreak}
                  </span>{' '}
                  · Win{' '}
                  <span className="font-mono-tabular font-semibold text-zinc-800 dark:text-zinc-200">
                    {winRate}%
                  </span>
                </p>
              </div>
            </div>

            {/* Quiet 7-Day Week Stamps (No heavy nested borders) */}
            <div className="relative mt-5 border-t border-stone-200/70 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                  <CalendarDays className="h-3.5 w-3.5 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                  <span>Weekly Rhythm</span>
                </span>
                <span className="font-mono-tabular">
                  {completedThisWeek} / 7 days active
                </span>
              </div>

              <div
                data-testid="week-streak-grid"
                className="grid grid-cols-7 gap-1.5 sm:gap-2"
              >
                {weekDays.map((day) => {
                  const isCompleted = day.state === 'completed';
                  const isTodayPending = day.state === 'today';
                  const isMissed = day.state === 'missed';

                  return (
                    <div
                      key={day.dateKey}
                      data-week-day={day.shortLabel}
                      data-day-state={day.state}
                      className={`flex flex-col items-center rounded-xl py-2 px-1 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/35'
                          : isTodayPending
                          ? 'bg-stone-100/90 dark:bg-zinc-800/80 ring-1 ring-[#1E6B52]/35 dark:ring-emerald-400/40'
                          : 'bg-[#F7F5F0]/80 dark:bg-zinc-950/40'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          day.isToday
                            ? 'text-[#1E6B52] dark:text-emerald-300'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {day.shortLabel}
                      </span>

                      <div
                        className={`mt-1.5 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                          isCompleted
                            ? 'border-[#1E6B52] bg-[#1E6B52] text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950'
                            : isTodayPending
                            ? 'border-[#1E6B52] dark:border-emerald-400 bg-white dark:bg-zinc-900 text-[#1E6B52] dark:text-emerald-400'
                            : isMissed
                            ? 'border-stone-300/80 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                            : 'border-dashed border-stone-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
                        }`}
                        aria-label={`${day.shortLabel} ${day.dayNumber}: ${day.state}`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" strokeWidth={2.8} aria-hidden="true" />
                        ) : isTodayPending ? (
                          <Flame className="h-4 w-4 text-amber-500 animate-flame-pulse" aria-hidden="true" />
                        ) : isMissed ? (
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <span className="font-mono-tabular text-[11px]">{day.dayNumber}</span>
                        )}
                      </div>

                      <span className="mt-1 font-mono-tabular text-[10px] text-zinc-500 dark:text-zinc-400">
                        {day.isToday ? 'Today' : day.dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Single Dominant Primary Action + Optional Streak Recovery */}
            <div className="relative mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                data-testid="home-play-puzzle-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartPuzzle();
                }}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-3 text-sm font-semibold transition-transform active:scale-[0.985] shadow-xs cursor-pointer"
              >
                <span>Play Puzzle</span>
                <span className="text-xs font-normal opacity-85 truncate max-w-[180px]">
                  · {activeCategoryName}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>

              {canSaveStreak && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onWatchAdSaveStreak();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-700/30 dark:border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-950/35 px-3.5 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Save Streak ({stats.previousLostStreak})</span>
                </button>
              )}
            </div>
          </div>

          {/* 5 Daily & Habit Challenges (Clean Hairline Rows — Zero Nested Card Clutter) */}
          <div className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(24,24,27,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Today&apos;s Challenges
                </h2>
              </div>
              <span
                data-testid="challenges-summary"
                className="font-mono-tabular text-xs font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {completedChallenges} / {challenges.length} Completed
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-[#1E6B52] dark:bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round((completedChallenges / challenges.length) * 100)}%` }}
              />
            </div>

            <div
              data-testid="challenges-list"
              className="mt-3 divide-y divide-stone-200/70 dark:divide-zinc-800/80"
            >
              {challenges.map((ch) => {
                const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
                return (
                  <div
                    key={ch.id}
                    data-challenge-id={ch.id}
                    data-challenge-completed={ch.completed ? 'true' : 'false'}
                    className="flex items-center justify-between gap-3 py-3 first:pt-2 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ch.completed ? (
                          <Check
                            className="h-4 w-4 shrink-0 text-[#1E6B52] dark:text-emerald-400"
                            strokeWidth={2.75}
                            aria-hidden="true"
                          />
                        ) : ch.openCategories ? (
                          <Compass
                            className="h-4 w-4 shrink-0 text-amber-600/90 dark:text-amber-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trophy
                            className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                            aria-hidden="true"
                          />
                        )}
                        <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {ch.title}
                        </h3>
                      </div>

                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {ch.description}
                      </p>

                      <div className="mt-2 flex items-center gap-2 max-w-xs">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200/80 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ch.completed
                                ? 'bg-[#1E6B52] dark:bg-emerald-500'
                                : 'bg-zinc-500 dark:bg-zinc-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-tabular text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          {ch.current}/{ch.target}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectChallenge(ch);
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        ch.completed
                          ? 'border border-emerald-700/25 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-[#1E6B52] dark:text-emerald-300 hover:bg-emerald-100/70'
                          : 'border border-stone-200 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {ch.completed ? 'Review' : ch.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Scholar Column (Curated Discovery, Weekly Mastery & Cultural Spotlight) */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Personalized Location & Player Study Card */}
          <div
            data-testid="home-personalization-card"
            className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 shadow-[0_1px_3px_rgba(24,24,27,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E6B52] dark:text-emerald-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {playerProfile.locationEnabled
                      ? `Tuned to ${locationLabel}`
                      : 'Curated Study · Location Optional'}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                  Picked For You &amp; Live Trends
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {insights.topInterests.length > 0
                    ? `${insights.topInterests.slice(0, 3).join(' · ')} · ${insights.recommendedDifficulty} tier`
                    : 'Set your city & favorite subjects for tailored vocabulary and local trivia.'}
                </p>
              </div>

              <button
                type="button"
                data-testid="open-personalization-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenPersonalize();
                }}
                className="shrink-0 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800/70 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
              >
                Personalize
              </button>
            </div>

            {playerProfile.locationEnabled && localHeadlines.length > 0 && (
              <p
                data-testid="home-local-headline-box"
                className="mt-3 border-t border-stone-200/70 dark:border-zinc-800 pt-2.5 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2"
              >
                <span className="font-semibold text-[#1E6B52] dark:text-emerald-400">
                  Trending Online:{' '}
                </span>
                <span>{localHeadlines[0]}</span>
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <button
                type="button"
                data-testid="home-for-you-puzzle-btn"
                disabled={loadingPersonalizedPuzzle}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlayPersonalizedPuzzle();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-300/90 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800/80 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-stone-200/75 dark:hover:bg-zinc-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                <span>
                  {loadingPersonalizedPuzzle
                    ? 'Crafting Word...'
                    : `Play ${insights.favoriteLength}L For You Word`}
                </span>
              </button>

              <button
                type="button"
                data-testid="home-local-trivia-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlayLocalTrivia();
                }}
                className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-700/25 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs font-semibold text-[#1E6B52] dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 cursor-pointer whitespace-nowrap"
              >
                <Brain className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Trending Near You Trivia</span>
              </button>
            </div>
          </div>

          {/* Faith Study Quick-Launch Card */}
          <div
            data-testid="home-faith-study-card"
            className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 shadow-[0_1px_3px_rgba(24,24,27,0.03)] amoled-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border wv-accent-pill">
                  <ReligionIcon religion={activeReligion} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider wv-accent-text">
                    Faith Study · {faithTradition.name}
                  </p>
                  <h2 className="truncate font-display text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {faithTradition.sacredTextLabel} Daily Session
                  </h2>
                </div>
              </div>
              <button
                type="button"
                data-testid="home-open-faith-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartFaith();
                }}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold wv-accent-btn transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>Open Faith</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-xs italic leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-2">
              &ldquo;{dailyFaithPassage.quote}&rdquo;
            </p>
          </div>

          {/* Weekly Mastery & AI Trivia Studio Card */}
          <div
            data-testid="home-weekly-rank-card"
            className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 shadow-[0_1px_3px_rgba(24,24,27,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Weekly Grading · Rank {weeklyGrade.current.id}</span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {weeklyGrade.current.tierName} ({weeklyGrade.current.badgeTitle})
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {weeklyGrade.statusHint}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-mono-tabular text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {weeklyProgress.weeklyXp} XP
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 font-mono-tabular text-[11px] text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>{weeklyCountdown}</span>
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-[#1E6B52] dark:bg-emerald-500 transition-all duration-300"
                style={{ width: `${weeklyGrade.progressPercent}%` }}
              />
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-tabular text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Badges: {weeklyProgress.unlockedAchievements.length}/{ACHIEVEMENTS.length} · Coins:{' '}
                {weeklyProgress.bonusCoins}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="home-open-weekly-rank-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenWeeklyRank();
                  }}
                  className="rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800/70 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
                >
                  Rank &amp; Achievements
                </button>

                <button
                  type="button"
                  data-testid="home-play-trivia-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStartTrivia();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E6B52] hover:bg-[#175440] dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Play AI Trivia</span>
                </button>
              </div>
            </div>
          </div>

          {/* Today's Rotating Entertainment Spotlight (Quiet Editorial Format) */}
          <div
            data-testid="home-entertainment-spotlight"
            className="rounded-2xl border border-stone-200/85 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/90 p-5 shadow-[0_1px_3px_rgba(24,24,27,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Tv className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {spotlight.source === 'live'
                      ? 'Trending Entertainment · Live Headlines'
                      : 'Daily Cultural Spotlight'}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                  {spotlight.eventTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {spotlight.matchedHeadline
                    ? `In today’s cultural news: “${spotlight.matchedHeadline}”`
                    : spotlight.eventSubtitle}
                </p>
              </div>

              <button
                type="button"
                data-testid="home-browse-entertainment-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onBrowseEntertainment();
                }}
                className="shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-[#1E6B52] dark:hover:text-emerald-400 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
              >
                All 20 Topics
              </button>
            </div>

            {/* Hero Daily Entertainment Topic Row */}
            <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-stone-200/70 dark:border-zinc-800 pt-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {heroCategory.isPremium ? (
                    heroLocked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 shrink-0 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                    )
                  ) : null}
                  <h3 className="truncate font-display text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {heroCategory.name}
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {heroCategory.tagline}
                </p>
                <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <span>{getEntertainmentSpec(heroCategory.id)?.subCollection || 'Entertainment'}</span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {heroCategory.isPremium
                      ? heroLocked
                        ? 'Watch 5s ad for 5 plays'
                        : `${heroPlays} plays left`
                      : 'Free unlimited'}
                  </span>
                </p>
              </div>

              <button
                type="button"
                data-testid="home-play-hero-entertainment-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlayEntertainmentCategory(heroCategory.id);
                }}
                className="shrink-0 rounded-lg border border-stone-300 dark:border-zinc-700 bg-[#F7F5F0] dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-stone-200/75 dark:hover:bg-zinc-700 whitespace-nowrap cursor-pointer"
              >
                {heroLocked ? 'Unlock & Play' : 'Play Topic'}
              </button>
            </div>

            {/* 3 Secondary Rotating Entertainment Picks (Calm Unboxed Links) */}
            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-stone-200/70 dark:border-zinc-800 pt-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {secondaryEntertainment.map((cat) => {
                const plays = getCategoryRemainingPlays(cat, playsRemaining);
                const locked = cat.isPremium && plays <= 0;
                const spec = getEntertainmentSpec(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-spotlight-category={cat.id}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onPlayEntertainmentCategory(cat.id);
                    }}
                    className="flex flex-col justify-between rounded-xl bg-[#F7F5F0]/85 dark:bg-zinc-800/50 p-2.5 text-left transition-colors hover:bg-stone-200/60 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-display text-xs font-bold text-zinc-800 dark:text-zinc-100 leading-snug">
                        {cat.name}
                      </span>
                      {cat.isPremium &&
                        (locked ? (
                          <Lock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        ) : (
                          <Unlock className="h-3 w-3 shrink-0 text-[#1E6B52] dark:text-emerald-400" aria-hidden="true" />
                        ))}
                    </div>
                    <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {spec?.eventTag || 'Entertainment'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {onOpenHelp && (
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            data-testid="home-enquiry-help-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHelp('rules');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#1E6B52] dark:hover:text-emerald-400 hover:underline underline-offset-4 cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Questions? How to Play &amp; FAQ</span>
          </button>
        </div>
      )}
    </section>
  );
};
