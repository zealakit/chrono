import type { ResourceWindowInfo, WindowRange } from "./types.js";

/** Clamp a half-open `[start, end)` window to `total` items (plan 10 R14). */
export function clampWindow(
  total: number,
  window: WindowRange | undefined,
): { start: number; end: number } {
  if (!window) {
    return { start: 0, end: total };
  }
  const start = Math.max(0, Math.min(total, Math.floor(window.start)));
  const end = Math.max(start, Math.min(total, Math.floor(window.end)));
  return { start, end };
}

export function windowInfo(
  totalRows: number,
  totalColumns: number,
  rows: { start: number },
  columns: { start: number },
): ResourceWindowInfo {
  return {
    totalRows,
    totalColumns,
    rowOffset: rows.start,
    columnOffset: columns.start,
  };
}
