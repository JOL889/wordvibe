import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  X,
} from 'lucide-react';
import {
  buildSocialShareTargets,
  copySharePayload,
  formatShareClipboardMessage,
  triggerNativeSystemShare,
  type SocialSharePayload,
  type SocialSharePlatformId,
} from '../game/shareServiceLogic';

interface SocialShareModalProps {
  open: boolean;
  payload: SocialSharePayload | null;
  onClose: () => void;
  onShared?: (status: 'shared' | 'copied' | 'failed', platform?: string) => void;
}

const PLATFORM_STYLE_MAP: Record<
  SocialSharePlatformId,
  { badgeClass: string; icon: React.ReactNode }
> = {
  whatsapp: {
    badgeClass: 'bg-emerald-600 text-white',
    icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
  },
  x: {
    badgeClass: 'bg-zinc-900 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    badgeClass: 'bg-blue-600 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H8v3h2.3v8h3.2z" />
      </svg>
    ),
  },
  telegram: {
    badgeClass: 'bg-sky-500 text-white',
    icon: <Send className="h-4 w-4" aria-hidden="true" />,
  },
  linkedin: {
    badgeClass: 'bg-blue-700 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
      </svg>
    ),
  },
  reddit: {
    badgeClass: 'bg-orange-600 text-white',
    icon: <Share2 className="h-4 w-4" aria-hidden="true" />,
  },
  sms: {
    badgeClass: 'bg-teal-600 text-white',
    icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
  },
  email: {
    badgeClass: 'bg-amber-600 text-white',
    icon: <Mail className="h-4 w-4" aria-hidden="true" />,
  },
};

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  open,
  payload,
  onClose,
  onShared,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setFeedback(null);
    }
  }, [open, payload]);

  const targets = useMemo(
    () => (payload ? buildSocialShareTargets(payload) : []),
    [payload]
  );

  if (!open || !payload) return null;

  const fullMessage = formatShareClipboardMessage(payload);

  const handleCopy = async () => {
    const ok = await copySharePayload(payload);
    if (ok) {
      setCopied(true);
      setFeedback('Copied message & https://wordvibe.pages.dev link!');
      onShared?.('copied');
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      setFeedback('Clipboard blocked — long-press the text above to copy.');
      onShared?.('failed');
    }
  };

  const handleNativeShare = async () => {
    const status = await triggerNativeSystemShare(payload);
    if (status === 'shared') {
      setFeedback('Shared via device sheet!');
      onShared?.('shared', 'Device Sheet');
      return;
    }
    if (status === 'cancelled') return;
    await handleCopy();
  };

  return (
    <div
      data-testid="social-share-modal"
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/65 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={payload.title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border wv-border wv-card p-5 shadow-lg animate-stage-enter max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl wv-accent-btn">
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold wv-text">
                {payload.title}
              </h2>
              <p className="flex items-center gap-1 text-xs font-semibold wv-accent-text truncate">
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{payload.url}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="social-share-close-btn"
            onClick={onClose}
            aria-label="Close share sheet"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl wv-card-muted wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Preview Message */}
        <div
          data-testid="social-share-preview"
          className="mt-4 rounded-2xl border wv-border wv-card-muted p-3.5 text-xs sm:text-sm leading-relaxed wv-text whitespace-pre-line break-words max-h-56 overflow-y-auto"
        >
          {fullMessage}
        </div>

        {/* Primary Quick Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            data-testid="social-share-copy-btn"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border wv-border wv-card-muted px-3 py-2.5 text-xs sm:text-sm font-bold wv-text hover:opacity-90 cursor-pointer"
          >
            {copied ? (
              <Check className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Message'}</span>
          </button>

          <button
            type="button"
            data-testid="social-share-system-btn"
            onClick={() => void handleNativeShare()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl wv-accent-btn px-3 py-2.5 text-xs sm:text-sm font-bold cursor-pointer"
          >
            <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>More Apps</span>
          </button>
        </div>

        {/* Social Media Platform Grid */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider wv-text-muted mb-2.5">
            Share to Social Media
          </p>
          <div
            data-testid="social-share-platforms"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {targets.map((target) => {
              const style = PLATFORM_STYLE_MAP[target.id];
              return (
                <a
                  key={target.id}
                  data-testid={`share-platform-${target.id}`}
                  href={target.href}
                  target={target.external ? '_blank' : undefined}
                  rel={target.external ? 'noopener noreferrer' : undefined}
                  onClick={() => {
                    onShared?.('shared', target.label);
                  }}
                  className="flex min-h-12 items-center gap-2 rounded-xl border wv-border wv-card-muted px-3 py-2 text-xs font-bold wv-text hover:opacity-90 transition-transform active:scale-95 cursor-pointer"
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badgeClass}`}
                  >
                    {style.icon}
                  </span>
                  <span className="truncate flex-1">{target.label}</span>
                  {target.external && (
                    <ExternalLink className="h-3 w-3 shrink-0 wv-text-muted opacity-70" aria-hidden="true" />
                  )}
                </a>
              );
            })}
          </div>
        </div>

        {feedback && (
          <p
            data-testid="social-share-feedback"
            role="status"
            className="mt-3 text-center text-xs font-semibold wv-accent-text"
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
};
