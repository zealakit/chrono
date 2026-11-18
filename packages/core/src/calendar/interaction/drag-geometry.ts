import {
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  fromEpochDay,
  fromSecondOfDay,
  plainDateTime,
  plainTime,
  toEpochDay,
  toSecondOfDay,
} from "../../foundation/index.js";

const DAY = 86400;
const MIDNIGHT = plainTime(0, 0, 0);

/** An event position in display-zone wall time; all-day ends are exclusive midnights (plan 05 E3). */
export type EditValue = {
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
};

/** Where the pointer is: a day, a time-grid slot, or the all-day row. */
export type DragTarget = {
  date: PlainDate;
  /** Start of the slot under the pointer (time grid). */
  time?: PlainTime;
  allDayRow?: boolean;
};

/** What part of the event the pointer grabbed (plan 09 §13.2). */
export type Grab = {
  /** Month / all-day row: which day of the event, 0-based. */
  dayOffset: number;
  /** Time grid: minutes from the event's start to the grabbed slot. */
  minuteOffset: number;
};

export type GeometryOptions = {
  view: "month" | "time-grid";
  /** Minutes. */
  snap: number;
  /** The grid's slot length in minutes (a resize to a slot reaches the slot's end). */
  slot: number;
  allowAllDayConversion: boolean;
  /** Minutes. */
  defaultTimedDuration: number;
};

export const toSeconds = (value: PlainDateTime): number =>
  toEpochDay(value) * DAY + toSecondOfDay(value);

export function fromSeconds(seconds: number): PlainDateTime {
  const day = Math.floor(seconds / DAY);
  return plainDateTime(fromEpochDay(day), fromSecondOfDay(seconds - day * DAY));
}

/** Nearest multiple of `size`; an exact tie rounds up (plan 09 §13.2). */
export const snapTo = (seconds: number, size: number): number =>
  Math.floor(seconds / size + 0.5) * size;

const midnight = (date: PlainDate): PlainDateTime =>
  plainDateTime(date, MIDNIGHT);
const shiftDays = (value: PlainDateTime, days: number): PlainDateTime =>
  fromSeconds(toSeconds(value) + days * DAY);
const dayDiff = (a: PlainDate, b: PlainDate): number =>
  toEpochDay(a) - toEpochDay(b);

/** How far into the event (in days / minutes) the press happened. */
export function grabOf(value: EditValue, target: DragTarget): Grab {
  const press = target.time
    ? plainDateTime(target.date, target.time)
    : midnight(target.date);
  const spanDays = Math.max(
    1,
    dayDiff(value.end, value.start) +
      (toSecondOfDay(value.end) > 0 && !value.allDay ? 1 : 0),
  );
  return {
    dayOffset: Math.min(
      Math.max(0, dayDiff(target.date, value.start)),
      spanDays - 1,
    ),
    minuteOffset: Math.max(
      0,
      Math.round((toSeconds(press) - toSeconds(value.start)) / 60),
    ),
  };
}

/**
 * Move an event so the grabbed part follows the pointer (plan 09 M4, M6). Returns
 * `null` when the target is not allowed (all-day conversion switched off).
 */
export function moveEvent(
  from: EditValue,
  grab: Grab,
  target: DragTarget,
  options: GeometryOptions,
): EditValue | null {
  const duration = toSeconds(from.end) - toSeconds(from.start);
  const dayLevel = options.view === "month" || target.allDayRow === true;
  if (dayLevel) {
    if (options.view === "time-grid" && !from.allDay) {
      // A timed event dropped on the all-day row becomes all-day.
      if (!options.allowAllDayConversion) return null;
      const days = Math.max(1, Math.ceil(duration / DAY));
      const start = midnight(target.date);
      return { start, end: shiftDays(start, days), allDay: true };
    }
    const delta = dayDiff(target.date, from.start) - grab.dayOffset;
    return {
      start: shiftDays(from.start, delta),
      end: shiftDays(from.end, delta),
      allDay: from.allDay,
    };
  }
  if (!target.time) return null;
  const targetSeconds = toSeconds(plainDateTime(target.date, target.time));
  if (from.allDay) {
    // An all-day event dropped in the timed area becomes timed.
    if (!options.allowAllDayConversion) return null;
    const start = fromSeconds(snapTo(targetSeconds, options.snap * 60));
    return {
      start,
      end: fromSeconds(toSeconds(start) + options.defaultTimedDuration * 60),
      allDay: false,
    };
  }
  const start = fromSeconds(
    snapTo(targetSeconds - grab.minuteOffset * 60, options.snap * 60),
  );
  return {
    start,
    end: fromSeconds(toSeconds(start) + duration),
    allDay: false,
  };
}

/**
 * Move one edge to the pointer (plan 09 M5). The edge never crosses the other one:
 * it stops one snap unit (one day for all-day) away.
 */
export function resizeEvent(
  from: EditValue,
  edge: "start" | "end",
  target: DragTarget,
  options: GeometryOptions,
): EditValue {
  const snap = options.snap * 60;
  const timedGrid =
    options.view === "time-grid" && !from.allDay && target.time !== undefined;
  if (timedGrid && target.time) {
    const wall = toSeconds(plainDateTime(target.date, target.time));
    if (edge === "end") {
      const end = Math.max(
        snapTo(wall + options.slot * 60, snap),
        toSeconds(from.start) + snap,
      );
      return { ...from, end: fromSeconds(end) };
    }
    const start = Math.min(snapTo(wall, snap), toSeconds(from.end) - snap);
    return { ...from, start: fromSeconds(start) };
  }
  if (from.allDay) {
    if (edge === "end") {
      const end = Math.max(
        toSeconds(midnight(target.date)) + DAY,
        toSeconds(from.start) + DAY,
      );
      return { ...from, end: fromSeconds(end) };
    }
    const start = Math.min(
      toSeconds(midnight(target.date)),
      toSeconds(from.end) - DAY,
    );
    return { ...from, start: fromSeconds(start) };
  }
  // A timed event in the month grid: move the edge's day, keep its time of day.
  if (edge === "end") {
    const wall = toSeconds(
      plainDateTime(
        target.date,
        plainTime(from.end.hour, from.end.minute, from.end.second),
      ),
    );
    return {
      ...from,
      end: fromSeconds(Math.max(wall, toSeconds(from.start) + snap)),
    };
  }
  const wall = toSeconds(
    plainDateTime(
      target.date,
      plainTime(from.start.hour, from.start.minute, from.start.second),
    ),
  );
  return {
    ...from,
    start: fromSeconds(Math.min(wall, toSeconds(from.end) - snap)),
  };
}

/** A keyboard step (plan 09 M10): shift by days and minutes. */
export function nudgeEvent(
  from: EditValue,
  kind: "move" | "resize-start" | "resize-end",
  step: { days: number; minutes: number },
  options: GeometryOptions,
): EditValue {
  const delta = step.days * DAY + step.minutes * 60;
  const unit = from.allDay ? DAY : options.snap * 60;
  if (kind === "move") {
    return {
      ...from,
      start: fromSeconds(toSeconds(from.start) + delta),
      end: fromSeconds(toSeconds(from.end) + delta),
    };
  }
  if (kind === "resize-end") {
    const end = Math.max(
      toSeconds(from.end) + delta,
      toSeconds(from.start) + unit,
    );
    return { ...from, end: fromSeconds(end) };
  }
  const start = Math.min(
    toSeconds(from.start) + delta,
    toSeconds(from.end) - unit,
  );
  return { ...from, start: fromSeconds(start) };
}
