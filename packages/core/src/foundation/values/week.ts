import { daysFromCivil } from "./epoch-day.js";
import { dayOfWeekFromEpochDay, toEpochDay } from "./plain-date.js";
import type { DayOfWeek, PlainDate, WeekInfo } from "./types.js";

export type WeekNumber = { year: number; week: number };

const ISO_WEEK_INFO = { firstDay: 1, minimalDays: 4 } as const;

/** Epoch day on which week 1 of `year` starts under the given rules. */
function firstWeekStart(
  year: number,
  firstDay: DayOfWeek,
  minimalDays: number,
): number {
  const jan1 = daysFromCivil(year, 1, 1);
  const offset = (dayOfWeekFromEpochDay(jan1) - firstDay + 7) % 7;
  const weekStart = jan1 - offset;
  const daysInYearPart = 7 - offset;
  return daysInYearPart >= minimalDays ? weekStart : weekStart + 7;
}

function weekNumber(
  date: PlainDate,
  firstDay: DayOfWeek,
  minimalDays: number,
): WeekNumber {
  const day = toEpochDay(date);
  let year = date.year;
  if (day >= firstWeekStart(year + 1, firstDay, minimalDays)) {
    year += 1;
  } else if (day < firstWeekStart(year, firstDay, minimalDays)) {
    year -= 1;
  }
  const week =
    Math.floor((day - firstWeekStart(year, firstDay, minimalDays)) / 7) + 1;
  return { year, week };
}

/** ISO 8601 week: weeks start on Monday, week 1 contains January 4th. */
export function getIsoWeek(date: PlainDate): WeekNumber {
  return weekNumber(date, ISO_WEEK_INFO.firstDay, ISO_WEEK_INFO.minimalDays);
}

/** Week number under a locale's first day and minimal days. */
export function getLocaleWeek(
  date: PlainDate,
  weekInfo: Pick<WeekInfo, "firstDay" | "minimalDays">,
): WeekNumber {
  return weekNumber(date, weekInfo.firstDay, weekInfo.minimalDays);
}
