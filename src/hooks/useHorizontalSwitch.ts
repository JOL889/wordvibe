import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  isSwipeIgnoredTarget,
  resolveHorizontalSwipeDirection,
  resolveWheelStepDirection,
  stepHorizontalSelection,
} from '../game/navigationLogic';

export interface UseHorizontalSwitchOptions<T> {
  items: readonly T[];
  activeItem: T;
  onChange: (nextItem: T) => void;
  disabled?: boolean;
  loop?: boolean;
  minSwipePx?: number;
  wheelCooldownMs?: number;
}

/**
 * Enables horizontal switching between 2+ items using touch swipe, mouse/pen horizontal drag,
 * or horizontal trackpad/Shift+wheel scrolling. Stops nested propagation so inner switchers
 * never accidentally trigger parent tab swipes.
 */
export function useHorizontalSwitch<T>({
  items,
  activeItem,
  onChange,
  disabled = false,
  loop = false,
  minSwipePx = 42,
  wheelCooldownMs = 340,
}: UseHorizontalSwitchOptions<T>) {
  const itemsRef = useRef(items);
  const activeItemRef = useRef(activeItem);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);

  itemsRef.current = items;
  activeItemRef.current = activeItem;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(
    null
  );
  const lastWheelAtRef = useRef(0);
  const suppressNextClickUntilRef = useRef(0);

  const commitStep = useCallback(
    (delta: -1 | 1): boolean => {
      if (disabledRef.current) return false;
      const next = stepHorizontalSelection(itemsRef.current, activeItemRef.current, delta, { loop });
      if (next === null) return false;
      onChangeRef.current(next);
      return true;
    },
    [loop]
  );

  const shouldIgnore = (target: EventTarget | null, currentTarget: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    // Ignore nested inner horizontal switchers/scrollers inside this container
    const innerSwitcher = el.closest('[data-horizontal-switcher="true"], [data-no-swipe="true"]');
    const isInnerSwitcher = Boolean(innerSwitcher && innerSwitcher !== currentTarget);
    const scrollAncestor = el.closest('.overflow-x-auto');
    const isInnerHorizontalScroll = Boolean(
      scrollAncestor &&
        scrollAncestor !== currentTarget &&
        scrollAncestor.scrollWidth > scrollAncestor.clientWidth + 4
    );

    return isSwipeIgnoredTarget({
      tagName: el.tagName,
      isContentEditable: el.isContentEditable,
      closestHorizontalScroll: isInnerHorizontalScroll,
      closestHorizontalSwitcher: isInnerSwitcher,
    });
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (disabledRef.current || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    if (shouldIgnore(e.target, e.currentTarget)) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || disabledRef.current || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const dir = resolveHorizontalSwipeDirection({
        deltaX: touch.clientX - start.x,
        deltaY: touch.clientY - start.y,
        durationMs: Date.now() - start.time,
        minSwipePx,
      });
      if (!dir) return;
      e.stopPropagation();
      commitStep(dir === 'left' ? 1 : -1);
    },
    [commitStep, minSwipePx]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (disabledRef.current || e.pointerType === 'touch' || e.button !== 0) {
      pointerStartRef.current = null;
      return;
    }
    if (shouldIgnore(e.target, e.currentTarget)) {
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start || e.pointerId !== start.pointerId || disabledRef.current) return;
      const dir = resolveHorizontalSwipeDirection({
        deltaX: e.clientX - start.x,
        deltaY: e.clientY - start.y,
        durationMs: Date.now() - start.time,
        minSwipePx,
      });
      if (!dir) return;
      suppressNextClickUntilRef.current = Date.now() + 260;
      e.stopPropagation();
      commitStep(dir === 'left' ? 1 : -1);
    },
    [commitStep, minSwipePx]
  );

  const handleClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (Date.now() < suppressNextClickUntilRef.current) {
      suppressNextClickUntilRef.current = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      if (disabledRef.current) return;
      if (shouldIgnore(e.target, e.currentTarget)) return;

      const el = e.currentTarget;
      const canNativeScrollX = el.scrollWidth > el.clientWidth + 6;
      const wheelStep = resolveWheelStepDirection({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        shiftKey: e.shiftKey,
      });
      if (!wheelStep) return;

      if (canNativeScrollX) {
        const atLeft = el.scrollLeft <= 2;
        const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        if ((wheelStep < 0 && !atLeft) || (wheelStep > 0 && !atRight)) {
          return;
        }
      }

      const now = Date.now();
      if (now - lastWheelAtRef.current < wheelCooldownMs) {
        e.stopPropagation();
        return;
      }
      if (commitStep(wheelStep)) {
        lastWheelAtRef.current = now;
        e.stopPropagation();
      }
    },
    [commitStep, wheelCooldownMs]
  );

  return {
    containerProps: {
      'data-horizontal-switcher': 'true' as const,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onClickCapture: handleClickCapture,
      onWheel: handleWheel,
    },
  };
}

/**
 * Automatically centers the currently active item inside a horizontally scrollable strip.
 */
export function useScrollSelectedIntoView(
  containerRef: RefObject<HTMLElement | null>,
  activeSelector: string,
  deps: readonly unknown[]
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(activeSelector);
    if (!activeEl) return;
    if (container.scrollWidth <= container.clientWidth + 2) return;
    const targetLeft =
      activeEl.offsetLeft - container.clientWidth / 2 + activeEl.offsetWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
