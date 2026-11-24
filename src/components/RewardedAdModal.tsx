import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, PlayCircle, X } from 'lucide-react';
import { rewardedAdService, type RewardPlacement } from '../services/rewardedAdService';

interface RewardedAdModalProps {
  placement: RewardPlacement | null;
  contextLabel?: string;
  onCancel: () => void;
  onRewardEarned: (placement: RewardPlacement) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  placement,
  contextLabel,
  onCancel,
  onRewardEarned,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [completed, setCompleted] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!placement) return;
    const meta = rewardedAdService.getPlacementMeta(placement);
    setSecondsLeft(meta.durationSeconds);
    setCompleted(false);
    setLoadFailed(false);

    let active = true;
    let intervalId: number | null = null;

    rewardedAdService.checkAvailability(placement).then((available) => {
      if (!active) return;
      if (!available) {
        setLoadFailed(true);
        rewardedAdService.notifyFailedToLoad('Ad unit fill unavailable while offline.');
        return;
      }

      rewardedAdService.notifyImpression(placement);
      intervalId = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (intervalId !== null) window.clearInterval(intervalId);
            setCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    return () => {
      active = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [placement]);

  if (!placement) return null;

  const baseMeta = rewardedAdService.getPlacementMeta(placement);
  const meta =
    placement === 'unlock_category' && contextLabel
      ? {
          ...baseMeta,
          title: `Unlock ${contextLabel} (5 Plays)`,
          rewardLabel: `5 Plays Unlocked in ${contextLabel}`,
          description: `Watch a brief ${baseMeta.durationSeconds}-second sponsor preview to unlock 5 full puzzles in ${contextLabel}.`,
        }
      : placement === 'puzzle_word_trivia' && contextLabel
      ? {
          ...baseMeta,
          title: `Unlock ${contextLabel} Word Trivia`,
          rewardLabel: `${contextLabel} Word Trivia Unlocked`,
          description: `Watch a brief ${baseMeta.durationSeconds}-second sponsor preview to unlock AI word trivia for horizontal ${contextLabel}.`,
        }
      : baseMeta;

  const progressPct = ((meta.durationSeconds - secondsLeft) / meta.durationSeconds) * 100;
  const activeUnitId = rewardedAdService.getActiveAdUnitId();

  const handleClose = () => {
    if (loadFailed || !completed) {
      rewardedAdService.notifyDismissed(placement);
      onCancel();
      return;
    }
    rewardedAdService.notifyRewardGranted(placement);
    onRewardEarned(placement);
  };

  return (
    <div
      data-testid="rewarded-ad-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewarded-ad-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sponsored Reward Preview
            </p>
            <h2
              id="rewarded-ad-title"
              className="mt-1 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              {meta.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close reward preview"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-100 dark:bg-zinc-950 p-6 text-center">
          {loadFailed ? (
            <>
              <AlertCircle
                className="h-10 w-10 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Rewarded ad could not load while offline. Reconnect to load your reward preview.
              </p>
            </>
          ) : (
            <>
              {completed ? (
                <CheckCircle2
                  className="h-10 w-10 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <PlayCircle
                  className="h-10 w-10 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              )}

              <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {completed ? meta.rewardLabel : meta.description}
              </p>

              <div className="mt-4 w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-emerald-700 dark:bg-emerald-500 transition-[width] duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-2 font-mono-tabular text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {completed ? 'Reward ready to claim' : `Reward unlocks in ${secondsLeft}s`}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-2.5 truncate font-mono-tabular text-[10px] text-zinc-400 dark:text-zinc-500">
          Ad Unit: {activeUnitId}
        </p>

        <div className="mt-4 flex items-center justify-end gap-2.5">
          {!completed && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-stone-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {loadFailed ? 'Close' : 'Skip (No Reward)'}
            </button>
          )}
          {!loadFailed && (
            <button
              type="button"
              data-testid="claim-reward-btn"
              disabled={!completed}
              onClick={handleClose}
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {completed ? 'Claim Reward' : `Wait ${secondsLeft}s...`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
