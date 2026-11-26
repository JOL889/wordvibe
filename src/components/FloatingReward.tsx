import React from 'react';
import { Coins, Flame, Sparkles } from 'lucide-react';
import type { AnimationIntensity } from '../game/settingsLogic';

export interface FloatingRewardItem {
  id: number;
  label: string;
  tone: 'coins' | 'xp' | 'streak';
}

interface FloatingRewardProps {
  items: FloatingRewardItem[];
  animationIntensity?: AnimationIntensity;
}

export const FloatingReward: React.FC<FloatingRewardProps> = ({
  items,
  animationIntensity = 'full',
}) => {
  if (items.length === 0 || animationIntensity === 'reduced') return null;

  return (
    <div
      data-testid="floating-reward"
      aria-live="polite"
      className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-[75] flex flex-col items-center gap-1.5"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-lg animate-float-up-fade ${
            item.tone === 'coins' ? 'wv-gold-pill' : 'wv-accent-btn border-white/20'
          }`}
        >
          {item.tone === 'coins' ? (
            <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : item.tone === 'streak' ? (
            <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="font-mono-tabular">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
