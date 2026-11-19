/**
 * Epoch-day arithmetic: days since 1970-01-01 using the "days from civil"
 * algorithm. Never uses `Date` (plan 03 D4).
 */

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : (MONTH_DAYS[month - 1] ?? 0);
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Epoch day of a proleptic Gregorian date. Does not validate its input. */
export function daysFromCivil(
  year: number,
  month: number,
  day: number,
): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of {@link daysFromCivil}: `[year, month, day]`. */
export function civilFromDays(epochDay: number): [number, number, number] {
  const z = epochDay + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return [year, month, day];
}

/** Floor division that is correct for negative numbers. */
export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;
