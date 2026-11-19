/** Pointer → cell hit testing (plan 05 E17): by element, never by geometry. */

export type HitPoint = { x: number; y: number };
export type HitTarget = {
  cellKey: string;
  /** The element is a time-grid all-day-row cell (`data-all-day-cell`). */
  allDay?: boolean;
};

/**
 * The default hit test: the nearest `[data-chrono-key]` among the elements under
 * the point (`document.elementsFromPoint`, so an event or column overlay drawn
 * above the slots does not hide the cell below it). Works with any CSS,
 * transform, zoom and RTL.
 */
export function elementHitTest(point: HitPoint): HitTarget | null {
  if (typeof document === "undefined") {
    return null;
  }
  const stack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(point.x, point.y)
      : [document.elementFromPoint(point.x, point.y)];
  for (const element of stack) {
    const cell = element?.closest?.("[data-chrono-key]");
    const key = cell?.getAttribute("data-chrono-key");
    if (key) {
      return {
        cellKey: key,
        ...(cell?.hasAttribute("data-all-day-cell") ? { allDay: true } : {}),
      };
    }
  }
  return null;
}
