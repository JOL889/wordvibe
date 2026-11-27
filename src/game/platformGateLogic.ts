import { isPrivacyPath } from './navigationLogic';

export const WORDVIBE_APK_DOWNLOAD_URL = 'https://github.com/JOL889/wordvibe/releases/latest';

export type AppEntryExperience = 'game' | 'install_landing' | 'privacy' | 'terms';

const ALLOWED_WEB_PUBLIC_PATHS = new Set(['/', '/privacy', '/terms']);

const BLOCKED_GAME_QUERY_PARAMS = [
  'tab',
  'autostart',
  'mode',
  'category',
  'level',
  'play',
];

export function isTermsPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return normalized === '/terms';
}

export function isBlockedGameUrlOnWeb(pathname: string, search = ''): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (!ALLOWED_WEB_PUBLIC_PATHS.has(normalizedPath)) {
    return true;
  }
  const params = new URLSearchParams(search || '');
  return BLOCKED_GAME_QUERY_PARAMS.some((key) => params.has(key));
}

export function isNativeAndroidRuntime(
  capacitorInstance?: { isNativePlatform?: () => boolean } | null
): boolean {
  try {
    return Boolean(
      capacitorInstance &&
        typeof capacitorInstance.isNativePlatform === 'function' &&
        capacitorInstance.isNativePlatform()
    );
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
