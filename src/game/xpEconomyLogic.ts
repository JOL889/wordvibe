import type { WeeklyActivityState } from './weeklyLogic';
import { computeWeeklyGrade, reconcileWeeklyRollover } from './weeklyLogic';

export const XP_COSTS = {
  PUZZLE_CLUE: 300,
  PUZZLE_HINT: 300,
  TRIVIA_SOLVE: 500,
  TRIVIA_MASTERMIND_UNLOCK: 200,
} as const;

export function getSpendableXpBalance(
  weeklyState: Pick<WeeklyActivityState, 'weeklyXp' | 'totalXp'>
): number {
  return Math.max(0, Math.floor(weeklyState.weeklyXp || 0));
}

export function canAffordXp(
  currentXp: number,
  cost: number
): boolean {
  return Math.max(0, Math.floor(currentXp)) >= Math.max(0, Math.floor(cost));
}

export function formatNotEnoughXpMessage(cost: number): string {
  return `Not enough XP — need ${Math.max(0, Math.floor(cost))} XP`;
}

export interface SpendXpResult {
  success: boolean;
  state: WeeklyActivityState;
  spent: number;
  remainingXp: number;
  errorMessage?: string;
}

/**
 * Deducts `cost` XP from the player's current rating XP (`weeklyXp`) and `totalXp`
 * dynamically (also recalculating rank/grade on next render). Never goes negative.
 */
export function spendPlayerXp(
  prevState: WeeklyActivityState,
  cost: number,
  nowMs: number = Date.now()
): SpendXpResult {
  const normalizedCost = Math.max(0, Math.floor(cost));
  const { state: reconciled } = reconcileWeeklyRollover(prevState, nowMs);
  const available = getSpendableXpBalance(reconciled);

  if (available < normalizedCost) {
    return {
      success: false,
      state: reconciled,
      spent: 0,
      remainingXp: available,
      errorMessage: formatNotEnoughXpMessage(normalizedCost),
    };
  }

  const nextWeeklyXp = Math.max(0, available - normalizedCost);
  const prevTotal = Math.max(reconciled.totalXp || 0, available);
  const nextTotalXp = Math.max(nextWeeklyXp, prevTotal - normalizedCost);

  const nextState: WeeklyActivityState = {
    ...reconciled,
    weeklyXp: nextWeeklyXp,
    totalXp: nextTotalXp,
  };

  return {
    success: true,
    state: nextState,
    spent: normalizedCost,
    remainingXp: nextWeeklyXp,
  };
}

/**
 * Computes current rating grade letter & tier label cleanly from live XP + achievements.
 */
export function getDynamicRatingAfterSpend(
  state: Pick<WeeklyActivityState, 'weeklyXp' | 'unlockedAchievements'>
) {
  return computeWeeklyGrade(state.weeklyXp, state.unlockedAchievements.length);
}
