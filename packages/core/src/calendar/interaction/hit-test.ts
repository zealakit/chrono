/** Pointer → cell hit testing (plan 05 E17): by element, never by geometry. */

export type HitPoint = { x: number; y: number };
export type HitTarget = {
  cellKey: string;
  /** The element is a time-grid all-day-row cell (`data-all-day-cell`). */
  allDay?: boolean;
};

/**
 * The default hit test: `document.elementFromPoint` plus the nearest
 * `[data-chrono-key]`. Works with any CSS, transform, zoom and RTL.
 */
export function elementHitTest(point: HitPoint): HitTarget | null {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.elementFromPoint(point.x, point.y);
  const cell = element?.closest?.("[data-chrono-key]");
  const key = cell?.getAttribute("data-chrono-key");
  return key
    ? {
        cellKey: key,
        ...(cell?.hasAttribute("data-all-day-cell") ? { allDay: true } : {}),
      }
    : null;
}
