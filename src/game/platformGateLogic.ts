import { isPrivacyPath } from './navigationLogic';

export const WORDVIBE_APK_DOWNLOAD_URL = 'https://github.com/JOL889/wordvibe/releases/latest';

export type AppEntryExperience = 'game' | 'install_landing' | 'privacy' | 'terms';

const BLOCKED_WEB_GAME_PATHS = new Set([
  '/puzzle',
  '/puzzles',
  '/trivia',
  '/faith',
  '/home',
  '/leaderboard',
  '/profile',
  '/settings',
  '/game',
  '/play',
]);

export function isTermsPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return normalized === '/terms';
}

export function isBlockedGameUrlOnWeb(pathname: string, search = ''): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (BLOCKED_WEB_GAME_PATHS.has(normalizedPath)) {
    return true;
  }
  const params = new URLSearchParams(search || '');
  return params.has('tab') || params.has('autostart') || params.has('mode');
}

export function isNativeAndroidRuntime(
  capacitorInstance?: { isNativePlatform?: () => boolean } | null
): boolean {
  try {
    return Boolean(capacitorInstance && typeof capacitorInstance.isNativePlatform === 'function' && capacitorInstance.isNativePlatform());
  } catch {
    return false;
  }
}

export function resolveAppEntryExperience(input: {
  isNativePlatform: boolean;
  pathname: string;
  search?: string;
}): AppEntryExperience {
  if (input.isNativePlatform) {
    return 'game';
  }
  if (isPrivacyPath(input.pathname)) {
    return 'privacy';
  }
  if (isTermsPath(input.pathname)) {
    return 'terms';
  }
  return 'install_landing';
}
