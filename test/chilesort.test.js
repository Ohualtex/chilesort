import test from 'node:test';
import assert from 'node:assert/strict';
import { chileSort } from '../dist/chilesort.js';

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
