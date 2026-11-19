import { compare } from "../values/compare.js";
import { plainDateTime, wallSeconds } from "../values/plain-date-time.js";
import { addDays, fromEpochDay, toEpochDay } from "../values/plain-date.js";
import { plainTime } from "../values/plain-time.js";
import type {
  PlainDate,
  PlainDateTime,
  ZonedDateTime,
} from "../values/types.js";
import { toInstant, toZoned, withTimeZone } from "../values/zoned.js";

/** Half-open `[start, end)` (D9). Both ends are the same kind of value. */
export type Interval<
  T extends PlainDateTime | ZonedDateTime = PlainDateTime | ZonedDateTime,
> = {
  start: T;
  end: T;
};

export type IntervalPiece<T extends PlainDateTime | ZonedDateTime> = {
  date: PlainDate;
  start: T;
  end: T;
  /** The interval started on an earlier day. */
  continuesBefore: boolean;
  /** The interval ends on a later day. */
  continuesAfter: boolean;
};

export function intervalsOverlap<T extends PlainDateTime | ZonedDateTime>(
  a: Interval<T>,
  b: Interval<T>,
): boolean {
  return compare(a.start, b.end) < 0 && compare(b.start, a.end) < 0;
}

/** Length in milliseconds: elapsed time for zoned values, wall-clock for plain ones. */
export function intervalDuration(interval: Interval): number {
  const { start, end } = interval;
  if ("timeZone" in start && "timeZone" in end) {
    return toInstant(end) - toInstant(start);
  }
  return (wallSeconds(end) - wallSeconds(start)) * 1000;
}

function isZoned(value: PlainDateTime | ZonedDateTime): value is ZonedDateTime {
  return "timeZone" in value;
}

/**
 * Split an interval at midnight. Zoned intervals are split at local midnight
 * in `timeZone` (default: the start's zone), so 23 and 25 hour days come out
 * with their real length. Empty or reversed intervals return no pieces.
 */
export function splitIntervalByDay<T extends PlainDateTime | ZonedDateTime>(
  interval: Interval<T>,
  timeZone?: string,
): IntervalPiece<T>[] {
  if (compare(interval.start, interval.end) >= 0) {
    return [];
  }
  const zoned = isZoned(interval.start);
  const zone = zoned
    ? (timeZone ?? (interval.start as ZonedDateTime).timeZone)
    : "";
  const start = (
    zoned ? withTimeZone(interval.start as ZonedDateTime, zone) : interval.start
  ) as PlainDateTime;
  const end = (
    zoned ? withTimeZone(interval.end as ZonedDateTime, zone) : interval.end
  ) as PlainDateTime;

  const dayStart = (date: PlainDate): PlainDateTime | ZonedDateTime => {
    const wall = plainDateTime(date, plainTime(0, 0, 0));
    return zoned ? toZoned(wall, zone) : wall;
  };

  const firstDay = toEpochDay(start);
  const endsAtMidnight = end.hour === 0 && end.minute === 0 && end.second === 0;
  const lastDay = toEpochDay(end) - (endsAtMidnight ? 1 : 0);
  const pieces: IntervalPiece<T>[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    const date = fromEpochDay(day);
    const begin = day === firstDay ? interval.start : (dayStart(date) as T);
    const finish =
      day === lastDay ? interval.end : (dayStart(addDays(date, 1)) as T);
    pieces.push({
      date,
      start: begin,
      end: finish,
      continuesBefore: day > firstDay,
      continuesAfter: day < lastDay,
    });
  }
  return pieces;
}
