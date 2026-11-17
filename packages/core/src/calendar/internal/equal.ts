/** Structural equality for plain data snapshots (no functions, no cycles). */
export const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
