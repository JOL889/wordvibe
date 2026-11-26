import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_SETTINGS,
  difficultyTierToPace,
  difficultyTierToTriviaLevel,
  formatLevelLabel,
  getNextLevelNumber,
  levelNumberToDifficultyBand,
  migrateLegacyPreferences,
  normalizeLevelNumber,
  paceToDifficultyTier,
  resolveDocumentThemeState,
} from './settingsLogic';

test('app settings default to Dark Mode, Emerald accent, looping sound on, Full Fun Animations, and Casual difficulty', () => {
  assert.equal(DEFAULT_APP_SETTINGS.themeMode, 'dark');
  assert.equal(DEFAULT_APP_SETTINGS.accentColor, 'emerald');
  assert.equal(DEFAULT_APP_SETTINGS.animationIntensity, 'full');
  assert.equal(DEFAULT_APP_SETTINGS.difficultyTier, 'casual');
  assert.equal(DEFAULT_APP_SETTINGS.defaultTab, 'home');
  assert.equal(DEFAULT_APP_SETTINGS.soundMode, 'on');
  assert.equal(DEFAULT_APP_SETTINGS.bgMusicEnabled, true);
  assert.equal(DEFAULT_APP_SETTINGS.soundEnabled, true);
  assert.equal(DEFAULT_APP_SETTINGS.autoDetectLocation, true);
  assert.equal(DEFAULT_APP_SETTINGS.showScriptureReferences, true);
});

test('resolveDocumentThemeState applies integrated single-color meta colors across all 4 themes', () => {
  const dark = resolveDocumentThemeState({
    themeMode: 'dark',
    accentColor: 'emerald',
    animationIntensity: 'full',
  });
  assert.equal(dark.isDarkClass, true);
  assert.equal(dark.metaThemeColor, '#061A14');

  const amoled = resolveDocumentThemeState({
    themeMode: 'amoled',
    accentColor: 'gold',
    animationIntensity: 'subtle',
  });
  assert.equal(amoled.isDarkClass, true);
  assert.equal(amoled.metaThemeColor, '#000000');

  const light = resolveDocumentThemeState({
    themeMode: 'light',
    accentColor: 'blue',
    animationIntensity: 'reduced',
  });
  assert.equal(light.isDarkClass, false);
  assert.equal(light.metaThemeColor, '#EEF5FD');

  const colorblind = resolveDocumentThemeState({
    themeMode: 'colorblind',
    accentColor: 'violet',
    animationIntensity: 'full',
  });
  assert.equal(colorblind.isDarkClass, true);
  assert.equal(colorblind.dataTheme, 'colorblind');
});

test('numeric level helpers start at Level 1 and climb infinitely', () => {
  assert.equal(normalizeLevelNumber(undefined), 1);
  assert.equal(normalizeLevelNumber('novice'), 1);
  assert.equal(normalizeLevelNumber('legendary'), 5);
  assert.equal(normalizeLevelNumber(12), 12);
  assert.equal(getNextLevelNumber(1), 2);
  assert.equal(getNextLevelNumber(9), 10);
  assert.equal(formatLevelLabel(14), 'Level 14');
  assert.equal(levelNumberToDifficultyBand(1), 'novice');
  assert.equal(levelNumberToDifficultyBand(14), 'legendary');
});

test('difficulty tier converts cleanly to challenge pace and trivia difficulty, and legacy prefs migrate', () => {
  assert.equal(difficultyTierToPace('casual'), 'relaxed');
  assert.equal(difficultyTierToPace('balanced'), 'adaptive');
  assert.equal(difficultyTierToPace('mastermind'), 'brainiac');
  assert.equal(paceToDifficultyTier('relaxed'), 'casual');
  assert.equal(difficultyTierToTriviaLevel('casual'), 'novice');
  assert.equal(difficultyTierToTriviaLevel('mastermind'), 'legendary');

  assert.deepEqual(migrateLegacyPreferences({ highContrast: true, soundEnabled: false }), {
    soundEnabled: false,
    soundMode: 'off',
    themeMode: 'colorblind',
  });
});
