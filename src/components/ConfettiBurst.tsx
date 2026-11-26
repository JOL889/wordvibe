import React, { useMemo } from 'react';
import type { AnimationIntensity } from '../game/settingsLogic';

interface ConfettiBurstProps {
  trigger: boolean;
  animationIntensity?: AnimationIntensity;
}

const COLOR_VARS = [
  'var(--wv-confetti-1)',
  'var(--wv-confetti-2)',
  'var(--wv-confetti-3)',
  'var(--wv-confetti-4)',
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  trigger,
  animationIntensity = 'full',
}) => {
  const pieces = useMemo(() => {
    const count = animationIntensity === 'subtle' ? 14 : 28;
    return Array.from({ length: count }, (_, idx) => {
      const leftPct = 8 + ((idx * 37) % 84);
      const cx = `${((idx % 7) - 3) * 24}px`;
      const cy = `${-45 - (idx % 5) * 26}px`;
      const cx2 = `${((idx % 9) - 4) * 28}px`;
      const cy2 = `${220 + (idx % 4) * 65}px`;
      const rot = `${(idx % 2 === 0 ? 1 : -1) * (240 + idx * 18)}deg`;
      const delay = `${(idx % 6) * 45}ms`;
      const colorVar = COLOR_VARS[idx % COLOR_VARS.length];
      const isCircle = idx % 3 === 0;
      return { idx, leftPct, cx, cy, cx2, cy2, rot, delay, colorVar, isCircle };
    });
  }, [animationIntensity]);

  if (!trigger || animationIntensity === 'reduced') return null;

  return (
    <div
      data-testid="confetti-burst"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-1/3 z-[75] overflow-visible h-0"
    >
      {pieces.map((p) => (
        <span
          key={p.idx}
          style={
            {
              left: `${p.leftPct}%`,
              backgroundColor: p.colorVar,
              '--cx': p.cx,
              '--cy': p.cy,
              '--cx2': p.cx2,
              '--cy2': p.cy2,
              '--rot': p.rot,
              animationDelay: p.delay,
            } as React.CSSProperties
          }
          className={`absolute block h-2.5 w-2.5 ${p.isCircle ? 'rounded-full' : 'rounded-xs'} animate-confetti-fall shadow-xs`}
        />
      ))}
    </div>
  );
};
