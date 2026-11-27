/**
 * Centralized Google AdMob Configuration for WordVibe (com.jol889.wordvibe)
 *
 * Keep USE_TEST_ADS = true during development and device testing.
 * Flip USE_TEST_ADS = false only when preparing a production Play Store / APK release.
 */

export const USE_TEST_ADS = true;

export const ADMOB_ANDROID_APP_ID = 'ca-app-pub-7584471711915098~8594351362';

export type AdMobFormat =
  | 'rewarded'
  | 'rewardedInterstitial'
  | 'interstitial'
  | 'appOpen';

export interface AdUnitPair {
  readonly test: string;
  readonly live: string;
}

export const ADMOB_AD_UNITS: Record<AdMobFormat, AdUnitPair> = {
  rewarded: {
    test: 'ca-app-pub-3940256099942544/5224354917',
    live: 'ca-app-pub-7584471711915098/9549174533',
  },
  rewardedInterstitial: {
    test: 'ca-app-pub-3940256099942544/5354046379',
    live: 'ca-app-pub-7584471711915098/1779650679',
  },
  interstitial: {
    test: 'ca-app-pub-3940256099942544/1033173712',
    live: 'ca-app-pub-7584471711915098/9215287564',
  },
  appOpen: {
    test: 'ca-app-pub-3940256099942544/9257395921',
    live: 'ca-app-pub-7584471711915098/7111868404',
  },
} as const;

export function getAdMobUnitId(
  format: AdMobFormat,
  useTestAds: boolean = USE_TEST_ADS
): string {
  const pair = ADMOB_AD_UNITS[format];
  return useTestAds ? pair.test : pair.live;
}
