import React from 'react';
import { ArrowLeft, FileText, Mail, ShieldAlert, Smartphone } from 'lucide-react';

interface TermsOfServiceViewProps {
  onBack: () => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onBack }) => {
  return (
    <article
      data-testid="terms-of-service-page"
      aria-label="Wordvibe Terms of Service"
      className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-5 animate-stage-enter"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="terms-back-btn"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border wv-border wv-card px-4 py-2 text-sm font-bold wv-text hover:opacity-85 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 wv-accent-text" aria-hidden="true" />
          <span>Back to Wordvibe</span>
        </button>

        <span className="text-xs font-semibold wv-text-muted">
          Last Updated: November 26, 2026
        </span>
      </div>

      <header className="rounded-3xl border wv-border wv-card p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold wv-accent-text">
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Wordvibe App Terms</span>
        </div>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold wv-text">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed wv-text-muted">
          These Terms govern your download and use of the Wordvibe Android application and web
          companion materials. By installing or using Wordvibe, you agree to play fairly and follow
          the terms below.
        </p>
      </header>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Smartphone className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>1. License &amp; Permitted Use</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          Wordvibe grants you a personal, non-commercial, revocable license to install and play the
          official Android APK on compatible Android devices. You may enjoy crosswords, Brain Trivia,
          and Faith Study offline or with optional cloud sync enabled.
        </p>
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <ShieldAlert className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>2. Fair Play, Leaderboards &amp; Integrity</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          Online leaderboard rankings and milestone claims apply strictly to verified online rounds
          completed inside an authenticated session. Automated bots, local storage tampering, score
          spoofing, or client modification may result in score reset or disqualification from weekly
          rankings.
        </p>
      </section>

      <section className="rounded-3xl border wv-border wv-card p-6 sm:p-7 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-bold wv-text">
          <Mail className="h-5 w-5 wv-accent-text shrink-0" aria-hidden="true" />
          <h2>3. Support &amp; Contact</h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed wv-text-muted">
          For support, release verification, or legal inquiries, contact{' '}
          <a
            href="mailto:lawaljustice12@gmail.com"
            className="font-bold underline wv-accent-text hover:opacity-85"
          >
            lawaljustice12@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
};
