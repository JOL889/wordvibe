import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_TAB_ORDER,
  isSwipeIgnoredTarget,
  resolveSwipeTabChange,
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

test('isSwipeIgnoredTarget skips form fields and horizontal scrollers', () => {
  assert.equal(isSwipeIgnoredTarget({ tagName: 'input' }), true);
  assert.equal(isSwipeIgnoredTarget({ tagName: 'textarea' }), true);
  assert.equal(isSwipeIgnoredTarget({ isContentEditable: true }), true);
  assert.equal(isSwipeIgnoredTarget({ closestHorizontalScroll: true }), true);
  assert.equal(isSwipeIgnoredTarget({ tagName: 'DIV', closestHorizontalScroll: false }), false);
});
