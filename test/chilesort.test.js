import test from 'node:test';
import assert from 'node:assert/strict';
import { chileSort, validateItems } from '../dist/chilesort.js';

test('everything goes south, preserving identity, duplicates and input order', () => {
  const duck = { name: 'duck' };
  const input = Object.freeze([duck, '🍕', 8, 3, 8, null]);
  const result = chileSort(input);
  assert.ok(result.every(row => row.length === 1));
  assert.deepEqual(result.flat(), input);
  assert.equal(result[0][0], duck);
  assert.notEqual(result[2], result[4]);
});
test('empty Chile and a single resident work', () => {
  assert.deepEqual(chileSort([]), []);
  assert.deepEqual(chileSort(['☕']), [['☕']]);
});
test('rejects non-array inputs', () => {
  for (const value of [null, undefined, 'Chile', 42, {}]) assert.throws(() => chileSort(value), TypeError);
});

test('accepts 4270 elements and rejects larger inputs with the exact message', () => {
  assert.doesNotThrow(() => validateItems(Array.from({ length: 4270 }, (_, i) => String(i + 1))));
  for (const count of [4271, 5000]) {
    assert.throws(() => validateItems(Array(count).fill('x')), { message: 'too long for Chile D:' });
  }
  assert.throws(() => validateItems(Array(4271).fill('a'.repeat(13))), { message: 'too long for Chile D:' });
  assert.doesNotThrow(() => validateItems([]));
  assert.doesNotThrow(() => validateItems(['valid again']));
});

test('validates text elements and counts Unicode characters', () => {
  assert.doesNotThrow(() => validateItems(['🦆'.repeat(12)]));
  assert.throws(() => validateItems(['🦆'.repeat(13)]), /12 characters/);
  for (const value of [null, [''], [' '], ['a,b'], [42]]) assert.throws(() => validateItems(value));
});
