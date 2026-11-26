import type { TriviaDifficulty } from './triviaLogic';

export type WeeklyGradeId = 'D' | 'C' | 'B' | 'A' | 'S';

export interface WeeklyGradeInfo {
  id: WeeklyGradeId;
  tierName: string;
  badgeTitle: string;
  minXp: number;
  maxXp: number | null;
  requiredAchievements: number;
  accentColor: string;
  rolloverBonusCoins: number;
  rolloverBonusXp: number;
}

export const WEEKLY_GRADES: WeeklyGradeInfo[] = [
  {
    id: 'D',
    tierName: 'Bronze',
    badgeTitle: 'Starter',
    minXp: 0,
    maxXp: 299,
    requiredAchievements: 0,
    accentColor: 'text-amber-800 dark:text-amber-400',
    rolloverBonusCoins: 20,
    rolloverBonusXp: 25,
  },
  {
    id: 'C',
    tierName: 'Silver',
    badgeTitle: 'Solver',
    minXp: 300,
    maxXp: 799,
    requiredAchievements: 0,
    accentColor: 'text-zinc-600 dark:text-zinc-300',
    rolloverBonusCoins: 45,
    rolloverBonusXp: 60,
  },
  {
    id: 'B',
    tierName: 'Gold',
    badgeTitle: 'Strategist',
    minXp: 800,
    maxXp: 1499,
    requiredAchievements: 0,
    accentColor: 'text-amber-600 dark:text-amber-400',
    rolloverBonusCoins: 80,
    rolloverBonusXp: 100,
  },
  {
    id: 'A',
    tierName: 'Platinum',
    badgeTitle: 'Mastermind',
    minXp: 1500,
    maxXp: 2499,
    requiredAchievements: 0,
    accentColor: 'text-emerald-700 dark:text-emerald-400',
    rolloverBonusCoins: 130,
    rolloverBonusXp: 160,
  },
  {
    id: 'S',
    tierName: 'Diamond',
    badgeTitle: 'Grandmaster',
    minXp: 2500,
    maxXp: null,
    requiredAchievements: 3,
    accentColor: 'text-sky-600 dark:text-sky-400',
    rolloverBonusCoins: 220,
    rolloverBonusXp: 250,
  },
];

export interface WeeklyGradeProgress {
  current: WeeklyGradeInfo;
  next: WeeklyGradeInfo | null;
  xpToNext: number;
  achievementsNeededForS: number;
  progressPercent: number;
  statusHint: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  mode: 'puzzle' | 'trivia' | 'hybrid';
  xpReward: number;
  coinReward: number;
  metricLabel: (state: WeeklyActivityState) => string;
  isEarned: (state: WeeklyActivityState) => boolean;
}

export interface WeeklyRolloverSummary {
  weekKey: string;
  finalGrade: WeeklyGradeId;
  tierName: string;
  badgeTitle: string;
  finalXp: number;
  puzzlesSolved: number;
  triviaCorrect: number;
  achievementsCount: number;
  bonusCoinsAwarded: number;
  bonusXpAwarded: number;
}

export interface WeeklyActivityState {
  weekKey: string;
  weeklyXp: number;
  totalXp: number;
  bonusCoins: number;
  puzzlesSolved: number;
  dailyPuzzlesWon: number;
  triviaAnswered: number;
  triviaCorrect: number;
  bestTriviaStreak: number;
  hardTriviaSolved: number;
  triviaRoundsCompleted: number;
  activeUtcDates: string[];
  categoriesPlayedThisWeek: string[];
  hasUsedDoubleXp: boolean;
  unlockedAchievements: string[];
  pendingWeekSummary: WeeklyRolloverSummary | null;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_spark',
    title: 'First Spark',
    description: 'Solve a word puzzle or answer an AI Trivia question right this week.',
    mode: 'hybrid',
    xpReward: 40,
    coinReward: 15,
    metricLabel: (s) => `${Math.min(1, s.puzzlesSolved + s.triviaCorrect)}/1`,
    isEarned: (s) => s.puzzlesSolved + s.triviaCorrect >= 1,
  },
  {
    id: 'wordsmith_5',
    title: 'Wordsmith',
    description: 'Solve 5 WordVibe word puzzles during the current UTC week.',
    mode: 'puzzle',
    xpReward: 90,
    coinReward: 30,
    metricLabel: (s) => `${Math.min(5, s.puzzlesSolved)}/5`,
    isEarned: (s) => s.puzzlesSolved >= 5,
  },
  {
    id: 'five_streak_genius',
    title: '5-Streak Genius',
    description: 'Build a streak of 5 consecutive correct answers in AI Trivia.',
    mode: 'trivia',
    xpReward: 110,
    coinReward: 35,
    metricLabel: (s) => `${Math.min(5, s.bestTriviaStreak)}/5`,
    isEarned: (s) => s.bestTriviaStreak >= 5,
  },
  {
    id: 'puzzle_brainiac_combo',
    title: 'Puzzle & Brainiac Combo',
    description: 'Win a word puzzle and finish a 5-question AI Trivia round in the same week.',
    mode: 'hybrid',
    xpReward: 100,
    coinReward: 30,
    metricLabel: (s) =>
      `${s.puzzlesSolved >= 1 && s.triviaRoundsCompleted >= 1 ? 2 : s.puzzlesSolved >= 1 || s.triviaRoundsCompleted >= 1 ? 1 : 0}/2`,
    isEarned: (s) => s.puzzlesSolved >= 1 && s.triviaRoundsCompleted >= 1,
  },
  {
    id: 'midweek_momentum',
    title: '3-Day Habit Builder',
    description: 'Play on 3 distinct UTC days in one week.',
    mode: 'hybrid',
    xpReward: 75,
    coinReward: 25,
    metricLabel: (s) => `${Math.min(3, s.activeUtcDates.length)}/3`,
    isEarned: (s) => s.activeUtcDates.length >= 3,
  },
  {
    id: 'seven_day_grinder',
    title: '7-Day Active Grinder',
    description: 'Log wins or trivia answers on all 7 days of the weekly cycle.',
    mode: 'hybrid',
    xpReward: 200,
    coinReward: 75,
    metricLabel: (s) => `${Math.min(7, s.activeUtcDates.length)}/7`,
    isEarned: (s) => s.activeUtcDates.length >= 7,
  },
  {
    id: 'trivia_scholar_15',
    title: 'Trivia Scholar',
    description: 'Answer 15 AI Trivia questions correctly this week.',
    mode: 'trivia',
    xpReward: 120,
    coinReward: 40,
    metricLabel: (s) => `${Math.min(15, s.triviaCorrect)}/15`,
    isEarned: (s) => s.triviaCorrect >= 15,
  },
  {
    id: 'hard_mode_ace',
    title: 'Hard-Mode Ace',
    description: 'Correctly answer 3 Hard-tier AI Trivia questions scaled by your streak.',
    mode: 'trivia',
    xpReward: 130,
    coinReward: 45,
    metricLabel: (s) => `${Math.min(3, s.hardTriviaSolved)}/3`,
    isEarned: (s) => s.hardTriviaSolved >= 3,
  },
  {
    id: 'category_wanderer_5',
    title: 'Category Explorer',
    description: 'Play across 5 different puzzle or trivia categories this week.',
    mode: 'hybrid',
    xpReward: 80,
    coinReward: 25,
    metricLabel: (s) => `${Math.min(5, s.categoriesPlayedThisWeek.length)}/5`,
    isEarned: (s) => s.categoriesPlayedThisWeek.length >= 5,
  },
  {
    id: 'daily_champion_3',
    title: 'Daily Regular',
    description: 'Solve 3 Daily WordVibe puzzles within the week.',
    mode: 'puzzle',
    xpReward: 95,
    coinReward: 30,
    metricLabel: (s) => `${Math.min(3, s.dailyPuzzlesWon)}/3`,
    isEarned: (s) => s.dailyPuzzlesWon >= 3,
  },
  {
    id: 'xp_doubler',
    title: '2x Momentum Strategist',
    description: 'Claim a 2x Weekly XP Boost after a puzzle or trivia round.',
    mode: 'hybrid',
    xpReward: 65,
    coinReward: 20,
    metricLabel: (s) => `${s.hasUsedDoubleXp ? 1 : 0}/1`,
    isEarned: (s) => s.hasUsedDoubleXp,
  },
  {
    id: 'diamond_aspirant',
    title: 'Platinum Summit',
    description: 'Reach 1,500+ Weekly XP to enter A / Platinum tier.',
    mode: 'hybrid',
    xpReward: 150,
    coinReward: 50,
    metricLabel: (s) => `${Math.min(1500, s.weeklyXp)}/1500`,
    isEarned: (s) => s.weeklyXp >= 1500,
  },
];

export function getUtcDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the Monday 00:00:00 UTC YYYY-MM-DD key representing the current weekly grading cycle.
 */
export function getUtcWeekKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const utcDay = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const daysSinceMonday = (utcDay + 6) % 7;
  const mondayMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
  return getUtcDateKey(mondayMs);
}

/**
 * Returns epoch milliseconds of the next Monday 00:00:00 UTC reset.
 */
export function getNextMondayUtcMs(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const utcDay = d.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - daysSinceMonday + 7,
    0,
    0,
    0,
    0
  );
}

export function formatWeeklyResetCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days}d ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function createFreshWeeklyState(weekKey: string = getUtcWeekKey()): WeeklyActivityState {
  return {
    weekKey,
    weeklyXp: 0,
    totalXp: 0,
    bonusCoins: 0,
    puzzlesSolved: 0,
    dailyPuzzlesWon: 0,
    triviaAnswered: 0,
    triviaCorrect: 0,
    bestTriviaStreak: 0,
    hardTriviaSolved: 0,
    triviaRoundsCompleted: 0,
    activeUtcDates: [],
    categoriesPlayedThisWeek: [],
    hasUsedDoubleXp: false,
    unlockedAchievements: [],
    pendingWeekSummary: null,
  };
}

/**
 * Computes player grade D -> C -> B -> A -> S strictly enforcing both
 * 2,500+ Weekly XP AND >= 3 unlocked achievements for S / Diamond.
 */
export function computeWeeklyGrade(
  weeklyXp: number,
  achievementsUnlockedCount: number
): WeeklyGradeProgress {
  const xp = Math.max(0, Math.floor(weeklyXp));
  const ach = Math.max(0, Math.floor(achievementsUnlockedCount));

  if (xp >= 2500 && ach >= 3) {
    return {
      current: WEEKLY_GRADES[4],
      next: null,
      xpToNext: 0,
      achievementsNeededForS: 0,
      progressPercent: 100,
      statusHint: 'Maximum Diamond Grandmaster tier reached for this week.',
    };
  }

  if (xp >= 1500) {
    const current = WEEKLY_GRADES[3]; // A / Platinum
    const next = WEEKLY_GRADES[4]; // S / Diamond
    const xpToNext = Math.max(0, 2500 - xp);
    const achievementsNeededForS = Math.max(0, 3 - ach);
    const span = 2500 - 1500;
    const progressPercent = Math.min(99, Math.max(5, Math.round(((xp - 1500) / span) * 100)));
    const statusHint =
      xpToNext === 0 && achievementsNeededForS > 0
        ? `Unlock ${achievementsNeededForS} more achievement${achievementsNeededForS === 1 ? '' : 's'} this week for S / Diamond`
        : achievementsNeededForS > 0
        ? `${xpToNext} XP & ${achievementsNeededForS} more achievement${achievementsNeededForS === 1 ? '' : 's'} to S / Diamond`
        : `${xpToNext} XP to S / Diamond (Grandmaster)`;
    return {
      current,
      next,
      xpToNext,
      achievementsNeededForS,
      progressPercent,
      statusHint,
    };
  }

  let current = WEEKLY_GRADES[0];
  let next = WEEKLY_GRADES[1];
  if (xp >= 800) {
    current = WEEKLY_GRADES[2];
    next = WEEKLY_GRADES[3];
  } else if (xp >= 300) {
    current = WEEKLY_GRADES[1];
    next = WEEKLY_GRADES[2];
  }

  const xpToNext = Math.max(0, next.minXp - xp);
  const span = Math.max(1, next.minXp - current.minXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / span) * 100)));
  return {
    current,
    next,
    xpToNext,
    achievementsNeededForS: Math.max(0, 3 - ach),
    progressPercent,
    statusHint: `${xpToNext} XP to ${next.id} / ${next.tierName} (${next.badgeTitle})`,
  };
}

/**
 * Checks whether the UTC week rolled over (Monday 00:00 UTC). If so, packages last week's
 * final grading summary and awards carryover bonus coins & starter XP into the new week.
 */
export function reconcileWeeklyRollover(
  state: WeeklyActivityState,
  nowMs: number = Date.now()
): { state: WeeklyActivityState; rolledOver: boolean } {
  const currentWeekKey = getUtcWeekKey(nowMs);
  if (state.weekKey === currentWeekKey) {
    return { state, rolledOver: false };
  }

  const hadActivity =
    state.weeklyXp > 0 ||
    state.puzzlesSolved > 0 ||
    state.triviaAnswered > 0 ||
    state.unlockedAchievements.length > 0;

  const prevTotalXp = Math.max(state.totalXp ?? 0, state.weeklyXp ?? 0);

  if (!hadActivity) {
    return {
      state: {
        ...createFreshWeeklyState(currentWeekKey),
        totalXp: prevTotalXp,
        bonusCoins: state.bonusCoins,
      },
      rolledOver: true,
    };
  }

  const prevGrade = computeWeeklyGrade(state.weeklyXp, state.unlockedAchievements.length).current;
  const fresh = createFreshWeeklyState(currentWeekKey);
  const summary: WeeklyRolloverSummary = {
    weekKey: state.weekKey,
    finalGrade: prevGrade.id,
    tierName: prevGrade.tierName,
    badgeTitle: prevGrade.badgeTitle,
    finalXp: state.weeklyXp,
    puzzlesSolved: state.puzzlesSolved,
    triviaCorrect: state.triviaCorrect,
    achievementsCount: state.unlockedAchievements.length,
    bonusCoinsAwarded: prevGrade.rolloverBonusCoins,
    bonusXpAwarded: prevGrade.rolloverBonusXp,
  };

  return {
    state: {
      ...fresh,
      weeklyXp: prevGrade.rolloverBonusXp,
      totalXp: prevTotalXp + prevGrade.rolloverBonusXp,
      bonusCoins: state.bonusCoins + prevGrade.rolloverBonusCoins,
      pendingWeekSummary: summary,
    },
    rolledOver: true,
  };
}

export type WeeklyEventInput =
  | {
      type: 'puzzle_completed';
      won: boolean;
      mode: 'daily' | 'sprint';
      attemptsUsed: number;
      wordLength: 4 | 5 | 6;
      categoryId: string;
      isOnline?: boolean;
      timedOut?: boolean;
      baseXp?: number;
      xpAwardedOverride?: number;
    }
  | {
      type: 'trivia_answered';
      correct: boolean;
      difficulty: TriviaDifficulty;
      streakAfter: number;
      xpAwarded: number;
      categoryId: string;
      isOnline?: boolean;
      timedOut?: boolean;
      baseXp?: number;
    }
  | {
      type: 'trivia_round_completed';
      correctCount: number;
      totalCount: number;
      categoryId: string;
    }
  | {
      type: 'double_xp_boost';
      bonusXp: number;
    };

export interface WeeklyUpdateResult {
  state: WeeklyActivityState;
  xpEarned: number;
  newlyUnlocked: AchievementDefinition[];
}

export function applyWeeklyActivityEvent(
  prevState: WeeklyActivityState,
  event: WeeklyEventInput,
  nowMs: number = Date.now()
): WeeklyUpdateResult {
  const { state: reconciled } = reconcileWeeklyRollover(prevState, nowMs);
  const todayUtc = getUtcDateKey(nowMs);

  let next: WeeklyActivityState = {
    ...reconciled,
    activeUtcDates: reconciled.activeUtcDates.includes(todayUtc)
      ? reconciled.activeUtcDates
      : [...reconciled.activeUtcDates, todayUtc],
    categoriesPlayedThisWeek: [...reconciled.categoriesPlayedThisWeek],
    unlockedAchievements: [...reconciled.unlockedAchievements],
  };

  const addCategory = (catId?: string) => {
    if (catId && !next.categoriesPlayedThisWeek.includes(catId)) {
      next.categoriesPlayedThisWeek.push(catId);
    }
  };

  let baseXp = 0;

  if (event.type === 'puzzle_completed') {
    addCategory(event.categoryId);
    if (event.timedOut) {
      baseXp = 0;
    } else if (event.won) {
      if (typeof event.xpAwardedOverride === 'number') {
        baseXp = Math.max(0, Math.round(event.xpAwardedOverride));
      } else {
        const lengthBonus = event.wordLength === 6 ? 40 : event.wordLength === 5 ? 25 : 15;
        const attemptBonus = Math.max(10, (7 - event.attemptsUsed) * 18);
        const dailyBonus = event.mode === 'daily' ? 60 : 25;
        baseXp = dailyBonus + lengthBonus + attemptBonus;
      }
      next.puzzlesSolved += 1;
      if (event.mode === 'daily') {
        next.dailyPuzzlesWon += 1;
      }
    } else if (event.isOnline) {
      // Online wrong / forfeited answer awards 0 XP
      baseXp = 0;
    } else {
      // Offline wrong answer awards 40% of base XP rounded to nearest integer
      const fallbackBase = event.mode === 'sprint' ? 10 : 30;
      baseXp = Math.max(0, Math.round((event.baseXp ?? fallbackBase) * 0.4));
    }
  } else if (event.type === 'trivia_answered') {
    addCategory(event.categoryId);
    next.triviaAnswered += 1;
    if (event.timedOut) {
      baseXp = 0;
    } else if (event.correct) {
      baseXp = Math.max(0, Math.round(event.xpAwarded));
      next.triviaCorrect += 1;
      next.bestTriviaStreak = Math.max(next.bestTriviaStreak, event.streakAfter);
      if (event.difficulty === 'hard') {
        next.hardTriviaSolved += 1;
      }
    } else if (event.isOnline) {
      // Online wrong answer awards 0 XP
      baseXp = 0;
    } else {
      // Offline wrong answer awards 40% of base XP rounded to nearest integer
      baseXp = Math.max(0, Math.round((event.baseXp ?? 15) * 0.4));
    }
  } else if (event.type === 'trivia_round_completed') {
    addCategory(event.categoryId);
    next.triviaRoundsCompleted += 1;
    baseXp = event.correctCount >= event.totalCount ? 80 : 35;
  } else if (event.type === 'double_xp_boost') {
    baseXp = Math.max(0, Math.round(event.bonusXp));
    next.hasUsedDoubleXp = true;
  }

  next.weeklyXp += baseXp;
  next.totalXp = Math.max(next.totalXp ?? 0, next.weeklyXp - baseXp) + baseXp;

  // Evaluate achievement unlocks (two passes in case XP reward crosses platinum summit!)
  const newlyUnlocked: AchievementDefinition[] = [];
  let bonusAchXp = 0;
  let bonusAchCoins = 0;

  for (let pass = 0; pass < 2; pass++) {
    for (const ach of ACHIEVEMENTS) {
      if (next.unlockedAchievements.includes(ach.id)) continue;
      if (ach.isEarned(next)) {
        next.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach);
        bonusAchXp += ach.xpReward;
        bonusAchCoins += ach.coinReward;
        next.weeklyXp += ach.xpReward;
        next.totalXp += ach.xpReward;
        next.bonusCoins += ach.coinReward;
      }
    }
  }

  return {
    state: next,
    xpEarned: baseXp + bonusAchXp,
    newlyUnlocked,
  };
}
