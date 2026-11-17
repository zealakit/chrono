import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  type WeekInfo,
  isDateInRange,
  plainDate,
} from "../../foundation/index.js";
import {
  type LayoutContext,
  type MonthLayout,
  getMonthLayout,
} from "./month-layout.js";

export type MiniCalendarLayoutOptions = {
  month: { year: number; month: number };
  weekStartsOn: DayOfWeek;
  weekInfo: Pick<WeekInfo, "weekend" | "firstDay" | "minimalDays">;
  locale?: string;
  today: PlainDate;
  focusedDate: PlainDate;
  /** Days inside it get `inRange` (the main calendar's visible range, C11). */
  highlight?: DateRange;
  isMarked?: (date: PlainDate) => boolean;
  selectedDate?: PlainDate;
  isHighlighted?: (date: PlainDate) => boolean;
  min?: PlainDate;
  max?: PlainDate;
  weekNumbers?: "iso" | "locale" | false;
};

/** One 6-row month grid. Every day adds `marked`, and `inRange` for the synced range. */
export function getMiniCalendarLayout(
  options: MiniCalendarLayoutOptions,
): MonthLayout {
  const first = plainDate(options.month.year, options.month.month, 1);
  const ctx: LayoutContext = {
    definition: {
      id: "mini",
      layout: "month",
      length: { months: 1 },
      align: "month",
      fixedWeeks: true,
    },
    range: { start: first, end: first },
    visibleRange: { start: first, end: first },
    focusedDate: options.focusedDate,
    hiddenDays: [],
    weekStartsOn: options.weekStartsOn,
    weekInfo: options.weekInfo,
    locale: options.locale,
    today: options.today,
    min: options.min,
    max: options.max,
    selectedDate: options.selectedDate,
    isHighlighted: options.isHighlighted,
    isMarked: options.isMarked,
    weekNumbers: options.weekNumbers ?? false,
  };
  const layout = getMonthLayout(ctx);
  const { highlight } = options;
  return {
    ...layout,
    months: layout.months.map((month) => ({
      ...month,
      weeks: month.weeks.map((week) => ({
        ...week,
        days: week.days.map((day) => ({
          ...day,
          inRange: highlight ? isDateInRange(day.date, highlight) : false,
        })),
      })),
    })),
  };
}
