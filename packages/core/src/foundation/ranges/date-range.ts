import { fromEpochDay, toEpochDay } from "../values/plain-date.js";
import { compare } from "../values/compare.js";
import type { PlainDate } from "../values/types.js";

/** Inclusive on both ends (D9). */
export type DateRange = { start: PlainDate; end: PlainDate };

/** Swap so that `start <= end` (F13 auto-swap). */
export function normalizeDateRange(a: PlainDate, b: PlainDate): DateRange {
  return compare(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

export function isDateInRange(date: PlainDate, range: DateRange): boolean {
  return compare(date, range.start) >= 0 && compare(date, range.end) <= 0;
}

/** Number of days, both ends included. */
export function dateRangeLength(range: DateRange): number {
  return toEpochDay(range.end) - toEpochDay(range.start) + 1;
}

export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
  return compare(a.start, b.end) <= 0 && compare(b.start, a.end) <= 0;
}

/** The shared days of two ranges, or `null`. */
export function intersectDateRanges(
  a: DateRange,
  b: DateRange,
): DateRange | null {
  if (!dateRangesOverlap(a, b)) {
    return null;
  }
  return {
    start: compare(a.start, b.start) >= 0 ? a.start : b.start,
    end: compare(a.end, b.end) <= 0 ? a.end : b.end,
  };
}

/** Pull a date into the range. */
export function clampDate(date: PlainDate, range: DateRange): PlainDate {
  if (compare(date, range.start) < 0) {
    return range.start;
  }
  return compare(date, range.end) > 0 ? range.end : date;
}

/** Every day of the range, in order. */
export function* eachDay(
  range: DateRange,
): Generator<PlainDate, void, undefined> {
  const last = toEpochDay(range.end);
  for (let day = toEpochDay(range.start); day <= last; day += 1) {
    yield fromEpochDay(day);
  }
}
