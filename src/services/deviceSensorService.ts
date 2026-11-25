/**
 * Device Sensor Service — Accelerometer Shake + Gyroscope 3D Parallax Tilt + Haptics
 *
 * Safely integrates mobile device sensors:
 * - Gyroscope / DeviceOrientation -> subtle 3D tilt CSS variables (--tilt-x, --tilt-y)
 *   with smooth pointer parallax fallback on desktop.
 * - Accelerometer / DeviceMotion -> shake-to-shuffle / smart-nudge trigger.
 * - Haptics -> navigator.vibrate feedback synced with settings.
 * - iOS 13+ permission handling without blocking initial gameplay.
 */

export interface SensorPermissionStatus {
  supported: boolean;
  needsPermissionPrompt: boolean;
  granted: boolean;
}

export function getSensorSupportStatus(): SensorPermissionStatus {
  if (typeof window === 'undefined') {
    return { supported: false, needsPermissionPrompt: false, granted: false };
  }
  const hasMotion = 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window;
  const MotionCtor = (window as unknown as {
    DeviceMotionEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
  }).DeviceMotionEvent;
  const OrientCtor = (window as unknown as {
    DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
  }).DeviceOrientationEvent;
  const needsPrompt =
    typeof MotionCtor?.requestPermission === 'function' ||
    typeof OrientCtor?.requestPermission === 'function';

  return {
    supported: hasMotion,
    needsPermissionPrompt: needsPrompt,
    granted: !needsPrompt && hasMotion,
  };
}

export async function requestMotionSensorPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  let granted = true;
  try {
    const MotionCtor = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    }).DeviceMotionEvent;
    if (typeof MotionCtor?.requestPermission === 'function') {
      const res = await MotionCtor.requestPermission();
      granted = granted && res === 'granted';
    }
    const OrientCtor = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    }).DeviceOrientationEvent;
    if (typeof OrientCtor?.requestPermission === 'function') {
      const res = await OrientCtor.requestPermission();
      granted = granted && res === 'granted';
    }
    return granted;
  } catch {
    return false;
  }
}

export function triggerHapticPulse(pattern: number | number[] = 14, enabled = true): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore restricted haptic environments
  }
}

export interface SensorListenersOptions {
  enabled: boolean;
  onShake?: () => void;
  onTiltChange?: (tiltXDeg: number, tiltYDeg: number) => void;
}

/**
 * Attaches throttled gyroscope tilt and accelerometer shake listeners.
 * Returns a clean teardown callback.
 */
export function attachDeviceSensorListeners(options: SensorListenersOptions): () => void {
  if (!options.enabled || typeof window === 'undefined') {
    return () => {};
  }

  let lastShakeAt = 0;
  let lastMag = 0;

  const handleOrientation = (ev: DeviceOrientationEvent) => {
    if (ev.beta === null && ev.gamma === null) return;
    const gamma = Math.max(-25, Math.min(25, ev.gamma ?? 0));
    const betaOffset = Math.max(-25, Math.min(25, (ev.beta ?? 35) - 35));
    const tiltY = Number((gamma * 0.22).toFixed(2));
    const tiltX = Number((-betaOffset * 0.18).toFixed(2));
    document.documentElement.style.setProperty('--tilt-x', `${tiltX}deg`);
    document.documentElement.style.setProperty('--tilt-y', `${tiltY}deg`);
    options.onTiltChange?.(tiltX, tiltY);
  };

  const handleMotion = (ev: DeviceMotionEvent) => {
    const acc = ev.accelerationIncludingGravity || ev.acceleration;
    if (!acc) return;
    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;
    const mag = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(mag - lastMag);
    lastMag = mag;

    const now = Date.now();
    if (delta > 16.5 && now - lastShakeAt > 1800) {
      lastShakeAt = now;
      options.onShake?.();
    }
  };

  const handlePointerParallax = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse') return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = (ev.clientX / w - 0.5) * 2; // -1..1
    const ny = (ev.clientY / h - 0.5) * 2;
    const tiltY = Number((nx * 3.2).toFixed(2));
    const tiltX = Number((-ny * 2.6).toFixed(2));
    document.documentElement.style.setProperty('--tilt-x', `${tiltX}deg`);
    document.documentElement.style.setProperty('--tilt-y', `${tiltY}deg`);
  };

  window.addEventListener('deviceorientation', handleOrientation, { passive: true });
  window.addEventListener('devicemotion', handleMotion, { passive: true });
  window.addEventListener('pointermove', handlePointerParallax, { passive: true });

  return () => {
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
    window.removeEventListener('pointermove', handlePointerParallax);
    document.documentElement.style.setProperty('--tilt-x', '0deg');
    document.documentElement.style.setProperty('--tilt-y', '0deg');
  };
}
