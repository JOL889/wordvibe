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
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl wv-accent-btn px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
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
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border wv-border wv-card-muted px-3 py-1.5 text-xs font-semibold wv-text transition-colors hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Install WordVibe on iOS"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border-2 wv-border wv-card p-6 shadow-2xl">
              <h3 id="ios-install-title" className="font-display text-lg font-bold wv-text">
                Install on iPhone or iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed wv-text-muted">
                1. Tap the <strong className="wv-text">Share</strong> button in your Safari toolbar.
                <br />
                2. Scroll down and tap <strong className="wv-text">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-11 rounded-xl wv-accent-btn py-2.5 text-sm font-bold cursor-pointer"
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
