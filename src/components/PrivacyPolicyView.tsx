import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Mail,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack: () => void;
  onClearLocalData: () => Promise<void> | void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onBack,
  onClearLocalData,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedDone, setClearedDone] = useState(false);

  const handleConfirmClear = async () => {
    await onClearLocalData();
    setConfirmClear(false);
    setClearedDone(true);
  };

  return (
    <article
      data-testid="privacy-policy-page"
      aria-label="WordVibe Privacy Policy"
      className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 lg:px-8 pt-5 pb-28 space-y-5 animate-stage-enter"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="privacy-back-btn"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border wv-border wv-card px-4 py-2 text-sm font-bold wv-text hover:opacity-85 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>Back to WordVibe</span>
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-full border wv-border wv-card-muted px-3.5 py-1.5 text-xs font-semibold wv-text-muted">
          Last Updated: November 26, 2026
        </span>
      </div>

      <header className="rounded-3xl border wv-border wv-card p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider wv-accent-text">
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <span>WordVibe Legal &amp; Data Practices</span>
        </div>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold wv-text">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed wv-text-muted">
          WordVibe is built to run fast and reliably offline. We respect your privacy and{' '}
          <strong className="wv-text">never sell your personal data</strong> to data brokers or
          third parties. This policy explains what data is saved on your device, how optional
          cloud sync and advertising partners work, and how you can erase your data at any time.
        </p>
      </header>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Database className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>1. Data Stored Locally on Your Device</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          WordVibe stores gameplay and preference data locally in your browser using{' '}
          <strong className="wv-text">localStorage</strong> and{' '}
          <strong className="wv-text">IndexedDB</strong> so your progress persists across offline
          sessions without requiring an account:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base leading-relaxed wv-text-muted">
          <li>
            <strong className="wv-text">Gameplay Progress &amp; Streaks:</strong> Active crossword
            boards, daily streaks, weekly XP, practice XP, Faith Study tradition progress, Brain
            Trivia history, and 5-play unlocked topic counters.
          </li>
          <li>
            <strong className="wv-text">Profile &amp; Preferences:</strong> Optional guest
            display name, chosen avatar or local profile image, theme/accent appearance, sound
            settings, timer controls, and optional city label for topic personalization.
          </li>
          <li>
            <strong className="wv-text">Offline App Cache:</strong> Our Progressive Web App
            service worker (<code className="font-mono-tabular text-xs">/sw.js</code>) caches core
            application pages, styles, scripts, and icons locally for offline play.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Smartphone className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>2. Third-Party Services, Cloud Sync &amp; Advertising</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          Certain optional features connect to trusted third-party infrastructure:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base leading-relaxed wv-text-muted">
          <li>
            <strong className="wv-text">Google AdMob / Advertising Partners:</strong> Optional
            rewarded previews (such as unlocking 5 plays on locked Puzzle topics, crossword hints,
            word clues, streak recovery, Trivia reveals, and XP boosts) integrate with Google AdMob
            and compatible web/mobile ad bridges. Ad networks may use cookies, local ad-frequency
            counters, or device advertising identifiers (such as Android Advertising ID or Apple
            IDFA, subject to your device OS settings) to serve and measure ads and prevent abuse.
          </li>
          <li>
            <strong className="wv-text">Firebase Authentication &amp; Cloud Firestore:</strong> If
            you optionally sign in with Google or email/password to join the online leaderboard or
            back up verified scores, your account identifier, display name, and verified XP totals
            are processed through Google Firebase. You can continue playing offline as a guest
            without linking a cloud account.
          </li>
          <li>
            <strong className="wv-text">Optional Location &amp; Device Sensors:</strong> Regional
            topic spotlights default to coarse browser timezone detection. Precise geolocation is
            requested only when you opt in inside Personalization settings, and you may opt out
            anytime. Accelerometer shake and gyroscope tilt animations run strictly on-device and
            can be toggled off in Settings.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Users className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>3. Children&apos;s Privacy</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          WordVibe is intended for a general audience and does not knowingly collect personal
          information from children under 13 years of age (or the applicable age of digital consent
          in your country). If you are a parent or guardian and believe your child has provided
          personal details through optional cloud sign-in, please contact us so we can promptly
          delete that record.
        </p>
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Trash2 className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>4. Your Privacy Rights &amp; Clearing Local Data</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          You control your data. You can opt out of optional cloud sync or location personalization
          inside WordVibe&apos;s settings, clear site storage in your browser, or erase all
          on-device profiles, scores, and cached files below:
        </p>

        {clearedDone ? (
          <div
            data-testid="privacy-data-cleared-banner"
            className="flex items-center gap-2.5 rounded-2xl border wv-border wv-card-muted p-4 text-sm font-semibold wv-accent-text"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>All local WordVibe profiles, scores, and browser caches have been cleared.</span>
          </div>
        ) : confirmClear ? (
          <div className="rounded-2xl border wv-border wv-card-muted p-4 space-y-3">
            <p className="text-sm font-semibold wv-text">
              Erase all locally saved streaks, profiles, settings, and offline caches on this
              device?
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                data-testid="privacy-confirm-clear-btn"
                onClick={() => void handleConfirmClear()}
                className="min-h-10 rounded-xl wv-accent-btn px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer"
              >
                Yes, Clear Local Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-10 rounded-xl border wv-border wv-card px-4 py-2 text-xs sm:text-sm font-semibold wv-text cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              data-testid="privacy-clear-data-btn"
              onClick={() => setConfirmClear(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border wv-border wv-card-muted px-4 py-2 text-sm font-bold wv-text hover:opacity-85 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 wv-accent-text" aria-hidden="true" />
              <span>Clear All Local Data</span>
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Mail className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>5. Contact</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          For privacy questions, data deletion requests, or compliance inquiries, email{' '}
          <a
            href="mailto:support@yourdomain.com"
            className="font-bold underline wv-accent-text hover:opacity-85"
          >
            support@yourdomain.com
          </a>
          .
        </p>
      </section>
    </article>
  );
};
