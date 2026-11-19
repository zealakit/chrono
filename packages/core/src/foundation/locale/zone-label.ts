import { getFormatter } from "./resolve.js";

/**
 * A readable name for a display zone ("Vietnam Time"), for the time-zone label
 * (plan 08 X11). Falls back from `shortGeneric` to `long`, `short` and the zone
 * id itself; never throws.
 */
export function getTimeZoneLabel(
  timeZone: string,
  locale?: string,
  at: number = 0,
): string {
  for (const style of ["shortGeneric", "long", "short"] as const) {
    try {
      const part = getFormatter(locale, {
        timeZone,
        timeZoneName: style,
      })
        .formatToParts(at)
        .find((item) => item.type === "timeZoneName")?.value;
      if (part) return part;
    } catch {
      // Try the next style.
    }
  }
  return timeZone;
}
