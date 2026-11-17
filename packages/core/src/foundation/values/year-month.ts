import { MAX_YEAR, MIN_YEAR } from "./epoch-day.js";
import type { PlainDate } from "./types.js";

/** A calendar month without a day (plan 06 A25). Months are 1-based. */
export type PlainYearMonth = Readonly<{ year: number; month: number }>;

export function plainYearMonth(year: number, month: number): PlainYearMonth {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < MIN_YEAR ||
    year > MAX_YEAR ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError(`${year}-${month} is not a valid year and month.`);
  }
  return Object.freeze({ year, month });
}

export const toPlainYearMonth = (date: PlainDate): PlainYearMonth =>
  plainYearMonth(date.year, date.month);

export const compareYearMonth = (
  a: PlainYearMonth,
  b: PlainYearMonth,
): number => a.year * 12 + a.month - (b.year * 12 + b.month);

export function addMonthsToYearMonth(
  value: PlainYearMonth,
  months: number,
): PlainYearMonth {
  const total = value.year * 12 + (value.month - 1) + months;
  const year = Math.floor(total / 12);
  return plainYearMonth(year, total - year * 12 + 1);
}
