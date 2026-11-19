import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  isSameDay,
  plainDate,
  startOfMonth,
  startOfWeek,
} from "../foundation/index.js";

export type PresetContext = {
  today: PlainDate;
  weekStartsOn?: DayOfWeek;
  /** Month a fiscal year starts in (1-12, default 1). */
  fiscalYearStartMonth?: number;
};

export type NamedPreset =
  | "today"
  | "yesterday"
  | "last7Days"
  | "last30Days"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "lastQuarter"
  | "yearToDate"
  | "thisYear"
  | "lastYear";

/** `rolling`: the last `amount` units ending today. `calendar`: `amount` whole units ending with the current one. */
export type CustomPreset = {
  unit: "day" | "week" | "month" | "quarter" | "year";
  amount: number;
  align: "rolling" | "calendar";
};
export type DatePreset = NamedPreset | CustomPreset;

function fiscalYearStart(date: PlainDate, startMonth: number): PlainDate {
  return plainDate(
    date.month >= startMonth ? date.year : date.year - 1,
    startMonth,
    1,
  );
}

function quarterStart(date: PlainDate, startMonth: number): PlainDate {
  const first = fiscalYearStart(date, startMonth);
  const months = (date.year - first.year) * 12 + (date.month - first.month);
  return addMonths(first, Math.floor(months / 3) * 3);
}

const quarterOf = (start: PlainDate): DateRange => ({
  start,
  end: addDays(addMonths(start, 3), -1),
});

function unitRange(
  unit: CustomPreset["unit"],
  at: PlainDate,
  ctx: PresetContext,
): DateRange {
  const weekStartsOn = ctx.weekStartsOn ?? 1;
  const fiscal = ctx.fiscalYearStartMonth ?? 1;
  switch (unit) {
    case "day":
      return { start: at, end: at };
    case "week":
      return {
        start: startOfWeek(at, weekStartsOn),
        end: endOfWeek(at, weekStartsOn),
      };
    case "month":
      return { start: startOfMonth(at), end: endOfMonth(at) };
    case "quarter":
      return quarterOf(quarterStart(at, fiscal));
    default: {
      const start = fiscalYearStart(at, fiscal);
      return { start, end: addDays(addYears(start, 1), -1) };
    }
  }
}

function shift(
  at: PlainDate,
  unit: CustomPreset["unit"],
  amount: number,
): PlainDate {
  switch (unit) {
    case "day":
      return addDays(at, amount);
    case "week":
      return addDays(at, amount * 7);
    case "month":
      return addMonths(at, amount);
    case "quarter":
      return addMonths(at, amount * 3);
    default:
      return addYears(at, amount);
  }
}

/** The inclusive range a preset stands for (plan 06 A21). Pure: pass `today` yourself. */
export function getPresetRange(
  preset: DatePreset,
  ctx: PresetContext,
): DateRange {
  const { today } = ctx;
  if (typeof preset === "object") {
    if (preset.align === "rolling") {
      const start = addDays(shift(today, preset.unit, -preset.amount), 1);
      return { start, end: today };
    }
    const current = unitRange(preset.unit, today, ctx);
    const first = unitRange(
      preset.unit,
      shift(today, preset.unit, -(preset.amount - 1)),
      ctx,
    );
    return { start: first.start, end: current.end };
  }
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { start: day, end: day };
    }
    case "last7Days":
      return { start: addDays(today, -6), end: today };
    case "last30Days":
      return { start: addDays(today, -29), end: today };
    case "thisWeek":
      return unitRange("week", today, ctx);
    case "lastWeek":
      return unitRange("week", addDays(today, -7), ctx);
    case "thisMonth":
      return unitRange("month", today, ctx);
    case "lastMonth":
      return unitRange("month", addMonths(startOfMonth(today), -1), ctx);
    case "thisQuarter":
      return unitRange("quarter", today, ctx);
    case "lastQuarter":
      return unitRange("quarter", addMonths(today, -3), ctx);
    case "yearToDate":
      return { start: unitRange("year", today, ctx).start, end: today };
    case "thisYear":
      return unitRange("year", today, ctx);
    default:
      return unitRange("year", addYears(today, -1), ctx);
  }
}

/** The first preset equal to `value`, for `aria-pressed` on the app's preset buttons. */
export function matchPreset<P extends DatePreset>(
  value: { start: PlainDate | null; end: PlainDate | null } | null,
  presets: readonly P[],
  ctx: PresetContext,
): P | null {
  if (!value?.start || !value.end) return null;
  for (const preset of presets) {
    const range = getPresetRange(preset, ctx);
    if (
      isSameDay(range.start, value.start) &&
      isSameDay(range.end, value.end)
    ) {
      return preset;
    }
  }
  return null;
}
