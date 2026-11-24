import React from 'react';
import { BookOpen, Brain, Flame, Grid3X3 } from 'lucide-react';

export type AppTab = 'home' | 'puzzle' | 'faith' | 'trivia';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

const TABS: Array<{ id: AppTab; label: string; testId: string; aria: string }> = [
  { id: 'home', label: 'Streak', testId: 'nav-home', aria: 'Streak home screen' },
  { id: 'puzzle', label: 'Puzzle', testId: 'nav-puzzle', aria: 'Puzzle board screen' },
  { id: 'faith', label: 'Faith', testId: 'nav-faith', aria: 'Faith Study screen' },
  { id: 'trivia', label: 'AI Trivia', testId: 'nav-trivia', aria: 'AI Trivia mode screen' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const activeIdx = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Primary screen switcher"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 dark:border-zinc-800/80 bg-[#F7F5F0]/95 dark:bg-[#111315]/95 backdrop-blur-md amoled-surface"
    >
      <div className="relative mx-auto grid h-[60px] max-w-lg grid-cols-4 px-2">
        {/* Sliding Top Accent Pill */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-2 flex justify-center transition-transform duration-300 ease-out"
          style={{
            width: 'calc((100% - 16px) / 4)',
            transform: `translateX(${activeIdx * 100}%)`,
          }}
        >
          <span className="h-[3px] w-11 rounded-b-full wv-accent-btn" />
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
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-transform active:scale-95 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'wv-accent-text'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.id === 'home' && (
                <Flame
                  className={`h-5 w-5 ${isActive ? 'animate-flame-pulse' : ''}`}
                  strokeWidth={isActive ? 2.4 : 1.9}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'puzzle' && (
                <Grid3X3
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.4 : 1.9}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'faith' && (
                <BookOpen
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.4 : 1.9}
                  aria-hidden="true"
                />
              )}
              {tab.id === 'trivia' && (
                <Brain
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.4 : 1.9}
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
