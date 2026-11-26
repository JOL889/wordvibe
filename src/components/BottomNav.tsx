import React from 'react';
import { BookOpen, Brain, Flame, Grid3X3 } from 'lucide-react';

export type AppTab = 'home' | 'puzzle' | 'faith' | 'trivia';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

const TABS: Array<{ id: AppTab; label: string; testId: string; aria: string }> = [
  { id: 'home', label: 'Streak', testId: 'nav-home', aria: 'Streak home screen' },
  { id: 'puzzle', label: 'Puzzle', testId: 'nav-puzzle', aria: 'Crossword puzzle screen' },
  { id: 'faith', label: 'Faith', testId: 'nav-faith', aria: 'Faith Study Endless Sprint screen' },
  { id: 'trivia', label: 'Trivia', testId: 'nav-trivia', aria: 'Brain Trivia mode screen' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const activeIdx = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Primary screen switcher"
      className="fixed inset-x-0 bottom-0 z-40 border-t wv-border wv-card backdrop-blur-md"
    >
      <div className="relative mx-auto grid h-[64px] max-w-lg grid-cols-4 px-2">
        {/* Sliding Top Accent Pill */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-2 flex justify-center transition-transform duration-300 ease-out"
          style={{
            width: 'calc((100% - 16px) / 4)',
            transform: `translateX(${activeIdx * 100}%)`,
          }}
        >
          <span className="h-[3.5px] w-12 rounded-b-full wv-accent-btn" />
        </div>

        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={tab.testId}
              aria-label={tab.aria}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeTab(tab.id);
              }}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap cursor-pointer ${
                isActive ? 'wv-accent-text' : 'wv-text-muted hover:opacity-90'
              }`}
            >
              {tab.id === 'home' && (
                <Flame
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'puzzle' && (
                <Grid3X3
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'faith' && (
                <BookOpen
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'trivia' && (
                <Brain
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
