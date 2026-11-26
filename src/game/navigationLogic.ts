import type { AppTab } from '../components/BottomNav';

export const APP_TAB_ORDER: readonly AppTab[] = ['home', 'puzzle', 'faith', 'trivia'];

export interface SwipeGestureInput {
  currentTab: AppTab;
  deltaX: number;
  deltaY: number;
  durationMs: number;
  minSwipePx?: number;
}

export interface SwipeResolution {
  nextTab: AppTab | null;
  direction: 'left' | 'right' | null;
}

export function resolveHorizontalSwipeDirection(input: {
  deltaX: number;
  deltaY: number;
  durationMs: number;
  minSwipePx?: number;
}): 'left' | 'right' | null {
  const { deltaX, deltaY, durationMs, minSwipePx = 54 } = input;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (durationMs <= 0 || durationMs > 850) {
    return null;
  }
  if (absX < minSwipePx) {
    return null;
  }
  if (absX <= absY * 1.35) {
    return null;
  }

  return deltaX < 0 ? 'left' : 'right';
}

export function resolveSwipeTabChange(input: SwipeGestureInput): SwipeResolution {
  const { currentTab, deltaX, deltaY, durationMs, minSwipePx = 54 } = input;
  const direction = resolveHorizontalSwipeDirection({
    deltaX,
    deltaY,
    durationMs,
    minSwipePx,
  });
  if (!direction) {
    return { nextTab: null, direction: null };
  }

  const currentIndex = APP_TAB_ORDER.indexOf(currentTab);
  if (currentIndex === -1) {
    return { nextTab: null, direction: null };
  }

  // Swiping left (finger moves right -> left, deltaX < 0) advances to next page
  if (direction === 'left') {
    if (currentIndex >= APP_TAB_ORDER.length - 1) {
      return { nextTab: null, direction: null };
    }
    return { nextTab: APP_TAB_ORDER[currentIndex + 1], direction: 'left' };
  }

  // Swiping right (finger moves left -> right, deltaX > 0) returns to previous page
  if (currentIndex <= 0) {
    return { nextTab: null, direction: null };
  }
  return { nextTab: APP_TAB_ORDER[currentIndex - 1], direction: 'right' };
}

export function stepHorizontalSelection<T>(
  items: readonly T[],
  current: T,
  delta: -1 | 1,
  options?: { loop?: boolean }
): T | null {
  if (items.length < 2) return null;
  const idx = items.indexOf(current);
  if (idx === -1) {
    return delta > 0 ? items[0] : items[items.length - 1];
  }
  const nextIdx = idx + delta;
  if (options?.loop) {
    const wrapped = (nextIdx + items.length) % items.length;
    return wrapped === idx ? null : items[wrapped];
  }
  if (nextIdx < 0 || nextIdx >= items.length) {
    return null;
  }
  return items[nextIdx];
}

export function resolveWheelStepDirection(input: {
  deltaX: number;
  deltaY: number;
  shiftKey?: boolean;
}): -1 | 1 | 0 {
  const absX = Math.abs(input.deltaX);
  const absY = Math.abs(input.deltaY);

  if (absX >= 18 && absX > absY * 1.15) {
    return input.deltaX > 0 ? 1 : -1;
  }
  if (input.shiftKey && absY >= 18 && absY >= absX) {
    return input.deltaY > 0 ? 1 : -1;
  }
  return 0;
}

export function isSwipeIgnoredTarget(target: {
  tagName?: string;
  isContentEditable?: boolean;
  closestHorizontalScroll?: boolean;
  closestHorizontalSwitcher?: boolean;
}): boolean {
  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target.closestHorizontalScroll || target.closestHorizontalSwitcher) {
    return true;
  }
  return false;
}

export function isPrivacyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/privacy';
}

