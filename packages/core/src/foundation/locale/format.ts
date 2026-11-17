import { toEpochDay } from "../values/plain-date.js";
import { toSecondOfDay } from "../values/plain-time.js";
import type { PlainDate, PlainDateTime, PlainTime } from "../values/types.js";
import { wallSeconds } from "../values/plain-date-time.js";
import { getFormatter } from "./resolve.js";

/** Intl options minus the two the library controls (UTC wall time, Gregorian). */
export type FormatOptions = Omit<
  Intl.DateTimeFormatOptions,
  "timeZone" | "calendar"
>;

const DAY_MS = 86400000;
const DATE_DEFAULT: FormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
};
const TIME_DEFAULT: FormatOptions = { hour: "numeric", minute: "2-digit" };
const DATE_TIME_DEFAULT: FormatOptions = { ...DATE_DEFAULT, ...TIME_DEFAULT };

function utc(options: FormatOptions): Intl.DateTimeFormatOptions {
  return { ...options, timeZone: "UTC" };
}

/** Plain values are formatted as UTC, so the host zone never shifts them. */
export function formatDate(
  date: PlainDate,
  locale?: string,
  options: FormatOptions = DATE_DEFAULT,
): string {
  return getFormatter(locale, utc(options)).format(toEpochDay(date) * DAY_MS);
}

export function formatTime(
  time: PlainTime,
  locale?: string,
  options: FormatOptions = TIME_DEFAULT,
): string {
  return getFormatter(locale, utc(options)).format(toSecondOfDay(time) * 1000);
}

export function formatDateTime(
  value: PlainDateTime,
  locale?: string,
  options: FormatOptions = DATE_TIME_DEFAULT,
): string {
  return getFormatter(locale, utc(options)).format(wallSeconds(value) * 1000);
}

export function formatDateRange(
  range: { start: PlainDate; end: PlainDate },
  locale?: string,
  options: FormatOptions = DATE_DEFAULT,
): string {
  return getFormatter(locale, utc(options)).formatRange(
    toEpochDay(range.start) * DAY_MS,
    toEpochDay(range.end) * DAY_MS,
  );
}

export type DatePartName = "day" | "month" | "year";

export type DatePartOrder = {
  order: readonly DatePartName[];
  /** Text between the first and second part, and between the second and third. */
  separators: readonly [string, string];
  /** Text before the first part and after the last part (for example the trailing "." in ko-KR). */
  prefix: string;
  suffix: string;
};

/** Order and separators of a numeric date, for segmented inputs and placeholders. */
export function getDatePartOrder(locale?: string): DatePartOrder {
  const parts = getFormatter(
    locale,
    utc({ year: "numeric", month: "numeric", day: "numeric" }),
  ).formatToParts(toEpochDay(plainDateTimeSample()) * DAY_MS);
  const order: DatePartName[] = [];
  const literals: string[] = [];
  let prefix = "";
  let pending = "";
  for (const part of parts) {
    if (part.type === "literal") {
      pending += part.value;
    } else if (
      part.type === "day" ||
      part.type === "month" ||
      part.type === "year"
    ) {
      if (order.length === 0) {
        prefix = pending;
      } else {
        literals.push(pending);
      }
      pending = "";
      order.push(part.type);
    }
  }
  return {
    order,
    separators: [literals[0] ?? "", literals[1] ?? ""],
    prefix,
    suffix: pending,
  };
}

function plainDateTimeSample(): PlainDate {
  return { calendar: "gregory", year: 2033, month: 11, day: 22 };
}
