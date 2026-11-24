import React, { useState } from 'react';
import {
  Brain,
  Check,
  Compass,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  formatLocationLabel,
  guessLocationFromTimezone,
  INTEREST_CATALOG,
  QUICK_CITY_PRESETS,
  summarizePlayerProfile,
  type ChallengePace,
  type InterestTagId,
  type PlayerProfileState,
  type UserLocationData,
} from '../game/playerProfileLogic';
import type { StatsData } from '../game/puzzleLogic';
import {
  buildUserResearchDossier,
  gatherUserEnvironmentDetails,
} from '../game/userResearchLogic';

interface PersonalizationModalProps {
  open: boolean;
  profile: PlayerProfileState;
  stats?: StatsData;
  localHeadlines?: string[];
  onClose: () => void;
  onUpdateProfile: (next: PlayerProfileState) => void;
  onResetStudyStats: () => void;
}

const PACE_OPTIONS: Array<{ id: ChallengePace; label: string; desc: string }> = [
  { id: 'relaxed', label: 'Relaxed', desc: 'Lighter trivia & friendly word clues' },
  { id: 'adaptive', label: 'Adaptive', desc: 'Balances challenge as you win' },
  { id: 'brainiac', label: 'Brainiac', desc: 'Sharper clues & high-tier trivia' },
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  open,
  profile,
  stats,
  localHeadlines = [],
  onClose,
  onUpdateProfile,
  onResetStudyStats,
}) => {
  const [detecting, setDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customCity, setCustomCity] = useState(profile.location?.city || '');
  const [customCc, setCustomCc] = useState(profile.location?.countryCode || 'US');

  if (!open) return null;

  const insights = summarizePlayerProfile(profile);
  const envSnapshot = profile.environmentSnapshot || gatherUserEnvironmentDetails();
  const dossier = buildUserResearchDossier(
    { ...profile, environmentSnapshot: envSnapshot },
    stats,
    localHeadlines
  );
  const activeLocationLabel =
    profile.locationEnabled && !profile.locationOptOut
      ? formatLocationLabel(profile.location)
      : 'Off (Global mode)';

  const handleToggleLocation = () => {
    const nextEnabled = !(profile.locationEnabled && !profile.locationOptOut);
    const nextLocation =
      nextEnabled && !profile.location ? guessLocationFromTimezone() : profile.location;
    onUpdateProfile({
      ...profile,
      locationEnabled: nextEnabled,
      locationOptOut: !nextEnabled,
      location: nextLocation,
    });
    setStatusMessage(
      nextEnabled
        ? `Location personalization turned on (${formatLocationLabel(nextLocation)}).`
        : 'Location personalization paused. Switched to global mode.'
    );
  };

  const resolveServerLocation = async (coords?: { lat: number; lon: number }) => {
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    try {
      const res = await fetch('/api/location/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coords?.lat,
          lon: coords?.lon,
          timezone: tz,
        }),
      });
      if (!res.ok) throw new Error('Location resolve failed');
      const data = (await res.json()) as { location?: UserLocationData };
      if (data.location) {
        onUpdateProfile({
          ...profile,
          locationEnabled: true,
          locationOptOut: false,
          location: data.location,
        });
        setCustomCity(data.location.city);
        setCustomCc(data.location.countryCode);
        setStatusMessage(
          `Detected ${formatLocationLabel(data.location)} via ${data.location.source.toUpperCase()}.`
        );
        return;
      }
      throw new Error('Empty location');
    } catch {
      const fallbackLoc = guessLocationFromTimezone(tz);
      onUpdateProfile({
        ...profile,
        locationEnabled: true,
        locationOptOut: false,
        location: fallbackLoc,
      });
      setCustomCity(fallbackLoc.city);
      setCustomCc(fallbackLoc.countryCode);
      setStatusMessage(`Set region to ${formatLocationLabel(fallbackLoc)} from timezone.`);
    }
  };

  const handleAutoDetect = () => {
    setDetecting(true);
    setStatusMessage(null);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void resolveServerLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }).finally(() => setDetecting(false));
        },
        () => {
          void resolveServerLocation().finally(() => setDetecting(false));
        },
        { timeout: 5000, maximumAge: 600_000 }
      );
    } else {
      void resolveServerLocation().finally(() => setDetecting(false));
    }
  };

  const handleApplyPreset = (preset: (typeof QUICK_CITY_PRESETS)[number]) => {
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const nextLoc: UserLocationData = {
      ...preset,
      timezone: tz,
      source: 'manual',
      updatedAt: Date.now(),
    };
    onUpdateProfile({
      ...profile,
      locationEnabled: true,
      locationOptOut: false,
      location: nextLoc,
    });
    setCustomCity(nextLoc.city);
    setCustomCc(nextLoc.countryCode);
    setStatusMessage(`Region tuned to ${formatLocationLabel(nextLoc)}.`);
  };

  const handleSaveManualCity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCity = customCity.trim();
    if (!cleanCity) return;
    const cleanCc = customCc.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'US';
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const nextLoc: UserLocationData = {
      city: cleanCity,
      region: '',
      countryCode: cleanCc,
      countryName: cleanCc,
      timezone: tz,
      source: 'manual',
      updatedAt: Date.now(),
    };
    onUpdateProfile({
      ...profile,
      locationEnabled: true,
      locationOptOut: false,
      location: nextLoc,
    });
    setStatusMessage(`Custom region saved: ${formatLocationLabel(nextLoc)}.`);
  };

  const handleToggleInterest = (id: InterestTagId) => {
    const exists = profile.selectedInterests.includes(id);
    if (exists && profile.selectedInterests.length <= 1) {
      setStatusMessage('Keep at least 1 interest topic selected.');
      return;
    }
    const next = exists
      ? profile.selectedInterests.filter((item) => item !== id)
      : [...profile.selectedInterests, id].slice(-5);
    onUpdateProfile({
      ...profile,
      selectedInterests: next,
    });
  };

  return (
    <div
      data-testid="personalization-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personalize-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
    >
      <div className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Personalize WordVibe &amp; Live Location</span>
            </div>
            <h2
              id="personalize-modal-title"
              className="mt-0.5 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Your Taste, City &amp; Play Study
            </h2>
          </div>

          <button
            type="button"
            data-testid="close-personalization-btn"
            onClick={onClose}
            aria-label="Close personalization settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-stone-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 1. Location Awareness */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Use My Location When Online</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Active region:{' '}
                  <span data-testid="active-location-label" className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeLocationLabel}
                  </span>
                </p>
              </div>

              <button
                type="button"
                data-testid="toggle-location-btn"
                aria-pressed={Boolean(profile.locationEnabled && !profile.locationOptOut)}
                onClick={handleToggleLocation}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  profile.locationEnabled && !profile.locationOptOut
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'border border-stone-300 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {profile.locationEnabled && !profile.locationOptOut ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="detect-location-btn"
                disabled={detecting}
                onClick={handleAutoDetect}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-xs font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-60 cursor-pointer"
              >
                {detecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{detecting ? 'Detecting...' : 'Auto-Detect My City'}</span>
              </button>

              {QUICK_CITY_PRESETS.map((preset) => {
                const isSelected =
                  profile.locationEnabled &&
                  profile.location?.city === preset.city &&
                  profile.location?.countryCode === preset.countryCode;
                return (
                  <button
                    key={`${preset.city}-${preset.countryCode}`}
                    type="button"
                    data-testid={`preset-city-${preset.city.toLowerCase().replace(/\s+/g, '-')}-${preset.countryCode.toLowerCase()}`}
                    onClick={() => handleApplyPreset(preset)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-stone-300'
                    }`}
                  >
                    {preset.city}, {preset.countryCode}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSaveManualCity} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="City (e.g. Austin)"
                aria-label="Custom city name"
                className="min-w-0 flex-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <input
                type="text"
                value={customCc}
                onChange={(e) => setCustomCc(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="US"
                maxLength={2}
                aria-label="2-letter country code"
                className="w-12 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-900 px-2 py-1.5 text-center font-mono-tabular text-xs uppercase text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-lg border border-stone-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
              >
                Set City
              </button>
            </form>

            {statusMessage && (
              <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {statusMessage}
              </p>
            )}
          </div>

          {/* 2. User Interests */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <Compass className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Your Topics (Up to 5)</span>
              </h3>
              <span className="font-mono-tabular text-[11px] text-zinc-500">
                {profile.selectedInterests.length}/5 selected
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {INTEREST_CATALOG.map((interest) => {
                const selected = profile.selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    data-interest-tag={interest.id}
                    onClick={() => handleToggleInterest(interest.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      selected
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 hover:border-stone-300'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AI Difficulty & Clue Style */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              AI Challenge Pace
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PACE_OPTIONS.map((opt) => {
                const active = profile.challengePace === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-pace-option={opt.id}
                    onClick={() => onUpdateProfile({ ...profile, challengePace: opt.id })}
                    className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-emerald-700 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/35'
                        : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-zinc-600 dark:text-zinc-400">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Learned Gameplay Insights */}
          <div
            data-testid="learned-insights-card"
            className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <Brain className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>What WordVibe Learned About You</span>
              </div>
              <button
                type="button"
                onClick={onResetStudyStats}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Study</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 p-2">
                <div className="font-mono-tabular text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {insights.favoriteLength}-Letter
                </div>
                <div className="text-[10px] text-zinc-500">Top Board</div>
              </div>
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 p-2">
                <div className="font-mono-tabular text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {profile.triviaAnswered > 0 ? `${insights.triviaAccuracy}%` : '—'}
                </div>
                <div className="text-[10px] text-zinc-500">Trivia Acc.</div>
              </div>
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 p-2">
                <div className="font-mono-tabular text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {profile.totalPuzzlesStudied > 0 ? insights.avgGuesses : '—'}
                </div>
                <div className="text-[10px] text-zinc-500">Avg Guesses</div>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {insights.topCategoryNames.length > 0
                ? `Top studied puzzle themes: ${insights.topCategoryNames.join(', ')}. Peak window: ${insights.peakWindowLabel}.`
                : `Play puzzles and AI Trivia so WordVibe can adapt difficulty (${insights.recommendedDifficulty} tier) and regional word picks.`}
            </p>
          </div>

          {/* 5. Current Player & Device Context */}
          <div
            data-testid="user-research-card"
            className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Your Active Player Context</span>
              </div>
              <span className="font-mono-tabular text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                {dossier.skillTier} Tier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">Region &amp; Timezone</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {dossier.regionLabel} · {envSnapshot.timezone}
                </div>
              </div>
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">Language &amp; Window</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {dossier.locale} · {envSnapshot.dayOfWeek} {dossier.timeOfDay}
                </div>
              </div>
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">Device &amp; Input</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {dossier.deviceLabel} · {envSnapshot.inputMethod}
                </div>
              </div>
              <div className="rounded-lg bg-stone-100/80 dark:bg-zinc-900 px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">Active Focus</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {dossier.focusLabel}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Name (Optional)
                </span>
                <input
                  type="text"
                  data-testid="profile-name-input"
                  value={profile.displayName || ''}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      displayName: e.target.value.slice(0, 32),
                    })
                  }
                  placeholder="e.g. Alex"
                  className="mt-1 w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Field or Vibe (Optional)
                </span>
                <input
                  type="text"
                  data-testid="profile-focus-input"
                  value={profile.focusField || ''}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      focusField: e.target.value.slice(0, 40),
                    })
                  }
                  placeholder="e.g. Medicine, Music, Design"
                  className="mt-1 w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 dark:border-zinc-800 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
