import type { PlayerProfileState } from './playerProfileLogic';
import { formatLocationLabel, summarizePlayerProfile } from './playerProfileLogic';
import type { StatsData } from './puzzleLogic';

export interface UserEnvironmentSnapshot {
  timezone: string;
  locale: string;
  languages: string[];
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  dayOfWeek: string;
  deviceType: 'Phone' | 'Tablet' | 'Desktop';
  osFamily: 'Android' | 'iOS' | 'macOS' | 'Windows' | 'Linux' | 'Unknown';
  inputMethod: 'Touch' | 'Keyboard';
  colorSchemePreference: 'dark' | 'light';
  connectionType: string;
  gatheredAt: number;
}

export interface UserResearchDossier {
  regionLabel: string;
  cityToken: string;
  locale: string;
  timeOfDay: UserEnvironmentSnapshot['timeOfDay'];
  deviceLabel: string;
  skillTier: 'Warmup' | 'Steady' | 'Sharp';
  focusLabel: string;
  interestsLabel: string;
  promptDossier: string;
}

export function getTimeOfDayWindow(nowMs: number = Date.now()): UserEnvironmentSnapshot['timeOfDay'] {
  const hr = new Date(nowMs).getHours();
  if (hr >= 5 && hr < 12) return 'Morning';
  if (hr >= 12 && hr < 17) return 'Afternoon';
  if (hr >= 17 && hr < 22) return 'Evening';
  return 'Night';
}

export function gatherUserEnvironmentDetails(nowMs: number = Date.now()): UserEnvironmentSnapshot {
  const date = new Date(nowMs);
  const timezone =
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  const dayOfWeek =
    typeof Intl !== 'undefined'
      ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
      : 'Today';
  const timeOfDay = getTimeOfDayWindow(nowMs);

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      timezone,
      locale: 'en-US',
      languages: ['en-US'],
      timeOfDay,
      dayOfWeek,
      deviceType: 'Desktop',
      osFamily: 'Unknown',
      inputMethod: 'Keyboard',
      colorSchemePreference: 'light',
      connectionType: 'online',
      gatheredAt: nowMs,
    };
  }

  const locale = navigator.language || 'en-US';
  const languages =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages.slice(0, 3)
      : [locale];

  const ua = navigator.userAgent || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  const width = window.innerWidth || 1024;

  let osFamily: UserEnvironmentSnapshot['osFamily'] = 'Unknown';
  if (/android/i.test(ua)) osFamily = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) osFamily = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) osFamily = 'macOS';
  else if (/Windows/i.test(ua)) osFamily = 'Windows';
  else if (/Linux/i.test(ua)) osFamily = 'Linux';

  let deviceType: UserEnvironmentSnapshot['deviceType'] = 'Desktop';
  if (width < 640 || /iPhone|Android.*Mobile/i.test(ua)) {
    deviceType = 'Phone';
  } else if (width < 1024 && maxTouch > 0) {
    deviceType = 'Tablet';
  }

  const inputMethod: UserEnvironmentSnapshot['inputMethod'] =
    maxTouch > 0 || deviceType !== 'Desktop' ? 'Touch' : 'Keyboard';

  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const navConn = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection;
  const connectionType = navigator.onLine
    ? navConn?.effectiveType || 'online'
    : 'offline';

  return {
    timezone,
    locale,
    languages,
    timeOfDay,
    dayOfWeek,
    deviceType,
    osFamily,
    inputMethod,
    colorSchemePreference: prefersDark ? 'dark' : 'light',
    connectionType,
    gatheredAt: nowMs,
  };
}

export function buildUserResearchDossier(
  profile: PlayerProfileState,
  stats?: StatsData,
  localHeadlines: string[] = []
): UserResearchDossier {
  const insights = summarizePlayerProfile(profile);
  const env = profile.environmentSnapshot || gatherUserEnvironmentDetails();
  const regionLabel =
    !profile.locationOptOut && profile.location
      ? formatLocationLabel(profile.location)
      : 'Global';

  const rawCity =
    !profile.locationOptOut && profile.location?.city
      ? profile.location.city.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '')
      : '';
  const cityToken = rawCity.length >= 3 && rawCity.length <= 12 ? rawCity : env.timeOfDay;

  const winRate =
    stats && stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : insights.puzzleWinRate;

  let skillTier: UserResearchDossier['skillTier'] = 'Steady';
  if (
    (stats && stats.gamesPlayed >= 4 && winRate >= 75 && insights.avgGuesses <= 4.2) ||
    (profile.triviaAnswered >= 5 && insights.triviaAccuracy >= 80)
  ) {
    skillTier = 'Sharp';
  } else if (
    (stats && stats.gamesPlayed >= 2 && winRate < 45) ||
    profile.challengePace === 'relaxed'
  ) {
    skillTier = 'Warmup';
  }

  const deviceLabel =
    env.osFamily !== 'Unknown' ? `${env.osFamily} ${env.deviceType}` : env.deviceType;
  const focusLabel = profile.focusField?.trim() || 'Everyday Learner';
  const interestsLabel = insights.topInterests.join(', ') || 'Culture & Wordplay';

  const parts = [
    profile.displayName?.trim() ? `Player: ${profile.displayName.trim()}` : '',
    `Location: ${regionLabel} (${env.timezone})`,
    `Language: ${env.locale}`,
    `Window: ${env.dayOfWeek} ${env.timeOfDay}`,
    `Device: ${deviceLabel} (${env.inputMethod})`,
    `Focus: ${focusLabel}`,
    `Interests: ${interestsLabel}`,
    insights.topCategoryNames.length > 0
      ? `Top Topics: ${insights.topCategoryNames.join(', ')}`
      : '',
    `Skill: ${skillTier} (${winRate}% win rate, fav ${insights.favoriteLength}-letter)`,
    localHeadlines.length > 0 ? `Local Buzz: ${localHeadlines[0].slice(0, 72)}` : '',
  ].filter(Boolean);

  return {
    regionLabel,
    cityToken,
    locale: env.locale,
    timeOfDay: env.timeOfDay,
    deviceLabel,
    skillTier,
    focusLabel,
    interestsLabel,
    promptDossier: parts.join(' | '),
  };
}
