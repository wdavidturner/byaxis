/**
 * Keep item layers contiguous so UI positions always run from back (1) to front.
 *
 * @template {{ z: number }} T
 * @param {T[]} items
 * @returns {T[]}
 */
export function normalizeLayers(items) {
  return [...items]
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((item, index) => ({ ...item, z: index + 1 }));
}

/**
 * Move one item to a 1-based layer position without mutating the input array.
 *
 * @template {{ id: string, z: number }} T
 * @param {T[]} items
 * @param {string} id
 * @param {number} requestedPosition
 * @returns {T[]}
 */
export function moveItemToLayer(items, id, requestedPosition) {
  const ordered = normalizeLayers(items);
  const currentIndex = ordered.findIndex((item) => item.id === id);
  if (currentIndex < 0) return ordered;

  const [moving] = ordered.splice(currentIndex, 1);
  const targetIndex = Math.max(0, Math.min(ordered.length, requestedPosition - 1));
  ordered.splice(targetIndex, 0, moving);

  return ordered.map((item, index) => ({ ...item, z: index + 1 }));
}
