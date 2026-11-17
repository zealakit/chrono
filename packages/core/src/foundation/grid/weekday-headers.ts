import { getWeekdayNames } from "../locale/names.js";
import { getWeekInfo } from "../locale/week-info.js";
import type { DayOfWeek } from "../values/types.js";

export type WeekdayHeader = {
  dayOfWeek: DayOfWeek;
  short: string;
  long: string;
  weekend: boolean;
};

/**
 * Column headers starting at `weekStartsOn`. `hiddenDays` drops columns (a
 * work week hides Saturday and Sunday). `width` picks the form used for
 * `short`.
 */
export function getWeekdayHeaders(
  locale: string | undefined,
  options: {
    weekStartsOn: DayOfWeek;
    hiddenDays?: readonly DayOfWeek[];
    width?: "short" | "narrow";
  },
): WeekdayHeader[] {
  const { weekStartsOn, hiddenDays = [], width = "short" } = options;
  const short = getWeekdayNames(locale, width, weekStartsOn);
  const long = getWeekdayNames(locale, "long", weekStartsOn);
  const weekend = getWeekInfo(locale).weekend;
  const headers: WeekdayHeader[] = [];
  for (let index = 0; index < 7; index += 1) {
    const dayOfWeek = (((weekStartsOn - 1 + index) % 7) + 1) as DayOfWeek;
    if (!hiddenDays.includes(dayOfWeek)) {
      headers.push({
        dayOfWeek,
        short: short[index] as string,
        long: long[index] as string,
        weekend: weekend.includes(dayOfWeek),
      });
    }
  }
  return headers;
}
