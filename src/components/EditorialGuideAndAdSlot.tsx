import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';

interface EditorialGuideAndAdSlotProps {
  isActivelyTyping: boolean;
  onOpenPrivacyPolicy?: () => void;
}

export const EditorialGuideAndAdSlot: React.FC<EditorialGuideAndAdSlotProps> = React.memo(({
  isActivelyTyping,
  onOpenPrivacyPolicy,
}) => {
  return (
    <div className="mx-auto mt-4 w-full max-w-2xl lg:max-w-3xl px-3 sm:px-6 pb-6">
      <aside
        aria-label="Free play hints"
        data-testid="footer-ad-slot"
        className={`rounded-2xl border wv-border wv-card-muted px-5 py-3.5 text-center transition-opacity duration-200 ${
          isActivelyTyping ? 'opacity-45' : 'opacity-90'
        }`}
      >
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:text-left">
          <div>
            <p className="text-sm sm:text-base font-bold wv-text">
              Wordvibe Free Play
            </p>
            <p className="text-sm sm:text-base wv-text-muted">
              Play offline anytime with optional hints &amp; clues.
            </p>
          </div>
          <div className="rounded-xl border wv-border wv-card px-3.5 py-2 text-xs sm:text-sm font-bold wv-accent-text whitespace-nowrap">
            Hints Ready
          </div>
        </div>
      </aside>

      <footer className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t wv-border pt-3 text-xs sm:text-sm wv-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span>On-Device Offline Ready</span>
          <a
            href="/privacy"
            data-testid="footer-privacy-link"
            onClick={(e) => {
              if (onOpenPrivacyPolicy) {
                e.preventDefault();
                onOpenPrivacyPolicy();
              }
            }}
            className="font-semibold underline underline-offset-4 hover:opacity-85 cursor-pointer"
          >
            Privacy Policy
          </a>
        </div>
        <PWAInstallButton compact />
      </footer>
    </div>
  );
});
