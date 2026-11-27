import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  AppOpenAdPluginEvents,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  RewardInterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import { getAdMobUnitId, USE_TEST_ADS } from '../config/admob';
import {
  canShowAppOpenAd,
  canShowInterstitialWithCooldown,
  INTERSTITIAL_COOLDOWN_MS,
} from '../game/admobFlowLogic';

export type RewardedShowResult = {
  shown: boolean;
  rewarded: boolean;
  reason?: string;
};

export type InterstitialShowResult = {
  shown: boolean;
  reason?: string;
};

type AdPresentationListener = (isShowing: boolean) => void;

interface AppOpenSuppressionContext {
  isAuthModalOpen: boolean;
  isAuthBusy: boolean;
}

type FormatSlotKey = 'rewarded' | 'rewardedInterstitial' | 'interstitial' | 'appOpen';

interface FormatSlotState {
  ready: boolean;
  loadingPromise: Promise<boolean> | null;
  lastFailedAtMs: number;
}

const PRELOAD_RETRY_BACKOFF_MS = 12_000;
const AD_DISMISS_SAFETY_TIMEOUT_MS = 90_000;

class NativeAdMobService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private listenerHandles: PluginListenerHandle[] = [];

  private slots: Record<FormatSlotKey, FormatSlotState> = {
    rewarded: { ready: false, loadingPromise: null, lastFailedAtMs: 0 },
    rewardedInterstitial: { ready: false, loadingPromise: null, lastFailedAtMs: 0 },
    interstitial: { ready: false, loadingPromise: null, lastFailedAtMs: 0 },
    appOpen: { ready: false, loadingPromise: null, lastFailedAtMs: 0 },
  };

  private activePresentingCount = 0;
  private presentationListeners = new Set<AdPresentationListener>();

  private lastInterstitialShownAtMs = 0;
  private lastAppOpenShownAtMs = 0;
  private initialLaunchAttempted = false;
  private suppression: AppOpenSuppressionContext = {
    isAuthModalOpen: false,
    isAuthBusy: false,
  };

  private activeRewardedWaiter: {
    earned: boolean;
    resolve: (res: { dismissed: boolean; earned: boolean; failed: boolean }) => void;
    timeoutId: number | null;
  } | null = null;

  private activeRewardInterstitialWaiter: {
    earned: boolean;
    resolve: (res: { dismissed: boolean; earned: boolean; failed: boolean }) => void;
    timeoutId: number | null;
  } | null = null;

  private activeInterstitialWaiter: {
    resolve: (res: { dismissed: boolean; failed: boolean }) => void;
    timeoutId: number | null;
  } | null = null;

  private activeAppOpenWaiter: {
    resolve: (res: { closed: boolean; failed: boolean }) => void;
    timeoutId: number | null;
  } | null = null;

  public isNativeAndroid(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === 'android' &&
        Capacitor.isPluginAvailable('AdMob')
      );
    } catch {
      return false;
    }
  }

  public isNativeRuntime(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        Capacitor.isNativePlatform() &&
        Capacitor.isPluginAvailable('AdMob')
      );
    } catch {
      return false;
    }
  }

  public isPresentingAd(): boolean {
    return this.activePresentingCount > 0;
  }

  public subscribeAdPresentation(listener: AdPresentationListener): () => void {
    this.presentationListeners.add(listener);
    listener(this.isPresentingAd());
    return () => {
      this.presentationListeners.delete(listener);
    };
  }

  public setAppOpenSuppressionContext(ctx: AppOpenSuppressionContext): void {
    this.suppression = { ...ctx };
  }

  private beginPresenting(): void {
    const wasShowing = this.activePresentingCount > 0;
    this.activePresentingCount += 1;
    if (!wasShowing) {
      for (const fn of this.presentationListeners) {
        try {
          fn(true);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  private endPresenting(): void {
    this.activePresentingCount = Math.max(0, this.activePresentingCount - 1);
    if (this.activePresentingCount === 0) {
      for (const fn of this.presentationListeners) {
        try {
          fn(false);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  public async initialize(): Promise<void> {
    if (!this.isNativeRuntime()) return;
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this.attachPluginListeners();
        await AdMob.initialize({
          initializeForTesting: USE_TEST_ADS,
        });
        this.initialized = true;
        void this.preloadAll().then(() => {
          if (!this.initialLaunchAttempted) {
            this.initialLaunchAttempted = true;
            void this.showAppOpenIfEligible('launch');
          }
        });
      } catch {
        this.initialized = false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async attachPluginListeners(): Promise<void> {
    if (this.listenerHandles.length > 0) return;

    const add = (promise: Promise<PluginListenerHandle>) =>
      promise.then((handle) => {
        this.listenerHandles.push(handle);
      });

    await Promise.allSettled([
      // Rewarded listeners
      add(
        AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
          this.slots.rewarded.ready = true;
          this.slots.rewarded.lastFailedAtMs = 0;
        })
      ),
      add(
        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          this.slots.rewarded.ready = false;
          this.slots.rewarded.lastFailedAtMs = Date.now();
        })
      ),
      add(
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (this.activeRewardedWaiter) {
            this.activeRewardedWaiter.earned = true;
          }
        })
      ),
      add(
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.slots.rewarded.ready = false;
          const waiter = this.activeRewardedWaiter;
          if (waiter) {
            this.activeRewardedWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: true, earned: waiter.earned, failed: false });
          }
          this.schedulePreload('rewarded');
        })
      ),
      add(
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          this.slots.rewarded.ready = false;
          const waiter = this.activeRewardedWaiter;
          if (waiter) {
            this.activeRewardedWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: false, earned: false, failed: true });
          }
          this.schedulePreload('rewarded');
        })
      ),

      // Rewarded Interstitial listeners
      add(
        AdMob.addListener(RewardInterstitialAdPluginEvents.Loaded, () => {
          this.slots.rewardedInterstitial.ready = true;
          this.slots.rewardedInterstitial.lastFailedAtMs = 0;
        })
      ),
      add(
        AdMob.addListener(RewardInterstitialAdPluginEvents.FailedToLoad, () => {
          this.slots.rewardedInterstitial.ready = false;
          this.slots.rewardedInterstitial.lastFailedAtMs = Date.now();
        })
      ),
      add(
        AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, () => {
          if (this.activeRewardInterstitialWaiter) {
            this.activeRewardInterstitialWaiter.earned = true;
          }
        })
      ),
      add(
        AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => {
          this.slots.rewardedInterstitial.ready = false;
          const waiter = this.activeRewardInterstitialWaiter;
          if (waiter) {
            this.activeRewardInterstitialWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: true, earned: waiter.earned, failed: false });
          }
          this.schedulePreload('rewardedInterstitial');
        })
      ),
      add(
        AdMob.addListener(RewardInterstitialAdPluginEvents.FailedToShow, () => {
          this.slots.rewardedInterstitial.ready = false;
          const waiter = this.activeRewardInterstitialWaiter;
          if (waiter) {
            this.activeRewardInterstitialWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: false, earned: false, failed: true });
          }
          this.schedulePreload('rewardedInterstitial');
        })
      ),

      // Interstitial listeners
      add(
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
          this.slots.interstitial.ready = true;
          this.slots.interstitial.lastFailedAtMs = 0;
        })
      ),
      add(
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
          this.slots.interstitial.ready = false;
          this.slots.interstitial.lastFailedAtMs = Date.now();
        })
      ),
      add(
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          this.slots.interstitial.ready = false;
          const waiter = this.activeInterstitialWaiter;
          if (waiter) {
            this.activeInterstitialWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: true, failed: false });
          }
          this.schedulePreload('interstitial');
        })
      ),
      add(
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          this.slots.interstitial.ready = false;
          const waiter = this.activeInterstitialWaiter;
          if (waiter) {
            this.activeInterstitialWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ dismissed: false, failed: true });
          }
          this.schedulePreload('interstitial');
        })
      ),

      // App Open listeners
      add(
        AdMob.addListener(AppOpenAdPluginEvents.Loaded, () => {
          this.slots.appOpen.ready = true;
          this.slots.appOpen.lastFailedAtMs = 0;
        })
      ),
      add(
        AdMob.addListener(AppOpenAdPluginEvents.FailedToLoad, () => {
          this.slots.appOpen.ready = false;
          this.slots.appOpen.lastFailedAtMs = Date.now();
        })
      ),
      add(
        AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
          this.slots.appOpen.ready = false;
          const waiter = this.activeAppOpenWaiter;
          if (waiter) {
            this.activeAppOpenWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ closed: true, failed: false });
          }
          this.schedulePreload('appOpen');
        })
      ),
      add(
        AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
          this.slots.appOpen.ready = false;
          const waiter = this.activeAppOpenWaiter;
          if (waiter) {
            this.activeAppOpenWaiter = null;
            if (waiter.timeoutId !== null) window.clearTimeout(waiter.timeoutId);
            waiter.resolve({ closed: false, failed: true });
          }
          this.schedulePreload('appOpen');
        })
      ),

      // Capacitor Foreground Resume for App Open Ads
      ...(Capacitor.isPluginAvailable('App')
        ? [
            add(
              App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                  void this.showAppOpenIfEligible('resume');
                }
              })
            ),
          ]
        : []),
    ]);
  }

  private schedulePreload(format: FormatSlotKey): void {
    if (!this.isNativeRuntime() || typeof window === 'undefined') return;
    window.setTimeout(() => {
      void this.preloadFormat(format, true);
    }, 200);
  }

  private async preloadFormat(format: FormatSlotKey, force = false): Promise<boolean> {
    if (!this.isNativeRuntime()) return false;
    const slot = this.slots[format];
    if (slot.ready && !force) return true;
    if (slot.loadingPromise) return slot.loadingPromise;
    if (
      !force &&
      slot.lastFailedAtMs > 0 &&
      Date.now() - slot.lastFailedAtMs < PRELOAD_RETRY_BACKOFF_MS
    ) {
      return false;
    }

    const adId = getAdMobUnitId(format, USE_TEST_ADS);
    slot.loadingPromise = (async () => {
      try {
        if (format === 'rewarded') {
          await AdMob.prepareRewardVideoAd({ adId, isTesting: USE_TEST_ADS });
        } else if (format === 'rewardedInterstitial') {
          await AdMob.prepareRewardInterstitialAd({ adId, isTesting: USE_TEST_ADS });
        } else if (format === 'interstitial') {
          await AdMob.prepareInterstitial({ adId, isTesting: USE_TEST_ADS });
        } else {
          await AdMob.loadAppOpen({ adId });
        }
        slot.ready = true;
        slot.lastFailedAtMs = 0;
        return true;
      } catch {
        slot.ready = false;
        slot.lastFailedAtMs = Date.now();
        return false;
      } finally {
        slot.loadingPromise = null;
      }
    })();

    return slot.loadingPromise;
  }

  public async preloadAll(): Promise<void> {
    if (!this.isNativeRuntime()) return;
    await Promise.allSettled([
      this.preloadFormat('rewarded'),
      this.preloadFormat('rewardedInterstitial'),
      this.preloadFormat('interstitial'),
      this.preloadFormat('appOpen'),
    ]);
  }

  public async showRewarded(_placement: string): Promise<RewardedShowResult> {
    if (!this.isNativeRuntime()) {
      return { shown: false, rewarded: false, reason: 'web_noop' };
    }
    if (this.isPresentingAd()) {
      return { shown: false, rewarded: false, reason: 'already_presenting' };
    }

    await this.initialize();
    const loaded = await this.preloadFormat('rewarded', !this.slots.rewarded.ready);
    if (!loaded) {
      return { shown: false, rewarded: false, reason: 'load_failed' };
    }

    this.beginPresenting();
    this.slots.rewarded.ready = false;

    try {
      const dismissPromise = new Promise<{ dismissed: boolean; earned: boolean; failed: boolean }>(
        (resolve) => {
          const timeoutId = window.setTimeout(() => {
            if (this.activeRewardedWaiter) {
              const earned = this.activeRewardedWaiter.earned;
              this.activeRewardedWaiter = null;
              resolve({ dismissed: true, earned, failed: false });
            }
          }, AD_DISMISS_SAFETY_TIMEOUT_MS);
          this.activeRewardedWaiter = { earned: false, resolve, timeoutId };
        }
      );

      let rewardEarnedFromPromise = false;
      try {
        const rewardItem = await AdMob.showRewardVideoAd();
        if (rewardItem && (rewardItem.amount > 0 || Boolean(rewardItem.type))) {
          rewardEarnedFromPromise = true;
          if (this.activeRewardedWaiter) {
            this.activeRewardedWaiter.earned = true;
          }
        }
      } catch {
        // Ad failed or dismissed without reward; check waiter below
        if (this.activeRewardedWaiter) {
          const w = this.activeRewardedWaiter;
          this.activeRewardedWaiter = null;
          if (w.timeoutId !== null) window.clearTimeout(w.timeoutId);
          w.resolve({ dismissed: false, earned: w.earned, failed: true });
        }
      }

      const settled = await dismissPromise;
      const rewarded = Boolean(settled.earned || rewardEarnedFromPromise);
      return {
        shown: !settled.failed || rewarded,
        rewarded,
        reason: settled.failed && !rewarded ? 'show_failed' : rewarded ? undefined : 'dismissed',
      };
    } finally {
      this.endPresenting();
      this.schedulePreload('rewarded');
    }
  }

  public async showRewardedInterstitial(_placement: string): Promise<RewardedShowResult> {
    if (!this.isNativeRuntime()) {
      return { shown: false, rewarded: false, reason: 'web_noop' };
    }
    if (this.isPresentingAd()) {
      return { shown: false, rewarded: false, reason: 'already_presenting' };
    }

    await this.initialize();
    const loaded = await this.preloadFormat(
      'rewardedInterstitial',
      !this.slots.rewardedInterstitial.ready
    );
    if (!loaded) {
      return { shown: false, rewarded: false, reason: 'load_failed' };
    }

    this.beginPresenting();
    this.slots.rewardedInterstitial.ready = false;

    try {
      const dismissPromise = new Promise<{ dismissed: boolean; earned: boolean; failed: boolean }>(
        (resolve) => {
          const timeoutId = window.setTimeout(() => {
            if (this.activeRewardInterstitialWaiter) {
              const earned = this.activeRewardInterstitialWaiter.earned;
              this.activeRewardInterstitialWaiter = null;
              resolve({ dismissed: true, earned, failed: false });
            }
          }, AD_DISMISS_SAFETY_TIMEOUT_MS);
          this.activeRewardInterstitialWaiter = { earned: false, resolve, timeoutId };
        }
      );

      let rewardEarnedFromPromise = false;
      try {
        const rewardItem = await AdMob.showRewardInterstitialAd();
        if (rewardItem && (rewardItem.amount > 0 || Boolean(rewardItem.type))) {
          rewardEarnedFromPromise = true;
          if (this.activeRewardInterstitialWaiter) {
            this.activeRewardInterstitialWaiter.earned = true;
          }
        }
      } catch {
        if (this.activeRewardInterstitialWaiter) {
          const w = this.activeRewardInterstitialWaiter;
          this.activeRewardInterstitialWaiter = null;
          if (w.timeoutId !== null) window.clearTimeout(w.timeoutId);
          w.resolve({ dismissed: false, earned: w.earned, failed: true });
        }
      }

      const settled = await dismissPromise;
      const rewarded = Boolean(settled.earned || rewardEarnedFromPromise);
      return {
        shown: !settled.failed || rewarded,
        rewarded,
        reason: settled.failed && !rewarded ? 'show_failed' : rewarded ? undefined : 'dismissed',
      };
    } finally {
      this.endPresenting();
      this.schedulePreload('rewardedInterstitial');
    }
  }

  public async showInterstitial(_placement: string): Promise<InterstitialShowResult> {
    if (!this.isNativeRuntime()) {
      return { shown: false, reason: 'web_noop' };
    }
    if (this.isPresentingAd()) {
      return { shown: false, reason: 'already_presenting' };
    }
    const now = Date.now();
    if (
      !canShowInterstitialWithCooldown(
        this.lastInterstitialShownAtMs,
        now,
        INTERSTITIAL_COOLDOWN_MS
      )
    ) {
      return { shown: false, reason: 'cooldown' };
    }

    await this.initialize();
    const loaded = await this.preloadFormat('interstitial', !this.slots.interstitial.ready);
    if (!loaded) {
      return { shown: false, reason: 'load_failed' };
    }

    this.beginPresenting();
    this.slots.interstitial.ready = false;
    this.lastInterstitialShownAtMs = Date.now();

    try {
      const dismissPromise = new Promise<{ dismissed: boolean; failed: boolean }>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          if (this.activeInterstitialWaiter) {
            this.activeInterstitialWaiter = null;
            resolve({ dismissed: true, failed: false });
          }
        }, AD_DISMISS_SAFETY_TIMEOUT_MS);
        this.activeInterstitialWaiter = { resolve, timeoutId };
      });

      try {
        await AdMob.showInterstitial();
      } catch {
        if (this.activeInterstitialWaiter) {
          const w = this.activeInterstitialWaiter;
          this.activeInterstitialWaiter = null;
          if (w.timeoutId !== null) window.clearTimeout(w.timeoutId);
          w.resolve({ dismissed: false, failed: true });
        }
      }

      const settled = await dismissPromise;
      return {
        shown: !settled.failed,
        reason: settled.failed ? 'show_failed' : undefined,
      };
    } finally {
      this.endPresenting();
      this.schedulePreload('interstitial');
    }
  }

  public async showAppOpenIfEligible(_trigger: 'launch' | 'resume'): Promise<boolean> {
    const eligible = canShowAppOpenAd({
      isNativePlatform: this.isNativeRuntime(),
      isAdShowing: this.isPresentingAd(),
      isAuthModalOpen: this.suppression.isAuthModalOpen,
      isAuthBusy: this.suppression.isAuthBusy,
      lastShownAtMs: this.lastAppOpenShownAtMs,
    });
    if (!eligible) return false;

    try {
      const { value: isLoaded } = await AdMob.isAppOpenLoaded();
      if (!isLoaded && !this.slots.appOpen.ready) {
        void this.preloadFormat('appOpen', true);
        return false;
      }
    } catch {
      if (!this.slots.appOpen.ready) return false;
    }

    this.beginPresenting();
    this.slots.appOpen.ready = false;
    this.lastAppOpenShownAtMs = Date.now();

    try {
      const closePromise = new Promise<{ closed: boolean; failed: boolean }>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          if (this.activeAppOpenWaiter) {
            this.activeAppOpenWaiter = null;
            resolve({ closed: true, failed: false });
          }
        }, AD_DISMISS_SAFETY_TIMEOUT_MS);
        this.activeAppOpenWaiter = { resolve, timeoutId };
      });

      try {
        await AdMob.showAppOpen();
      } catch {
        if (this.activeAppOpenWaiter) {
          const w = this.activeAppOpenWaiter;
          this.activeAppOpenWaiter = null;
          if (w.timeoutId !== null) window.clearTimeout(w.timeoutId);
          w.resolve({ closed: false, failed: true });
        }
      }

      const settled = await closePromise;
      return !settled.failed;
    } finally {
      this.endPresenting();
      this.schedulePreload('appOpen');
    }
  }
}

export const admobService = new NativeAdMobService();
