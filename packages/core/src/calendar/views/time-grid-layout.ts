import {
  type DayOfWeek,
  type TimeSlot,
  type WeekdayHeader,
  getTimeAxis,
  getWeekdayHeaders,
  toPlainTime,
  type TimeInput,
} from "../../foundation/index.js";
import { type CalendarDay, visibleDays } from "./day.js";
import type { LayoutContext } from "./month-layout.js";

export type TimeGridOptions = {
  start?: TimeInput;
  /** Exclusive. Omit for 24:00. */
  end?: TimeInput;
  /** Minutes per slot (default 30). */
  step?: number;
  workingHours?: { start: TimeInput; end: TimeInput; days?: DayOfWeek[] };
};

export type TimeGridLayout = {
  kind: "time-grid";
  /** Visible columns only. */
  days: CalendarDay[];
  slots: TimeSlot[];
  /** One header per entry of `days`. */
  weekdays: WeekdayHeader[];
  /** Days of the week that count as working days (all when not set). */
  workingDays: DayOfWeek[];
};

export function getTimeGridLayout(
  ctx: LayoutContext,
  options: TimeGridOptions = {},
): TimeGridLayout {
  const days = visibleDays(ctx);

  const headers = new Map(
    getWeekdayHeaders(ctx.locale, { weekStartsOn: 1 }).map((header) => [
      header.dayOfWeek,
      header,
    ]),
  );
  const workingHours = options.workingHours;
  const slots = getTimeAxis({
    start: options.start === undefined ? undefined : toPlainTime(options.start),
    end: options.end === undefined ? undefined : toPlainTime(options.end),
    step: { minutes: options.step ?? 30 },
    workingHours: workingHours
      ? [
          {
            start: toPlainTime(workingHours.start),
            end: toPlainTime(workingHours.end),
          },
        ]
      : undefined,
  });
  return {
    kind: "time-grid",
    days,
    slots,
    weekdays: days.map((day) => headers.get(day.dayOfWeek) as WeekdayHeader),
    workingDays: workingHours?.days ?? [1, 2, 3, 4, 5, 6, 7],
  };
}
