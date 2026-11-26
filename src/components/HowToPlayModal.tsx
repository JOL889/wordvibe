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
      <div className="my-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-2xl border-2 wv-border wv-card shadow-2xl animate-modal-pop">
        {/* Compact Header */}
        <div className="flex items-start justify-between gap-4 border-b wv-border px-5 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold wv-accent-text">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Player Guide &amp; Rules</span>
            </div>
            <h2
              id="how-to-play-modal-title"
              className="mt-0.5 font-display text-xl font-bold wv-text"
            >
              How to Play WordVibe
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help dialog"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Sub-Tabs */}
        <div className="px-5 pt-3">
          <div
            role="tablist"
            aria-label="Help sections"
            className="grid grid-cols-3 rounded-xl wv-card-muted border wv-border p-1 text-xs font-semibold"
          >
            {(
              [
                ['rules', 'Crossword'],
                ['streaks', 'Levels & Modes'],
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
                className={`min-h-9 rounded-lg py-1.5 transition-colors cursor-pointer ${
                  activeTab === tabKey
                    ? 'wv-accent-btn shadow-xs'
                    : 'wv-text-muted hover:opacity-90'
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
              <p className="text-xs sm:text-sm leading-relaxed wv-text-muted">
                Solve every linked horizontal row and vertical column individually in each{' '}
                <strong className="wv-text">4×4, 5×5, or 6×6</strong> crossword grid. Every
                horizontal and vertical word is distinct and intersects seamlessly.
              </p>

              <div className="space-y-3 border-t wv-border pt-3">
                <div>
                  <div className="flex gap-1.5">
                    {['S', 'T', 'A', 'R'].map((ch, idx) => (
                      <div
                        key={ch}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                          idx === 0
                            ? 'wv-tile-correct'
                            : 'wv-tile-wooden'
                        }`}
                      >
                        {ch}
                        {idx === 0 && (
                          <Check className="absolute top-0.5 right-0.5 h-2.5 w-2.5" strokeWidth={3} />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-sm wv-text-muted">
                    Tap any square to spell <strong className="wv-text">Across</strong> or{' '}
                    <strong className="wv-text">Down</strong>, then check that row or column.
                  </p>
                </div>

                <div>
                  <div className="flex gap-1.5">
                    {['P', 'I', 'L', 'O', 'T'].map((ch, idx) => (
                      <div
                        key={ch}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                          idx === 1 ? 'wv-tile-present' : 'wv-tile-wooden'
                        }`}
                      >
                        {ch}
                        {idx === 1 && (
                          <CircleDot className="absolute top-0.5 right-0.5 h-2.5 w-2.5" strokeWidth={2.5} />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-sm wv-text-muted">
                    <strong className="wv-text">Soft-tinted tiles</strong> show a letter belongs in that line
                    at another spot; <strong className="wv-text">Solid accent tiles</strong> lock in solved
                    letters &amp; completed rows or columns individually.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border wv-border wv-card-muted p-3 text-sm leading-relaxed wv-text-muted">
                <strong className="wv-text">Live Word Clues &amp; Post-Solve Dictionary:</strong>{' '}
                See the active word&apos;s dictionary meaning above the grid with zero leaked letters!
                Once you finish the grid, tap any solved word or tile to read its brief dictionary
                definition.
              </div>
            </div>
          )}

          {activeTab === 'streaks' && (
            <div className="space-y-3.5 text-sm leading-relaxed wv-text-muted">
              <div className="rounded-xl border wv-border wv-card-muted p-3.5">
                <h3 className="font-semibold wv-text">5-Stage Timed Level Climb (Level 1 → 2 → 3...)</h3>
                <p className="mt-1 text-sm leading-relaxed">
                  Start at <strong className="wv-text">Level 1</strong> on Crossword &amp; Brain
                  Trivia. Beat <strong className="wv-text">5 challenges in a row</strong> before the
                  countdown expires—the timer speeds up concurrently across puzzles 1 through 5! Or
                  switch to <strong className="wv-text">Endless Sprint</strong> for relaxed,
                  level-free play.
                </p>
              </div>

              <div className="rounded-xl border wv-border wv-card-muted p-3.5">
                <h3 className="font-semibold wv-text">Faith Study &amp; XP Leaderboard</h3>
                <p className="mt-1 text-sm leading-relaxed">
                  Faith Study runs as a level-free Endless Sprint across Bible, Quran, Torah, Gita,
                  and Buddhist scriptures. Track your live <strong className="wv-text">#Rank</strong>{' '}
                  on the Weekly &amp; All-Time XP Leaderboard anytime from the header.
                </p>
              </div>

              <div className="rounded-xl border wv-border wv-card-muted p-3.5">
                <h3 className="font-semibold wv-text">
                  {CATEGORIES.length} Curated Topics &amp; Phone Motion
                </h3>
                <p className="mt-1 text-sm leading-relaxed">
                  Watch a short ad anytime to unlock 5 plays in any topic of your choice. Audio
                  follows your 3-state switch (On, Mute/Vibrate, or Off).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <dl className="divide-y wv-border text-sm">
              <div className="pb-3">
                <dt className="font-semibold wv-text">
                  Are questions or crossword grids ever repeated?
                </dt>
                <dd className="mt-1 leading-relaxed wv-text-muted">
                  No — smart question rotation tracks played trivia questions, faith prompts, and
                  word seeds across sessions so puzzles stay fresh.
                </dd>
              </div>
              <div className="py-3">
                <dt className="font-semibold wv-text">How do unlimited hints and clues work?</dt>
                <dd className="mt-1 leading-relaxed wv-text-muted">
                  You can watch a quick sponsor ad anytime for another letter hint or a brief
                  dictionary explanation on any crossword row or column.
                </dd>
              </div>
              <div className="pt-3">
                <dt className="font-semibold wv-text">Can I play WordVibe offline on my phone?</dt>
                <dd className="mt-1 leading-relaxed wv-text-muted">
                  Yes — all crossword dictionaries, trivia banks, and faith studies work 100% offline.
                </dd>
                <div className="mt-2">
                  <PWAInstallButton />
                </div>
              </div>
            </dl>
          )}
        </div>

        {/* Footer */}
        <div className="border-t wv-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl wv-accent-btn py-2.5 text-sm font-bold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
