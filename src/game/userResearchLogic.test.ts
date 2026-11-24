import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPlayerProfile } from './playerProfileLogic';
import { DEFAULT_STATS } from './puzzleLogic';
import {
  buildUserResearchDossier,
  gatherUserEnvironmentDetails,
  getTimeOfDayWindow,
} from './userResearchLogic';

test('getTimeOfDayWindow classifies Morning, Afternoon, Evening, and Night accurately', () => {
  const mkHour = (hr: number) => new Date(2026, 10, 24, hr, 15, 0).getTime();
  assert.equal(getTimeOfDayWindow(mkHour(8)), 'Morning');
  assert.equal(getTimeOfDayWindow(mkHour(14)), 'Afternoon');
  assert.equal(getTimeOfDayWindow(mkHour(19)), 'Evening');
  assert.equal(getTimeOfDayWindow(mkHour(23)), 'Night');
  assert.equal(getTimeOfDayWindow(mkHour(2)), 'Night');
});

test('gatherUserEnvironmentDetails returns valid non-empty environment snapshot', () => {
  const snapshot = gatherUserEnvironmentDetails(new Date(2026, 10, 24, 10, 30, 0).getTime());
  assert.ok(snapshot.timezone.length > 0);
  assert.ok(snapshot.locale.length > 0);
  assert.ok(snapshot.languages.length >= 1);
  assert.equal(snapshot.timeOfDay, 'Morning');
  assert.ok(['Phone', 'Tablet', 'Desktop'].includes(snapshot.deviceType));
  assert.ok(['Touch', 'Keyboard'].includes(snapshot.inputMethod));
});

test('buildUserResearchDossier incorporates location, profile focus, stats tier, and headlines', () => {
  const profile = {
    ...createDefaultPlayerProfile(),
    locationEnabled: true,
    locationOptOut: false,
    location: {
      city: 'Lagos',
      region: 'LA',
      countryCode: 'NG',
      countryName: 'Nigeria',
      timezone: 'Africa/Lagos',
      source: 'ip' as const,
      updatedAt: Date.now(),
    },
    displayName: 'Tunde',
    focusField: 'Product Design',
    triviaAnswered: 10,
    triviaCorrect: 9,
    environmentSnapshot: {
      timezone: 'Africa/Lagos',
      locale: 'en-NG',
      languages: ['en-NG'],
      timeOfDay: 'Afternoon' as const,
      dayOfWeek: 'Tuesday',
      deviceType: 'Phone' as const,
      osFamily: 'Android' as const,
      inputMethod: 'Touch' as const,
      colorSchemePreference: 'light' as const,
      connectionType: '4g',
      gatheredAt: Date.now(),
    },
  };

  const dossier = buildUserResearchDossier(
    profile,
    { ...DEFAULT_STATS, gamesPlayed: 8, gamesWon: 7 },
    ['Tech startups expand mobile hubs across Lagos']
  );

  assert.equal(dossier.regionLabel, 'Lagos, NG');
  assert.equal(dossier.cityToken, 'Lagos');
  assert.equal(dossier.skillTier, 'Sharp');
  assert.equal(dossier.deviceLabel, 'Android Phone');
  assert.equal(dossier.focusLabel, 'Product Design');
  assert.match(dossier.promptDossier, /Player: Tunde/);
  assert.match(dossier.promptDossier, /Location: Lagos, NG/);
  assert.match(dossier.promptDossier, /Focus: Product Design/);
  assert.match(dossier.promptDossier, /Local Buzz: Tech startups/);

  const optedOutDossier = buildUserResearchDossier(
    { ...profile, locationOptOut: true },
    DEFAULT_STATS,
    []
  );
  assert.equal(optedOutDossier.regionLabel, 'Global');
  assert.equal(optedOutDossier.cityToken, 'Afternoon');
});
