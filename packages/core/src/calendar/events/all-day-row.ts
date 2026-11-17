import {
  type PlainDate,
  type PlainDateTime,
  compare,
  toEpochDay,
} from "../../foundation/index.js";
import { coveredDays, wallSecondsOf } from "./normalize.js";
import { applyPieceLimit, type DayOverflow } from "./overflow.js";
import { compareMonthSegments } from "./sort.js";
import type {
  AllDayRowSegment,
  CalendarEventInput,
  NormalizedEvent,
} from "./types.js";

export type AllDayRowOptions = {
  /** `allDayEventLimit`, default 3 (plan 05 §2.6). */
  eventLimit?: number;
  /** Timed events of 24h or more move here (plan 05 E5), default `true`. */
  longEventsInAllDayRow?: boolean;
  now?: PlainDateTime;
};

const SECONDS_PER_DAY = 86400;

function laneOverlaps(
  occupied: Set<number> | undefined,
  start: number,
  days: number,
): boolean {
  if (!occupied) {
    return false;
  }
  for (let c = start; c < start + days; c += 1) {
    if (occupied.has(c)) {
      return true;
    }
  }
  return false;
}

/**
 * The time-grid all-day row (plan 05 §2.4 step 1): all-day events plus long
 * timed events (E5), packed into lanes across the visible days with a
 * first-fit pass and an `eventLimit` (default 3).
 */
export function layoutAllDayRow<T extends CalendarEventInput>(
  events: readonly NormalizedEvent<T>[],
  days: readonly { date: PlainDate; key: string }[],
  options: AllDayRowOptions = {},
): { segments: AllDayRowSegment<T>[]; more: DayOverflow<T>[] } {
  const longEvents = options.longEventsInAllDayRow ?? true;
  const columnByDay = new Map<number, number>();
  for (let index = 0; index < days.length; index += 1) {
    columnByDay.set(
      toEpochDay((days[index] as { date: PlainDate }).date),
      index,
    );
  }

  const pieces: AllDayRowSegment<T>[] = [];
  for (const event of events) {
    const isLong =
      longEvents &&
      wallSecondsOf(event.end) - wallSecondsOf(event.start) >= SECONDS_PER_DAY;
    if (!event.allDay && !isLong) {
      continue;
    }

    const { firstDay, lastDay } = coveredDays(
      event.start,
      event.end,
      event.allDay,
    );
    let startColumn = -1;
    let endColumn = -1;
    let firstVisibleDay = Number.POSITIVE_INFINITY;
    let lastVisibleDay = Number.NEGATIVE_INFINITY;
    for (let day = firstDay; day <= lastDay; day += 1) {
      const column = columnByDay.get(day);
      if (column === undefined) {
        continue;
      }
      if (startColumn === -1) {
        startColumn = column;
      }
      endColumn = column;
      if (day < firstVisibleDay) firstVisibleDay = day;
      if (day > lastVisibleDay) lastVisibleDay = day;
    }
    if (startColumn === -1) {
      continue; // no visible day
    }
    const firstKey = days[startColumn]?.key as string;
    pieces.push({
      key: `${event.key}:${firstKey}`,
      event: event.event,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      continuesBefore: firstVisibleDay > firstDay,
      continuesAfter: lastVisibleDay < lastDay,
      past: options.now !== undefined && compare(event.end, options.now) <= 0,
      dayKey: firstKey,
      startColumn,
      days: endColumn - startColumn + 1,
      lane: 0,
      hidden: false,
    });
  }

  pieces.sort(compareMonthSegments);
  const lanes: Set<number>[] = [];
  for (const piece of pieces) {
    let lane = 0;
    while (laneOverlaps(lanes[lane], piece.startColumn, piece.days)) {
      lane += 1;
    }
    if (!lanes[lane]) {
      lanes[lane] = new Set();
    }
    for (
      let c = piece.startColumn;
      c < piece.startColumn + piece.days;
      c += 1
    ) {
      lanes[lane]?.add(c);
    }
    piece.lane = lane;
  }

  const limit = options.eventLimit ?? 3;
  const { pieces: limited, more } = applyPieceLimit(
    pieces,
    limit,
    () => "row",
    (_piece, column) => days[column]?.key,
  );
  return { segments: limited, more };
}
