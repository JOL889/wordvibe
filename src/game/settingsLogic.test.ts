import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_SETTINGS,
  difficultyTierToPace,
  difficultyTierToTriviaLevel,
  migrateLegacyPreferences,
  paceToDifficultyTier,
  resolveDocumentThemeState,
} from './settingsLogic';

test('app settings default to Dark Mode, Emerald accent, Full Fun Animations, and Casual difficulty', () => {
  assert.equal(DEFAULT_APP_SETTINGS.themeMode, 'dark');
  assert.equal(DEFAULT_APP_SETTINGS.accentColor, 'emerald');
  assert.equal(DEFAULT_APP_SETTINGS.animationIntensity, 'full');
  assert.equal(DEFAULT_APP_SETTINGS.difficultyTier, 'casual');
  assert.equal(DEFAULT_APP_SETTINGS.defaultTab, 'home');
  assert.equal(DEFAULT_APP_SETTINGS.autoDetectLocation, true);
  assert.equal(DEFAULT_APP_SETTINGS.showScriptureReferences, true);
});

test('resolveDocumentThemeState applies dark class and meta colors across all 4 themes', () => {
  const dark = resolveDocumentThemeState({
    themeMode: 'dark',
    accentColor: 'emerald',
    animationIntensity: 'full',
  });
  assert.equal(dark.isDarkClass, true);
  assert.equal(dark.metaThemeColor, '#111315');

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
  assert.equal(light.metaThemeColor, '#F7F5F0');

  const colorblind = resolveDocumentThemeState({
    themeMode: 'colorblind',
    accentColor: 'violet',
    animationIntensity: 'full',
  });
  assert.equal(colorblind.isDarkClass, true);
  assert.equal(colorblind.dataTheme, 'colorblind');
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
    themeMode: 'colorblind',
  });
});
