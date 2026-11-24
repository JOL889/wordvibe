import React, { useEffect, useState } from 'react';
import { Check, CircleDot, HelpCircle, X } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { PWAInstallButton } from './PWAInstallButton';

export type HelpSectionTab = 'rules' | 'streaks' | 'faq';

interface HowToPlayModalProps {
  open: boolean;
  initialTab?: HelpSectionTab;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  open,
  initialTab = 'rules',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HelpSectionTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  if (!open) return null;

  return (
    <div
      data-testid="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-2xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 shadow-2xl animate-modal-pop">
        {/* Compact Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 px-5 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Player Guide &amp; Enquiries</span>
            </div>
            <h2
              id="how-to-play-modal-title"
              className="mt-0.5 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              How to Play WordVibe
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help dialog"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Sub-Tabs */}
        <div className="px-5 pt-3">
          <div
            role="tablist"
            aria-label="Help sections"
            className="grid grid-cols-3 rounded-lg bg-stone-200/80 dark:bg-zinc-800/90 p-0.5 text-xs font-semibold"
          >
            {(
              [
                ['rules', 'How to Play'],
                ['streaks', 'Streaks & Modes'],
                ['faq', 'FAQ'],
              ] as const
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={activeTab === tabKey}
                data-testid={`help-tab-${tabKey}`}
                onClick={() => setActiveTab(tabKey)}
                className={`min-h-9 rounded-md py-1.5 transition-colors cursor-pointer ${
                  activeTab === tabKey
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Guess the hidden <strong>4, 5, or 6-letter word</strong> in <strong>6 tries</strong>.
                Tile colors and corner markers show how close each guess is.
              </p>

              <div className="space-y-3 border-t border-stone-200 dark:border-zinc-800 pt-3">
                <div>
                  <div className="flex gap-1.5">
                    {['C', 'R', 'A', 'N', 'E'].map((ch, idx) => (
                      <div
                        key={ch}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-md border-2 text-sm font-bold ${
                          idx === 0
                            ? 'bg-emerald-700 border-emerald-700 text-white'
                            : 'border-stone-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {ch}
                        {idx === 0 && (
                          <Check className="absolute top-0.5 right-0.5 h-2.5 w-2.5" strokeWidth={3} />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <strong>C</strong> is in the word and in the <strong>correct spot</strong>.
                  </p>
                </div>

                <div>
                  <div className="flex gap-1.5">
                    {['P', 'I', 'L', 'O', 'T'].map((ch, idx) => (
                      <div
                        key={ch}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-md border-2 text-sm font-bold ${
                          idx === 1
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-stone-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {ch}
                        {idx === 1 && (
                          <CircleDot
                            className="absolute top-0.5 right-0.5 h-2.5 w-2.5"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <strong>I</strong> is in the word but in the <strong>wrong spot</strong>.
                  </p>
                </div>

                <div>
                  <div className="flex gap-1.5">
                    {['V', 'A', 'G', 'U', 'E'].map((ch, idx) => (
                      <div
                        key={ch}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-sm font-bold ${
                          idx === 3
                            ? 'bg-zinc-600 border-zinc-600 text-white'
                            : 'border-stone-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {ch}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <strong>U</strong> is <strong>not in the word</strong> in any spot.
                  </p>
                </div>
              </div>

              <p className="border-t border-stone-200 dark:border-zinc-800 pt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Tap any open box to enter letters and use the compact Icon Action Bar below the
                grid for Hints, 50/50 elimination, Across/Down switching, Row Trivia Clues, Skip,
                and Submit.
              </p>
            </div>
          )}

          {activeTab === 'streaks' && (
            <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 p-3.5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Daily Challenge &amp; 7-Day Streak
                </h3>
                <p className="mt-1 text-xs leading-relaxed">
                  A new puzzle unlocks at local midnight for 4-, 5-, and 6-letter boards. Solving on
                  consecutive days builds your streak and fills your Monday–Sunday week tracker.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 p-3.5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Faith Study &amp; AI Trivia
                </h3>
                <p className="mt-1 text-xs leading-relaxed">
                  Explore daily scripture passages, 5-letter faith puzzles, and interactive trivia
                  across Christianity, Islam, Judaism, Hinduism, Buddhism, and World Faiths—plus
                  location-tuned AI Trivia rounds.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 p-3.5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {CATEGORIES.length} Curated &amp; Live Entertainment Topics
                </h3>
                <p className="mt-1 text-xs leading-relaxed">
                  Browse {CATEGORIES.length} dedicated topics including daily rotating Entertainment
                  events, Astrology, True Crime, and Dark Psychology.{' '}
                  {CATEGORIES.filter((c) => !c.isPremium).length} classic topics are always free, and
                  premium topics unlock for 5 full plays per 5-second rewarded preview.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <dl className="divide-y divide-stone-200 dark:divide-zinc-800 text-xs">
              <div className="pb-3">
                <dt className="font-semibold text-zinc-900 dark:text-zinc-100">
                  How do optional hints and extra attempts work?
                </dt>
                <dd className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Basic gameplay is never interrupted by forced pop-ups. You can opt in to watch a
                  5-second sponsor preview for +1 letter hint, a 7th bonus row on a miss, 5
                  premium topic plays, or one-time streak recovery per 7-day period.
                </dd>
              </div>
              <div className="py-3">
                <dt className="font-semibold text-zinc-900 dark:text-zinc-100">
                  How are duplicate letters scored?
                </dt>
                <dd className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Exact green matches are assigned first. Extra copies of a letter turn amber only up
                  to the number of unmatched occurrences remaining in the target word.
                </dd>
              </div>
              <div className="pt-3">
                <dt className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Can I play WordVibe offline on my phone?
                </dt>
                <dd className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Yes — install it to your home screen as a Progressive Web App to launch standalone
                  and play offline anytime.
                </dd>
                <div className="mt-2">
                  <PWAInstallButton />
                </div>
              </div>
            </dl>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 dark:border-zinc-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
