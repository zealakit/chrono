import { compare } from "../values/compare.js";
import {
  daysInMonth,
  dayOfWeekFromEpochDay,
  fromEpochDay,
  plainDate,
  toEpochDay,
} from "../values/plain-date.js";
import type { DayOfWeek, PlainDate, WeekInfo } from "../values/types.js";
import { getIsoWeek, getLocaleWeek } from "../values/week.js";

export type GridDay = {
  date: PlainDate;
  dayOfWeek: DayOfWeek;
  outsideMonth: boolean;
  weekend: boolean;
  /** Only set when `today` is passed in the options. */
  today: boolean;
};

export type GridWeek = { weekNumber: number; days: GridDay[] };

export type MonthGrid = { year: number; month: number; weeks: GridWeek[] };

export type MonthGridOptions = {
  weekStartsOn: DayOfWeek;
  /** Source of the weekend days (default Saturday and Sunday) and of locale week numbers. */
  weekInfo?: Pick<WeekInfo, "weekend"> &
    Partial<Pick<WeekInfo, "firstDay" | "minimalDays">>;
  /** Always render 6 rows so the grid height is stable. */
  fixedWeeks?: boolean;
  today?: PlainDate;
  weekNumbers?: "iso" | "locale";
};

const DEFAULT_WEEKEND: readonly DayOfWeek[] = [6, 7];

export function getMonthGrid(
  year: number,
  month: number,
  options: MonthGridOptions,
): MonthGrid {
  const first = plainDate(year, month, 1);
  const firstEpoch = toEpochDay(first);
  const lead =
    (dayOfWeekFromEpochDay(firstEpoch) - options.weekStartsOn + 7) % 7;
  const startEpoch = firstEpoch - lead;
  const used = lead + daysInMonth(year, month);
  const rows = options.fixedWeeks ? 6 : Math.ceil(used / 7);
  const weekend = options.weekInfo?.weekend ?? DEFAULT_WEEKEND;
  const localeRules = {
    firstDay: options.weekInfo?.firstDay ?? options.weekStartsOn,
    minimalDays: options.weekInfo?.minimalDays ?? 1,
  };

  const weeks: GridWeek[] = [];
  for (let row = 0; row < rows; row += 1) {
    const days: GridDay[] = [];
    for (let column = 0; column < 7; column += 1) {
      const epoch = startEpoch + row * 7 + column;
      const date = fromEpochDay(epoch);
      const weekday = dayOfWeekFromEpochDay(epoch);
      days.push({
        date,
        dayOfWeek: weekday,
        outsideMonth: date.month !== month || date.year !== year,
        weekend: weekend.includes(weekday),
        today: options.today ? compare(date, options.today) === 0 : false,
      });
    }
    // ISO weeks are named by their Thursday; locale weeks by the row's first day.
    const reference =
      options.weekNumbers === "locale"
        ? (days[0] as GridDay)
        : (days.find((day) => day.dayOfWeek === 4) as GridDay);
    const weekNumber =
      options.weekNumbers === "locale"
        ? getLocaleWeek(reference.date, localeRules).week
        : getIsoWeek(reference.date).week;
    weeks.push({ weekNumber, days });
  }
  return { year, month, weeks };
}

/** `count` consecutive month grids starting at `start`'s month. */
export function getMonths(
  start: { year: number; month: number },
  count: number,
  options: MonthGridOptions,
): MonthGrid[] {
  const grids: MonthGrid[] = [];
  for (let index = 0; index < count; index += 1) {
    const total = start.year * 12 + (start.month - 1) + index;
    const year = Math.floor(total / 12);
    grids.push(getMonthGrid(year, total - year * 12 + 1, options));
  }
  return grids;
}
