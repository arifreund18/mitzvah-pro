/** Swap an item one position up or down. Returns the same array reference if the move is a no-op. */
export function moveArrayItem<T>(
  items: T[],
  index: number,
  direction: 'up' | 'down',
): T[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items
  }
  const next = items.slice()
  const tmp = next[index]!
  next[index] = next[target]!
  next[target] = tmp
  return next
}
