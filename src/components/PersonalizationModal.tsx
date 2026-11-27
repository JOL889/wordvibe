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
import { useHorizontalSwitch } from '../hooks/useHorizontalSwitch';

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
const PACE_IDS: readonly ChallengePace[] = PACE_OPTIONS.map((p) => p.id);

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

  const paceSwitch = useHorizontalSwitch({
    items: PACE_IDS,
    activeItem: profile.challengePace,
    onChange: (challengePace) => onUpdateProfile({ ...profile, challengePace }),
    disabled: !open,
  });

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

  const resolveOfflineLocation = (coords?: { lat: number; lon: number }) => {
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const fallbackLoc = guessLocationFromTimezone(tz);
    const nextLoc: UserLocationData = coords
      ? {
          ...fallbackLoc,
          source: 'gps',
          updatedAt: Date.now(),
        }
      : fallbackLoc;
    onUpdateProfile({
      ...profile,
      locationEnabled: true,
      locationOptOut: false,
      location: nextLoc,
    });
    setCustomCity(nextLoc.city);
    setCustomCc(nextLoc.countryCode);
    setStatusMessage(
      `Region tuned to ${formatLocationLabel(nextLoc)} (${coords ? 'Device GPS + Timezone' : 'Offline Timezone'}).`
    );
  };

  const handleAutoDetect = () => {
    setDetecting(true);
    setStatusMessage(null);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolveOfflineLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setDetecting(false);
        },
        () => {
          resolveOfflineLocation();
          setDetecting(false);
        },
        { timeout: 4000, maximumAge: 600_000 }
      );
    } else {
      resolveOfflineLocation();
      setDetecting(false);
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
      <div className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 wv-border wv-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b wv-border px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold wv-accent-text">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Personalize Wordvibe &amp; Offline Region</span>
            </div>
            <h2
              id="personalize-modal-title"
              className="mt-0.5 font-display text-xl font-bold wv-text"
            >
              Your Taste, City &amp; Play Study
            </h2>
          </div>

          <button
            type="button"
            data-testid="close-personalization-btn"
            onClick={onClose}
            aria-label="Close personalization settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl wv-text-muted hover:opacity-80 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 1. Location Awareness */}
          <div className="rounded-xl border wv-border wv-card-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold wv-text">
                  <MapPin className="h-4 w-4 wv-accent-text shrink-0" aria-hidden="true" />
                  <span>Use My Region (Offline GPS / Timezone)</span>
                </div>
                <p className="mt-0.5 text-xs wv-text-muted">
                  Active region:{' '}
                  <span data-testid="active-location-label" className="font-semibold wv-text">
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
                    ? 'wv-accent-btn'
                    : 'border wv-border wv-card wv-text-muted'
                }`}
              >
                {profile.locationEnabled && !profile.locationOptOut ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div
              data-no-swipe="true"
              className="mt-3 flex items-center gap-2 overflow-x-auto snap-x no-scrollbar pb-0.5 sm:flex-wrap"
            >
              <button
                type="button"
                data-testid="detect-location-btn"
                disabled={detecting}
                onClick={handleAutoDetect}
                className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-lg wv-accent-btn px-3 py-2 text-xs font-semibold disabled:opacity-60 cursor-pointer whitespace-nowrap"
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
                    className={`shrink-0 snap-start rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'wv-accent-pill border'
                        : 'wv-border wv-card wv-text-muted hover:opacity-90'
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
                className="min-w-0 flex-1 rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs wv-text"
              />
              <input
                type="text"
                value={customCc}
                onChange={(e) => setCustomCc(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="US"
                maxLength={2}
                aria-label="2-letter country code"
                className="w-12 rounded-lg border wv-border wv-card px-2 py-1.5 text-center font-mono-tabular text-xs uppercase wv-text"
              />
              <button
                type="submit"
                className="rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs font-semibold wv-text hover:opacity-90 cursor-pointer whitespace-nowrap"
              >
                Set City
              </button>
            </form>

            {statusMessage && (
              <p className="mt-2 text-xs font-medium wv-accent-text">
                {statusMessage}
              </p>
            )}
          </div>

          {/* 2. User Interests */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider wv-text-muted">
                <Compass className="h-3.5 w-3.5 wv-accent-text" aria-hidden="true" />
                <span>Your Topics (Up to 5)</span>
              </h3>
              <span className="font-mono-tabular text-xs wv-text-muted">
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
                        ? 'wv-accent-btn border-transparent'
                        : 'wv-border wv-card-muted wv-text-muted hover:opacity-90'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    <span>{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Challenge Pace */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider wv-text-muted">
              Challenge Pace
            </h3>
            <div
              {...paceSwitch.containerProps}
              className="mt-2 grid grid-cols-3 gap-2"
            >
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
                        ? 'wv-accent-pill border-2'
                        : 'wv-border wv-card-muted wv-text hover:opacity-90'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="mt-0.5 text-xs leading-snug opacity-80">
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
            className="rounded-xl border wv-border wv-card-muted p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold wv-text">
                <Brain className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>What Wordvibe Learned About You</span>
              </div>
              <button
                type="button"
                onClick={onResetStudyStats}
                className="inline-flex items-center gap-1 text-xs font-semibold wv-text-muted hover:opacity-80 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Study</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border wv-border wv-card p-2">
                <div className="font-mono-tabular text-sm font-bold wv-text">
                  {insights.favoriteLength}-Letter
                </div>
                <div className="text-xs wv-text-muted">Top Board</div>
              </div>
              <div className="rounded-lg border wv-border wv-card p-2">
                <div className="font-mono-tabular text-sm font-bold wv-accent-text">
                  {profile.triviaAnswered > 0 ? `${insights.triviaAccuracy}%` : '—'}
                </div>
                <div className="text-xs wv-text-muted">Trivia Acc.</div>
              </div>
              <div className="rounded-lg border wv-border wv-card p-2">
                <div className="font-mono-tabular text-sm font-bold wv-text">
                  {profile.totalPuzzlesStudied > 0 ? insights.avgGuesses : '—'}
                </div>
                <div className="text-xs wv-text-muted">Avg Moves</div>
              </div>
            </div>

            <p className="mt-2.5 text-xs leading-relaxed wv-text-muted">
              {insights.topCategoryNames.length > 0
                ? `Top studied puzzle themes: ${insights.topCategoryNames.join(', ')}. Peak window: ${insights.peakWindowLabel}.`
                : `Play puzzles and Trivia so Wordvibe can adapt your recommended pace cleanly offline.`}
            </p>
          </div>

          {/* 5. Current Player & Device Context */}
          <div
            data-testid="user-research-card"
            className="rounded-xl border wv-border wv-card-muted p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold wv-text">
                <UserCheck className="h-4 w-4 wv-accent-text" aria-hidden="true" />
                <span>Your Active Player Context</span>
              </div>
              <span className="font-mono-tabular text-xs font-semibold wv-accent-text">
                {dossier.skillTier} Tier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border wv-border wv-card px-2.5 py-2">
                <div className="text-xs wv-text-muted">Region &amp; Timezone</div>
                <div className="font-semibold wv-text truncate">
                  {dossier.regionLabel} · {envSnapshot.timezone}
                </div>
              </div>
              <div className="rounded-lg border wv-border wv-card px-2.5 py-2">
                <div className="text-xs wv-text-muted">Language &amp; Window</div>
                <div className="font-semibold wv-text truncate">
                  {dossier.locale} · {envSnapshot.dayOfWeek} {dossier.timeOfDay}
                </div>
              </div>
              <div className="rounded-lg border wv-border wv-card px-2.5 py-2">
                <div className="text-xs wv-text-muted">Device &amp; Input</div>
                <div className="font-semibold wv-text truncate">
                  {dossier.deviceLabel} · {envSnapshot.inputMethod}
                </div>
              </div>
              <div className="rounded-lg border wv-border wv-card px-2.5 py-2">
                <div className="text-xs wv-text-muted">Active Focus</div>
                <div className="font-semibold wv-text truncate">
                  {dossier.focusLabel}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold wv-text-muted">
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
                  className="mt-1 w-full rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs wv-text"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold wv-text-muted">
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
                  className="mt-1 w-full rounded-lg border wv-border wv-card px-2.5 py-1.5 text-xs wv-text"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="border-t wv-border px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl wv-accent-btn px-5 py-2 text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
