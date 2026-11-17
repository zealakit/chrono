import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  type WeekInfo,
  type WeekdayHeader,
  dayOfWeekFromEpochDay,
  endOfWeek,
  fromEpochDay,
  getIsoWeek,
  getLocaleWeek,
  getMonths,
  getWeekdayHeaders,
  startOfWeek,
  toEpochDay,
} from "../../foundation/index.js";
import {
  type ViewDefinition,
  getMonthCount,
} from "../navigation/view-definition.js";
import { type CalendarDay, type DayContext, makeDay } from "./day.js";

export type CalendarWeek = { weekNumber: number; days: CalendarDay[] };
export type MonthGridModel = {
  year: number;
  month: number;
  weeks: CalendarWeek[];
};

export type MonthLayout = {
  kind: "month";
  months: MonthGridModel[];
  /** Header cells for the visible columns. */
  weekdays: WeekdayHeader[];
  /** Whether the app asked for week numbers. */
  weekNumbers: boolean;
};

export type LayoutContext = DayContext & {
  definition: ViewDefinition;
  visibleRange: DateRange;
  weekStartsOn: DayOfWeek;
  weekInfo: Pick<WeekInfo, "weekend" | "firstDay" | "minimalDays">;
  locale?: string;
  today: PlainDate;
  weekNumbers: "iso" | "locale" | false;
};

function weekNumberOf(days: CalendarDay[], ctx: LayoutContext): number {
  if (ctx.weekNumbers === "locale") {
    return getLocaleWeek((days[0] as CalendarDay).date, ctx.weekInfo).week;
  }
  const thursday =
    days.find((day) => day.dayOfWeek === 4) ?? (days[0] as CalendarDay);
  return getIsoWeek(thursday.date).week;
}

export function getMonthLayout(ctx: LayoutContext): MonthLayout {
  const { definition, range } = ctx;
  const weekdays = getWeekdayHeaders(ctx.locale, {
    weekStartsOn: ctx.weekStartsOn,
    hiddenDays: ctx.hiddenDays,
  });
  const base = {
    kind: "month" as const,
    weekdays,
    weekNumbers: ctx.weekNumbers !== false,
  };

  if (definition.length.months !== undefined) {
    const grids = getMonths(range.start, getMonthCount(definition), {
      weekStartsOn: ctx.weekStartsOn,
      weekInfo: ctx.weekInfo,
      fixedWeeks: definition.fixedWeeks,
      today: ctx.today,
    });
    return {
      ...base,
      months: grids.map((grid) => ({
        year: grid.year,
        month: grid.month,
        weeks: grid.weeks.map((week) => {
          const days = week.days.map((day) => makeDay(day, ctx));
          return { weekNumber: weekNumberOf(days, ctx), days };
        }),
      })),
    };
  }

  // Days or weeks in a month layout: one block of whole weeks around the range.
  const start = toEpochDay(startOfWeek(range.start, ctx.weekStartsOn));
  const end = toEpochDay(endOfWeek(range.end, ctx.weekStartsOn));
  const weeks: CalendarWeek[] = [];
  for (let first = start; first <= end; first += 7) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = fromEpochDay(first + index);
      const weekday = dayOfWeekFromEpochDay(first + index);
      return makeDay(
        {
          date,
          dayOfWeek: weekday,
          outsideMonth: !(
            toEpochDay(date) >= toEpochDay(range.start) &&
            toEpochDay(date) <= toEpochDay(range.end)
          ),
          weekend: ctx.weekInfo.weekend.includes(weekday),
          today: toEpochDay(date) === toEpochDay(ctx.today),
        },
        ctx,
      );
    });
    weeks.push({ weekNumber: weekNumberOf(days, ctx), days });
  }
  return {
    ...base,
    months: [{ year: range.start.year, month: range.start.month, weeks }],
  };
}
