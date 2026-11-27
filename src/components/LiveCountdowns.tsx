import React, { useEffect, useState } from 'react';
import {
  formatCountdown,
  getTimeUntilMidnightMs,
} from '../game/puzzleLogic';
import {
  formatWeeklyResetCountdown,
  getNextMondayUtcMs,
} from '../game/weeklyLogic';

export const DailyResetCountdown: React.FC = React.memo(() => {
  const [text, setText] = useState<string>(() => formatCountdown(getTimeUntilMidnightMs()));

  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setText(formatCountdown(getTimeUntilMidnightMs()));
    };
    update();
    const id = window.setInterval(update, 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <>{text}</>;
});

export const WeeklyResetCountdown: React.FC = React.memo(() => {
  const [text, setText] = useState<string>(() =>
    formatWeeklyResetCountdown(getNextMondayUtcMs() - Date.now())
  );

  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      setText(formatWeeklyResetCountdown(getNextMondayUtcMs(now) - now));
    };
    update();
    const id = window.setInterval(update, 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <>{text}</>;
});
