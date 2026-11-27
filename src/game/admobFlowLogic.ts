import type { SessionPlayMode } from './settingsLogic';

export const INTERSTITIAL_COOLDOWN_MS = 20_000;
export const APP_OPEN_COOLDOWN_MS = 60_000;
export const TRIVIA_LOW_TIMER_LIFELINE_SEC = 4;

export function canShowInterstitialWithCooldown(
  lastShownAtMs: number,
  nowMs: number = Date.now(),
  cooldownMs: number = INTERSTITIAL_COOLDOWN_MS
): boolean {
  if (lastShownAtMs <= 0) return true;
  return nowMs - lastShownAtMs >= cooldownMs;
}

export interface AppOpenEligibilityInput {
  isNativePlatform: boolean;
  isAdShowing: boolean;
  isAuthModalOpen: boolean;
  isAuthBusy: boolean;
  lastShownAtMs: number;
  nowMs?: number;
  cooldownMs?: number;
}

export function canShowAppOpenAd(input: AppOpenEligibilityInput): boolean {
  if (!input.isNativePlatform) return false;
  if (input.isAdShowing) return false;
  if (input.isAuthModalOpen || input.isAuthBusy) return false;
  const now = input.nowMs ?? Date.now();
  const cooldown = input.cooldownMs ?? APP_OPEN_COOLDOWN_MS;
  if (input.lastShownAtMs > 0 && now - input.lastShownAtMs < cooldown) {
    return false;
  }
  return true;
}

export interface FourSecondLifelineInput {
  sessionMode: SessionPlayMode;
  timeLeftSec: number;
  isAnswered: boolean;
  isTimedOut: boolean;
  isStageComplete: boolean;
  alreadyOfferedForQuestion: boolean;
  isPaused: boolean;
}

export function shouldTriggerFourSecondLifeline(
  input: FourSecondLifelineInput
): boolean {
  if (input.sessionMode !== 'level_climb') return false;
  if (input.isAnswered || input.isTimedOut || input.isStageComplete) return false;
  if (input.alreadyOfferedForQuestion) return false;
  if (input.isPaused) return false;
  return input.timeLeftSec === TRIVIA_LOW_TIMER_LIFELINE_SEC;
}

export interface SequentialRevealAdProgress {
  completedAds: number;
  requiredAds: number;
  revealed: boolean;
}

export function advanceSequentialRevealAd(
  currentCompletedAds: number,
  requiredAds: number = 2
): SequentialRevealAdProgress {
  const safeReq = Math.max(1, Math.floor(requiredAds));
  const next = Math.min(safeReq, Math.max(0, Math.floor(currentCompletedAds)) + 1);
  return {
    completedAds: next,
    requiredAds: safeReq,
    revealed: next >= safeReq,
  };
}
