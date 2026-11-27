import React, { useMemo } from 'react';
import {
  ArrowRight,
  Brain,
  CalendarDays,
  Check,
  Compass,
  Flame,
  Lock,
  Minus,
  Share2,
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
  getDailyFaithPassage,
  getFaithTradition,
  type ReligionId,
} from '../game/faithStudyLogic';
import { DailyResetCountdown } from './LiveCountdowns';
import { ReligionIcon } from './ReligionIcons';

interface StreakHomeViewProps {
  stats: StatsData;
  dateKey: string;
  activeReligion: ReligionId;
  puzzleNumber: number;
  countdown?: string;
  weekDays: WeekStreakDay[];
  challenges: HomeChallenge[];
  spotlight: DailyEntertainmentSpotlight;
  playsRemaining: Record<string, number>;
  canSaveStreak: boolean;
  playerProfile: PlayerProfileState;
  onOpenPersonalize: () => void;
  onPlayPersonalizedPuzzle: () => void;
  onWatchAdSaveStreak: () => void;
  onStartPuzzle: () => void;
  onStartFaith: () => void;
  onStartTrivia: () => void;
  onSelectChallenge: (challenge: HomeChallenge) => void;
  onPlayEntertainmentCategory: (categoryId: string) => void;
  onBrowseEntertainment: () => void;
  onInviteFriends?: () => void;
}

export const StreakHomeView: React.FC<StreakHomeViewProps> = React.memo(({
  stats,
  dateKey,
  activeReligion,
  countdown,
  weekDays,
  challenges,
  spotlight,
  playsRemaining,
  canSaveStreak,
  playerProfile,
  onOpenPersonalize,
  onPlayPersonalizedPuzzle,
  onWatchAdSaveStreak,
  onStartPuzzle,
  onStartFaith,
  onStartTrivia,
  onSelectChallenge,
  onPlayEntertainmentCategory,
  onBrowseEntertainment,
  onInviteFriends,
}) => {
  const faithTradition = useMemo(() => getFaithTradition(activeReligion), [activeReligion]);
  const dailyFaithPassage = useMemo(
    () => getDailyFaithPassage(activeReligion, dateKey),
    [activeReligion, dateKey]
  );
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const completedChallenges = challenges.filter((c) => c.completed).length;
  const completedThisWeek = weekDays.filter((d) => d.state === 'completed').length;

  const heroCategory = useMemo(
    () => getCategoryById(spotlight.heroCategoryId),
    [spotlight.heroCategoryId]
  );
  const heroPlays = getCategoryRemainingPlays(heroCategory, playsRemaining);
  const heroLocked = heroCategory.isPremium && heroPlays <= 0;
  const insights = useMemo(() => summarizePlayerProfile(playerProfile), [playerProfile]);
  const locationLabel = playerProfile.locationEnabled
    ? formatLocationLabel(playerProfile.location)
    : 'Global Mix';

  return (
    <section
      data-testid="streak-home"
      aria-label="Wordvibe streak and game launcher"
      className="mx-auto flex w-full max-w-2xl lg:max-w-6xl flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-5 pb-28 sm:pt-7 animate-stage-enter"
    >
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12 lg:items-start lg:gap-7">
        {/* Primary Column: Enlarged Arcade Streak Hero + Daily Quests */}
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-7">
          {/* Tactile Word-Game Streak Hero */}
          <div className="wv-tilt-surface relative overflow-hidden rounded-3xl border-2 wv-border wv-card shadow-md">
            <div className="wv-hero-arcade relative px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    <Flame className="h-4 w-4 text-white" aria-hidden="true" />
                    <span className="font-bold">Wordvibe Daily Streak</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3.5">
                    <span
                      data-testid="home-streak-count"
                      className="font-display text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] tabular-nums leading-none"
                    >
                      {stats.currentStreak}
                    </span>
                    <span className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                      {stats.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                    </span>
                  </div>
                </div>

                {/* Enlarged Decorative Tactile Word Tiles */}
                <div className="flex items-center gap-2" aria-hidden="true">
                  {['P', 'L', 'A', 'Y'].map((letter, idx) => (
                    <span
                      key={letter}
                      style={{ animationDelay: `${idx * 70}ms` }}
                      className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 wv-tile-wooden font-display text-2xl sm:text-3xl font-bold animate-tile-deal"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm sm:text-base font-semibold text-white/95">
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
                  <strong className="font-mono-tabular font-extrabold text-white">
                    {countdown ?? <DailyResetCountdown />}
                  </strong>
                </span>
              </div>
            </div>

            {/* Enlarged 7-Day Rhythm Strip */}
            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between text-sm sm:text-base wv-text-muted mb-3">
                <span className="inline-flex items-center gap-2 font-bold wv-text">
                  <CalendarDays className="h-5 w-5 wv-accent-text" aria-hidden="true" />
                  <span>7-Day Rhythm</span>
                </span>
                <span className="font-mono-tabular font-semibold">
                  {completedThisWeek} / 7 days active
                </span>
              </div>

              <div data-testid="week-streak-grid" className="grid grid-cols-7 gap-1 sm:gap-2.5">
                {weekDays.map((day) => {
                  const isCompleted = day.state === 'completed';
                  const isTodayPending = day.state === 'today';
                  const isMissed = day.state === 'missed';

                  return (
                    <div
                      key={day.dateKey}
                      data-week-day={day.shortLabel}
                      data-day-state={day.state}
                      className={`flex flex-col items-center rounded-xl sm:rounded-2xl py-2.5 px-0.5 sm:py-3.5 sm:px-1.5 border ${
                        isCompleted
                          ? 'wv-accent-pill'
                          : isTodayPending
                          ? 'wv-border wv-card-muted ring-2 ring-[var(--wv-accent)]/50'
                          : 'wv-border wv-card-muted opacity-80'
                      }`}
                    >
                      <span className="text-[11px] sm:text-sm font-bold uppercase wv-text-muted">
                        {day.shortLabel}
                      </span>
                      <div
                        className={`mt-1.5 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold ${
                          isCompleted
                            ? 'wv-accent-btn'
                            : isTodayPending
                            ? 'wv-gold-pill'
                            : 'wv-card wv-text-muted border wv-border'
                        }`}
                        aria-label={`${day.shortLabel} ${day.dayNumber}: ${day.state}`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} aria-hidden="true" />
                        ) : isTodayPending ? (
                          <Flame className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                        ) : isMissed ? (
                          <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                        ) : (
                          <span className="font-mono-tabular text-xs sm:text-sm">{day.dayNumber}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Enlarged Game Mode Launcher Buttons */}
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  data-testid="home-play-puzzle-btn"
                  onClick={onStartPuzzle}
                  className="flex min-h-14 sm:min-h-[60px] flex-1 items-center justify-center gap-2.5 rounded-2xl wv-accent-btn px-5 py-3.5 font-display text-lg sm:text-xl font-bold cursor-pointer whitespace-nowrap"
                >
                  <span>Play Crossword</span>
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  data-testid="home-play-trivia-btn"
                  onClick={onStartTrivia}
                  className="flex min-h-14 sm:min-h-[60px] flex-1 items-center justify-center gap-2.5 rounded-2xl wv-gold-pill px-5 py-3.5 font-display text-lg sm:text-xl font-bold transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Brain className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Play Trivia</span>
                </button>

                {canSaveStreak && (
                  <button
                    type="button"
                    onClick={onWatchAdSaveStreak}
                    className="inline-flex min-h-14 sm:min-h-[60px] items-center justify-center gap-2 rounded-2xl border wv-accent-pill px-4 py-3 text-sm sm:text-base font-bold cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    <span>Save ({stats.previousLostStreak}d)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enlarged Daily Quests */}
          <div className="flex-1 rounded-3xl border wv-border wv-card p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Target className="h-5 w-5 wv-accent-text" aria-hidden="true" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold wv-text">Daily Quests</h2>
              </div>
              <span
                data-testid="challenges-summary"
                className="text-sm sm:text-base font-bold wv-accent-text"
              >
                {completedChallenges === challenges.length ? 'All Done' : 'Active'}
              </span>
            </div>

            <div className="mt-3 h-2.5 sm:h-3 w-full overflow-hidden rounded-full wv-card-muted">
              <div
                className="h-full w-full origin-left rounded-full wv-accent-btn transition-transform duration-300"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, challenges.length > 0 ? completedChallenges / challenges.length : 0))})`,
                }}
              />
            </div>

            <div data-testid="challenges-list" className="mt-4 divide-y wv-border">
              {challenges.slice(0, 4).map((ch) => {
                const ratio = Math.max(0, Math.min(1, ch.target > 0 ? ch.current / ch.target : 0));
                return (
                  <div
                    key={ch.id}
                    data-challenge-id={ch.id}
                    data-challenge-completed={ch.completed ? 'true' : 'false'}
                    className="flex items-center justify-between gap-4 py-3.5 sm:py-4 first:pt-1.5 last:pb-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        {ch.completed ? (
                          <Check
                            className="h-5 w-5 shrink-0 wv-accent-text"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        ) : ch.openCategories ? (
                          <Compass className="h-5 w-5 shrink-0 wv-accent-text" aria-hidden="true" />
                        ) : (
                          <Trophy className="h-5 w-5 shrink-0 wv-text-muted" aria-hidden="true" />
                        )}
                        <h3 className="truncate font-display text-lg sm:text-xl font-bold wv-text">
                          {ch.title}
                        </h3>
                      </div>
                      <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full wv-card-muted">
                        <div
                          className={`h-full w-full origin-left rounded-full transition-transform duration-300 ${
                            ch.completed ? 'wv-accent-btn' : 'bg-[var(--wv-text-muted)]/45'
                          }`}
                          style={{ transform: `scaleX(${ratio})` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectChallenge(ch)}
                      className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm sm:text-base font-bold whitespace-nowrap cursor-pointer ${
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

        {/* Secondary Column: Enlarged Faith Sprint & Personalized Topic Spotlight */}
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-5">
          {/* Endless Faith Study Card */}
          <div
            data-testid="home-faith-study-card"
            className="rounded-3xl border wv-border wv-card p-6 sm:p-8 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border wv-accent-pill">
                  <ReligionIcon religion={activeReligion} className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
                    Endless Faith Sprint · {faithTradition.name}
                  </p>
                  <h2 className="truncate font-display text-2xl sm:text-3xl font-bold wv-text">
                    {faithTradition.sacredTextLabel}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                data-testid="home-open-faith-btn"
                onClick={onStartFaith}
                className="inline-flex min-h-12 sm:min-h-[52px] shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:text-base font-bold wv-accent-btn cursor-pointer whitespace-nowrap"
              >
                <span>Study</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-5 text-base sm:text-xl italic leading-relaxed wv-text-muted line-clamp-3">
              &ldquo;{dailyFaithPassage.quote}&rdquo;
            </p>
          </div>

          {/* Unified Personalization & Featured Topic Card */}
          <div
            data-testid="home-entertainment-spotlight"
            className="rounded-3xl border wv-border wv-card p-6 sm:p-8 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
                  {locationLabel} · {spotlight.eventTitle}
                </p>
                <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold wv-text truncate">
                  {heroCategory.name}
                </h2>
              </div>

              <button
                type="button"
                data-testid="open-personalization-btn"
                onClick={onOpenPersonalize}
                className="min-h-11 shrink-0 rounded-xl border wv-border wv-card-muted px-4 py-2 text-sm sm:text-base font-bold wv-text hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                Personalize
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                data-testid="home-for-you-puzzle-btn"
                onClick={onPlayPersonalizedPuzzle}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border wv-accent-pill px-4 py-2.5 text-sm sm:text-base font-bold cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {insights.favoriteLength}×{insights.favoriteLength} For You
                </span>
              </button>

              <button
                type="button"
                data-testid="home-play-hero-entertainment-btn"
                onClick={() => onPlayEntertainmentCategory(heroCategory.id)}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-sm sm:text-base font-bold wv-text hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                {heroCategory.isPremium ? (
                  heroLocked ? (
                    <Lock className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                  ) : (
                    <Unlock className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                  )
                ) : null}
                <span>{heroLocked ? 'Unlock Topic' : 'Play Topic'}</span>
              </button>

              <button
                type="button"
                data-testid="home-browse-entertainment-btn"
                onClick={onBrowseEntertainment}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border wv-border wv-card-muted px-4 py-2.5 text-sm sm:text-base font-bold wv-text-muted hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                Browse Topics
              </button>
            </div>
          </div>

          {onInviteFriends && (
            <div
              data-testid="home-share-card"
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border wv-border wv-card p-5 sm:p-6 shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider wv-accent-text">
                  Challenge Friends
                </p>
                <p className="mt-0.5 text-sm sm:text-base font-semibold wv-text">
                  Share Wordvibe &amp; compare weekly streaks
                </p>
              </div>
              <button
                type="button"
                data-testid="home-share-invite-btn"
                onClick={onInviteFriends}
                className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl wv-accent-btn px-4 py-2.5 text-sm sm:text-base font-bold cursor-pointer whitespace-nowrap"
              >
                <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Share &amp; Invite</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
