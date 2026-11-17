import { SECONDS_PER_DAY, plainTime, toSecondOfDay } from "./plain-time.js";
import { plainDate, toEpochDay } from "./plain-date.js";
import type { PlainDate, PlainDateTime, PlainTime } from "./types.js";

export function plainDateTime(date: PlainDate, time: PlainTime): PlainDateTime {
  return Object.freeze({
    calendar: "gregory",
    year: date.year,
    month: date.month,
    day: date.day,
    hour: time.hour,
    minute: time.minute,
    second: time.second,
  });
}

/** The date part of any value that has one. */
export function datePart(value: PlainDate): PlainDate {
  return plainDate(value.year, value.month, value.day);
}

/** The time part of any value that has one. */
export function timePart(value: PlainTime): PlainTime {
  return plainTime(value.hour, value.minute, value.second);
}

/** Wall-clock seconds since 1970-01-01T00:00:00 as if the wall time were UTC. */
export function wallSeconds(value: PlainDateTime): number {
  return toEpochDay(value) * SECONDS_PER_DAY + toSecondOfDay(value);
}
