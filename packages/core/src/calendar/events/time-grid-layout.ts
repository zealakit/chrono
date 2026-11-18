import {
  type PlainDate,
  type PlainDateTime,
  type PlainTime,
  compare,
  splitIntervalByDay,
  toEpochDay,
  toSecondOfDay,
} from "../../foundation/index.js";
import { wallSecondsOf } from "./normalize.js";
import { compareEventIds } from "./sort.js";
import type {
  CalendarEventInput,
  NormalizedEvent,
  TimeGridSegment,
} from "./types.js";

export type TimeGridEventsOptions = {
  dayStart?: PlainTime;
  /** Exclusive; omit for 24:00. */
  dayEnd?: PlainTime;
  /** Minimum drawn height in minutes (plan 05 E4), default 15. */
  minEventDuration?: number;
  /** Timed events of 24h or more move to the all-day row (E5), default `true`. */
  longEventsInAllDayRow?: boolean;
  now?: PlainDateTime;
};

const SECONDS_PER_DAY = 86400;

type Timed<T extends CalendarEventInput> = {
  key: string;
  event: T;
  start: PlainDateTime;
  end: PlainDateTime;
  dayKey: string;
  top: number;
  height: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  past: boolean;
  recurrence?: NormalizedEvent<T>["recurrence"];
  /** Effective clipped interval, seconds within the day (for overlap). */
  startSec: number;
  endSec: number;
  column: number;
  columns: number;
  span: number;
};

function secondsInDay(value: PlainDateTime, date: PlainDate): number {
  return wallSecondsOf(value) - toEpochDay(date) * SECONDS_PER_DAY;
}

function compareTimed<T extends CalendarEventInput>(
  a: Timed<T>,
  b: Timed<T>,
): number {
  if (a.startSec !== b.startSec) {
    return a.startSec - b.startSec;
  }
  const da = wallSecondsOf(a.end) - wallSecondsOf(a.start);
  const db = wallSecondsOf(b.end) - wallSecondsOf(b.start);
  if (da !== db) {
    return db - da;
  }
  return compareEventIds(a.event.id, b.event.id);
}

/**
 * Assign overlap columns within a cluster and expand each event rightward
 * (plan 05 E8). Members must be sorted by `compareTimed`.
 */
function assignColumns<T extends CalendarEventInput>(
  members: Timed<T>[],
): void {
  const columnEnds: number[] = [];
  for (const item of members) {
    let column = 0;
    while (
      column < columnEnds.length &&
      (columnEnds[column] as number) > item.startSec
    ) {
      column += 1;
    }
    if (column === columnEnds.length) {
      columnEnds.push(item.endSec);
    } else {
      columnEnds[column] = item.endSec;
    }
    item.column = column;
  }
  const columns = columnEnds.length;
  for (const item of members) {
    item.columns = columns;
    let span = 1;
    while (item.column + span < columns) {
      const column = item.column + span;
      const overlap = members.some(
        (other) =>
          other.column === column &&
          other.startSec < item.endSec &&
          item.startSec < other.endSec,
      );
      if (overlap) {
        break;
      }
      span += 1;
    }
    item.span = span;
  }
}

/**
 * The timed area of a week / work week / day time grid (plan 05 §2.4): split
 * each event per day, clip to the axis, lay out overlapping events into
 * columns with rightward expansion. All-day and long events are handled by
 * `layoutAllDayRow`, not here.
 */
export function layoutTimeGridEvents<T extends CalendarEventInput>(
  events: readonly NormalizedEvent<T>[],
  days: readonly { date: PlainDate; key: string }[],
  options: TimeGridEventsOptions = {},
): TimeGridSegment<T>[] {
  const axisStart = options.dayStart ? toSecondOfDay(options.dayStart) : 0;
  const axisEnd = options.dayEnd
    ? toSecondOfDay(options.dayEnd)
    : SECONDS_PER_DAY;
  const axisLength = axisEnd - axisStart;
  const minDuration = (options.minEventDuration ?? 15) * 60;
  const longEvents = options.longEventsInAllDayRow ?? true;
  const now = options.now;

  const columnByDay = new Map<number, number>();
  for (let index = 0; index < days.length; index += 1) {
    columnByDay.set(
      toEpochDay((days[index] as { date: PlainDate }).date),
      index,
    );
  }

  const byDay = new Map<string, Timed<T>[]>();
  for (const event of events) {
    if (event.allDay) {
      continue;
    }
    if (
      longEvents &&
      wallSecondsOf(event.end) - wallSecondsOf(event.start) >= SECONDS_PER_DAY
    ) {
      continue;
    }
    // `splitIntervalByDay` returns nothing for an empty interval, so a
    // zero-length event (no `end`) becomes one piece by hand.
    const pieces =
      compare(event.start, event.end) === 0
        ? [
            {
              date: event.start as PlainDate,
              start: event.start,
              end: event.end,
              continuesBefore: false,
              continuesAfter: false,
            },
          ]
        : splitIntervalByDay({ start: event.start, end: event.end });
    for (const piece of pieces) {
      const dayIndex = columnByDay.get(toEpochDay(piece.date));
      if (dayIndex === undefined) {
        continue;
      }
      const dayKey = days[dayIndex]?.key as string;
      const startSec = secondsInDay(piece.start, piece.date);
      const endSec = secondsInDay(piece.end, piece.date);
      const clippedStart = Math.max(startSec, axisStart);
      const clippedEnd = Math.min(endSec, axisEnd);
      // A zero-length event (no `end`) is kept when it starts inside the axis
      // and drawn at the minimum height; anything else must overlap the axis.
      const zeroLength = startSec === endSec;
      if (
        zeroLength
          ? startSec < axisStart || startSec >= axisEnd
          : clippedEnd <= clippedStart
      ) {
        continue;
      }
      const realHeight = (clippedEnd - clippedStart) / axisLength;
      const timed: Timed<T> = {
        key: `${event.key}:${dayKey}`,
        event: event.event,
        start: event.start,
        end: event.end,
        dayKey,
        top: (clippedStart - axisStart) / axisLength,
        height: Math.max(realHeight, minDuration / axisLength),
        continuesBefore: piece.continuesBefore,
        continuesAfter: piece.continuesAfter,
        past: now !== undefined && compare(event.end, now) <= 0,
        recurrence: event.recurrence,
        startSec: clippedStart,
        // Overlap follows the drawn extent, so minimum-height events never
        // sit on top of their neighbours.
        endSec: Math.max(clippedEnd, clippedStart + minDuration),
        column: 0,
        columns: 1,
        span: 1,
      };
      const list = byDay.get(dayKey);
      if (list) {
        list.push(timed);
      } else {
        byDay.set(dayKey, [timed]);
      }
    }
  }

  const result: TimeGridSegment<T>[] = [];
  for (const group of byDay.values()) {
    group.sort(compareTimed);
    // Cluster transitively overlapping events (sorted order keeps this linear).
    const clusters: { members: Timed<T>[]; end: number }[] = [];
    for (const item of group) {
      const cluster = clusters.find((c) => c.end > item.startSec);
      if (!cluster) {
        clusters.push({ members: [item], end: item.endSec });
      } else {
        cluster.members.push(item);
        cluster.end = Math.max(cluster.end, item.endSec);
      }
    }
    for (const cluster of clusters) {
      assignColumns(cluster.members);
    }
    for (const item of group) {
      result.push({
        key: item.key,
        event: item.event,
        start: item.start,
        end: item.end,
        allDay: false,
        continuesBefore: item.continuesBefore,
        continuesAfter: item.continuesAfter,
        past: item.past,
        recurrence: item.recurrence,
        dayKey: item.dayKey,
        top: item.top,
        height: item.height,
        column: item.column,
        columns: item.columns,
        span: item.span,
      });
    }
  }
  return result;
}
