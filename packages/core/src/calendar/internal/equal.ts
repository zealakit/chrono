/** Structural equality for plain data snapshots (no functions, no cycles). */
export const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * State comparison (plan 05 R1). `events`, `more` and `allDayRow` hold the
 * app's event objects (possibly cyclic, large or with `Date`s), so they are
 * compared by reference — the controller memoizes layout results so unchanged
 * inputs return the same arrays. Everything else is JSON-safe and compared
 * structurally.
 */
const REFERENCE_FIELDS = [
  "events",
  "more",
  "allDayRow",
  "drag",
  "pending",
  "resources",
] as const;

export function statesEqual(prev: unknown, next: unknown): boolean {
  if (prev === next) {
    return true;
  }
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  for (const key of REFERENCE_FIELDS) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  const restA: Record<string, unknown> = {};
  const restB: Record<string, unknown> = {};
  for (const key of Object.keys(a)) {
    if (!REFERENCE_FIELDS.includes(key as (typeof REFERENCE_FIELDS)[number])) {
      restA[key] = a[key];
    }
  }
  for (const key of Object.keys(b)) {
    if (!REFERENCE_FIELDS.includes(key as (typeof REFERENCE_FIELDS)[number])) {
      restB[key] = b[key];
    }
  }
  return JSON.stringify(restA) === JSON.stringify(restB);
}
