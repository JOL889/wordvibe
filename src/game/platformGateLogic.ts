import { isPrivacyPath } from './navigationLogic';

export const WORDVIBE_APK_FILENAME = 'WordVibe-release.apk';
export const WORDVIBE_APK_DOWNLOAD_URL =
  'https://github.com/JOL889/wordvibe/releases/latest/download/WordVibe-release.apk';
export const WORDVIBE_APK_RELEASES_URL = 'https://github.com/JOL889/wordvibe/releases/latest';
export const WORDVIBE_WEB_SHARE_URL = 'https://wordvibe.pages.dev';

export type AppEntryExperience = 'game' | 'install_landing' | 'privacy' | 'terms';

export interface CapacitorLike {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  platform?: string;
}

export interface NativeRuntimeWindowLike {
  Capacitor?: CapacitorLike;
  androidBridge?: unknown;
}

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

function hasNativeCapacitorBridge(cap?: CapacitorLike | null): boolean {
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      return true;
    }
    if (typeof cap.getPlatform === 'function') {
      const platform = cap.getPlatform();
      if (platform === 'android' || platform === 'ios') {
        return true;
      }
    }
    if (cap.platform === 'android' || cap.platform === 'ios') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isNativeAndroidRuntime(
  capacitorInstance?: CapacitorLike | null,
  runtimeWindow?: NativeRuntimeWindowLike | null
): boolean {
  // 1. Check imported Capacitor runtime first
  if (hasNativeCapacitorBridge(capacitorInstance)) {
    return true;
  }

  // 2. Check injected Capacitor Android WebView bridge indicators (for live server.url loads)
  const win =
    runtimeWindow !== undefined
      ? runtimeWindow
      : typeof window !== 'undefined'
      ? (window as unknown as NativeRuntimeWindowLike)
      : null;

  if (!win) return false;

  if (hasNativeCapacitorBridge(win.Capacitor)) {
    return true;
  }

  if (win.androidBridge && typeof win.androidBridge === 'object') {
    return true;
  }

  return false;
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
