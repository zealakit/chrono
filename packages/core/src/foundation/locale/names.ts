import { toEpochDay, plainDate } from "../values/plain-date.js";
import type { DayOfWeek } from "../values/types.js";
import { getFormatter } from "./resolve.js";
import { getWeekInfo } from "./week-info.js";

export type NameWidth = "long" | "short" | "narrow";

const DAY_MS = 86400000;
const cache = new Map<string, readonly string[]>();

function memo(key: string, create: () => string[]): readonly string[] {
  let names = cache.get(key);
  if (!names) {
    names = Object.freeze(create());
    cache.set(key, names);
  }
  return names;
}

/** Twelve month names, January first. */
export function getMonthNames(
  locale: string | undefined,
  width: NameWidth,
): readonly string[] {
  return memo(`m|${locale ?? ""}|${width}`, () => {
    const formatter = getFormatter(locale, { month: width, timeZone: "UTC" });
    return Array.from({ length: 12 }, (_, index) =>
      formatter.format(toEpochDay(plainDate(2021, index + 1, 15)) * DAY_MS),
    );
  });
}

/** Seven weekday names starting at `firstDay` (default: the locale's first day). */
export function getWeekdayNames(
  locale: string | undefined,
  width: NameWidth,
  firstDay?: DayOfWeek,
): readonly string[] {
  const start = firstDay ?? getWeekInfo(locale).firstDay;
  return memo(`w|${locale ?? ""}|${width}|${start}`, () => {
    const formatter = getFormatter(locale, { weekday: width, timeZone: "UTC" });
    // 2021-01-04 was a Monday.
    const monday = toEpochDay(plainDate(2021, 1, 4));
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format((monday + ((start - 1 + index) % 7)) * DAY_MS),
    );
  });
}
