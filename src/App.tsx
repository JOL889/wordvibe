import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { WebInstallExperience } from './components/WebInstallExperience';
import { isNativeAndroidRuntime } from './game/platformGateLogic';

const NativeWordvibeGame = lazy(() => import('./NativeWordvibeGame'));

export default function App() {
  if (!isNativeAndroidRuntime(Capacitor)) {
    return <WebInstallExperience />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center wv-app-shell">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="h-12 w-12 rounded-2xl border-2 wv-tile-wooden flex items-center justify-center font-display text-2xl font-bold">
              W
            </div>
            <p className="font-display text-lg font-bold wv-text">Loading Wordvibe...</p>
          </div>
        </div>
      }
    >
      <NativeWordvibeGame />
    </Suspense>
  );
}
