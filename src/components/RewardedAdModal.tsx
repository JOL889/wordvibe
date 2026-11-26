import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, PlayCircle, Sparkles, X, Zap } from 'lucide-react';
import { formatNotEnoughXpMessage } from '../game/xpEconomyLogic';
import { rewardedAdService, type RewardPlacement } from '../services/rewardedAdService';

interface RewardedAdModalProps {
  placement: RewardPlacement | null;
  contextLabel?: string;
  multiAdProgress?: { current: number; total: number } | null;
  xpCost?: number;
  currentXp?: number;
  xpActionLabel?: string;
  onSpendXp?: () => void;
  onCancel: () => void;
  onRewardEarned: (placement: RewardPlacement) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  placement,
  contextLabel,
  multiAdProgress = null,
  xpCost,
  currentXp = 0,
  xpActionLabel,
  onSpendXp,
  onCancel,
  onRewardEarned,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [completed, setCompleted] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const currentMultiCompleted = multiAdProgress?.current ?? 0;

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
        rewardedAdService.notifyFailedToLoad('Ad unit fill unavailable right now.');
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
  }, [placement, currentMultiCompleted]);

  if (!placement) return null;

  const baseMeta = rewardedAdService.getPlacementMeta(placement);
  const totalMulti = multiAdProgress?.total ?? 0;
  const activeAdNumber =
    multiAdProgress && totalMulti > 0
      ? Math.min(totalMulti, currentMultiCompleted + 1)
      : 1;
  const isMultiAd = Boolean(multiAdProgress && totalMulti > 1);
  const isLastMultiAd = !isMultiAd || activeAdNumber >= totalMulti;

  const meta =
    placement === 'unlock_category' && contextLabel
      ? {
          ...baseMeta,
          title: isMultiAd
            ? `Unlock ${contextLabel} (${activeAdNumber}/${totalMulti} Ads)`
            : `Unlock ${contextLabel} (5 Plays)`,
          rewardLabel:
            isMultiAd && !isLastMultiAd
              ? `Ad ${activeAdNumber}/${totalMulti} Complete!`
              : `5 Plays Unlocked in ${contextLabel}`,
          description: isMultiAd
            ? `Watch ad ${activeAdNumber} of ${totalMulti} (${baseMeta.durationSeconds}s) to unlock 5 full puzzles in ${contextLabel}.`
            : `Watch a brief ${baseMeta.durationSeconds}-second sponsor preview to unlock 5 full puzzles in ${contextLabel}.`,
        }
      : placement === 'puzzle_clue' && contextLabel
      ? {
          ...baseMeta,
          title: `Unlock Clue · ${contextLabel}`,
          rewardLabel: `Dictionary Meaning Unlocked!`,
          description: `Watch a brief ${baseMeta.durationSeconds}-second sponsor preview to reveal a short dictionary explanation for ${contextLabel}.`,
        }
      : placement === 'puzzle_word_trivia' && contextLabel
      ? {
          ...baseMeta,
          title: `Unlock ${contextLabel} Word Clue`,
          rewardLabel: `${contextLabel} Clue Unlocked`,
          description: `Watch a brief ${baseMeta.durationSeconds}-second sponsor preview to unlock a short dictionary explanation for ${contextLabel}.`,
        }
      : baseMeta;

  const isDualConcurrent = (meta.concurrentAdsCount || 1) >= 2;
  const progressPct = ((meta.durationSeconds - secondsLeft) / Math.max(1, meta.durationSeconds)) * 100;
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border-2 wv-border wv-card p-5 sm:p-6 shadow-2xl animate-modal-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider wv-accent-text">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isMultiAd
                  ? `Watch ${totalMulti} Ads · Ad ${activeAdNumber} of ${totalMulti}`
                  : isDualConcurrent
                  ? 'Dual Concurrent Ad Preview (2 Ads)'
                  : 'Sponsored Reward Preview'}
              </span>
            </p>
            <h2
              id="rewarded-ad-title"
              className="mt-1 font-display text-xl font-bold wv-text"
            >
              {meta.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close reward preview"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border wv-border wv-card-muted p-4 sm:p-5 text-center">
          {isMultiAd && !loadFailed && (
            <div
              data-testid="multi-ad-progress-steps"
              className="mb-3 flex items-center justify-center gap-1.5"
              aria-label={`Ad unlock progress: ${currentMultiCompleted + (completed ? 1 : 0)} of ${totalMulti}`}
            >
              {Array.from({ length: totalMulti }).map((_, idx) => {
                const done = idx < currentMultiCompleted || (idx === currentMultiCompleted && completed);
                const current = idx === currentMultiCompleted && !completed;
                return (
                  <span
                    key={idx}
                    className={`inline-flex h-2 flex-1 rounded-full transition-colors ${
                      done
                        ? 'wv-accent-btn'
                        : current
                        ? 'bg-[var(--wv-accent)]/45'
                        : 'bg-black/15 dark:bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {loadFailed ? (
            <>
              <AlertCircle className="mx-auto h-10 w-10 wv-accent-text" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium wv-text">
                Rewarded ad could not load right now. Please try again.
              </p>
            </>
          ) : isDualConcurrent ? (
            <div data-testid="concurrent-ads-stage">
              <div className="grid grid-cols-2 gap-2.5">
                {[1, 2].map((adIdx) => (
                  <div
                    key={adIdx}
                    data-testid={`concurrent-ad-slot-${adIdx}`}
                    className="rounded-xl border wv-border wv-card p-3 text-center shadow-xs"
                  >
                    <div className="text-xs font-bold uppercase tracking-wide wv-accent-text">
                      Ad #{adIdx} Active
                    </div>
                    {completed ? (
                      <CheckCircle2 className="mx-auto mt-2 h-8 w-8 wv-accent-text" aria-hidden="true" />
                    ) : (
                      <PlayCircle className="mx-auto mt-2 h-8 w-8 wv-accent-text" aria-hidden="true" />
                    )}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
                      <div
                        className="h-full wv-accent-btn transition-[width] duration-300 ease-out"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono-tabular text-xs font-semibold wv-text-muted">
                      {completed ? 'Watched ✓' : `${secondsLeft}s`}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold wv-text">
                {completed ? meta.rewardLabel : meta.description}
              </p>
              <p className="mt-1 font-mono-tabular text-xs font-medium wv-text-muted">
                {completed ? 'Both ads finished · Tap Claim to reveal!' : `Both ads finish in ${secondsLeft}s`}
              </p>
            </div>
          ) : (
            <>
              {completed ? (
                <CheckCircle2 className="mx-auto h-10 w-10 wv-accent-text" aria-hidden="true" />
              ) : (
                <PlayCircle className="mx-auto h-10 w-10 wv-accent-text" aria-hidden="true" />
              )}

              <p className="mt-3 text-sm font-semibold wv-text">
                {completed ? meta.rewardLabel : meta.description}
              </p>

              <div className="mt-4 w-full">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
                  <div
                    className="h-full wv-accent-btn transition-[width] duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-2 font-mono-tabular text-xs font-semibold wv-text-muted">
                  {completed
                    ? isMultiAd && !isLastMultiAd
                      ? `${totalMulti - activeAdNumber} more ad${totalMulti - activeAdNumber === 1 ? '' : 's'} remaining for 5 plays`
                      : 'Reward ready to claim'
                    : `Ad ${isMultiAd ? `${activeAdNumber}/${totalMulti} ` : ''}finishes in ${secondsLeft}s`}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-2.5 truncate font-mono-tabular text-xs wv-text-muted opacity-70">
          Ad Unit: {activeUnitId}
        </p>

        {typeof xpCost === 'number' && xpCost > 0 && onSpendXp && (
          <div
            data-testid="reward-modal-xp-alternative"
            className="mt-3 rounded-xl border wv-border wv-card-muted p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold wv-text">
                  {xpActionLabel || `Instant Unlock (Works Offline)`}
                </p>
                <p
                  data-testid="reward-modal-xp-status"
                  className="font-mono-tabular text-xs wv-text-muted"
                >
                  {currentXp >= xpCost
                    ? `Balance: ${currentXp.toLocaleString()} XP`
                    : `${formatNotEnoughXpMessage(xpCost)} (Have ${currentXp.toLocaleString()} XP)`}
                </p>
              </div>
              <button
                type="button"
                data-testid="reward-modal-spend-xp-btn"
                disabled={currentXp < xpCost}
                onClick={onSpendXp}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl wv-gold-pill px-3.5 py-1.5 text-xs font-extrabold transition-transform active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Spend {xpCost} XP</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2.5">
          {(!completed || isMultiAd) && (
            <button
              type="button"
              onClick={() => {
                rewardedAdService.notifyDismissed(placement);
                onCancel();
              }}
              className="min-h-11 rounded-xl border wv-border px-4 py-2 text-xs font-bold wv-text-muted hover:opacity-80 cursor-pointer"
            >
              {loadFailed
                ? 'Close'
                : isMultiAd && currentMultiCompleted > 0
                ? `Save Progress (${currentMultiCompleted}/${totalMulti})`
                : 'Skip (No Reward)'}
            </button>
          )}
          {!loadFailed && (
            <button
              type="button"
              data-testid="claim-reward-btn"
              disabled={!completed}
              onClick={handleClose}
              className="min-h-11 rounded-xl wv-accent-btn px-5 py-2 text-xs sm:text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {completed
                ? isMultiAd
                  ? !isLastMultiAd
                    ? `Watch Next Ad (${activeAdNumber + 1}/${totalMulti})`
                    : 'Claim 5 Topic Plays'
                  : 'Claim Reward'
                : `Wait ${secondsLeft}s...`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
