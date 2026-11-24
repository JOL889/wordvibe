/**
 * RewardedAdService — Google AdMob Rewarded Ads Wrapper & Web/Native Bridge
 *
 * Uses official Google AdMob TEST Ad Unit IDs by default so rewarded placements run
 * cleanly out of the box without policy violations or build errors.
 *
 * WHERE TO INSERT YOUR PRODUCTION ADMOB AD UNIT ID:
 * 1. Set `VITE_ADMOB_REWARDED_AD_UNIT_ID` in your `.env` / hosting Secrets, OR
 * 2. Replace `PRODUCTION_REWARDED_AD_UNIT_ID` below inside `ADMOB_CONFIG`.
 */

export type RewardPlacement =
  | 'hint'
  | 'extra_attempt'
  | 'save_streak'
  | 'unlock_category'
  | 'trivia_revive'
  | 'trivia_fifty_fifty'
  | 'double_xp'
  | 'unlock_trivia_24h'
  | 'puzzle_word_trivia'
  | 'trivia_reveal_answer_1'
  | 'trivia_reveal_answer_2';

export type AdLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export interface RewardMeta {
  placement: RewardPlacement;
  title: string;
  rewardLabel: string;
  description: string;
  durationSeconds: number;
  isOptionalPrompt: boolean;
}

export interface RewardedAdCallbacks {
  onAdLoaded?: (adUnitId: string) => void;
  onUserEarnedReward?: (placement: RewardPlacement) => void;
  onAdFailedToLoad?: (reason: string) => void;
  onAdDismissedFullScreenContent?: (placement: RewardPlacement, rewardEarned: boolean) => void;
}

export interface AdSDKAdapter {
  readonly providerName: string;
  preloadRewardedAd?(adUnitId: string): Promise<boolean>;
  isRewardedAvailable(placement: RewardPlacement): Promise<boolean>;
  onAdImpression?(placement: RewardPlacement): void;
  onRewardGranted?(placement: RewardPlacement): void;
  onAdDismissed?(placement: RewardPlacement): void;
  onAdFailed?(reason: string): void;
}

/**
 * Official Google AdMob Test Ad Unit IDs + Production Placeholder Constants
 */
export const ADMOB_CONFIG = {
  // Official Google-provided Test Rewarded Ad Unit IDs (safe for dev & QA)
  TEST_REWARDED_ANDROID_ID: 'ca-app-pub-3940256099942544/5224354917',
  TEST_REWARDED_IOS_ID: 'ca-app-pub-3940256099942544/1712485313',

  // PRODUCTION PLACEHOLDER: Set VITE_ADMOB_REWARDED_AD_UNIT_ID or replace below before release
  PRODUCTION_REWARDED_AD_UNIT_ID:
    (import.meta.env?.VITE_ADMOB_REWARDED_AD_UNIT_ID as string | undefined) ||
    'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',

  USE_TEST_ADS_BY_DEFAULT: !import.meta.env?.VITE_ADMOB_REWARDED_AD_UNIT_ID,
} as const;

export function getActiveRewardedAdUnitId(): string {
  if (!ADMOB_CONFIG.USE_TEST_ADS_BY_DEFAULT) {
    return ADMOB_CONFIG.PRODUCTION_REWARDED_AD_UNIT_ID;
  }
  const isApple =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent);
  return isApple ? ADMOB_CONFIG.TEST_REWARDED_IOS_ID : ADMOB_CONFIG.TEST_REWARDED_ANDROID_ID;
}

/**
 * Non-intrusive frequency caps & cooldown constants
 */
export const AD_OPTIONAL_PROMPT_COOLDOWN_MS = 120_000; // 2 minutes between optional upsell prompts
export const AD_DAILY_REWARDED_CAP = 12;

const AD_GUARD_STORAGE_KEY = 'lexicon_ad_frequency_guard_v1';

interface AdFrequencyGuardState {
  dateKey: string;
  dailyAdsWatched: number;
  lastOptionalPromptAtMs: number;
}

function getTodayGuardKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadFrequencyGuard(nowMs: number = Date.now()): AdFrequencyGuardState {
  const today = getTodayGuardKey(nowMs);
  if (typeof window === 'undefined') {
    return { dateKey: today, dailyAdsWatched: 0, lastOptionalPromptAtMs: 0 };
  }
  try {
    const raw = window.localStorage.getItem(AD_GUARD_STORAGE_KEY);
    if (!raw) return { dateKey: today, dailyAdsWatched: 0, lastOptionalPromptAtMs: 0 };
    const parsed = JSON.parse(raw) as Partial<AdFrequencyGuardState>;
    if (parsed.dateKey !== today) {
      return { dateKey: today, dailyAdsWatched: 0, lastOptionalPromptAtMs: 0 };
    }
    return {
      dateKey: today,
      dailyAdsWatched: typeof parsed.dailyAdsWatched === 'number' ? parsed.dailyAdsWatched : 0,
      lastOptionalPromptAtMs:
        typeof parsed.lastOptionalPromptAtMs === 'number' ? parsed.lastOptionalPromptAtMs : 0,
    };
  } catch {
    return { dateKey: today, dailyAdsWatched: 0, lastOptionalPromptAtMs: 0 };
  }
}

function saveFrequencyGuard(state: AdFrequencyGuardState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AD_GUARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export const REWARD_PLACEMENTS: Record<RewardPlacement, RewardMeta> = {
  hint: {
    placement: 'hint',
    title: 'Unlock +1 Letter Hint',
    rewardLabel: '+1 Hint Unlocked',
    description: 'Watch a brief 5-second sponsor preview to reveal a helpful letter position.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
  extra_attempt: {
    placement: 'extra_attempt',
    title: 'Unlock +1 Extra Attempt',
    rewardLabel: '+1 Bonus Row Granted',
    description: 'Watch a brief 5-second sponsor preview to add a 7th guess row to this puzzle.',
    durationSeconds: 5,
    isOptionalPrompt: true,
  },
  save_streak: {
    placement: 'save_streak',
    title: 'Save Your Daily Streak',
    rewardLabel: 'Daily Streak Restored',
    description:
      'Watch a brief 5-second sponsor preview to recover your broken daily streak (1x per 7 days).',
    durationSeconds: 5,
    isOptionalPrompt: true,
  },
  unlock_category: {
    placement: 'unlock_category',
    title: 'Unlock Premium Category (5 Plays)',
    rewardLabel: '5 Plays Unlocked',
    description:
      'Watch a brief 5-second sponsor preview to unlock 5 full puzzles in this premium category.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
  trivia_revive: {
    placement: 'trivia_revive',
    title: 'Second Chance · Keep Streak',
    rewardLabel: 'Trivia Streak Preserved',
    description: 'Watch a short rewarded ad to keep your active Trivia Streak Multiplier alive.',
    durationSeconds: 5,
    isOptionalPrompt: true,
  },
  trivia_fifty_fifty: {
    placement: 'trivia_fifty_fifty',
    title: 'AI Hint · 50-50 Eliminate',
    rewardLabel: '2 Wrong Options Removed',
    description: 'Watch a short rewarded ad to eliminate 2 incorrect choices on this question.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
  double_xp: {
    placement: 'double_xp',
    title: 'Claim 2x Weekly XP Boost',
    rewardLabel: '2x Weekly XP Credited',
    description: 'Watch a short rewarded ad to double the Weekly XP earned from this round.',
    durationSeconds: 5,
    isOptionalPrompt: true,
  },
  unlock_trivia_24h: {
    placement: 'unlock_trivia_24h',
    title: 'Unlock Mastermind Vault (24 Hours)',
    rewardLabel: 'Bonus Theme Unlocked for 24h',
    description: 'Watch a short rewarded ad for 24 hours of unlimited access to Mastermind Vault.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
  puzzle_word_trivia: {
    placement: 'puzzle_word_trivia',
    title: 'Unlock Horizontal Word Trivia',
    rewardLabel: 'Word Trivia Unlocked',
    description:
      'Watch a brief 5-second sponsor preview to unlock an AI word trivia clue for your chosen horizontal line.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
};

declare global {
  interface Window {
    AndroidAdBridge?: {
      preloadRewardedAd?: (adUnitId: string) => void;
      showRewardedAd?: (adUnitId: string, placement: string) => boolean;
    };
    webkit?: {
      messageHandlers?: {
        adBridge?: {
          postMessage: (payload: { action: string; adUnitId: string; placement?: string }) => void;
        };
      };
    };
  }
}

class AdMobHybridAdapter implements AdSDKAdapter {
  public readonly providerName = 'GoogleAdMobRewardedWrapper';

  public async preloadRewardedAd(adUnitId: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      if (window.AndroidAdBridge?.preloadRewardedAd) {
        window.AndroidAdBridge.preloadRewardedAd(adUnitId);
        return true;
      }
      if (window.webkit?.messageHandlers?.adBridge) {
        window.webkit.messageHandlers.adBridge.postMessage({
          action: 'preloadRewarded',
          adUnitId,
        });
        return true;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
      }
    }
    return true;
  }

  public async isRewardedAvailable(_placement: RewardPlacement): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    return true;
  }

  public onAdImpression(placement: RewardPlacement): void {
    const adUnitId = getActiveRewardedAdUnitId();
    if (typeof window !== 'undefined' && window.AndroidAdBridge?.showRewardedAd) {
      window.AndroidAdBridge.showRewardedAd(adUnitId, placement);
    } else if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.adBridge) {
      window.webkit.messageHandlers.adBridge.postMessage({
        action: 'showRewarded',
        adUnitId,
        placement,
      });
    }
  }

  public onRewardGranted(_placement: RewardPlacement): void {
    // Verified reward hook (connect SSV endpoint here if needed)
  }

  public onAdDismissed(_placement: RewardPlacement): void {
    // Closed before reward completion or after claiming
  }

  public onAdFailed(_reason: string): void {
    // Telemetry hook when offline or ad fill is unavailable
  }
}

class RewardedAdService {
  private adapter: AdSDKAdapter = new AdMobHybridAdapter();
  private loadState: AdLoadState = 'idle';
  private callbacks: RewardedAdCallbacks = {};

  public setAdapter(customAdapter: AdSDKAdapter): void {
    this.adapter = customAdapter;
  }

  public setCallbacks(callbacks: RewardedAdCallbacks): void {
    this.callbacks = callbacks;
  }

  public getLoadState(): AdLoadState {
    return this.loadState;
  }

  public getActiveAdUnitId(): string {
    return getActiveRewardedAdUnitId();
  }

  public getPlacementMeta(placement: RewardPlacement): RewardMeta {
    return REWARD_PLACEMENTS[placement];
  }

  public async preloadRewardedAd(): Promise<boolean> {
    const adUnitId = getActiveRewardedAdUnitId();
    this.loadState = 'loading';
    try {
      const ok = this.adapter.preloadRewardedAd
        ? await this.adapter.preloadRewardedAd(adUnitId)
        : await this.adapter.isRewardedAvailable('hint');
      if (ok) {
        this.loadState = 'loaded';
        this.callbacks.onAdLoaded?.(adUnitId);
        return true;
      }
      this.loadState = 'failed';
      this.adapter.onAdFailed?.('No ad fill available (offline)');
      this.callbacks.onAdFailedToLoad?.('Rewarded ad unavailable right now.');
      return false;
    } catch {
      this.loadState = 'failed';
      this.adapter.onAdFailed?.('Ad preload exception');
      this.callbacks.onAdFailedToLoad?.('Could not preload rewarded ad.');
      return false;
    }
  }

  public async checkAvailability(placement: RewardPlacement): Promise<boolean> {
    return this.adapter.isRewardedAvailable(placement);
  }

  public getDailyAdsRemaining(nowMs: number = Date.now()): number {
    const guard = loadFrequencyGuard(nowMs);
    return Math.max(0, AD_DAILY_REWARDED_CAP - guard.dailyAdsWatched);
  }

  public canShowOptionalPrompt(nowMs: number = Date.now()): boolean {
    const guard = loadFrequencyGuard(nowMs);
    if (guard.dailyAdsWatched >= AD_DAILY_REWARDED_CAP) return false;
    return nowMs - guard.lastOptionalPromptAtMs >= AD_OPTIONAL_PROMPT_COOLDOWN_MS;
  }

  public getOptionalCooldownRemainingSec(nowMs: number = Date.now()): number {
    const guard = loadFrequencyGuard(nowMs);
    const diff = AD_OPTIONAL_PROMPT_COOLDOWN_MS - (nowMs - guard.lastOptionalPromptAtMs);
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  }

  public recordOptionalPromptShown(nowMs: number = Date.now()): void {
    const guard = loadFrequencyGuard(nowMs);
    saveFrequencyGuard({
      ...guard,
      lastOptionalPromptAtMs: nowMs,
    });
  }

  public notifyImpression(placement: RewardPlacement): void {
    if (REWARD_PLACEMENTS[placement]?.isOptionalPrompt) {
      this.recordOptionalPromptShown();
    }
    this.adapter.onAdImpression?.(placement);
  }

  public notifyRewardGranted(placement: RewardPlacement): void {
    const guard = loadFrequencyGuard();
    saveFrequencyGuard({
      ...guard,
      dailyAdsWatched: guard.dailyAdsWatched + 1,
    });
    this.adapter.onRewardGranted?.(placement);
    this.callbacks.onUserEarnedReward?.(placement);
    this.callbacks.onAdDismissedFullScreenContent?.(placement, true);
    // Automatically preload the next ad in the background
    void this.preloadRewardedAd();
  }

  public notifyDismissed(placement: RewardPlacement): void {
    this.adapter.onAdDismissed?.(placement);
    this.callbacks.onAdDismissedFullScreenContent?.(placement, false);
    void this.preloadRewardedAd();
  }

  public notifyFailedToLoad(reason: string): void {
    this.loadState = 'failed';
    this.adapter.onAdFailed?.(reason);
    this.callbacks.onAdFailedToLoad?.(reason);
  }
}

export const rewardedAdService = new RewardedAdService();
