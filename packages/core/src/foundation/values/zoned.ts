import {
  civilFromDays,
  daysFromCivil,
  floorDiv,
  MAX_YEAR,
  MIN_YEAR,
} from "./epoch-day.js";
import { plainDateTime, wallSeconds } from "./plain-date-time.js";
import { fromSecondOfDay } from "./plain-time.js";
import { fromEpochDay, plainDate } from "./plain-date.js";
import type { Disambiguation, PlainDateTime, ZonedDateTime } from "./types.js";

const DAY_SECONDS = 86400;
const OFFSET_ID = /^([+-])(\d{2}):?(\d{2})$/;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Minutes east of UTC for a fixed-offset id such as `+05:30`, else `null`. */
export function parseOffsetId(id: string): number | null {
  const match = OFFSET_ID.exec(id);
  if (!match) {
    return null;
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar: "gregory",
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** `true` for an IANA zone id the runtime knows, or a fixed offset such as `+05:30`. */
export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string" || timeZone === "") {
    return false;
  }
  if (parseOffsetId(timeZone) !== null) {
    return true;
  }
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

function assertTimeZone(timeZone: string): void {
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`Unknown time zone "${timeZone}".`);
  }
}

/**
 * Offset of `timeZone` at an instant, in minutes east of UTC. Historical
 * offsets with seconds (pre-1900 local mean time) are rounded to the minute.
 */
export function getOffset(epochMs: number, timeZone: string): number {
  const fixed = parseOffsetId(timeZone);
  if (fixed !== null) {
    return fixed;
  }
  assertTimeZone(timeZone);
  const values: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(epochMs)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }
  const days = daysFromCivil(
    values.year ?? 1970,
    values.month ?? 1,
    values.day ?? 1,
  );
  const wall =
    days * DAY_SECONDS +
    ((values.hour ?? 0) % 24) * 3600 +
    (values.minute ?? 0) * 60 +
    (values.second ?? 0);
  return Math.round((wall - Math.floor(epochMs / 1000)) / 60);
}

function build(
  dateTime: PlainDateTime,
  timeZone: string,
  offset: number,
): ZonedDateTime {
  return Object.freeze({
    calendar: "gregory",
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: dateTime.hour,
    minute: dateTime.minute,
    second: dateTime.second,
    timeZone,
    offset,
  });
}

/** The instant (epoch milliseconds) a zoned value points at. */
export function toInstant(zoned: ZonedDateTime): number {
  return (wallSeconds(zoned) - zoned.offset * 60) * 1000;
}

export function fromInstant(epochMs: number, timeZone: string): ZonedDateTime {
  const offset = getOffset(epochMs, timeZone);
  const wall = Math.floor(epochMs / 1000) + offset * 60;
  const days = floorDiv(wall, DAY_SECONDS);
  const [year] = civilFromDays(days);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Date out of range: year ${year}.`);
  }
  const date = fromEpochDay(days);
  const time = fromSecondOfDay(wall - days * DAY_SECONDS);
  return build(plainDateTime(date, time), timeZone, offset);
}

/** Pin a wall time to a zone. DST gaps and overlaps follow `disambiguation` (D8). */
export function toZoned(
  dateTime: PlainDateTime,
  timeZone: string,
  disambiguation: Disambiguation = "compatible",
): ZonedDateTime {
  assertTimeZone(timeZone);
  // Validates the fields as a side effect.
  plainDate(dateTime.year, dateTime.month, dateTime.day);
  const fixed = parseOffsetId(timeZone);
  if (fixed !== null) {
    return build(dateTime, timeZone, fixed);
  }

  const wall = wallSeconds(dateTime);
  const before = getOffset((wall - DAY_SECONDS) * 1000, timeZone);
  const after = getOffset((wall + DAY_SECONDS) * 1000, timeZone);
  const candidates = before === after ? [before] : [before, after];
  const valid = candidates.filter(
    (offset) => getOffset((wall - offset * 60) * 1000, timeZone) === offset,
  );

  let offset: number;
  if (valid.length === 1) {
    offset = valid[0] as number;
  } else if (valid.length === 2) {
    if (disambiguation === "reject") {
      throw new RangeError(
        `${dateTime.year}-${dateTime.month}-${dateTime.day} ${dateTime.hour}:${dateTime.minute} is ambiguous in ${timeZone}.`,
      );
    }
    // Larger offset = earlier instant.
    offset =
      disambiguation === "later"
        ? Math.min(before, after)
        : Math.max(before, after);
  } else {
    if (disambiguation === "reject") {
      throw new RangeError(
        `${dateTime.year}-${dateTime.month}-${dateTime.day} ${dateTime.hour}:${dateTime.minute} does not exist in ${timeZone} (DST gap).`,
      );
    }
    // In a gap the offset grows. Using the old offset moves forward, the new one backward.
    offset = disambiguation === "earlier" ? after : before;
  }
  return fromInstant((wall - offset * 60) * 1000, timeZone);
}

export function withTimeZone(
  zoned: ZonedDateTime,
  timeZone: string,
): ZonedDateTime {
  return fromInstant(toInstant(zoned), timeZone);
}
