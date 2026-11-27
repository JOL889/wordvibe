import { WORDVIBE_WEB_SHARE_URL } from './platformGateLogic';

export interface SocialSharePayload {
  title: string;
  text: string;
  url: string;
}

export type SocialSharePlatformId =
  | 'whatsapp'
  | 'x'
  | 'facebook'
  | 'telegram'
  | 'linkedin'
  | 'reddit'
  | 'sms'
  | 'email';

export interface SocialShareTarget {
  id: SocialSharePlatformId;
  label: string;
  href: string;
  external: boolean;
}

export function resolveShareAppUrl(options?: {
  shareUrl?: string;
  apkDownloadUrl?: string;
}): string {
  const candidate = options?.shareUrl?.trim() || options?.apkDownloadUrl?.trim();
  return candidate || WORDVIBE_WEB_SHARE_URL;
}

export function buildLandingAppSharePayload(
  appUrl = WORDVIBE_WEB_SHARE_URL
): SocialSharePayload {
  return {
    title: 'Wordvibe — Daily Word Puzzle, Brain Trivia & Faith Study',
    text: [
      '🧩 Wordvibe — Daily Crosswords, Brain Trivia & Faith Study',
      '🟩🟩🟩🟩 Solve 4×4, 5×5 & 6×6 linked puzzles offline and climb weekly leaderboards.',
      '',
      '📲 Get Wordvibe for Android:',
    ].join('\n'),
    url: appUrl,
  };
}

export function formatShareClipboardMessage(payload: SocialSharePayload): string {
  if (!payload.url) return payload.text;
  if (payload.text.includes(payload.url)) return payload.text;
  return `${payload.text}\n${payload.url}`;
}

export function buildSocialShareTargets(
  payload: SocialSharePayload
): SocialShareTarget[] {
  const shareUrl = payload.url?.trim() || WORDVIBE_WEB_SHARE_URL;
  const normalizedPayload: SocialSharePayload = {
    ...payload,
    url: shareUrl,
  };
  const fullMessage = formatShareClipboardMessage(normalizedPayload);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(payload.text);
  const encodedTitle = encodeURIComponent(payload.title);
  const encodedFull = encodeURIComponent(fullMessage);

  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedFull}`,
      external: true,
    },
    {
      id: 'x',
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      external: true,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      external: true,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      external: true,
    },
    {
      id: 'sms',
      label: 'SMS',
      href: `sms:?body=${encodedFull}`,
      external: false,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedFull}`,
      external: false,
    },
  ];
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

export async function copySharePayload(
  payload: SocialSharePayload
): Promise<boolean> {
  return copyShareText(formatShareClipboardMessage(payload));
}

export async function triggerNativeSystemShare(
  payload: SocialSharePayload
): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unavailable';
  }
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
    return 'unavailable';
  }
}

export async function shareOrCopyPayload(
  payload: SocialSharePayload
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const nativeStatus = await triggerNativeSystemShare(payload);
  if (nativeStatus === 'shared' || nativeStatus === 'cancelled') {
    return nativeStatus;
  }
  const copied = await copySharePayload(payload);
  return copied ? 'copied' : 'failed';
}
