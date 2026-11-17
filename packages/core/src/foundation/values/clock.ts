import { fromInstant } from "./zoned.js";
import { plainDate } from "./plain-date.js";
import type { PlainDate, ZonedDateTime } from "./types.js";

/**
 * The only place in `values/` that reads the clock, and only when `now` is not
 * passed (D10). Pass the same `now` on server and client to avoid hydration
 * mismatches.
 */
function resolveNow(now: number | undefined): number {
  return now ?? Date.now();
}

function hostTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Today's date in `timeZone` (default: the runtime's zone). */
export function today(timeZone?: string, now?: number): PlainDate {
  const zoned = fromInstant(resolveNow(now), timeZone ?? hostTimeZone());
  return plainDate(zoned.year, zoned.month, zoned.day);
}

export function nowZoned(timeZone: string, now?: number): ZonedDateTime {
  return fromInstant(resolveNow(now), timeZone);
}
