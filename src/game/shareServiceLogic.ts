import { WORDVIBE_APK_DOWNLOAD_URL } from './platformGateLogic';

export interface SocialSharePayload {
  title: string;
  text: string;
  url: string;
}

export function resolveShareAppUrl(options?: {
  apkDownloadUrl?: string;
}): string {
  const candidate = options?.apkDownloadUrl?.trim();
  return candidate || WORDVIBE_APK_DOWNLOAD_URL;
}

export function buildLandingAppSharePayload(
  appUrl = WORDVIBE_APK_DOWNLOAD_URL
): SocialSharePayload {
  return {
    title: 'Wordvibe — Daily Word Puzzle, Brain Trivia & Faith Study',
    text: [
      '🧩 Wordvibe — Daily Crosswords, Brain Trivia & Faith Study',
      '🟩🟩🟩🟩 Solve 4×4, 5×5 & 6×6 linked puzzles offline and climb weekly leaderboards.',
      '',
      '📲 Download the Android APK:',
    ].join('\n'),
    url: appUrl,
  };
}

export function formatShareClipboardMessage(payload: SocialSharePayload): string {
  if (!payload.url) return payload.text;
  if (payload.text.includes(payload.url)) return payload.text;
  return `${payload.text}\n${payload.url}`;
}

async function copyShareText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function shareOrCopyPayload(
  payload: SocialSharePayload
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const fullMessage = formatShareClipboardMessage(payload);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall back to clipboard copy when native share is unavailable
    }
  }

  const copied = await copyShareText(fullMessage);
  return copied ? 'copied' : 'failed';
}
