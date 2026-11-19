import { MAX_YEAR, MIN_YEAR } from "../values/epoch-day.js";

export type MonthCell = { year: number; month: number };
export type YearGrid = { year: number; columns: number; rows: MonthCell[][] };

/** The 12 months of `year`, split into rows (default 4 columns, 3 rows). */
export function getYearGrid(
  year: number,
  options: { columns?: number } = {},
): YearGrid {
  const columns = options.columns ?? 4;
  if (!Number.isInteger(columns) || columns < 1 || columns > 12) {
    throw new RangeError("columns must be an integer from 1 to 12.");
  }
  const rows: MonthCell[][] = [];
  for (let month = 1; month <= 12; month += 1) {
    if ((month - 1) % columns === 0) {
      rows.push([]);
    }
    (rows[rows.length - 1] as MonthCell[]).push({ year, month });
  }
  return { year, columns, rows };
}

export type DecadeCell = { year: number; outsideDecade: boolean };
export type DecadeGrid = {
  startYear: number;
  endYear: number;
  years: DecadeCell[];
};

/**
 * `size` years around `year` (default 12): the decade containing it plus one
 * year before and the rest after, so the grid fills evenly.
 */
export function getDecadeGrid(
  year: number,
  options: { size?: number } = {},
): DecadeGrid {
  const size = options.size ?? 12;
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError("size must be a positive integer.");
  }
  const decade = Math.floor(year / 10) * 10;
  const years: DecadeCell[] = [];
  for (let index = 0; index < size; index += 1) {
    const value = decade - 1 + index;
    if (value >= MIN_YEAR && value <= MAX_YEAR) {
      years.push({
        year: value,
        outsideDecade: value < decade || value > decade + 9,
      });
    }
  }
  const first = years[0]?.year ?? decade;
  const last = years[years.length - 1]?.year ?? decade;
  return { startYear: first, endYear: last, years };
}
