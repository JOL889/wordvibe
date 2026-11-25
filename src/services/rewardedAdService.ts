/**
 * RewardedAdService — Google AdMob Rewarded Ads Wrapper & Web/Native Bridge
 *
 * Hints & Word Clues are unlimited as long as ads are watched.
 * Normal Trivia supports watching 2 ads concurrently/sequentially to reveal the answer.
 */

export type RewardPlacement =
  | 'hint'
  | 'puzzle_clue'
  | 'extra_attempt'
  | 'save_streak'
  | 'unlock_category'
  | 'trivia_revive'
  | 'trivia_fifty_fifty'
  | 'double_xp'
  | 'unlock_trivia_24h'
  | 'puzzle_word_trivia'
  | 'trivia_reveal_answer_1'
  | 'trivia_reveal_answer_2'
  | 'trivia_reveal_answer_pair';

export type AdLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export interface RewardMeta {
  placement: RewardPlacement;
  title: string;
  rewardLabel: string;
  description: string;
  durationSeconds: number;
  isOptionalPrompt: boolean;
  concurrentAdsCount?: number;
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

export const ADMOB_CONFIG = {
  TEST_REWARDED_ANDROID_ID: 'ca-app-pub-3940256099942544/5224354917',
  TEST_REWARDED_IOS_ID: 'ca-app-pub-3940256099942544/1712485313',
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

export const AD_OPTIONAL_PROMPT_COOLDOWN_MS = 120_000;
export const AD_DAILY_REWARDED_CAP = 9999; // Hints & clues are unlimited via watched ads

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
    rewardLabel: '+1 Hint Unlocked (Unlimited)',
    description: 'Watch a brief 4-second sponsor preview to reveal a letter box on the grid.',
    durationSeconds: 4,
    isOptionalPrompt: false,
  },
  puzzle_clue: {
    placement: 'puzzle_clue',
    title: 'Unlock Word Structure & Meaning Clue',
    rewardLabel: 'Vowel/Consonant & Meaning Clue Unlocked',
    description:
      'Watch a brief 4-second sponsor preview to reveal consonant/vowel count and the word explanation.',
    durationSeconds: 4,
    isOptionalPrompt: false,
  },
  extra_attempt: {
    placement: 'extra_attempt',
    title: 'Unlock +1 Extra Attempt',
    rewardLabel: '+1 Bonus Row Granted',
    description: 'Watch a brief 5-second sponsor preview to continue playing.',
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
      'Watch a brief 4-second sponsor preview to unlock 5 full puzzles in this premium category.',
    durationSeconds: 4,
    isOptionalPrompt: false,
  },
  trivia_revive: {
    placement: 'trivia_revive',
    title: 'Second Chance · Keep Streak',
    rewardLabel: 'Trivia Streak Preserved',
    description: 'Watch a short rewarded ad to keep your active Trivia Streak Multiplier alive.',
    durationSeconds: 4,
    isOptionalPrompt: true,
  },
  trivia_fifty_fifty: {
    placement: 'trivia_fifty_fifty',
    title: 'Unlock 50/50 Split',
    rewardLabel: '2 Wrong Options Eliminated',
    description: 'Watch a brief 4-second sponsor preview to eliminate two wrong answers.',
    durationSeconds: 4,
    isOptionalPrompt: false,
  },
  double_xp: {
    placement: 'double_xp',
    title: 'Claim 2x Weekly XP Boost',
    rewardLabel: '2x Weekly XP Credited',
    description: 'Watch a short rewarded ad to double the Weekly XP earned from this round.',
    durationSeconds: 4,
    isOptionalPrompt: true,
  },
  unlock_trivia_24h: {
    placement: 'unlock_trivia_24h',
    title: 'Unlock Mastermind Vault (24 Hours)',
    rewardLabel: 'Bonus Theme Unlocked for 24h',
    description: 'Watch a short rewarded ad for 24 hours of unlimited access to Mastermind Vault.',
    durationSeconds: 4,
    isOptionalPrompt: false,
  },
  puzzle_word_trivia: {
    placement: 'puzzle_word_trivia',
    title: 'Unlock Word Trivia Clue',
    rewardLabel: 'Consonant/Vowel & Meaning Clue Unlocked',
    description:
      'Watch a brief 5-second sponsor preview to reveal the consonant/vowel breakdown and meaning clue for your selected horizontal line or vertical column.',
    durationSeconds: 5,
    isOptionalPrompt: false,
  },
  trivia_reveal_answer_1: {
    placement: 'trivia_reveal_answer_1',
    title: 'Reveal Answer · Ad 1 of 2',
    rewardLabel: 'Ad 1 Complete — Ready for Ad 2',
    description: 'Watch 2 quick sponsor previews back-to-back to reveal the exact Trivia answer.',
    durationSeconds: 3,
    isOptionalPrompt: false,
  },
  trivia_reveal_answer_2: {
    placement: 'trivia_reveal_answer_2',
    title: 'Reveal Answer · Ad 2 of 2',
    rewardLabel: 'Correct Answer Unlocked!',
    description: 'Final preview! Claiming reveals the exact verified Trivia answer immediately.',
    durationSeconds: 3,
    isOptionalPrompt: false,
  },
  trivia_reveal_answer_pair: {
    placement: 'trivia_reveal_answer_pair',
    title: 'Watch 2 Concurrent Ads · Reveal Answer',
    rewardLabel: 'Both Ads Watched — Answer Revealed!',
    description: 'Two brief sponsor previews run side-by-side to unlock the exact Trivia answer.',
    durationSeconds: 5,
    isOptionalPrompt: false,
    concurrentAdsCount: 2,
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
    }
    return true;
  }

  public async isRewardedAvailable(_placement: RewardPlacement): Promise<boolean> {
    // Supported both online and in offline test preview mode so ad-gated hints never break without network
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

  public onRewardGranted(_placement: RewardPlacement): void {}
  public onAdDismissed(_placement: RewardPlacement): void {}
  public onAdFailed(_reason: string): void {}
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
    return REWARD_PLACEMENTS[placement] || REWARD_PLACEMENTS.hint;
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
      this.adapter.onAdFailed?.('Ad fill unavailable');
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
