/**
 * The view id one zoom step away (plan 10 R8): `-1` = finer (`zoomIn`), `1` =
 * coarser (`zoomOut`). `undefined` at the ends or when `current` is not a level.
 */
export function zoomTarget(
  levels: readonly string[],
  current: string,
  direction: -1 | 1,
): string | undefined {
  const index = levels.indexOf(current);
  if (index < 0) {
    return undefined;
  }
  return levels[index + direction];
}
