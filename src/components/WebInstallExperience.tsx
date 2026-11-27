import React, { useCallback, useEffect, useState } from 'react';
import {
  isBlockedGameUrlOnWeb,
  resolveAppEntryExperience,
} from '../game/platformGateLogic';
import {
  DEFAULT_APP_SETTINGS,
  resolveDocumentThemeState,
  type AppSettings,
} from '../game/settingsLogic';
import { InstallLandingPage } from './InstallLandingPage';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsOfServiceView } from './TermsOfServiceView';

type WebRoute = 'install_landing' | 'privacy' | 'terms';

function loadLightweightWebSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
  try {
    const raw = window.localStorage.getItem('wordvibe_app_settings_v1');
    if (!raw) return DEFAULT_APP_SETTINGS;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...(JSON.parse(raw) as Partial<AppSettings>),
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function resolveCurrentWebRoute(): WebRoute {
  if (typeof window === 'undefined') return 'install_landing';
  const entry = resolveAppEntryExperience({
    isNativePlatform: false,
    pathname: window.location.pathname,
    search: window.location.search,
  });
  return entry === 'privacy' || entry === 'terms' ? entry : 'install_landing';
}

export const WebInstallExperience: React.FC = () => {
  const [route, setRoute] = useState<WebRoute>(() => resolveCurrentWebRoute());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const settings = loadLightweightWebSettings();
      const docState = resolveDocumentThemeState(settings);
      const html = document.documentElement;
      html.setAttribute('data-theme', docState.dataTheme);
      html.setAttribute('data-accent', docState.dataAccent);
      html.setAttribute('data-anim', docState.dataAnim);
      if (docState.isDarkClass) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Block direct URL access to game routes in regular web browsers
    if (isBlockedGameUrlOnWeb(window.location.pathname, window.location.search)) {
      window.history.replaceState({ page: 'install' }, '', '/');
      setRoute('install_landing');
    }
    const handlePopState = () => {
      const next = resolveCurrentWebRoute();
      if (next === 'install_landing' && isBlockedGameUrlOnWeb(window.location.pathname, window.location.search)) {
        window.history.replaceState({ page: 'install' }, '', '/');
      }
      setRoute(next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (route === 'privacy') {
      document.title = 'Privacy Policy — Wordvibe';
    } else if (route === 'terms') {
      document.title = 'Terms of Service — Wordvibe';
    } else {
      document.title = 'Wordvibe: Daily Word Puzzle, Brain Trivia & Faith Study';
    }
  }, [route]);

  const openPrivacyPolicy = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'privacy' }, '', '/privacy');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setRoute('privacy');
  }, []);

  const openTerms = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'terms' }, '', '/terms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setRoute('terms');
  }, []);

  const backToLanding = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'install' }, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setRoute('install_landing');
  }, []);

  const handleClearLocalData = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch {
      // Ignore storage restrictions
    }
    if ('caches' in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith('wordvibe-')).map((k) => window.caches.delete(k))
        );
      } catch {
        // Ignore Cache API errors
      }
    }
  }, []);

  if (route === 'privacy') {
    return (
      <div className="min-h-screen wv-app-shell">
        <PrivacyPolicyView onBack={backToLanding} onClearLocalData={handleClearLocalData} />
      </div>
    );
  }

  if (route === 'terms') {
    return (
      <div className="min-h-screen wv-app-shell">
        <TermsOfServiceView onBack={backToLanding} />
      </div>
    );
  }

  return (
    <InstallLandingPage
      onOpenPrivacyPolicy={openPrivacyPolicy}
      onOpenTerms={openTerms}
    />
  );
};
