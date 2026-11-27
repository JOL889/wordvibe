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
 * Attaches calibrated gyroscope tilt + subtle pointer parallax and accelerometer shake listeners.
 * Strictly follows the actual movement of the user's phone gently (never wobbles on its own).
 */
export function attachDeviceSensorListeners(options: SensorListenersOptions): () => void {
  if (!options.enabled || typeof window === 'undefined') {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--tilt-x', '0deg');
      document.documentElement.style.setProperty('--tilt-y', '0deg');
      document.documentElement.style.setProperty('--shift-x', '0px');
      document.documentElement.style.setProperty('--shift-y', '0px');
    }
    return () => {};
  }

  let lastShakeAt = 0;
  let lastMag = 0;

  // Calibrated rest orientation so holding the phone naturally at any angle feels centered
  let baseBeta: number | null = null;
  let baseGamma: number | null = null;

  let targetTiltX = 0;
  let targetTiltY = 0;
  let targetShiftX = 0;
  let targetShiftY = 0;

  let currentTiltX = 0;
  let currentTiltY = 0;
  let currentShiftX = 0;
  let currentShiftY = 0;
  let rafId = 0;

  let lastWrittenTiltX = '';
  let lastWrittenTiltY = '';
  let lastWrittenShiftX = '';
  let lastWrittenShiftY = '';
  let lastShakeCheckAt = 0;

  const isMotionPaused = () => {
    if (typeof document === 'undefined') return true;
    return (
      document.visibilityState === 'hidden' ||
      document.documentElement.dataset.anim === 'reduced'
    );
  };

  const scheduleSmoothFrame = () => {
    if (rafId || isMotionPaused()) return;
    const step = () => {
      if (isMotionPaused()) {
        rafId = 0;
        return;
      }

      const ease = 0.16;
      currentTiltX += (targetTiltX - currentTiltX) * ease;
      currentTiltY += (targetTiltY - currentTiltY) * ease;
      currentShiftX += (targetShiftX - currentShiftX) * ease;
      currentShiftY += (targetShiftY - currentShiftY) * ease;

      const nextTiltX = `${currentTiltX.toFixed(1)}deg`;
      const nextTiltY = `${currentTiltY.toFixed(1)}deg`;
      const nextShiftX = `${currentShiftX.toFixed(1)}px`;
      const nextShiftY = `${currentShiftY.toFixed(1)}px`;

      const rootStyle = document.documentElement.style;
      let changed = false;
      if (nextTiltX !== lastWrittenTiltX) {
        lastWrittenTiltX = nextTiltX;
        rootStyle.setProperty('--tilt-x', nextTiltX);
        changed = true;
      }
      if (nextTiltY !== lastWrittenTiltY) {
        lastWrittenTiltY = nextTiltY;
        rootStyle.setProperty('--tilt-y', nextTiltY);
        changed = true;
      }
      if (nextShiftX !== lastWrittenShiftX) {
        lastWrittenShiftX = nextShiftX;
        rootStyle.setProperty('--shift-x', nextShiftX);
        changed = true;
      }
      if (nextShiftY !== lastWrittenShiftY) {
        lastWrittenShiftY = nextShiftY;
        rootStyle.setProperty('--shift-y', nextShiftY);
        changed = true;
      }
      if (changed && options.onTiltChange) {
        options.onTiltChange(Number(currentTiltX.toFixed(1)), Number(currentTiltY.toFixed(1)));
      }

      const settled =
        Math.abs(targetTiltX - currentTiltX) < 0.04 &&
        Math.abs(targetTiltY - currentTiltY) < 0.04 &&
        Math.abs(targetShiftX - currentShiftX) < 0.05 &&
        Math.abs(targetShiftY - currentShiftY) < 0.05;

      if (!settled) {
        rafId = window.requestAnimationFrame(step);
      } else {
        rafId = 0;
      }
    };
    rafId = window.requestAnimationFrame(step);
  };

  const clamp = (val: number, maxAbs: number) => Math.max(-maxAbs, Math.min(maxAbs, val));

  const handleOrientation = (ev: DeviceOrientationEvent) => {
    if (isMotionPaused() || (ev.beta === null && ev.gamma === null)) return;
    const rawBeta = ev.beta ?? 0;
    const rawGamma = ev.gamma ?? 0;

    if (baseBeta === null || baseGamma === null) {
      baseBeta = rawBeta;
      baseGamma = rawGamma;
    } else {
      // Gently re-center resting posture over time so sustained angles feel natural
      baseBeta += (rawBeta - baseBeta) * 0.012;
      baseGamma += (rawGamma - baseGamma) * 0.012;
    }

    let deltaPitch = rawBeta - baseBeta;
    let deltaRoll = rawGamma - baseGamma;

    const orientAngle = window.screen?.orientation?.angle ?? 0;
    if (orientAngle === 90) {
      [deltaPitch, deltaRoll] = [-deltaRoll, deltaPitch];
    } else if (orientAngle === 270 || orientAngle === -90) {
      [deltaPitch, deltaRoll] = [deltaRoll, -deltaPitch];
    } else if (orientAngle === 180) {
      deltaPitch = -deltaPitch;
      deltaRoll = -deltaRoll;
    }

    // Gentle responsive limits: ±2.2deg tilt and ±2.5px translate so cards feel tactile without wobble
    targetTiltX = clamp(-deltaPitch * 0.09, 2.2);
    targetTiltY = clamp(deltaRoll * 0.1, 2.2);
    targetShiftX = clamp(deltaRoll * 0.11, 2.5);
    targetShiftY = clamp(deltaPitch * 0.1, 2.5);
    scheduleSmoothFrame();
  };

  const handleMotion = (ev: DeviceMotionEvent) => {
    const now = Date.now();
    if (now - lastShakeCheckAt < 50 || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      return;
    }
    lastShakeCheckAt = now;
    const acc = ev.accelerationIncludingGravity || ev.acceleration;
    if (!acc) return;
    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;
    const mag = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(mag - lastMag);
    lastMag = mag;

    // Higher threshold so normal movement/tilting never triggers a false shuffle
    if (delta > 29 && now - lastShakeAt > 2000) {
      lastShakeAt = now;
      options.onShake?.();
    }
  };

  const handlePointerParallax = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse' || isMotionPaused()) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = (ev.clientX / w - 0.5) * 2;
    const ny = (ev.clientY / h - 0.5) * 2;
    targetTiltY = clamp(nx * 1.4, 1.6);
    targetTiltX = clamp(-ny * 1.2, 1.6);
    targetShiftX = clamp(nx * 1.8, 2.0);
    targetShiftY = clamp(ny * 1.8, 2.0);
    scheduleSmoothFrame();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  window.addEventListener('deviceorientation', handleOrientation, { passive: true });
  window.addEventListener('devicemotion', handleMotion, { passive: true });
  window.addEventListener('pointermove', handlePointerParallax, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
    window.removeEventListener('pointermove', handlePointerParallax);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--tilt-x', '0deg');
    rootStyle.setProperty('--tilt-y', '0deg');
    rootStyle.setProperty('--shift-x', '0px');
    rootStyle.setProperty('--shift-y', '0px');
  };
}
