export const MAX_ITEMS = 4270;

export function validateItems(items) {
  if (!Array.isArray(items)) throw new TypeError('ChileSort needs an array. Chile has borders.');
  if (items.length > MAX_ITEMS) throw new Error('too long for Chile D:');
  if (items.some(item => typeof item !== 'string' || !item.trim() || item.includes(','))) throw new Error('Use nonempty strings without commas.');
  if (items.some(item => [...item].length > 12)) throw new Error('Keep each element to 12 characters or fewer. Narrow country, remember?');
}

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
