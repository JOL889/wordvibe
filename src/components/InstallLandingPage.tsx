import React, { useState } from 'react';
import {
  Cloud,
  Download,
  Flame,
  Share2,
  Smartphone,
  Sparkles,
  Trophy,
  WifiOff,
} from 'lucide-react';
import {
  WORDVIBE_APK_DOWNLOAD_URL,
  WORDVIBE_APK_FILENAME,
  WORDVIBE_APK_RELEASES_URL,
} from '../game/platformGateLogic';
import {
  buildLandingAppSharePayload,
  shareOrCopyPayload,
} from '../game/shareServiceLogic';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallLandingPageProps {
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
}

const KEY_HIGHLIGHTS = [
  {
    number: '01.',
    title: 'Offline Word Puzzles',
    description:
      'Solve 4×4, 5×5, and 6×6 linked crossword grids across 112 curated topics without needing an internet connection.',
    icon: WifiOff,
  },
  {
    number: '02.',
    title: 'Daily Challenges',
    description:
      'Keep your streak alive with daily word sprints, timed Brain Trivia rounds, and six-tradition Faith Study.',
    icon: Flame,
  },
  {
    number: '03.',
    title: 'Weekly Leaderboards',
    description:
      'Earn Verified Online XP during connected sessions to climb weekly ranks and track milestone progress.',
    icon: Trophy,
  },
  {
    number: '04.',
    title: 'Cloud Sync',
    description:
      'Sign in with Google or Email inside the app to back up your profile, streaks, and verified score history.',
    icon: Cloud,
  },
] as const;

const INSTALL_STEPS = [
  {
    step: 'Step 1',
    title: 'Tap Download APK',
    detail:
      'Tap Download Android APK to open the latest Wordvibe release and save the .apk installer to your phone.',
  },
  {
    step: 'Step 2',
    title: 'Open the downloaded file',
    detail:
      'Tap the finished download notification or locate the Wordvibe APK inside your browser Downloads folder.',
  },
  {
    step: 'Step 3',
    title: 'Allow "Install from this source" if prompted',
    detail:
      'Grant permission for your browser to install apps if Android asks, then tap Install and launch Wordvibe.',
  },
] as const;

const PREVIEW_GRID_ROWS = [
  [
    { letter: 'W', variant: 'correct' },
    { letter: 'O', variant: 'correct' },
    { letter: 'R', variant: 'correct' },
    { letter: 'D', variant: 'correct' },
  ],
  [
    { letter: 'V', variant: 'wooden' },
    { letter: 'I', variant: 'present' },
    { letter: 'B', variant: 'wooden' },
    { letter: 'E', variant: 'correct' },
  ],
  [
    { letter: 'P', variant: 'wooden' },
    { letter: 'L', variant: 'wooden' },
    { letter: 'A', variant: 'present' },
    { letter: 'Y', variant: 'wooden' },
  ],
] as const;

export const InstallLandingPage: React.FC<InstallLandingPageProps> = ({
  onOpenPrivacyPolicy,
  onOpenTerms,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [iconFailed, setIconFailed] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const handleInstallPwa = async () => {
    await install();
  };

  const handleShareApp = async () => {
    const status = await shareOrCopyPayload(buildLandingAppSharePayload());
    if (status === 'shared') {
      setShareNote('Shared Wordvibe invite!');
    } else if (status === 'copied') {
      setShareNote('Invite & APK link copied!');
    } else if (status === 'failed') {
      setShareNote('Unable to copy link in this browser.');
    }
  };

  return (
    <div
      data-testid="install-landing-page"
      className="min-h-screen flex flex-col wv-app-shell"
    >
      {/* Top Bar: strict 3-zone layout (Brand — Concise Nav — Single Primary Action) */}
      <header className="sticky top-0 z-30 w-full border-b wv-border wv-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          <a
            href="/"
            className="font-display text-xl sm:text-2xl font-bold tracking-tight wv-text whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 wv-tile-wooden font-display text-base font-bold"
            >
              W
            </span>
            <span>Wordvibe</span>
          </a>

          <nav
            aria-label="Primary landing navigation"
            className="hidden md:flex items-center gap-6 text-sm font-semibold wv-text-muted"
          >
            <a
              href="#features"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#preview"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Preview
            </a>
            <a
              href="#install-guide"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Install Guide
            </a>
            <a
              href="#legal-footer"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Legal
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href={WORDVIBE_APK_DOWNLOAD_URL}
              download={WORDVIBE_APK_FILENAME}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl wv-accent-btn px-4 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Download APK</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Proposition + Interactive App Preview Split */}
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: App Identity, Value Proposition & Primary APK Download CTA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 wv-border wv-card flex items-center justify-center">
                  {!iconFailed ? (
                    <img
                      src="/icon.svg"
                      alt="Wordvibe Android app icon"
                      referrerPolicy="no-referrer"
                      onError={() => setIconFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-2xl font-bold wv-accent-text">W</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg sm:text-xl font-bold wv-text">
                    Wordvibe for Android
                  </p>
                  <p className="text-xs sm:text-sm font-medium wv-text-muted">
                    Word Puzzles <span aria-hidden="true">·</span> Brain Trivia{' '}
                    <span aria-hidden="true">·</span> Faith Study
                  </p>
                </div>
              </div>

              <h1
                className="font-display font-bold tracking-tight wv-text [text-wrap:balance] leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)' }}
              >
                Daily crosswords and brain trivia, built for offline mobile play.
              </h1>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed wv-text-muted">
                Solve linked 4×4, 5×5, and 6×6 word grids across 112 topics, challenge 15-second
                Brain Trivia, and sync verified weekly leaderboard progress cleanly on Android.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <a
                  href={WORDVIBE_APK_DOWNLOAD_URL}
                  download={WORDVIBE_APK_FILENAME}
                  data-testid="landing-download-apk-btn"
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl wv-accent-btn px-6 py-3 text-sm sm:text-base font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Download Android APK</span>
                </a>

                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    data-testid="landing-pwa-install-btn"
                    onClick={() => void handleInstallPwa()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 wv-border wv-card px-5 py-3 text-sm sm:text-base font-bold wv-text transition-opacity hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                    <span>Install Web App (PWA)</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="landing-share-app-btn"
                  onClick={() => void handleShareApp()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 wv-border wv-card px-5 py-3 text-sm sm:text-base font-bold wv-text transition-opacity hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                  <span>Share App</span>
                </button>
              </div>

              {shareNote && (
                <p
                  role="status"
                  data-testid="landing-share-status"
                  className="text-xs sm:text-sm font-semibold wv-accent-text"
                >
                  {shareNote}
                </p>
              )}

              <p className="text-xs sm:text-sm wv-text-muted">
                Official GitHub Release <span aria-hidden="true">·</span> Direct Android APK
                installer <span aria-hidden="true">·</span> Playable exclusively inside the app
              </p>
            </div>

            {/* Right: Faithful WordVibe App Preview Card */}
            <div id="preview" className="lg:col-span-5">
              <div
                data-testid="landing-app-preview-card"
                className="rounded-3xl border-2 wv-border wv-card overflow-hidden shadow-md"
              >
                {/* Hero Header Mirror */}
                <div className="wv-hero-arcade px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-white/85">
                        Daily Crossword &amp; Streak
                      </p>
                      <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
                        Wordvibe App
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular text-white">
                      <p className="text-xs text-white/80">Streak</p>
                      <p className="text-2xl font-bold">14 Days</p>
                    </div>
                  </div>
                </div>

                {/* Tactile Crossword Sample Grid */}
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between text-xs sm:text-sm wv-text-muted">
                    <span className="font-semibold wv-text">Linked 4×4 Preview</span>
                    <span className="font-mono-tabular">Across · 4 Letters</span>
                  </div>

                  <div
                    aria-label="Preview of Wordvibe linked letter tiles"
                    className="mx-auto flex flex-col items-center gap-2"
                  >
                    {PREVIEW_GRID_ROWS.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex items-center gap-2">
                        {row.map((cell, colIndex) => {
                          const tileClass =
                            cell.variant === 'correct'
                              ? 'wv-tile-correct'
                              : cell.variant === 'present'
                              ? 'wv-tile-present'
                              : 'wv-tile-wooden';
                          return (
                            <span
                              key={`${rowIndex}-${colIndex}`}
                              className={`inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border-2 font-display text-xl sm:text-2xl font-bold ${tileClass}`}
                            >
                              {cell.letter}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="border-t wv-border pt-4 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-semibold wv-text">
                      <Sparkles className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                      <span>112 Topics &amp; Faith Study</span>
                    </div>
                    <span className="font-mono-tabular font-bold wv-accent-text">
                      +30 XP / Round
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Feature Highlights */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="border-t wv-border py-14 sm:py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="max-w-2xl space-y-2">
              <h2
                id="features-heading"
                className="font-display text-2xl sm:text-3xl font-bold wv-text [text-wrap:balance]"
              >
                Built for focused offline puzzles and fair online competition.
              </h2>
              <p className="text-sm sm:text-base wv-text-muted">
                Download the Android package once to play anywhere and keep every streak intact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {KEY_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.number}
                    className="rounded-2xl border wv-border wv-card p-6 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-bold wv-accent-text">
                          {item.number}
                        </span>
                        <Icon className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
                      </div>
                      <h3 className="font-display text-lg font-bold wv-text">{item.title}</h3>
                      <p className="text-sm leading-relaxed wv-text-muted">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Brief 3-Step Android APK Install Guide */}
        <section
          id="install-guide"
          aria-labelledby="install-guide-heading"
          className="border-t wv-border py-14 sm:py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <h2
                  id="install-guide-heading"
                  className="font-display text-2xl sm:text-3xl font-bold wv-text [text-wrap:balance]"
                >
                  Install Wordvibe on Android in 3 quick steps.
                </h2>
                <p className="text-sm sm:text-base wv-text-muted">
                  Direct APK installation takes less than a minute from your mobile browser.
                </p>
              </div>
              <a
                href={WORDVIBE_APK_DOWNLOAD_URL}
                download={WORDVIBE_APK_FILENAME}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl wv-accent-btn px-5 py-2.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Download Android APK</span>
              </a>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {INSTALL_STEPS.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border wv-border wv-card p-6 space-y-2.5"
                >
                  <p className="font-mono-tabular text-xs font-bold wv-accent-text">{item.step}</p>
                  <h3 className="font-display text-lg font-bold wv-text">{item.title}</h3>
                  <p className="text-sm leading-relaxed wv-text-muted">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* Quiet Footer for Search Indexing Metadata & Legal Pages */}
      <footer
        id="legal-footer"
        className="border-t wv-border wv-card py-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm wv-text-muted">
          <div className="space-y-1">
            <p className="font-display text-base font-bold wv-text">Wordvibe</p>
            <p>
              Daily Word Puzzle, Brain Trivia &amp; Faith Study <span aria-hidden="true">·</span>{' '}
              Android Edition
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-semibold">
            <a
              href="/privacy"
              data-testid="landing-footer-privacy-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenPrivacyPolicy();
              }}
              className="hover:underline underline-offset-4 wv-text cursor-pointer whitespace-nowrap shrink-0"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              data-testid="landing-footer-terms-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenTerms();
              }}
              className="hover:underline underline-offset-4 wv-text cursor-pointer whitespace-nowrap shrink-0"
            >
              Terms of Service
            </a>
            <a
              href={WORDVIBE_APK_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-4 wv-accent-text cursor-pointer whitespace-nowrap shrink-0"
            >
              Android APK Releases
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
