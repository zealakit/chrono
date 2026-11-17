import { toEpochDay } from "./plain-date.js";
import { wallSeconds } from "./plain-date-time.js";
import { toSecondOfDay } from "./plain-time.js";
import type {
  PlainDate,
  PlainDateTime,
  PlainTime,
  ZonedDateTime,
} from "./types.js";

export type Comparable = PlainDate | PlainTime | PlainDateTime | ZonedDateTime;

function sign(n: number): -1 | 0 | 1 {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * Compare two values of the same type: -1, 0 or 1. Zoned values compare by
 * instant, plain date-times by wall time. A date-time compared with a date
 * compares the date only.
 */
export function compare<T extends Comparable>(a: T, b: T): -1 | 0 | 1 {
  const x = a as Partial<ZonedDateTime>;
  const y = b as Partial<ZonedDateTime>;
  if (x.timeZone !== undefined && y.timeZone !== undefined) {
    return sign(
      wallSeconds(a as ZonedDateTime) -
        (x.offset as number) * 60 -
        (wallSeconds(b as ZonedDateTime) - (y.offset as number) * 60),
    );
  }
  const aDate = x.year !== undefined;
  const bDate = y.year !== undefined;
  const aTime = x.hour !== undefined;
  const bTime = y.hour !== undefined;
  if (aDate && bDate) {
    if (aTime && bTime) {
      return sign(
        wallSeconds(a as PlainDateTime) - wallSeconds(b as PlainDateTime),
      );
    }
    return sign(toEpochDay(a as PlainDate) - toEpochDay(b as PlainDate));
  }
  if (aTime && bTime) {
    return sign(toSecondOfDay(a as PlainTime) - toSecondOfDay(b as PlainTime));
  }
  throw new TypeError("compare() needs two values of the same type.");
}

export function isSameDay(a: PlainDate, b: PlainDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function isSameMonth(
  a: Pick<PlainDate, "year" | "month">,
  b: Pick<PlainDate, "year" | "month">,
): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isSameYear(
  a: Pick<PlainDate, "year">,
  b: Pick<PlainDate, "year">,
): boolean {
  return a.year === b.year;
}

export function isSameTime(a: PlainTime, b: PlainTime): boolean {
  return a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

export function isBefore<T extends Comparable>(a: T, b: T): boolean {
  return compare(a, b) < 0;
}

export function isAfter<T extends Comparable>(a: T, b: T): boolean {
  return compare(a, b) > 0;
}

export function minValue<T extends Comparable>(first: T, ...rest: T[]): T {
  let result = first;
  for (const value of rest) {
    if (compare(value, result) < 0) {
      result = value;
    }
  }
  return result;
}

export function maxValue<T extends Comparable>(first: T, ...rest: T[]): T {
  let result = first;
  for (const value of rest) {
    if (compare(value, result) > 0) {
      result = value;
    }
  }
  return result;
}
