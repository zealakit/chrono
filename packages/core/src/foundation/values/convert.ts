import { parseIsoDate, parseIsoTime } from "./iso.js";
import { plainDateTime } from "./plain-date-time.js";
import { plainDate } from "./plain-date.js";
import { plainTime } from "./plain-time.js";
import type {
  DateInput,
  PlainDate,
  PlainDateTime,
  PlainTime,
  TimeInput,
  ZonedDateTime,
} from "./types.js";
import { fromInstant, toInstant, toZoned } from "./zoned.js";

/**
 * A `Date` as a zoned value. `timeZone` defaults to `"UTC"`, never the host
 * zone, so results do not depend on where the code runs.
 */
export function fromDate(date: Date, timeZone = "UTC"): ZonedDateTime {
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    throw new RangeError("Invalid Date.");
  }
  return fromInstant(ms, timeZone);
}

/**
 * A value as a `Date`. A zoned value keeps its instant; a plain date or
 * date-time is read as wall time in `timeZone` (default `"UTC"`).
 */
export function toDate(
  value: PlainDate | PlainDateTime | ZonedDateTime,
  timeZone = "UTC",
): Date {
  const v = value as Partial<ZonedDateTime>;
  if (v.timeZone !== undefined) {
    return new Date(toInstant(value as ZonedDateTime));
  }
  const dateTime = plainDateTime(
    value,
    plainTime(v.hour ?? 0, v.minute ?? 0, v.second ?? 0),
  );
  return new Date(toInstant(toZoned(dateTime, timeZone)));
}

export function toPlainDate(input: DateInput, timeZone = "UTC"): PlainDate {
  if (typeof input === "string") {
    return parseIsoDate(input);
  }
  if (input instanceof Date) {
    const zoned = fromDate(input, timeZone);
    return plainDate(zoned.year, zoned.month, zoned.day);
  }
  return plainDate(input.year, input.month, input.day);
}

export function toPlainTime(input: TimeInput): PlainTime {
  if (typeof input === "string") {
    return parseIsoTime(input);
  }
  return plainTime(input.hour, input.minute, input.second);
}

type TemporalLike = {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  calendarId?: string;
  timeZoneId?: string;
  timeZone?: string;
  offsetNanoseconds?: number;
  offset?: number | string;
};

/**
 * Duck-type a Temporal-like object (`PlainDate`, `PlainTime`, `PlainDateTime`
 * or `ZonedDateTime`) without importing Temporal. Returns the matching Chrono
 * value.
 */
export function fromTemporalLike(
  object: object,
): PlainDate | PlainTime | PlainDateTime | ZonedDateTime {
  const t = object as TemporalLike;
  if (
    t.calendarId !== undefined &&
    t.calendarId !== "iso8601" &&
    t.calendarId !== "gregory"
  ) {
    throw new RangeError(`Calendar "${t.calendarId}" is not supported.`);
  }
  const hasDate =
    t.year !== undefined && t.month !== undefined && t.day !== undefined;
  const hasTime = t.hour !== undefined && t.minute !== undefined;
  if (!hasDate && !hasTime) {
    throw new TypeError("Not a Temporal-like date or time object.");
  }
  const time = hasTime
    ? plainTime(t.hour as number, t.minute as number, t.second ?? 0)
    : undefined;
  if (!hasDate) {
    return time as PlainTime;
  }
  const date = plainDate(t.year as number, t.month as number, t.day as number);
  if (!time) {
    return date;
  }
  const dateTime = plainDateTime(date, time);
  const zone =
    t.timeZoneId ?? (typeof t.timeZone === "string" ? t.timeZone : undefined);
  if (zone === undefined) {
    return dateTime;
  }
  const offset =
    typeof t.offsetNanoseconds === "number"
      ? Math.round(t.offsetNanoseconds / 60_000_000_000)
      : typeof t.offset === "number"
        ? t.offset
        : toZoned(dateTime, zone).offset;
  return Object.freeze({ ...dateTime, timeZone: zone, offset });
}
