/**
 * No comparisons. No reordering. Just geography.
 * Each element gets its own row, preserving the input and its order.
 * @template T
 * @param {T[]} items
 * @returns {T[][]} A very narrow, very long array.
 */
export function chileSort(items) {
  if (!Array.isArray(items)) throw new TypeError('ChileSort needs an array. Chile has borders.');
  return items.map(item => [item]);
}
