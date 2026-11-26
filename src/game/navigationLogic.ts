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

export function resolveSwipeTabChange(input: SwipeGestureInput): SwipeResolution {
  const { currentTab, deltaX, deltaY, durationMs, minSwipePx = 54 } = input;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (durationMs <= 0 || durationMs > 850) {
    return { nextTab: null, direction: null };
  }
  if (absX < minSwipePx) {
    return { nextTab: null, direction: null };
  }
  // Ignore diagonal or vertical scrolling gestures
  if (absX <= absY * 1.35) {
    return { nextTab: null, direction: null };
  }

  const currentIndex = APP_TAB_ORDER.indexOf(currentTab);
  if (currentIndex === -1) {
    return { nextTab: null, direction: null };
  }

  // Swiping left (finger moves right -> left, deltaX < 0) advances to next page
  if (deltaX < 0) {
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

export function isSwipeIgnoredTarget(target: {
  tagName?: string;
  isContentEditable?: boolean;
  closestHorizontalScroll?: boolean;
}): boolean {
  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target.closestHorizontalScroll) {
    return true;
  }
  return false;
}
