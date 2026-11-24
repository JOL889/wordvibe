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
    <div className="mx-auto mt-4 w-full max-w-xl px-4 pb-4">
      {/* Quiet footer banner ad slot — strictly outside active puzzle input */}
      <aside
        aria-label="Sponsored placement"
        data-testid="footer-ad-slot"
        className={`rounded-xl border border-stone-200/70 dark:border-zinc-800/70 bg-white/45 dark:bg-zinc-900/45 px-3.5 py-2 text-center transition-opacity duration-200 ${
          isActivelyTyping ? 'opacity-45' : 'opacity-90'
        }`}
      >
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:text-left">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Sponsored · Non-intrusive slot
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Free daily play with optional rewarded hints and zero pop-up interruptions.
            </p>
          </div>
          {/* Production Hook: Mount Google AdSense <ins className="adsbygoogle" /> or GPT 728x90 / 320x50 banner unit here */}
          <div className="rounded-md bg-stone-200/50 dark:bg-zinc-800/60 px-2.5 py-1 font-mono-tabular text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            Ad Slot · 728×90
          </div>
        </div>
      </aside>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 dark:border-zinc-800/70 pt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          data-testid="open-help-enquiry-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenHelp('rules');
          }}
          className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#1E6B52] dark:hover:text-emerald-400 hover:underline underline-offset-4 cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>How to Play, Streak Rules &amp; FAQ</span>
        </button>

        <div className="flex items-center gap-3">
          <PWAInstallButton compact />
          <span>Offline PWA</span>
        </div>
      </footer>
    </div>
  );
};
