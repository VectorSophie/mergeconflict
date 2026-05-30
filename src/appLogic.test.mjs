import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSwipe, createChatGate } from './appLogic.mjs';

test('right swipe matches repos at or above 70 compatibility', () => {
  assert.deepEqual(resolveSwipe({ compatibility: 70 }, 'right'), {
    kind: 'match',
    reason: 'compatibility'
  });
});

test('right swipe below 70 saves interest without a match', () => {
  assert.deepEqual(resolveSwipe({ compatibility: 69 }, 'right'), {
    kind: 'interested',
    reason: 'below-threshold'
  });
});

test('super like always creates a match', () => {
  assert.deepEqual(resolveSwipe({ compatibility: 12 }, 'up'), {
    kind: 'match',
    reason: 'super-like'
  });
});

test('free chat gate locks after three repo chats', () => {
  const gate = createChatGate(3, false);
  assert.equal(gate.canOpenChat(), false);
  assert.equal(gate.remaining, 0);
});
