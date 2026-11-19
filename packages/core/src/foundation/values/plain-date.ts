import {
  civilFromDays,
  daysFromCivil,
  daysInMonth,
  daysInYear,
  isLeapYear,
  MAX_YEAR,
  MIN_YEAR,
} from "./epoch-day.js";
import type { DayOfWeek, Overflow, PlainDate } from "./types.js";

export { daysInMonth, daysInYear, isLeapYear };

export function isValidDate(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/**
 * Create a frozen {@link PlainDate}. Invalid input throws a `RangeError`, or
 * is clamped into the month with `overflow: "constrain"`.
 */
export function plainDate(
  year: number,
  month: number,
  day: number,
  options: { overflow?: Overflow } = {},
): PlainDate {
  if (options.overflow === "constrain") {
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      year >= MIN_YEAR &&
      year <= MAX_YEAR &&
      month >= 1 &&
      month <= 12
    ) {
      return Object.freeze({
        calendar: "gregory",
        year,
        month,
        day: Math.min(Math.max(day, 1), daysInMonth(year, month)),
      });
    }
  }
  if (!isValidDate(year, month, day)) {
    throw new RangeError(
      `Invalid date ${year}-${month}-${day}: year must be ${MIN_YEAR}-${MAX_YEAR}, month 1-12 and day within the month.`,
    );
  }
  return Object.freeze({ calendar: "gregory", year, month, day });
}

export function toEpochDay(
  date: Pick<PlainDate, "year" | "month" | "day">,
): number {
  return daysFromCivil(date.year, date.month, date.day);
}

export function fromEpochDay(epochDay: number): PlainDate {
  const [year, month, day] = civilFromDays(epochDay);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(
      `Date out of range: year ${year} is outside ${MIN_YEAR}-${MAX_YEAR}.`,
    );
  }
  return Object.freeze({ calendar: "gregory", year, month, day });
}

/** 1 = Monday ... 7 = Sunday. */
export function dayOfWeek(
  date: Pick<PlainDate, "year" | "month" | "day">,
): DayOfWeek {
  return dayOfWeekFromEpochDay(toEpochDay(date));
}

export function dayOfWeekFromEpochDay(epochDay: number): DayOfWeek {
  // 1970-01-01 was a Thursday (4).
  return (((((epochDay + 3) % 7) + 7) % 7) + 1) as DayOfWeek;
}

export function dayOfYear(date: PlainDate): number {
  return toEpochDay(date) - daysFromCivil(date.year, 1, 1) + 1;
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return fromEpochDay(toEpochDay(date) + days);
}

export function addWeeks(date: PlainDate, weeks: number): PlainDate {
  return addDays(date, weeks * 7);
}

export function addMonths(
  date: PlainDate,
  months: number,
  options: { overflow?: Overflow } = {},
): PlainDate {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Date out of range: year ${year}.`);
  }
  const limit = daysInMonth(year, month);
  if (date.day > limit && options.overflow === "reject") {
    throw new RangeError(
      `${year}-${month}-${date.day} does not exist (overflow: "reject").`,
    );
  }
  return plainDate(year, month, Math.min(date.day, limit));
}

export function addYears(
  date: PlainDate,
  years: number,
  options: { overflow?: Overflow } = {},
): PlainDate {
  return addMonths(date, years * 12, options);
}

/** `a - b` in whole days. */
export function diffDays(a: PlainDate, b: PlainDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function startOfWeek(
  date: PlainDate,
  weekStartsOn: DayOfWeek,
): PlainDate {
  const offset = (dayOfWeek(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function endOfWeek(date: PlainDate, weekStartsOn: DayOfWeek): PlainDate {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

export function startOfMonth(date: PlainDate): PlainDate {
  return plainDate(date.year, date.month, 1);
}

export function endOfMonth(date: PlainDate): PlainDate {
  return plainDate(date.year, date.month, daysInMonth(date.year, date.month));
}

export function startOfYear(date: PlainDate): PlainDate {
  return plainDate(date.year, 1, 1);
}

export function endOfYear(date: PlainDate): PlainDate {
  return plainDate(date.year, 12, 31);
}
