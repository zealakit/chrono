import {
  getMonths,
  toIsoString,
  toPlainDate,
  type DayOfWeek,
} from "../../dist/foundation/index.js";
import {
  applyEventLimit,
  layoutMonthEvents,
  normalizeEvents,
  type MonthEventLayout,
  type MonthSegment,
} from "../../dist/calendar/index.js";

/** Build the month grid structure the event layout reads (plan 05 13.4). */
export function monthLayout(options: {
  year: number;
  month: number;
  count?: number;
  weekStartsOn?: DayOfWeek;
  hiddenDays?: DayOfWeek[];
  fixedWeeks?: boolean;
}): MonthEventLayout {
  const {
    year,
    month,
    count = 1,
    weekStartsOn = 1,
    hiddenDays = [],
    fixedWeeks = true,
  } = options;
  const grids = getMonths({ year, month }, count, {
    weekStartsOn,
    weekInfo: { weekend: [6, 7] },
    fixedWeeks,
  });
  return {
    months: grids.map((grid) => ({
      weeks: grid.weeks.map((week) => ({
        days: week.days.map((day) => ({
          date: day.date,
          hidden: hiddenDays.includes(day.dayOfWeek),
          outsideMonth: day.outsideMonth,
          key: toIsoString(day.date),
        })),
      })),
    })),
  };
}

export type MonthFixture = {
  options: {
    year: number;
    month: number;
    count?: number;
    weekStartsOn?: DayOfWeek;
    hiddenDays?: DayOfWeek[];
    eventLimit?: number;
    visibleRange: { start: string; end: string };
  };
  events: Record<string, unknown>[];
};

/** Run a month fixture through normalize → layout → overflow. */
export function runMonthFixture(fixture: MonthFixture): {
  segments: MonthSegment[];
  more: { dayKey: string; count: number; events: unknown[] }[];
} {
  const { options, events } = fixture;
  const layout = monthLayout({
    year: options.year,
    month: options.month,
    count: options.count,
    weekStartsOn: options.weekStartsOn,
    hiddenDays: options.hiddenDays,
  });
  const visibleRange = {
    start: toPlainDate(options.visibleRange.start),
    end: toPlainDate(options.visibleRange.end),
  };
  const normalized = normalizeEvents(events as never, { visibleRange });
  let segments = layoutMonthEvents(normalized, layout);
  let more: { dayKey: string; count: number; events: unknown[] }[] = [];
  if (options.eventLimit != null) {
    const result = applyEventLimit(segments, options.eventLimit, layout);
    segments = result.segments;
    more = result.more;
  }
  return { segments, more };
}
