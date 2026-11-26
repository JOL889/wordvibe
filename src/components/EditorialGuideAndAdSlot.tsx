import React from 'react';
import { HelpCircle } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface EditorialGuideAndAdSlotProps {
  isActivelyTyping: boolean;
  onOpenHelp: (tab?: 'rules' | 'streaks' | 'faq') => void;
}

export const EditorialGuideAndAdSlot: React.FC<EditorialGuideAndAdSlotProps> = ({
  isActivelyTyping,
  onOpenHelp,
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
              WordVibe Free Play
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
        <button
          type="button"
          data-testid="open-help-enquiry-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenHelp('rules');
          }}
          className="inline-flex min-h-10 items-center gap-1.5 font-semibold wv-text hover:underline underline-offset-4 cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>How to Play, Streak Rules &amp; FAQ</span>
        </button>

        <div className="flex items-center gap-3">
          <PWAInstallButton compact />
          <span>Offline Ready</span>
        </div>
      </footer>
    </div>
  );
};
