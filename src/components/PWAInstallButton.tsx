import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Install WordVibe app"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Install WordVibe on iOS"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 p-6 shadow-xl">
              <h3 id="ios-install-title" className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Install on iPhone or iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                1. Tap the <strong>Share</strong> button in your Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
