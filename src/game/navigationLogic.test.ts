import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_TAB_ORDER,
  isPrivacyPath,
  isSwipeIgnoredTarget,
  resolveHorizontalSwipeDirection,
  resolveSwipeTabChange,
  resolveWheelStepDirection,
  stepHorizontalSelection,
} from './navigationLogic';

test('APP_TAB_ORDER matches BottomNav order', () => {
  assert.deepEqual(APP_TAB_ORDER, ['home', 'puzzle', 'faith', 'trivia']);
});

test('resolveSwipeTabChange switches left and right across tabs smoothly', () => {
  const step1 = resolveSwipeTabChange({
    currentTab: 'home',
    deltaX: -95,
    deltaY: 12,
    durationMs: 220,
  });
  assert.deepEqual(step1, { nextTab: 'puzzle', direction: 'left' });

  const step2 = resolveSwipeTabChange({
    currentTab: 'puzzle',
    deltaX: -110,
    deltaY: -18,
    durationMs: 180,
  });
  assert.deepEqual(step2, { nextTab: 'faith', direction: 'left' });

  const step3 = resolveSwipeTabChange({
    currentTab: 'faith',
    deltaX: -80,
    deltaY: 5,
    durationMs: 240,
  });
  assert.deepEqual(step3, { nextTab: 'trivia', direction: 'left' });

  const back = resolveSwipeTabChange({
    currentTab: 'trivia',
    deltaX: 90,
    deltaY: -10,
    durationMs: 200,
  });
  assert.deepEqual(back, { nextTab: 'faith', direction: 'right' });
});

test('resolveSwipeTabChange ignores edges, vertical scrolling, short taps, and slow drags', () => {
  assert.equal(
    resolveSwipeTabChange({ currentTab: 'home', deltaX: 120, deltaY: 0, durationMs: 200 }).nextTab,
    null
  );
  assert.equal(
    resolveSwipeTabChange({ currentTab: 'trivia', deltaX: -120, deltaY: 0, durationMs: 200 }).nextTab,
    null
  );
  assert.equal(
    resolveSwipeTabChange({ currentTab: 'puzzle', deltaX: -70, deltaY: 90, durationMs: 200 }).nextTab,
    null
  );
  assert.equal(
    resolveSwipeTabChange({ currentTab: 'puzzle', deltaX: -30, deltaY: 0, durationMs: 150 }).nextTab,
    null
  );
  assert.equal(
    resolveSwipeTabChange({ currentTab: 'puzzle', deltaX: -120, deltaY: 0, durationMs: 1200 }).nextTab,
    null
  );
});

test('isSwipeIgnoredTarget skips form fields, horizontal scrollers, and nested switchers', () => {
  assert.equal(isSwipeIgnoredTarget({ tagName: 'input' }), true);
  assert.equal(isSwipeIgnoredTarget({ tagName: 'textarea' }), true);
  assert.equal(isSwipeIgnoredTarget({ isContentEditable: true }), true);
  assert.equal(isSwipeIgnoredTarget({ closestHorizontalScroll: true }), true);
  assert.equal(isSwipeIgnoredTarget({ closestHorizontalSwitcher: true }), true);
  assert.equal(isSwipeIgnoredTarget({ tagName: 'DIV', closestHorizontalScroll: false }), false);
});

test('stepHorizontalSelection navigates across 2+ items cleanly and respects loop option', () => {
  const sizes = [4, 5, 6] as const;
  assert.equal(stepHorizontalSelection(sizes, 4, 1), 5);
  assert.equal(stepHorizontalSelection(sizes, 5, 1), 6);
  assert.equal(stepHorizontalSelection(sizes, 6, 1), null);
  assert.equal(stepHorizontalSelection(sizes, 6, 1, { loop: true }), 4);
  assert.equal(stepHorizontalSelection(sizes, 4, -1), null);
  assert.equal(stepHorizontalSelection(sizes, 4, -1, { loop: true }), 6);
  assert.equal(stepHorizontalSelection(['only'], 'only', 1), null);
});

test('resolveWheelStepDirection triggers only on dominant horizontal or Shift+wheel deltas', () => {
  assert.equal(resolveWheelStepDirection({ deltaX: 32, deltaY: 4 }), 1);
  assert.equal(resolveWheelStepDirection({ deltaX: -28, deltaY: 5 }), -1);
  assert.equal(resolveWheelStepDirection({ deltaX: 10, deltaY: 40 }), 0);
  assert.equal(resolveWheelStepDirection({ deltaX: 0, deltaY: 36, shiftKey: false }), 0);
  assert.equal(resolveWheelStepDirection({ deltaX: 0, deltaY: 36, shiftKey: true }), 1);
  assert.equal(resolveWheelStepDirection({ deltaX: 0, deltaY: -36, shiftKey: true }), -1);
});

test('resolveHorizontalSwipeDirection detects left and right horizontal gestures', () => {
  assert.equal(resolveHorizontalSwipeDirection({ deltaX: -65, deltaY: 8, durationMs: 180 }), 'left');
  assert.equal(resolveHorizontalSwipeDirection({ deltaX: 70, deltaY: -12, durationMs: 220 }), 'right');
  assert.equal(resolveHorizontalSwipeDirection({ deltaX: -25, deltaY: 0, durationMs: 180 }), null);
});

test('isPrivacyPath identifies /privacy and /privacy/ routes cleanly', () => {
  assert.equal(isPrivacyPath('/privacy'), true);
  assert.equal(isPrivacyPath('/privacy/'), true);
  assert.equal(isPrivacyPath('/'), false);
  assert.equal(isPrivacyPath('/about'), false);
});

